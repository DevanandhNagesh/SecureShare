# SecureShare

**Secure cloud file-sharing system using AES-256-GCM encryption and ElGamal-based Proxy Re-Encryption (PRE).**

SecureShare is a full-stack academic project that demonstrates how encrypted files can be shared between users using hybrid encryption and Proxy Re-Encryption.

The actual file is protected using **AES-256-GCM**. The AES session key is then encrypted using an **ElGamal-based Proxy Re-Encryption scheme (BBS98-style construction)**. When a file is shared, the proxy transforms the encrypted AES key using a re-encryption key so that the recipient can recover the AES key using their own ElGamal private key.

The project also includes authentication, file management, sharing/revocation, expiry, audit logging, and cryptographic inspection interfaces.

---

## Core Idea

SecureShare uses hybrid encryption:

```text
                    Alice
                      │
                      │ Upload file
                      ▼
              ┌─────────────────┐
              │   AES-256-GCM   │
              │  File Encryption│
              └────────┬────────┘
                       │
                       │ Encrypted file
                       ▼
                 File Storage


              AES session key
                       │
                       ▼
              ┌─────────────────┐
              │     ElGamal     │
              │    Encryption   │
              └────────┬────────┘
                       │
                       │ Encrypted AES key
                       ▼
                  Alice's key
                   ciphertext
                       │
                       │ Share with Bob
                       ▼
              ┌─────────────────┐
              │      Proxy      │
              │  Re-Encryption  │
              └────────┬────────┘
                       │
                       │ Re-encrypted AES-key
                       ▼
                     Bob
                       │
                       │ ElGamal decrypt
                       ▼
                  AES session key
                       │
                       │ AES-GCM decrypt
                       ▼
                 Original file
```

The Proxy Re-Encryption layer operates on the **small AES session key**, not on the complete file.

---

## Cryptographic Design

### 1. AES-256-GCM

The actual uploaded file is encrypted using AES-256-GCM.

The implementation:

- Generates a random 256-bit AES key.
- Generates a random 12-byte nonce.
- Encrypts the complete file using AES-GCM.
- Stores the encrypted file in the backend storage directory.
- Computes a SHA-256 hash of the original plaintext for integrity verification.

The AES key is never used to encrypt the file through the ElGamal layer. Instead, only the small AES key is passed to the asymmetric cryptographic layer.

This hybrid approach allows AES to handle files efficiently while ElGamal/PRE handles only the small session key.

---

### 2. ElGamal-Based Proxy Re-Encryption

The PRE implementation is located in:

```text
backend/app/crypto/pre_crypto.py
```

The implemented operations are:

```text
KeyGen
Encrypt
Decrypt
ReKeyGen
ReEncrypt
```

The scheme follows the project’s BBS98-style construction:

```text
KeyGen:
    private key a
    public key pkA = g^a mod p

Encryption:
    C1 = g^k mod p
    C2 = m × pkA^k mod p

ReKeyGen:
    rk(A → B) = a × b⁻¹ mod q

ReEncrypt:
    C1' = C1^rk mod p
    C2' = C2

Decryption:
    m = C2' × (C1'^b)⁻¹ mod p
```

Here, `m` is the AES session key represented as an integer.

The complete file is **not** passed through ElGamal.

---

## File Upload Flow

When Alice uploads a file:

```text
1. Read plaintext file
        ↓
2. Calculate SHA-256 hash
        ↓
3. Generate random AES-256 key
        ↓
4. Encrypt file using AES-256-GCM
        ↓
5. Convert AES key to integer
        ↓
6. Encrypt AES key using Alice's ElGamal public key
        ↓
7. Store encrypted file
        ↓
8. Store encrypted AES-key components
```

The backend stores:

- encrypted file
- AES-GCM nonce
- SHA-256 plaintext hash
- ElGamal `C1`
- ElGamal `C2`
- file metadata

---

## File Sharing Flow

When Alice shares a file with Bob:

```text
Alice's private key
        +
Bob's private key
        │
        ▼
   ReKeyGen
        │
        ▼
rk(Alice → Bob)
        │
        ▼
Stored with the share
```

The implementation currently computes:

```text
rk(Alice → Bob) = a × b⁻¹ mod q
```

and stores the resulting re-encryption key in the `ShareRecord`.

The share can also have an optional expiration time.

---

## The Proxy Re-Encryption Step

When Bob downloads a shared file, the backend performs the PRE transformation:

```text
Alice's encrypted AES key
        │
        │  ReEncrypt(rk)
        ▼
Re-encrypted AES key
        │
        │ Bob's private key
        ▼
Recovered AES key
        │
        │ AES-GCM decryption
        ▼
Original file
```

The relevant implementation is in:

```text
backend/app/routers/sharing.py
```

The proxy operation transforms the ElGamal ciphertext using the stored re-encryption key.

The implementation is designed so that the proxy transformation operates on the encrypted AES key rather than directly on the plaintext file key.

---

## Sharing Features

SecureShare currently implements:

