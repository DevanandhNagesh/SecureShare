from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import init_db
from app.routers import auth, files, sharing

app = FastAPI(title="SecureShare — Proxy Re-Encryption File Sharing")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
    ],
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    init_db()


app.include_router(auth.router)
app.include_router(files.router)
app.include_router(sharing.router)


@app.get("/")
def root():
    return {"status": "SecureShare backend running", "algorithm": "ElGamal-based Proxy Re-Encryption (BBS98)"}
