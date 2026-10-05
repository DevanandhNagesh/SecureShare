from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlmodel import Session, select

from app.database import get_session
from app.models import User, AuditLog
from app.schemas import UserCreate, UserOut, UserMeOut, Token
from app.utils.security import hash_password, verify_password, create_access_token, get_current_user
from app.crypto import pre_crypto as pc

router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("/me", response_model=UserMeOut)
def get_me(current_user: User = Depends(get_current_user)):
    return UserMeOut(
        id=current_user.id,
        username=current_user.username,
        elg_public=current_user.elg_public,
        elg_private=current_user.elg_private,
    )


@router.post("/signup", response_model=UserOut)
def signup(payload: UserCreate, session: Session = Depends(get_session)):
    existing = session.exec(select(User).where(User.username == payload.username)).first()
    if existing:
        raise HTTPException(status_code=400, detail="Username already taken")

    # Generate this user's ElGamal keypair right at signup.
    private_key, public_key = pc.keygen()

    user = User(
        username=payload.username,
        hashed_password=hash_password(payload.password),
        elg_public=str(public_key),
        elg_private=str(private_key),
    )
    session.add(user)
    session.commit()
    session.refresh(user)

    session.add(AuditLog(actor_id=user.id, action="USER_SIGNUP",
                          detail=f"New user '{user.username}' registered, ElGamal keypair generated."))
    session.commit()

    return UserOut(id=user.id, username=user.username, elg_public=user.elg_public)


@router.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), session: Session = Depends(get_session)):
    user = session.exec(select(User).where(User.username == form_data.username)).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect username or password")

    token = create_access_token({"sub": user.username})
    return Token(access_token=token)