- User registration
- Login using JWT authentication
- Automatic ElGamal key-pair generation
- File upload
- AES-256-GCM encryption
- ElGamal encryption of AES keys
- File sharing
- Proxy Re-Encryption
- Shared-with-me file listing
- File download
- Share expiration
- Share revocation
- SHA-256 integrity verification
- Audit logging
- Ciphertext inspection
- PRE/decryption trace inspection
- Plaintext/decryption inspection

---

## Authentication

The backend uses:

- FastAPI OAuth2 password flow
- bcrypt password hashing
- JWT access tokens
- Protected API endpoints

Authentication-related code is located in:

```text
backend/app/routers/auth.py
backend/app/utils/security.py
```

During signup, each user receives an ElGamal key pair.

---

## Audit Logging

Security-relevant actions are recorded using the `AuditLog` model.

Examples include:

```text
USER_SIGNUP
FILE_UPLOADED
SHARE_CREATED
PROXY_REENCRYPT
DOWNLOAD
SHARE_REVOKED
```

The frontend provides an audit-log interface for inspecting these events.

---

## Project Structure

```text
SecureShare/
│
├── backend/
│   ├── app/
│   │   ├── crypto/
│   │   │   ├── aes_utils.py
│   │   │   └── pre_crypto.py
│   │   │
│   │   ├── routers/
│   │   │   ├── auth.py
│   │   │   ├── files.py
│   │   │   └── sharing.py
│   │   │
│   │   ├── utils/
│   │   │   └── security.py
│   │   │
│   │   ├── database.py
│   │   ├── main.py
│   │   ├── models.py
│   │   └── schemas.py
│   │
│   ├── storage/
│   ├── requirements.txt
│   ├── test_crypto_inspector_unit.py
│   └── test_crypto_visibility.py
│
├── frontend/
│   ├── app/
│   │   ├── (auth)/
│   │   ├── audit-log/
│   │   ├── dashboard/
│   │   └── shared-with-me/
│   │
│   ├── components/
│   │   ├── AuditTimeline.tsx
│   │   ├── DecryptionTraceViewer.tsx
│   │   ├── FileCiphertextViewer.tsx
│   │   ├── HowItWorks.tsx
│   │   ├── Navbar.tsx
│   │   ├── ShareDialog.tsx
│   │   ├── SharedDecryptViewer.tsx
│   │   └── UserKeyInspector.tsx
│   │
│   ├── lib/
│   │   ├── api.ts
│   │   └── auth-context.tsx
│   │
│   └── types/
│
├── .gitignore
├── run_backend.bat
├── run_dev.bat
└── LICENSE
```

---

## Technology Stack

### Backend

- Python
- FastAPI
- SQLModel
- SQLite
- bcrypt
- JWT
- `cryptography`
- ElGamal-based Proxy Re-Encryption

### Frontend

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS
- Lucide React

---

## Running the Project

### Backend

From the project root:

```powershell
.\run_backend.bat
```

The backend-specific scripts are also available under:

```text
backend/
```

The backend exposes FastAPI endpoints and interactive API documentation.

### Frontend

From the frontend directory:

```powershell
cd frontend
npm install
npm run dev
```

The frontend runs as a Next.js development application.

---

## Important Project Limitations

SecureShare is an **academic/coursework implementation** intended to demonstrate cryptographic concepts and their integration into a real application.

The current implementation intentionally has limitations that would need to be addressed in a production system.

### Server-side private keys

The current implementation stores ElGamal private keys server-side.

This was done so that the complete cryptographic workflow can be demonstrated without requiring a client-side cryptographic key-management system.

A production architecture should generate and protect private keys client-side rather than storing them directly on the application server.

### Re-encryption key generation

The current implementation generates the re-encryption key on the server using both users' private keys.

A hardened architecture would use a separate key-issuing mechanism or interactive protocol so that the application server does not have access to both raw private keys.

### Cryptographic parameters

The implementation uses the 1024-bit RFC 2409 Oakley Group 2 safe prime for the coursework demonstration.

A production deployment should use a larger and more current standardized cryptographic group or an independently reviewed modern PRE construction.

### Production security

A production deployment would additionally require:

- Proper secret management
- HTTPS/TLS
- Stronger private-key protection
- Production-grade database infrastructure
- Hardened access controls
- Security review and cryptographic review
- Additional protection against operational and application-layer attacks

Therefore, SecureShare should be understood as a **cryptographic demonstration and academic project**, not as a production-ready secure cloud storage service.

---

## Project Goals

SecureShare demonstrates the integration of:

1. AES-256-GCM symmetric encryption.
2. ElGamal public-key encryption.
3. Proxy Re-Encryption for delegated access.
4. Hybrid encryption for efficient file protection.
5. Authentication using password hashing and JWT.
6. File sharing with expiration and revocation.
7. Integrity verification using SHA-256.
8. Audit logging.
9. Visual inspection of cryptographic operations.

---

## Academic Context

SecureShare was developed as a security-focused academic project to demonstrate the practical integration of cryptographic algorithms into a full-stack application.

The Proxy Re-Encryption implementation corresponds to the cryptographic construction studied in the associated coursework, while the application extends the algorithm into an end-to-end file-sharing workflow.

---

## License

This project is licensed under the MIT License.

See [`LICENSE`](LICENSE) for details.
