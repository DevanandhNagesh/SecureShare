import io
import os
import base64
import random
import string
from fastapi.testclient import TestClient
from app.database import init_db
from app.main import app

init_db()
client = TestClient(app)

def random_username(prefix="user"):
    suffix = "".join(random.choices(string.ascii_lowercase + string.digits, k=6))
    return f"{prefix}_{suffix}"

def test_full_crypto_visibility_suite():
    alice_name = random_username("alice")
    bob_name = random_username("bob")

    # 1. Signup Alice
    r = client.post("/auth/signup", json={"username": alice_name, "password": "password123"})
    assert r.status_code == 200, r.text
    r = client.post("/auth/login", data={"username": alice_name, "password": "password123"})
    assert r.status_code == 200, r.text
    alice_token = r.json()["access_token"]
    alice_headers = {"Authorization": f"Bearer {alice_token}"}

    # 2. GET /auth/me for Alice
    r = client.get("/auth/me", headers=alice_headers)
    assert r.status_code == 200
    alice_me = r.json()
    assert "elg_public" in alice_me and "elg_private" in alice_me
    print(f"[OK] GET /auth/me -> Alice pub length {len(alice_me['elg_public'])}, priv length {len(alice_me['elg_private'])}")

    # 3. Signup Bob
    r = client.post("/auth/signup", json={"username": bob_name, "password": "password123"})
    assert r.status_code == 200
    r = client.post("/auth/login", data={"username": bob_name, "password": "password123"})
    assert r.status_code == 200
    bob_token = r.json()["access_token"]
    bob_headers = {"Authorization": f"Bearer {bob_token}"}

    r = client.get("/auth/me", headers=bob_headers)
    assert r.status_code == 200
    bob_me = r.json()
    print(f"[OK] GET /auth/me -> Bob pub length {len(bob_me['elg_public'])}, priv length {len(bob_me['elg_private'])}")

    # 4. Upload file as Alice
    file_bytes = b"Classified proxy re-encryption memo: ElGamal + AES-256-GCM."
    filename = "memo.txt"
    files = {"upload": (filename, io.BytesIO(file_bytes), "text/plain")}
    r = client.post("/files/upload", headers=alice_headers, files=files)
    assert r.status_code == 200, r.text
    file_data = r.json()
    file_id = file_data["id"]
    assert "enc_key_c1" in file_data and "enc_key_c2" in file_data
    assert file_data["enc_key_c1"] and file_data["enc_key_c2"]
    print(f"[OK] Upload File -> FileOut contains enc_key_c1 and enc_key_c2")

    # 5. GET /files/{id}/ciphertext
    r = client.get(f"/files/{file_id}/ciphertext", headers=alice_headers)
    assert r.status_code == 200
    c_data = r.json()
    assert "ciphertext_b64" in c_data
    raw_ciphertext = base64.b64decode(c_data["ciphertext_b64"])
    assert len(raw_ciphertext) > 0
    print(f"[OK] GET /files/{file_id}/ciphertext -> returned {len(raw_ciphertext)} bytes base64")

    # 6. GET /files/{id}/plaintext with real private key
    r = client.get(f"/files/{file_id}/plaintext", headers=alice_headers)
    assert r.status_code == 200
    pt_data = r.json()
    assert pt_data["is_text"] is True
    assert pt_data["text"] == file_bytes.decode("utf-8")
    assert pt_data["error"] is None
    print(f"[OK] GET /files/{file_id}/plaintext -> decrypted correctly with owner's key")

    # 7. GET /files/{id}/plaintext with wrong key
    wrong_key = str(int(alice_me["elg_private"]) + 42)
    r = client.get(f"/files/{file_id}/plaintext?private_key={wrong_key}", headers=alice_headers)
    assert r.status_code == 200
    pt_err_data = r.json()
    assert pt_err_data["is_text"] is False
    assert pt_err_data["text"] is None
    assert pt_err_data["error"] is not None
    print(f"[OK] GET /files/{file_id}/plaintext with wrong key -> failed gracefully with error: {pt_err_data['error']}")

    # 8. Share file with Bob
    r = client.post("/sharing/share", headers=alice_headers, json={"file_id": file_id, "recipient_username": bob_name})
    assert r.status_code == 200, r.text
    share_data = r.json()
    share_id = share_data["id"]
    assert "rk" in share_data and share_data["rk"] is not None
    assert share_data["filename"] == filename
    print(f"[OK] POST /sharing/share -> rk generated: {share_data['rk'][:16]}...")

    # 9. Bob queries GET /sharing/shared-with-me
    r = client.get("/sharing/shared-with-me", headers=bob_headers)
    assert r.status_code == 200
    bob_shares = r.json()
    assert any(s["id"] == share_id and s["rk"] == share_data["rk"] for s in bob_shares)
    print(f"[OK] GET /sharing/shared-with-me -> contains share with rk and filename")

    # 10. GET /sharing/download/{share_id}/raw
    r = client.get(f"/sharing/download/{share_id}/raw", headers=bob_headers)
    assert r.status_code == 200
    assert r.content == raw_ciphertext
    assert "attachment; filename=\"memo.txt.enc\"" in r.headers.get("Content-Disposition", "")
    print(f"[OK] GET /sharing/download/{share_id}/raw -> exact matching raw ciphertext attachment downloaded")

    # 11. GET /sharing/download/{share_id}/trace
    r = client.get(f"/sharing/download/{share_id}/trace", headers=bob_headers)
    assert r.status_code == 200
    trace = r.json()
    assert trace["c1"] == file_data["enc_key_c1"]
    assert trace["c2"] == file_data["enc_key_c2"]
    assert trace["rk"] == share_data["rk"]
    assert "c1_prime" in trace and "c2_prime" in trace and "recovered_aes_key_int" in trace
    print(f"[OK] GET /sharing/download/{share_id}/trace -> valid BBS98 math trace returned")

    # 12. GET /sharing/download/{share_id}/plaintext (with Bob's real key)
    r = client.get(f"/sharing/download/{share_id}/plaintext", headers=bob_headers)
    assert r.status_code == 200
    shared_pt = r.json()
    assert shared_pt["is_text"] is True
    assert shared_pt["text"] == file_bytes.decode("utf-8")
    assert shared_pt["error"] is None
    print(f"[OK] GET /sharing/download/{share_id}/plaintext -> Bob decrypted via PRE successfully")

    # 13. GET /sharing/download/{share_id}/plaintext with wrong key (Alice's key instead of Bob's)
    r = client.get(f"/sharing/download/{share_id}/plaintext?private_key={alice_me['elg_private']}", headers=bob_headers)
    assert r.status_code == 200
    wrong_pt = r.json()
    assert wrong_pt["is_text"] is False
    assert wrong_pt["text"] is None
    assert wrong_pt["error"] is not None
    assert "Integrity check failed / AES authentication tag mismatch" in wrong_pt["error"]
    print(f"[OK] GET /sharing/download/{share_id}/plaintext with wrong key -> rejected with: {wrong_pt['error']}")

    # 14. GET /sharing/download/{share_id} standard download
    r = client.get(f"/sharing/download/{share_id}", headers=bob_headers)
    assert r.status_code == 200
    assert r.content == file_bytes
    print(f"[OK] GET /sharing/download/{share_id} standard download -> identical plaintext bytes recovered")

    print("\n>>> ALL CRYPTO VISIBILITY ENDPOINTS VERIFIED SUCCESSFULLY! <<<")

if __name__ == "__main__":
    test_full_crypto_visibility_suite()
