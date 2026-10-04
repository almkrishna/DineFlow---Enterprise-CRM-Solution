from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from app.config import settings
from datetime import datetime, timedelta
from jose import jwt, JWTError

router = APIRouter(prefix="/auth", tags=["Auth"])

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=1440)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm="HS256")

@router.post("/login")
def login(form_data: OAuth2PasswordRequestForm = Depends()):
    if form_data.username == settings.ADMIN_USERNAME and form_data.password == settings.ADMIN_PASSWORD:
        token = create_access_token(data={"sub": form_data.username, "role": "admin"})
        return {"access_token": token, "token_type": "bearer"}
    raise HTTPException(status_code=400, detail="Incorrect username or password")

@router.post("/kitchen/login")
def kitchen_login(form_data: OAuth2PasswordRequestForm = Depends()):
    if form_data.username == settings.KITCHEN_USERNAME and form_data.password == settings.KITCHEN_PASSWORD:
        token = create_access_token(data={"sub": form_data.username, "role": "chef"})
        return {"access_token": token, "token_type": "bearer"}
    raise HTTPException(status_code=400, detail="Incorrect kitchen credentials")

def get_current_admin(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        username: str = payload.get("sub")
        if username != settings.ADMIN_USERNAME or payload.get("role") != "admin":
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    return username

def get_current_kitchen_user(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        role = payload.get("role")
        if role not in {"admin", "chef"}:
            raise HTTPException(status_code=401, detail="Invalid token")
        return payload.get("sub")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
