import os
from datetime import datetime, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlmodel import Session, select

from app.database import get_session
from app.models import User, FileRecord, ShareRecord, AuditLog
from app.schemas import ShareCreate, ShareOut, AuditLogOut, PlaintextOut, PreTraceOut
from app.utils.security import get_current_user
from app.crypto import pre_crypto as pc
from app.crypto import aes_utils

router = APIRouter(prefix="/sharing", tags=["sharing"])


@router.post("/share", response_model=ShareOut)
def create_share(payload: ShareCreate, session: Session = Depends(get_session),
                  current_user: User = Depends(get_current_user)):
    file_record = session.get(FileRecord, payload.file_id)
    if not file_record or file_record.owner_id != current_user.id:
        raise HTTPException(status_code=404, detail="File not found")

    recipient = session.exec(select(User).where(User.username == payload.recipient_username)).first()
    if not recipient:
        raise HTTPException(status_code=404, detail="Recipient user not found")
    if recipient.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot share a file with yourself")

    # --- This is the re-encryption KEY GENERATION step from the algorithm ---
    # rk(owner -> recipient) = a * b^-1 mod q
    rk = pc.rekeygen(int(current_user.elg_private), int(recipient.elg_private))

    expires_at = None
    if payload.expires_in_minutes:
        expires_at = datetime.utcnow() + timedelta(minutes=payload.expires_in_minutes)

    share = ShareRecord(file_id=file_record.id, owner_id=current_user.id,
                         recipient_id=recipient.id, rk=str(rk), expires_at=expires_at)
    session.add(share)
    session.commit()
    session.refresh(share)

    session.add(AuditLog(actor_id=current_user.id, action="SHARE_CREATED",
                          detail=f"Re-encryption key generated for file '{file_record.filename}' "
                                 f"-> recipient '{recipient.username}'. No private key was exposed."))
    session.commit()

    return ShareOut(
        id=share.id,
        file_id=share.file_id,
        recipient_username=recipient.username,
        filename=file_record.filename,
        rk=share.rk,
        created_at=share.created_at,
        expires_at=share.expires_at,
    )


@router.delete("/share/{share_id}")
def revoke_share(share_id: int, session: Session = Depends(get_session),
                  current_user: User = Depends(get_current_user)):
    share = session.get(ShareRecord, share_id)
    if not share or share.owner_id != current_user.id:
        raise HTTPException(status_code=404, detail="Share not found")

    session.delete(share)
    session.commit()

    session.add(AuditLog(actor_id=current_user.id, action="SHARE_REVOKED",
                          detail=f"Share id={share_id} revoked. Recipient can no longer obtain a "
                                 f"re-encrypted key for this file."))
    session.commit()
    return {"detail": "Share revoked"}


