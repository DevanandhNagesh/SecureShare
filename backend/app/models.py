from datetime import datetime, timedelta
from typing import Optional
from sqlmodel import SQLModel, Field


class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    username: str = Field(index=True, unique=True)
    hashed_password: str

    # ElGamal keys. NOTE: elg_private is stored ONLY so this demo can show
    # decrypt/rekeygen server-side without a client-side crypto UI. In a
    # production system the private key must never touch the server --
    # it would be generated and held client-side only. Call this out
    # explicitly in your DA3 report's "limitations" section.
    elg_public: str   # stored as decimal string (big int)
    elg_private: str  # decimal string (big int) -- see note above

    created_at: datetime = Field(default_factory=datetime.utcnow)


class FileRecord(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    owner_id: int = Field(foreign_key="user.id")
    filename: str
    storage_path: str          # where the AES-encrypted blob lives on disk
    nonce_hex: str              # AES-GCM nonce
    sha256_hash: str            # integrity check, computed on plaintext at upload

    # The AES file-key, ElGamal-encrypted under the OWNER's public key.
    enc_key_c1: str
    enc_key_c2: str

    created_at: datetime = Field(default_factory=datetime.utcnow)


class ShareRecord(SQLModel, table=True):
    """One row per (file, recipient) share. Deleting this row = revocation."""
    id: Optional[int] = Field(default=None, primary_key=True)
    file_id: int = Field(foreign_key="filerecord.id")
    owner_id: int = Field(foreign_key="user.id")
    recipient_id: int = Field(foreign_key="user.id")

    rk: str  # the re-encryption key rk(owner -> recipient), decimal string

    expires_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

    def is_expired(self) -> bool:
        return self.expires_at is not None and datetime.utcnow() > self.expires_at


class AuditLog(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    actor_id: Optional[int] = Field(foreign_key="user.id", default=None)
    action: str          # e.g. "SHARE_CREATED", "PROXY_REENCRYPT", "DOWNLOAD", "REVOKE"
    detail: str           # human-readable detail, no secrets ever logged here
    timestamp: datetime = Field(default_factory=datetime.utcnow)
