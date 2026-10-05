from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class UserCreate(BaseModel):
    username: str
    password: str


class UserOut(BaseModel):
    id: int
    username: str
    elg_public: str


class UserMeOut(BaseModel):
    id: int
    username: str
    elg_public: str
    elg_private: str


class CiphertextOut(BaseModel):
    ciphertext_b64: str


class PlaintextOut(BaseModel):
    text: Optional[str] = None
    is_text: bool = False
    error: Optional[str] = None


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class FileOut(BaseModel):
    id: int
    filename: str
    sha256_hash: str
    created_at: datetime
    enc_key_c1: Optional[str] = None
    enc_key_c2: Optional[str] = None


class ShareCreate(BaseModel):
    file_id: int
    recipient_username: str
    expires_in_minutes: Optional[int] = None  # None = never expires


class ShareOut(BaseModel):
    id: int
    file_id: int
    recipient_username: str
    filename: Optional[str] = None
    rk: Optional[str] = None
    created_at: datetime
    expires_at: Optional[datetime]


class PreTraceOut(BaseModel):
    share_id: int
    file_id: int
    filename: str
    c1: str
    c2: str
    rk: str
    c1_prime: str
    c2_prime: str
    recovered_aes_key_int: str


class AuditLogOut(BaseModel):
    id: int
    action: str
    detail: str
    timestamp: datetime
