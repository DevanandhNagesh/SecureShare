"""
Hybrid encryption layer.

Files are encrypted with AES-256-GCM (fast, handles any file size).
Only the small AES key itself is ever passed through the ElGamal/PRE
layer in pre_crypto.py -- this is the standard "hybrid encryption"
pattern real PRE systems use, since ElGamal on a whole file would be
both slow and would not fit the (0, P) integer range constraint.
"""

import os
import hashlib
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

AES_KEY_BYTES = 32  # AES-256


def generate_aes_key() -> bytes:
    return AESGCM.generate_key(bit_length=256)


def encrypt_file(data: bytes, key: bytes) -> tuple[bytes, bytes]:
    """Returns (nonce, ciphertext). GCM tag is appended to ciphertext by the library."""
    aesgcm = AESGCM(key)
    nonce = os.urandom(12)
    ciphertext = aesgcm.encrypt(nonce, data, associated_data=None)
    return nonce, ciphertext


def decrypt_file(nonce: bytes, ciphertext: bytes, key: bytes) -> bytes:
    aesgcm = AESGCM(key)
    return aesgcm.decrypt(nonce, ciphertext, associated_data=None)


def sha256_hex(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()
