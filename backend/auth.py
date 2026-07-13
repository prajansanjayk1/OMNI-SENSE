import jwt
import datetime
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from typing import Optional, List
from database import get_db_connection

SECRET_KEY = "OMNISENSE_SECRET_SUPER_KEY_12345"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")

def create_access_token(data: dict, expires_delta: Optional[datetime.timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.datetime.utcnow() + expires_delta
    else:
        expire = datetime.datetime.utcnow() + datetime.timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def get_current_user(token: str = Depends(oauth2_scheme)) -> dict:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        role: str = payload.get("role")
        name: str = payload.get("name")
        token_version: int = payload.get("token_version")
        
        if email is None or role is None or token_version is None:
            raise credentials_exception
            
        # Verify token version, status, and details in database
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT name, role, token_version, is_verified, status, branch_id, department, profile_picture FROM Users WHERE email = ?", (email,))
        user_row = cursor.fetchone()
        conn.close()
        
        if user_row is None:
            raise credentials_exception
            
        db_token_version = user_row["token_version"]
        is_verified = user_row["is_verified"]
        user_status = user_row["status"]
        
        if token_version != db_token_version:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Session has expired or logged out from all devices",
                headers={"WWW-Authenticate": "Bearer"},
            )
            
        if user_status == "Suspended":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Your account has been suspended. Please contact support."
            )
            
        return {
            "email": email,
            "role": user_row["role"],
            "name": user_row["name"],
            "token_version": token_version,
            "is_verified": is_verified,
            "status": user_status,
            "branch_id": user_row["branch_id"],
            "department": user_row["department"],
            "profile_picture": user_row["profile_picture"]
        }
    except jwt.PyJWTError:
        raise credentials_exception

class RoleChecker:
    def __init__(self, allowed_roles: List[str]):
        self.allowed_roles = allowed_roles

    def __call__(self, user: dict = Depends(get_current_user)):
        if user["role"] not in self.allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied for role: {user['role']}. Required: {self.allowed_roles}"
            )
        return user

def check_permission(permission_name: str):
    def dependency(user: dict = Depends(get_current_user)):
        # Super Admin has full access to everything
        if user["role"] == "Super Admin":
            return user
            
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT p.name FROM Permissions p
            JOIN role_permissions rp ON p.id = rp.permission_id
            JOIN Roles r ON rp.role_id = r.id
            WHERE r.name = ? AND p.name = ?
        """, (user["role"], permission_name))
        
        perm = cursor.fetchone()
        conn.close()
        
        if not perm:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. User role '{user['role']}' does not have permission: '{permission_name}'"
            )
        return user
    return dependency
