import io
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_crypto_inspector_end_to_end():
    # 1. Sign up & Login Alice
    client.post("/auth/signup", json={"username": "alice_unit", "password": "password123"})
    r = client.post("/auth/login", data={"username": "alice_unit", "password": "password123"})
    assert r.status_code == 200, r.text
    alice_token = r.json()["access_token"]
    alice_headers = {"Authorization": f"Bearer {alice_token}"}

    # 2. GET /auth/me for Alice
    r = client.get("/auth/me", headers=alice_headers)
    assert r.status_code == 200
    alice_me = r.json()
    assert "elg_public" in alice_me and "elg_private" in alice_me
    assert len(alice_me["elg_public"]) > 0 and len(alice_me["elg_private"]) > 0

    # 3. Sign up & Login Bob
    client.post("/auth/signup", json={"username": "bob_unit", "password": "password123"})
    r = client.post("/auth/login", data={"username": "bob_unit", "password": "password123"})
    assert r.status_code == 200
    bob_token = r.json()["access_token"]
    bob_headers = {"Authorization": f"Bearer {bob_token}"}

    r = client.get("/auth/me", headers=bob_headers)
    assert r.status_code == 200
    bob_me = r.json()
    assert "elg_public" in bob_me and "elg_private" in bob_me

    # 4. Upload file as Alice
    file_bytes = b"Top secret proxy re-encryption document for Bob."
    files = {"upload": ("secret_doc.txt", io.BytesIO(file_bytes), "text/plain")}
    r = client.post("/files/upload", headers=alice_headers, files=files)
    assert r.status_code == 200
    uploaded = r.json()
    file_id = uploaded["id"]
    assert "enc_key_c1" in uploaded and "enc_key_c2" in uploaded
    assert uploaded["enc_key_c1"] is not None and uploaded["enc_key_c2"] is not None

    # 5. Preview own file as Alice
    r = client.get(f"/files/{file_id}/preview", headers=alice_headers)
    assert r.status_code == 200
    preview = r.json()
    assert preview["is_text"] is True
    assert preview["text_preview"] == file_bytes.decode("utf-8")
    assert preview["size_bytes"] == len(file_bytes)

    # 6. Manual decrypt own file as Alice with valid key
    r = client.post(
        f"/files/{file_id}/manual-decrypt",
        headers=alice_headers,
        json={"private_key": alice_me["elg_private"]},
    )
    assert r.status_code == 200
    res = r.json()
    assert res["success"] is True
    assert res["preview"]["text_preview"] == file_bytes.decode("utf-8")

    # 7. Manual decrypt own file with wrong key (should return success: False gracefully)
    wrong_key = str(int(alice_me["elg_private"]) + 1)
    r = client.post(
        f"/files/{file_id}/manual-decrypt",
        headers=alice_headers,
        json={"private_key": wrong_key},
    )
    assert r.status_code == 200
    res = r.json()
    assert res["success"] is False
    assert res["error"] is not None

    # 8. Share file with Bob
    r = client.post(
        "/sharing/share",
        headers=alice_headers,
        json={"file_id": file_id, "recipient_username": "bob_unit"},
    )
    assert r.status_code == 200
    share_data = r.json()
    share_id = share_data["id"]
    assert "rk" in share_data and share_data["rk"] is not None

    # 9. Bob queries shared-with-me
    r = client.get("/sharing/shared-with-me", headers=bob_headers)
    assert r.status_code == 200
    shares = r.json()
    bob_share = next((s for s in shares if s["id"] == share_id), None)
    assert bob_share is not None
    assert bob_share["rk"] == share_data["rk"]

    # 10. PRE Trace Pipeline endpoint
    r = client.get(f"/sharing/download/{share_id}/trace", headers=bob_headers)
    assert r.status_code == 200
    trace = r.json()
    assert trace["c1"] == uploaded["enc_key_c1"]
    assert trace["c2"] == uploaded["enc_key_c2"]
    assert trace["rk"] == share_data["rk"]
    assert "c1_prime" in trace and "c2_prime" in trace and "recovered_aes_key_int" in trace

    # 11. Recipient preview
    r = client.get(f"/sharing/download/{share_id}/preview", headers=bob_headers)
    assert r.status_code == 200
    shared_preview = r.json()
    assert shared_preview["is_text"] is True
    assert shared_preview["text_preview"] == file_bytes.decode("utf-8")

    # 12. Recipient manual decrypt with Bob's authentic key
    r = client.post(
        f"/sharing/download/{share_id}/manual-decrypt",
        headers=bob_headers,
        json={"private_key": bob_me["elg_private"]},
    )
    assert r.status_code == 200
    res = r.json()
    assert res["success"] is True
    assert res["preview"]["text_preview"] == file_bytes.decode("utf-8")
    assert res["trace"] is not None

    # 13. Recipient manual decrypt with wrong key (Alice's key instead of Bob's)
    r = client.post(
        f"/sharing/download/{share_id}/manual-decrypt",
        headers=bob_headers,
        json={"private_key": alice_me["elg_private"]},
    )
    assert r.status_code == 200
    res = r.json()
    assert res["success"] is False
    assert res["error"] is not None

    # 14. Download shared file binary
    r = client.get(f"/sharing/download/{share_id}", headers=bob_headers)
    assert r.status_code == 200
    assert r.content == file_bytes
    print("\nALL IN-PROCESS TESTS PASSED!")

if __name__ == "__main__":
    test_crypto_inspector_end_to_end()

