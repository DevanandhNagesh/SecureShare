"""
ElGamal-based Proxy Re-Encryption (BBS98 construction).

This is the SAME scheme worked by hand in DA1:
    Setup:      p, g, q = (p-1)//2   (g generates the prime-order-q subgroup)
    KeyGen:     private a, public pkA = g^a mod p
    Encrypt:    C1 = g^k mod p ,  C2 = m * pkA^k mod p
    ReKeyGen:   rk(A->B) = a * b^-1 mod q
    ReEncrypt:  C1' = C1^rk mod p ,  C2' = C2
    Decrypt:    m = C2' * (C1'^b)^-1 mod p

We work in the prime-order subgroup of a known 1024-bit safe prime
(RFC 2409 "Oakley Group 2"), so q is prime and every private key is
guaranteed invertible mod q via Fermat's little theorem.

The plaintext `m` here is always the small AES-256 session key used to
encrypt the actual file (see aes_utils.py) -- NOT the file itself.
ElGamal/PRE only ever touches this one small integer.
"""

import secrets

# --- Public parameters (RFC 2409 Oakley Group 2, 1024-bit safe prime) -----
_P_HEX = (
    "FFFFFFFFFFFFFFFFC90FDAA22168C234C4C6628B80DC1CD"
    "129024E088A67CC74020BBEA63B139B22514A08798E3404"
    "DDEF9519B3CD3A431B302B0A6DF25F14374FE1356D6D51C"
    "245E485B576625E7EC6F44C42E9A637ED6B0BFF5CB6F406"
    "B7EDEE386BFB5A899FA5AE9F24117C4B1FE649286651ECE"
    "65381FFFFFFFFFFFFFFFF"
)
P = int(_P_HEX, 16)
_G_RAW = 2
Q = (P - 1) // 2          # prime order of the subgroup we use
G = pow(_G_RAW, 2, P)     # generator of the order-Q subgroup


def _rand_below_q() -> int:
    """Uniform random integer in [2, Q-2] -- avoids the degenerate 0/1 keys."""
    return secrets.randbelow(Q - 3) + 2


def modinv(x: int, mod: int) -> int:
    """Modular inverse via Fermat's little theorem (mod must be prime)."""
    return pow(x, mod - 2, mod)


def keygen() -> tuple[int, int]:
    """Returns (private_key, public_key)."""
    a = _rand_below_q()
    pk = pow(G, a, P)
    return a, pk


def encrypt(public_key: int, m: int) -> tuple[int, int]:
    """Standard ElGamal encryption of integer m (must satisfy 0 < m < P)."""
    if not (0 < m < P):
        raise ValueError("message integer must be in range (0, P)")
    k = _rand_below_q()
    c1 = pow(G, k, P)
    c2 = (m * pow(public_key, k, P)) % P
    return c1, c2


def decrypt(private_key: int, c1: int, c2: int) -> int:
    """Standard ElGamal decryption."""
    s = pow(c1, private_key, P)
    return (c2 * modinv(s, P)) % P


def rekeygen(private_key_a: int, private_key_b: int) -> int:
    """
    Compute rk(A->B) = a * b^-1 mod Q.
    This is the "re-encryption key" that allows a proxy to transform
    """
    
    b_inv = modinv(private_key_b, Q)
    return (private_key_a * b_inv) % Q


def reencrypt(rk: int, c1: int, c2: int) -> tuple[int, int]:
    """The PROXY operation: transform a ciphertext for A into one for B.
    Never sees the plaintext, and only ever touches (c1, c2) and rk."""
    c1_prime = pow(c1, rk, P)
    c2_prime = c2
    return c1_prime, c2_prime


def int_to_bytes(m: int, length: int = 32) -> bytes:
    return m.to_bytes(length, "big")


def bytes_to_int(b: bytes) -> int:
    return int.from_bytes(b, "big")
