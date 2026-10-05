# SecureShare — Proxy Re-Encryption File Sharing (Backend)

Backend for DA2. Implements the ElGamal-based Proxy Re-Encryption scheme
(BBS98) exactly as solved by hand in DA1, wired into a real file-sharing
API. Verified end-to-end (see the smoke test below).

## Algorithm module

`app/crypto/pre_crypto.py` — the whole algorithm: `keygen`, `encrypt`,
`decrypt`, `rekeygen`, `reencrypt`. This is the file to walk through on
camera for the "code explanation" part of DA2.

`app/crypto/aes_utils.py` — the hybrid layer. Files are AES-256-GCM
encrypted; only the small AES key is passed through PRE. This is why a
1024-bit ElGamal group is enough — the "message" is never the file
itself.

## Run it

```bash
pip install -r requirements.txt --break-system-packages   # or use a venv
uvicorn app.main:app --reload --port 8010
```

Interactive API docs: http://127.0.0.1:8010/docs

## Demo flow (matches the MVP)

1. `POST /auth/signup` for Alice and Bob → each gets an ElGamal keypair.
2. `POST /auth/login` → get a JWT for each user.
3. `POST /files/upload` (as Alice) → file is AES-encrypted, and the AES
   key is ElGamal-encrypted under Alice's public key.
4. `POST /sharing/share` (as Alice, targeting Bob) → server computes
   `rk(Alice -> Bob)` and stores it against this file+recipient pair.
5. `GET /sharing/download/{share_id}` (as Bob) → **the proxy moment**:
   the stored ciphertext is transformed with `rk`, then Bob decrypts
   the transformed ciphertext with his own private key. The proxy
   function never touches the plaintext AES key.
6. `DELETE /sharing/share/{share_id}` (as Alice) → revokes access;
   Bob's next download attempt gets a 404.
7. `GET /sharing/audit-log` → shows every SHARE_CREATED / PROXY_REENCRYPT
   / DOWNLOAD / REVOKE event — good evidence for the DA2 video and the
   DA3 paper's evaluation section.

## Known limitations (mention these in DA3 — they're expected, not bugs)

- Private keys are stored server-side so the whole flow can run without
  a client-side crypto UI. A production system would generate and hold
  private keys client-side only.
- `rk` generation currently happens on the server at share-time using
  both users' private keys. A hardened design would compute `rk` via an
  interactive protocol or a separate trusted key-issuing service, so the
  application server itself never sees both raw private keys together.
- The 1024-bit safe prime (RFC 2409 Oakley Group 2) is adequate for a
  coursework demo; a production deployment would use a larger, more
  current standardized group.
