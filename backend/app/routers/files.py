import base64
import os
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File as FastAPIFile
from fastapi.responses import Response
from sqlmodel import Session, select

from app.database import get_session
from app.models import User, FileRecord, AuditLog
from app.schemas import FileOut, CiphertextOut, PlaintextOut
from app.utils.security import get_current_user
from app.crypto import pre_crypto as pc
from app.crypto import aes_utils

router = APIRouter(prefix="/files", tags=["files"])

STORAGE_DIR = "storage"
os.makedirs(STORAGE_DIR, exist_ok=True)


@router.post("/upload", response_model=FileOut)
def upload_file(
    upload: UploadFile = FastAPIFile(...),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    plaintext = upload.file.read()
    file_hash = aes_utils.sha256_hex(plaintext)

    # 1) Symmetric layer: AES-256-GCM encrypts the actual file bytes.
    aes_key = aes_utils.generate_aes_key()
    nonce, ciphertext = aes_utils.encrypt_file(plaintext, aes_key)

    # 2) Asymmetric layer: ElGamal encrypts the small AES key under the
    #    UPLOADER's own public key. This is the ciphertext the proxy
    #    will later transform for a recipient -- it never touches `ciphertext`.
    aes_key_int = pc.bytes_to_int(aes_key)
    owner_pub = int(current_user.elg_public)
    c1, c2 = pc.encrypt(owner_pub, aes_key_int)

    storage_path = os.path.join(STORAGE_DIR, f"{current_user.id}_{upload.filename}")
    with open(storage_path, "wb") as f:
        f.write(ciphertext)

    record = FileRecord(
        owner_id=current_user.id,
        filename=upload.filename,
        storage_path=storage_path,
        nonce_hex=nonce.hex(),
        sha256_hash=file_hash,
        enc_key_c1=str(c1),
        enc_key_c2=str(c2),
    )
    session.add(record)
    session.commit()
    session.refresh(record)

    session.add(AuditLog(actor_id=current_user.id, action="FILE_UPLOADED",
                          detail=f"File '{upload.filename}' uploaded and AES-key ElGamal-encrypted "
                                 f"under owner's public key."))
    session.commit()

    return FileOut(
        id=record.id,
        filename=record.filename,
        sha256_hash=record.sha256_hash,
        created_at=record.created_at,
        enc_key_c1=record.enc_key_c1,
        enc_key_c2=record.enc_key_c2,
    )


@router.get("/mine", response_model=List[FileOut])
def list_my_files(session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    records = session.exec(select(FileRecord).where(FileRecord.owner_id == current_user.id)).all()
    return [
        FileOut(
            id=r.id,
            filename=r.filename,
            sha256_hash=r.sha256_hash,
            created_at=r.created_at,
            enc_key_c1=r.enc_key_c1,
            enc_key_c2=r.enc_key_c2,
        )
        for r in records
    ]


@router.get("/{file_id}/download")
def download_own_file(file_id: int, session: Session = Depends(get_session),
                       current_user: User = Depends(get_current_user)):
    record = session.get(FileRecord, file_id)
    if not record or record.owner_id != current_user.id:
        raise HTTPException(status_code=404, detail="File not found")

    aes_key_int = pc.decrypt(int(current_user.elg_private), int(record.enc_key_c1), int(record.enc_key_c2))
    aes_key = pc.int_to_bytes(aes_key_int)

    with open(record.storage_path, "rb") as f:
        ciphertext = f.read()
    plaintext = aes_utils.decrypt_file(bytes.fromhex(record.nonce_hex), ciphertext, aes_key)

    if aes_utils.sha256_hex(plaintext) != record.sha256_hash:
        raise HTTPException(status_code=500, detail="Integrity check failed -- file may be corrupted")

    return Response(content=plaintext, media_type="application/octet-stream",
                     headers={"Content-Disposition": f"attachment; filename={record.filename}"})


@router.get("/{file_id}/ciphertext", response_model=CiphertextOut)
def get_file_ciphertext(
    file_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    record = session.get(FileRecord, file_id)
    if not record or record.owner_id != current_user.id:
        raise HTTPException(status_code=404, detail="File not found")
    if not os.path.exists(record.storage_path):
        raise HTTPException(status_code=404, detail="Encrypted file not found on disk")

    with open(record.storage_path, "rb") as f:
        data = f.read()

    return CiphertextOut(ciphertext_b64=base64.b64encode(data).decode("ascii"))


@router.get("/{file_id}/plaintext", response_model=PlaintextOut)
def get_own_file_plaintext(
    file_id: int,
    private_key: Optional[str] = None,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    record = session.get(FileRecord, file_id)
    if not record or record.owner_id != current_user.id:
        raise HTTPException(status_code=404, detail="File not found")
    if not os.path.exists(record.storage_path):
        raise HTTPException(status_code=404, detail="Encrypted file not found on disk")

    key_to_use = private_key.strip() if private_key and private_key.strip() else current_user.elg_private
    try:
        priv_int = int(key_to_use)
        aes_key_int = pc.decrypt(priv_int, int(record.enc_key_c1), int(record.enc_key_c2))
        aes_key = pc.int_to_bytes(aes_key_int)

        with open(record.storage_path, "rb") as f:
            ciphertext = f.read()

        plaintext = aes_utils.decrypt_file(bytes.fromhex(record.nonce_hex), ciphertext, aes_key)

        if aes_utils.sha256_hex(plaintext) != record.sha256_hash:
            return PlaintextOut(text=None, is_text=False, error="Integrity check failed: decrypted bytes do not match expected hash.")

        try:
            text_val = plaintext.decode("utf-8")
            return PlaintextOut(text=text_val, is_text=True, error=None)
        except UnicodeDecodeError:
            return PlaintextOut(text=None, is_text=False, error=None)
    except Exception as e:
        return PlaintextOut(
            text=None,
            is_text=False,
            error="Decryption failed: Integrity check failed / AES authentication tag mismatch. Decryption key is incorrect."
        )