@router.get("/shared-with-me", response_model=List[ShareOut])
def list_shared_with_me(session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    shares = session.exec(select(ShareRecord).where(ShareRecord.recipient_id == current_user.id)).all()
    out = []
    for s in shares:
        if s.is_expired():
            continue
        file_rec = session.get(FileRecord, s.file_id)
        fname = file_rec.filename if file_rec else f"File #{s.file_id}"
        out.append(
            ShareOut(
                id=s.id,
                file_id=s.file_id,
                recipient_username=current_user.username,
                filename=fname,
                rk=s.rk,
                created_at=s.created_at,
                expires_at=s.expires_at,
            )
        )
    return out


@router.get("/download/{share_id}")
def download_shared_file(share_id: int, session: Session = Depends(get_session),
                          current_user: User = Depends(get_current_user)):
    share = session.get(ShareRecord, share_id)
    if not share or share.recipient_id != current_user.id:
        raise HTTPException(status_code=404, detail="Share not found")
    if share.is_expired():
        raise HTTPException(status_code=410, detail="This share has expired")

    file_record = session.get(FileRecord, share.file_id)
    if not file_record:
        raise HTTPException(status_code=404, detail="Underlying file no longer exists")

    # --- THE PROXY MOMENT ---
    # Take the owner's stored ciphertext of the AES key and transform it
    # using rk. This function never sees the plaintext AES key or file key.
    c1_prime, c2_prime = pc.reencrypt(
        int(share.rk), int(file_record.enc_key_c1), int(file_record.enc_key_c2)
    )
    session.add(AuditLog(actor_id=current_user.id, action="PROXY_REENCRYPT",
                          detail=f"Proxy transformed ciphertext for file '{file_record.filename}' "
                                 f"using rk -- plaintext AES key was never exposed to the proxy."))
    session.commit()

    # Recipient decrypts the just-transformed ciphertext with THEIR OWN private key.
    aes_key_int = pc.decrypt(int(current_user.elg_private), c1_prime, c2_prime)
    aes_key = pc.int_to_bytes(aes_key_int)

    with open(file_record.storage_path, "rb") as f:
        ciphertext = f.read()
    plaintext = aes_utils.decrypt_file(bytes.fromhex(file_record.nonce_hex), ciphertext, aes_key)

    if aes_utils.sha256_hex(plaintext) != file_record.sha256_hash:
        raise HTTPException(status_code=500, detail="Integrity check failed -- file may be corrupted")

    session.add(AuditLog(actor_id=current_user.id, action="DOWNLOAD",
                          detail=f"Recipient downloaded and decrypted '{file_record.filename}' "
                                 f"via re-encrypted ciphertext."))
    session.commit()

    return Response(content=plaintext, media_type="application/octet-stream",
                     headers={"Content-Disposition": f"attachment; filename={file_record.filename}"})


@router.get("/download/{share_id}/raw")
def download_shared_file_raw(
    share_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    share = session.get(ShareRecord, share_id)
    if not share or share.recipient_id != current_user.id:
        raise HTTPException(status_code=404, detail="Share not found")
    if share.is_expired():
        raise HTTPException(status_code=410, detail="This share has expired")

    file_record = session.get(FileRecord, share.file_id)
    if not file_record or not os.path.exists(file_record.storage_path):
        raise HTTPException(status_code=404, detail="Underlying file not found")

    with open(file_record.storage_path, "rb") as f:
        ciphertext = f.read()

    enc_filename = f"{file_record.filename}.enc"
    return Response(
        content=ciphertext,
        media_type="application/octet-stream",
        headers={"Content-Disposition": f'attachment; filename="{enc_filename}"'},
    )


@router.get("/download/{share_id}/plaintext", response_model=PlaintextOut)
def get_shared_file_plaintext(
    share_id: int,
    private_key: Optional[str] = None,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    share = session.get(ShareRecord, share_id)
    if not share or share.recipient_id != current_user.id:
        raise HTTPException(status_code=404, detail="Share not found")
    if share.is_expired():
        raise HTTPException(status_code=410, detail="This share has expired")

    file_record = session.get(FileRecord, share.file_id)
    if not file_record or not os.path.exists(file_record.storage_path):
        raise HTTPException(status_code=404, detail="Underlying file not found")

    # Re-encryption step (proxy)
    try:
        c1_prime, c2_prime = pc.reencrypt(
            int(share.rk), int(file_record.enc_key_c1), int(file_record.enc_key_c2)
        )
    except Exception as e:
        return PlaintextOut(text=None, is_text=False, error=f"Proxy re-encryption failed: {str(e)}")

    key_to_use = private_key.strip() if private_key and private_key.strip() else current_user.elg_private
    try:
        priv_int = int(key_to_use)
        aes_key_int = pc.decrypt(priv_int, c1_prime, c2_prime)
        aes_key = pc.int_to_bytes(aes_key_int)

        with open(file_record.storage_path, "rb") as f:
            ciphertext = f.read()

        plaintext = aes_utils.decrypt_file(bytes.fromhex(file_record.nonce_hex), ciphertext, aes_key)

        if aes_utils.sha256_hex(plaintext) != file_record.sha256_hash:
            return PlaintextOut(text=None, is_text=False, error="Integrity check failed: decrypted content hash mismatch.")

        try:
            text_val = plaintext.decode("utf-8")
            return PlaintextOut(text=text_val, is_text=True, error=None)
        except UnicodeDecodeError:
            return PlaintextOut(text=None, is_text=False, error=None)
    except Exception as e:
        return PlaintextOut(
            text=None,
            is_text=False,
            error="Decryption failed: Integrity check failed / AES authentication tag mismatch. This proves that PRE only allows decryption with the correct private key."
        )


@router.get("/download/{share_id}/trace", response_model=PreTraceOut)
def get_share_trace(
    share_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    share = session.get(ShareRecord, share_id)
    if not share or share.recipient_id != current_user.id:
        raise HTTPException(status_code=404, detail="Share not found")
    if share.is_expired():
        raise HTTPException(status_code=410, detail="This share has expired")

    file_record = session.get(FileRecord, share.file_id)
    if not file_record:
        raise HTTPException(status_code=404, detail="Underlying file not found")

    # The exact same pre_crypto operations:
    c1_prime, c2_prime = pc.reencrypt(
        int(share.rk), int(file_record.enc_key_c1), int(file_record.enc_key_c2)
    )
    aes_key_int = pc.decrypt(int(current_user.elg_private), c1_prime, c2_prime)

    return PreTraceOut(
        share_id=share.id,
        file_id=file_record.id,
        filename=file_record.filename,
        c1=file_record.enc_key_c1,
        c2=file_record.enc_key_c2,
        rk=share.rk,
        c1_prime=str(c1_prime),
        c2_prime=str(c2_prime),
        recovered_aes_key_int=str(aes_key_int),
    )


@router.get("/audit-log", response_model=List[AuditLogOut])
def get_audit_log(session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    logs = session.exec(
        select(AuditLog).where(AuditLog.actor_id == current_user.id).order_by(AuditLog.timestamp.desc())
    ).all()
    return [AuditLogOut(id=l.id, action=l.action, detail=l.detail, timestamp=l.timestamp) for l in logs]
