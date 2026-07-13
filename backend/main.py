"""
Project Omni-Sense - Tiered Spatial Credit Intelligence Early Warning System
FastAPI Server with REST Endpoints and WebSocket Pipelines
"""

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from fastapi.encoders import jsonable_encoder
from typing import Dict, Any, List, Optional
from pydantic import BaseModel
import json
import asyncio
from datetime import datetime, timedelta
import sys
import os
import httpx
import random

# Fix Windows charmap encoding issues for console output
sys.stdout.reconfigure(encoding='utf-8')


from schemas import (
    AnalyzeRequest,
    AnalyzeResponse,
    RestructureRequest,
    RestructuringSimulation,
    StreamEvent,
    WebSocketMessage,
    TierLevel,
    AgentLogEntry,
    SHAPContribution,
    ChatRequest,
    ChatResponse,
)
from engine import engine_instance, AgentSwarmEngine
from database import init_db, log_audit, save_analysis, get_db_connection, verify_password, hash_password
from auth import create_access_token, get_current_user, RoleChecker, check_permission
from schemas import (
    UserLogin, TokenResponse, AuditLogEntry, UserRegister,
    ForgotPasswordRequest, ResetPasswordRequest, EmailVerificationRequest,
    SupportTicketCreate, LoanApplicationCreate,
    NotificationResponse, NotificationCreate, LoginHistoryResponse,
    UserAdminUpdate, UserResponse, BranchCreate, BranchResponse,
    DepartmentCreate, DepartmentResponse, RefreshRequest
)
from fastapi import Depends



# Initialize FastAPI application
app = FastAPI(
    title="Project Omni-Sense API",
    description="Tiered Spatial Credit Intelligence Early Warning System",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configure CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:8000", "http://127.0.0.1:8000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# WebSocket connection manager
class ConnectionManager:
    """Manages active WebSocket connections for real-time streaming."""
    
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}
    
    async def connect(self, websocket: WebSocket, client_id: str):
        """Accept a WebSocket connection and register it."""
        await websocket.accept()
        if client_id not in self.active_connections:
            self.active_connections[client_id] = []
        self.active_connections[client_id].append(websocket)
        print(f"[WebSocket] Client {client_id} connected. Total connections: {len(self.active_connections[client_id])}")
    
    def disconnect(self, websocket: WebSocket, client_id: str):
        """Remove a WebSocket connection."""
        if client_id in self.active_connections and websocket in self.active_connections[client_id]:
            self.active_connections[client_id].remove(websocket)
            print(f"[WebSocket] Client {client_id} disconnected. Remaining: {len(self.active_connections[client_id])}")
    
    async def send_personal_message(self, message: dict, websocket: WebSocket):
        """Send a message to a specific WebSocket connection."""
        try:
            await websocket.send_json(message)
        except Exception as e:
            print(f"[WebSocket] Error sending message: {e}")
    
    async def broadcast_to_client(self, message: dict, client_id: str):
        """Broadcast a message to all connections for a specific client."""
        if client_id in self.active_connections:
            for connection in self.active_connections[client_id]:
                try:
                    await connection.send_json(message)
                except Exception as e:
                    print(f"[WebSocket] Error broadcasting to {client_id}: {e}")
    
    async def broadcast_to_all(self, message: dict):
        """Broadcast a message to all connected clients."""
        for client_id, connections in self.active_connections.items():
            for connection in connections:
                try:
                    await connection.send_json(message)
                except Exception as e:
                    print(f"[WebSocket] Error broadcasting to {client_id}: {e}")


# Global connection manager instance
manager = ConnectionManager()

# Voice synthesis state for handling interruptions
voice_state = {
    "is_speaking": False,
    "current_audio_buffer": [],
    "interruption_requested": False,
    "active_synthesis_task": None
}


class MFAVerifyRequest(BaseModel):
    email: str
    mfa_token: str
    otp: str

@app.post("/api/auth/login")
async def login(credentials: UserLogin):
    """Log in using email and retrieve JWT access token or MFA challenge."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM Users WHERE email = ?", (credentials.email,))
    user = cursor.fetchone()
    
    if not user:
        conn.close()
        log_audit(credentials.email, "login", "Failed login attempt (user not found)", status="failed")
        conn2 = get_db_connection()
        cursor2 = conn2.cursor()
        cursor2.execute(
            "INSERT INTO LoginHistory (username, timestamp, status, failure_reason) VALUES (?, ?, 'failed', 'User not found')",
            (credentials.email, datetime.utcnow().isoformat())
        )
        conn2.commit()
        conn2.close()
        raise HTTPException(status_code=401, detail="Invalid email or password")
        
    if not verify_password(user["password"], credentials.password):
        cursor.execute(
            "INSERT INTO LoginHistory (user_id, username, timestamp, status, failure_reason) VALUES (?, ?, ?, 'failed', 'Invalid password')",
            (user["id"], user["email"], datetime.utcnow().isoformat())
        )
        conn.commit()
        conn.close()
        log_audit(credentials.email, "login", "Failed login attempt (invalid password)", status="failed")
        raise HTTPException(status_code=401, detail="Invalid email or password")
        
    if not user["is_verified"]:
        cursor.execute(
            "INSERT INTO LoginHistory (user_id, username, timestamp, status, failure_reason) VALUES (?, ?, ?, 'failed', 'Email not verified')",
            (user["id"], user["email"], datetime.utcnow().isoformat())
        )
        conn.commit()
        conn.close()
        raise HTTPException(status_code=403, detail="Email address has not been verified yet")
        
    if user["status"] == "Suspended":
        cursor.execute(
            "INSERT INTO LoginHistory (user_id, username, timestamp, status, failure_reason) VALUES (?, ?, ?, 'failed', 'Account suspended')",
            (user["id"], user["email"], datetime.utcnow().isoformat())
        )
        conn.commit()
        conn.close()
        raise HTTPException(status_code=403, detail="Account is suspended. Please contact support.")
        
    conn.close()
    
    # Generate temporary MFA pending token
    mfa_token = create_access_token(
        data={
            "sub": user["email"],
            "mfa_pending": True
        },
        expires_delta=timedelta(minutes=5)
    )
    
    log_audit(user["email"], "login_challenge", "MFA OTP challenge issued", status="success")
    return {
        "status": "mfa_required",
        "mfa_token": mfa_token,
        "email": user["email"]
    }

@app.post("/api/auth/verify-mfa")
async def verify_mfa(req: MFAVerifyRequest):
    """Verify MFA OTP and return final JWT tokens."""
    try:
        from auth import SECRET_KEY, ALGORITHM
        import jwt
        payload = jwt.decode(req.mfa_token, SECRET_KEY, algorithms=[ALGORITHM])
        email = payload.get("sub")
        mfa_pending = payload.get("mfa_pending")
        if email != req.email or not mfa_pending:
            raise HTTPException(status_code=401, detail="Invalid MFA token")
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"MFA validation failed: {str(e)}")
        
    # Accept mock OTP code '123456' for sandbox testing
    if req.otp != "123456":
        log_audit(req.email, "verify_mfa", "Failed MFA OTP verification (invalid code)", status="failed")
        raise HTTPException(status_code=401, detail="Invalid OTP code. Use 123456.")
        
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM Users WHERE email = ?", (req.email,))
    user = cursor.fetchone()
    
    if not user:
        conn.close()
        raise HTTPException(status_code=404, detail="User not found")
        
    # Successful login
    last_login_time = datetime.utcnow().isoformat()
    cursor.execute(
        "UPDATE Users SET last_login = ? WHERE id = ?",
        (last_login_time, user["id"])
    )
    cursor.execute(
        "INSERT INTO LoginHistory (user_id, username, timestamp, status, ip_address, browser) VALUES (?, ?, ?, 'success', '127.0.0.1', 'Chrome/FintechClient')",
        (user["id"], user["email"], last_login_time)
    )
    conn.commit()
    conn.close()
    
    expires = timedelta(minutes=30)
    access_token = create_access_token(
        data={
            "sub": user["email"],
            "role": user["role"],
            "name": user["name"],
            "token_version": user["token_version"]
        },
        expires_delta=expires
    )
    refresh_token = create_access_token(
        data={
            "sub": user["email"],
            "token_version": user["token_version"],
            "is_refresh": True
        },
        expires_delta=timedelta(days=30)
    )
    
    log_audit(user["email"], "verify_mfa", "Successful MFA login authentication completed", status="success")
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "role": user["role"],
        "email": user["email"],
        "name": user["name"]
    }

@app.post("/api/auth/refresh")
async def refresh_token_endpoint(req: RefreshRequest):
    """
    Refresh access token using a valid refresh token.
    """
    credentials_exception = HTTPException(
        status_code=401,
        detail="Could not validate refresh token",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        from auth import SECRET_KEY, ALGORITHM
        import jwt
        payload = jwt.decode(req.refresh_token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        is_refresh: bool = payload.get("is_refresh", False)
        token_version: int = payload.get("token_version")
        
        if email is None or not is_refresh or token_version is None:
            raise credentials_exception
            
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT token_version, role, name, is_verified, status FROM Users WHERE email = ?", (email,))
        user = cursor.fetchone()
        conn.close()
        
        if user is None or user["token_version"] != token_version:
            raise credentials_exception
            
        if user["status"] == "Suspended":
            raise HTTPException(status_code=403, detail="Account is suspended.")
            
        # Generate new access token
        access_token = create_access_token(
            data={
                "sub": email,
                "role": user["role"],
                "name": user["name"],
                "token_version": token_version
            },
            expires_delta=timedelta(minutes=30)
        )
        return {
            "access_token": access_token,
            "token_type": "bearer"
        }
    except jwt.PyJWTError:
        raise credentials_exception


@app.post("/api/auth/register")
async def register(req: UserRegister):
    """Register a new user (default unverified)."""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        hashed = hash_password(req.password)
        # Generate simple verification token
        import uuid
        token = str(uuid.uuid4())
        # Default avatar based on email
        profile_img = f"https://api.dicebear.com/7.x/bottts/svg?seed={req.name}"
        cursor.execute(
            "INSERT INTO Users (email, password, role, name, branch_id, is_verified, verification_token, profile_picture) VALUES (?, ?, ?, ?, ?, 0, ?, ?)",
            (req.email, hashed, req.role, req.name, req.branch_id, token, profile_img)
        )
        user_id = cursor.lastrowid
        
        # If Customer, also create customer profile
        if req.role == "Customer":
            cursor.execute(
                "INSERT INTO customers (user_id, income, savings, expenses, credit_score, debt, branch_id) VALUES (?, 100000, 300000, 35000, 750, 0, ?)",
                (user_id, req.branch_id or "Mumbai-North")
            )
            
        conn.commit()
        log_audit(req.email, "register", f"User registered successfully. Token: {token}", status="success")
        return {"status": "success", "message": "Registration successful. Please verify email.", "verification_token": token}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=400, detail=f"Email already exists or invalid payload: {e}")
    finally:
        conn.close()

@app.post("/api/auth/verify-email")
async def verify_email(req: EmailVerificationRequest):
    """Verify email address with verification token."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM Users WHERE verification_token = ?", (req.token,))
    user = cursor.fetchone()
    if not user:
        conn.close()
        raise HTTPException(status_code=400, detail="Invalid verification token")
        
    cursor.execute("UPDATE Users SET is_verified = 1, verification_token = NULL WHERE id = ?", (user["id"],))
    conn.commit()
    conn.close()
    log_audit(user["email"], "verify_email", "Email successfully verified", status="success")
    return {"status": "success", "message": "Email verified successfully."}

@app.post("/api/auth/forgot-password")
async def forgot_password(req: ForgotPasswordRequest):
    """Generate reset token for password recovery."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM Users WHERE email = ?", (req.email,))
    user = cursor.fetchone()
    if not user:
        conn.close()
        # To prevent user enumeration, return success even if user not found
        return {"status": "success", "message": "If email exists, a reset link has been generated."}
        
    import uuid
    token = str(uuid.uuid4())
    cursor.execute("UPDATE Users SET reset_token = ? WHERE id = ?", (token, user["id"]))
    conn.commit()
    conn.close()
    log_audit(req.email, "forgot_password", f"Password reset requested. Token: {token}", status="success")
    return {"status": "success", "message": "Reset token generated.", "reset_token": token}

@app.post("/api/auth/reset-password")
async def reset_password(req: ResetPasswordRequest):
    """Reset password using recovery token."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM Users WHERE reset_token = ?", (req.token,))
    user = cursor.fetchone()
    if not user:
        conn.close()
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
        
    hashed = hash_password(req.new_password)
    cursor.execute("UPDATE Users SET password = ?, reset_token = NULL WHERE id = ?", (hashed, user["id"]))
    conn.commit()
    conn.close()
    log_audit(user["email"], "reset_password", "Password reset successfully completed", status="success")
    return {"status": "success", "message": "Password reset successfully."}

@app.post("/api/auth/logout")
async def logout(current_user: dict = Depends(get_current_user)):
    """Log out current session."""
    log_audit(current_user["email"], "logout", "Successful logout", status="success")
    return {"status": "success", "message": "Logout successful"}

@app.post("/api/auth/logout-all-devices")
async def logout_all_devices(current_user: dict = Depends(get_current_user)):
    """Log out all active devices by incrementing the stored token version."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE Users SET token_version = token_version + 1 WHERE email = ?", (current_user["email"],))
    conn.commit()
    conn.close()
    log_audit(current_user["email"], "logout_all_devices", "Forced logout from all devices", status="success")
    return {"status": "success", "message": "Logged out from all devices successfully."}

@app.get("/api/auth/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    """Retrieve current user details."""
    return current_user

@app.get("/api/auth/audit_logs", response_model=List[AuditLogEntry])
async def get_logs(current_user: dict = Depends(check_permission("view_audit_logs"))):
    """Retrieve all system audit logs (Admin only)."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM audit_logs ORDER BY timestamp DESC")
    logs = cursor.fetchall()
    conn.close()
    return [dict(log) for log in logs]

# User Management for Super Admin
@app.get("/api/admin/users", response_model=List[UserResponse])
async def list_users(current_user: dict = Depends(check_permission("manage_users"))):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, email, role, name, branch_id, department, status, last_login, profile_picture FROM Users")
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

@app.put("/api/admin/users/{user_id}", response_model=UserResponse)
async def update_user(user_id: int, updates: UserAdminUpdate, current_user: dict = Depends(check_permission("manage_users"))):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM Users WHERE id = ?", (user_id,))
    user = cursor.fetchone()
    if not user:
        conn.close()
        raise HTTPException(status_code=404, detail="User not found")
        
    fields = []
    values = []
    if updates.role is not None:
        fields.append("role = ?")
        values.append(updates.role)
    if updates.status is not None:
        fields.append("status = ?")
        values.append(updates.status)
        if updates.status == "Suspended":
            fields.append("token_version = token_version + 1")
    if updates.branch_id is not None:
        fields.append("branch_id = ?")
        values.append(updates.branch_id)
    if updates.department is not None:
        fields.append("department = ?")
        values.append(updates.department)
        
    if not fields:
        conn.close()
        raise HTTPException(status_code=400, detail="No fields to update")
        
    values.append(user_id)
    query = f"UPDATE Users SET {', '.join(fields)} WHERE id = ?"
    cursor.execute(query, tuple(values))
    conn.commit()
    
    cursor.execute("SELECT id, email, role, name, branch_id, department, status, last_login, profile_picture FROM Users WHERE id = ?", (user_id,))
    updated_user = cursor.fetchone()
    conn.close()
    
    log_audit(
        current_user["email"], 
        "update_user", 
        f"Updated user ID {user_id}: role={updates.role}, status={updates.status}, branch={updates.branch_id}", 
        status="success"
    )
    
    return dict(updated_user)

# Branch Management
@app.get("/api/admin/branches", response_model=List[BranchResponse])
async def list_branches(current_user: dict = Depends(get_current_user)):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM Branches")
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

@app.post("/api/admin/branches", response_model=BranchResponse)
async def create_branch(branch: BranchCreate, current_user: dict = Depends(check_permission("manage_branches"))):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "INSERT INTO Branches (id, name, location) VALUES (?, ?, ?)",
            (branch.id, branch.name, branch.location)
        )
        conn.commit()
        log_audit(current_user["email"], "create_branch", f"Created branch: {branch.name} ({branch.id})", status="success")
        return {"id": branch.id, "name": branch.name, "location": branch.location}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=400, detail=f"Branch already exists or invalid data: {e}")
    finally:
        conn.close()

# Department Management
@app.get("/api/admin/departments", response_model=List[DepartmentResponse])
async def list_departments(current_user: dict = Depends(get_current_user)):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM Departments")
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

@app.post("/api/admin/departments", response_model=DepartmentResponse)
async def create_department(dept: DepartmentCreate, current_user: dict = Depends(check_permission("manage_branches"))):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "INSERT INTO Departments (name, branch_id) VALUES (?, ?)",
            (dept.name, dept.branch_id)
        )
        conn.commit()
        dept_id = cursor.lastrowid
        log_audit(current_user["email"], "create_department", f"Created department: {dept.name} in branch {dept.branch_id}", status="success")
        return {"id": dept_id, "name": dept.name, "branch_id": dept.branch_id}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=400, detail=f"Failed to create department: {e}")
    finally:
        conn.close()

# Login History
@app.get("/api/admin/login-history", response_model=List[LoginHistoryResponse])
async def get_login_history(current_user: dict = Depends(check_permission("view_audit_logs"))):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM LoginHistory ORDER BY timestamp DESC LIMIT 100")
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

# Support Customer Search & Password Reset
@app.get("/api/support/customers")
async def support_search_customers(query: Optional[str] = None, current_user: dict = Depends(check_permission("view_support_tickets"))):
    conn = get_db_connection()
    cursor = conn.cursor()
    if query:
        search = f"%{query}%"
        cursor.execute("""
            SELECT u.id as user_id, u.name, u.email, u.status, c.id as customer_id, c.income, c.savings, c.expenses, c.credit_score, c.debt, c.branch_id
            FROM Users u
            LEFT JOIN customers c ON u.id = c.user_id
            WHERE u.role = 'Customer' AND (u.name LIKE ? OR u.email LIKE ?)
        """, (search, search))
    else:
        cursor.execute("""
            SELECT u.id as user_id, u.name, u.email, u.status, c.id as customer_id, c.income, c.savings, c.expenses, c.credit_score, c.debt, c.branch_id
            FROM Users u
            LEFT JOIN customers c ON u.id = c.user_id
            WHERE u.role = 'Customer'
        """)
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

@app.post("/api/support/reset-password")
async def support_reset_password(req: ForgotPasswordRequest, current_user: dict = Depends(check_permission("view_support_tickets"))):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM Users WHERE email = ? AND role = 'Customer'", (req.email,))
    user = cursor.fetchone()
    if not user:
        conn.close()
        raise HTTPException(status_code=404, detail="Customer not found")
        
    import uuid
    token = str(uuid.uuid4())
    cursor.execute("UPDATE Users SET reset_token = ? WHERE id = ?", (token, user["id"]))
    conn.commit()
    conn.close()
    log_audit(current_user["email"], "support_reset_password", f"Reset token generated for customer {req.email}. Token: {token}", status="success")
    return {"status": "success", "message": "Reset token generated for customer.", "reset_token": token}

# Notifications System
@app.get("/api/notifications", response_model=List[NotificationResponse])
async def get_notifications(current_user: dict = Depends(get_current_user)):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM Users WHERE email = ?", (current_user["email"],))
    user_row = cursor.fetchone()
    if not user_row:
        conn.close()
        return []
    cursor.execute("SELECT * FROM Notifications WHERE user_id = ? ORDER BY created_at DESC", (user_row["id"],))
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

@app.put("/api/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: int, current_user: dict = Depends(get_current_user)):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM Users WHERE email = ?", (current_user["email"],))
    user_row = cursor.fetchone()
    if not user_row:
        conn.close()
        raise HTTPException(status_code=404, detail="User not found")
        
    cursor.execute("UPDATE Notifications SET is_read = 1 WHERE id = ? AND user_id = ?", (notification_id, user_row["id"]))
    conn.commit()
    conn.close()
    return {"status": "success"}

@app.post("/api/notifications", response_model=NotificationResponse)
async def create_notification(noti: NotificationCreate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["Super Admin", "Branch Manager"]:
        raise HTTPException(status_code=403, detail="Unauthorized to send notifications")
        
    conn = get_db_connection()
    cursor = conn.cursor()
    
    user_id = noti.user_id
    if noti.email:
        cursor.execute("SELECT id FROM Users WHERE email = ?", (noti.email,))
        user_row = cursor.fetchone()
        if user_row:
            user_id = user_row["id"]
        else:
            conn.close()
            raise HTTPException(status_code=404, detail=f"User with email {noti.email} not found")
            
    if not user_id:
        conn.close()
        raise HTTPException(status_code=400, detail="Must provide user_id or email")
        
    created_at = datetime.utcnow().isoformat()
    cursor.execute(
        "INSERT INTO Notifications (user_id, title, message, is_read, created_at, type) VALUES (?, ?, ?, 0, ?, ?)",
        (user_id, noti.title, noti.message, created_at, noti.type)
    )
    conn.commit()
    noti_id = cursor.lastrowid
    
    cursor.execute("SELECT * FROM Notifications WHERE id = ?", (noti_id,))
    row = cursor.fetchone()
    conn.close()
    return dict(row)

@app.get("/")
async def root():
    """Root endpoint with API information."""
    return {
        "name": "Project Omni-Sense",
        "version": "1.0.0",
        "status": "operational",
        "description": "Tiered Spatial Credit Intelligence Early Warning System"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "active_connections": sum(len(conns) for conns in manager.active_connections.values())
    }


@app.post("/api/analyze", response_model=AnalyzeResponse)
async def analyze_corporate(request: AnalyzeRequest, current_user: dict = Depends(check_permission("run_analysis"))):
    """
    Analyze a corporate entity using the tri-agent autonomous swarm.
    
    This endpoint triggers the complete analysis cascade:
    - Agent 1 (Auditor): E-Courts, GST, Smart-meter data
    - Agent 2 (Chaser): Fastag/NETC mobility logistics
    - Agent 3 (Eye): SAR satellite imagery analysis
    """
    try:
        print(f"[API] Analysis requested for {request.corporate_id} by user {current_user['email']}")
        
        # Execute the analysis using the engine
        start_time = datetime.utcnow()
        state = await engine_instance.execute_analysis(
            corporate_id=request.corporate_id,
            corporate_name=request.corporate_name
        )
        end_time = datetime.utcnow()
        processing_time = (end_time - start_time).total_seconds() * 1000
        
        # Convert agent logs to dict format
        agent_logs_dict = [
            {
                "agent_type": log.agent_type.value,
                "timestamp": log.timestamp.isoformat(),
                "message": log.message,
                "data_payload": log.data_payload,
                "confidence_score": log.confidence_score,
                "execution_time_ms": log.execution_time_ms
            }
            for log in state.agent_logs
        ]
        
        # Convert SHAP contributions to dict format
        shap_contributions_dict = [
            {
                "feature_name": contrib.feature_name,
                "contribution_percentage": contrib.contribution_percentage,
                "direction": contrib.direction,
                "baseline_value": contrib.baseline_value,
                "current_value": contrib.current_value
            }
            for contrib in state.shap_contributions
        ]
        
        # Build response
        response = AnalyzeResponse(
            corporate_id=state.corporate_id,
            status="success",
            current_tier=state.current_tier,
            default_probability=state.default_probability,
            anomaly_detected=state.is_anomaly_detected,
            agent_logs=agent_logs_dict,  # Type adjustment for response
            shap_contributions=shap_contributions_dict,  # Type adjustment for response
            message=f"Analysis complete. Current tier: {state.current_tier.value}, Default probability: {state.default_probability:.2%}",
            processing_time_ms=processing_time
        )
        
        # Broadcast completion event via WebSocket
        completion_event = StreamEvent(
            event_type="analysis_complete",
            corporate_id=state.corporate_id,
            data={
                "tier": state.current_tier.value,
                "default_probability": state.default_probability,
                "anomaly_detected": state.is_anomaly_detected,
                "agent_logs": agent_logs_dict,
                "shap_contributions": shap_contributions_dict
            },
            tier=state.current_tier
        )
        
        await manager.broadcast_to_all({
            "message_type": "stream_event",
            "payload": jsonable_encoder(completion_event),
            "timestamp": datetime.utcnow().isoformat()
        })
        
        # Save to SQLite Database
        save_analysis(
            corporate_id=state.corporate_id,
            corporate_name=request.corporate_name or "Balaji Components Ltd",
            tier=state.current_tier.value,
            default_probability=state.default_probability,
            anomaly_detected=state.is_anomaly_detected,
            agent_logs=agent_logs_dict,
            shap_contributions=shap_contributions_dict
        )
        
        log_audit(
            username=current_user["email"],
            action="analyze",
            details=f"Ran analysis on corporate_id: {request.corporate_id}, tier result: {state.current_tier.value}",
            status="success"
        )
        
        return response
        
    except Exception as e:
        print(f"[API] Error in analyze endpoint: {e}")
        log_audit(
            username=current_user["email"],
            action="analyze",
            details=f"Failed analysis run on corporate_id: {request.corporate_id}. Error: {str(e)}",
            status="failed"
        )
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/restructure", response_model=RestructuringSimulation)
async def simulate_restructuring(request: RestructureRequest, current_user: dict = Depends(check_permission("restructure_loan"))):
    """
    Simulate dynamic loan restructuring based on physical velocity metrics.
    
    This endpoint calculates restructuring scenarios considering:
    - EMI adjustments
    - Tenure extensions
    - Moratorium periods
    - Interest rate reductions
    - Velocity-linked adjustments based on Fastag transit data
    """
    try:
        print(f"[API] Restructuring simulation requested for {request.corporate_id} by user {current_user['email']}")
        
        # Convert request to dict
        request_dict = {
            "current_outstanding": request.current_outstanding,
            "original_emi": request.original_emi,
            "original_tenure_months": request.original_tenure_months,
            "proposed_emi": request.proposed_emi,
            "proposed_tenure_months": request.proposed_tenure_months,
            "moratorium_months": request.moratorium_months,
            "interest_rate_reduction_bps": request.interest_rate_reduction_bps,
            "velocity_linked": request.velocity_linked
        }
        
        # Run simulation
        simulation = await engine_instance.simulate_restructuring(request_dict)
        
        # Broadcast update via WebSocket
        await manager.broadcast_to_all({
            "message_type": "state_update",
            "payload": {
                "corporate_id": simulation.corporate_id,
                "restructuring_simulation": jsonable_encoder(simulation),
                "timestamp": datetime.utcnow().isoformat()
            },
            "timestamp": datetime.utcnow().isoformat()
        })
        
        log_audit(
            username=current_user["email"],
            action="restructure",
            details=f"Simulated restructuring for {request.corporate_id}: Proposed EMI {request.proposed_emi}, Tenure {request.proposed_tenure_months} months, Moratorium {request.moratorium_months} months",
            status="success"
        )
        
        return simulation
        
    except Exception as e:
        print(f"[API] Error in restructure endpoint: {e}")
        log_audit(
            username=current_user["email"],
            action="restructure",
            details=f"Failed restructuring simulation for {request.corporate_id}. Error: {str(e)}",
            status="failed"
        )
        raise HTTPException(status_code=500, detail=str(e))


class ScenarioRequest(BaseModel):
    corporate_id: str
    inflation_shock: float
    interest_rate_shock: float
    fuel_shock: float

class KnowledgeGraphResponse(BaseModel):
    nodes: List[Dict[str, Any]]
    edges: List[Dict[str, Any]]

@app.post("/api/scenario-simulator")
async def run_scenario_simulator(req: ScenarioRequest, current_user: dict = Depends(get_current_user)):
    try:
        print(f"[API] Running Macro Scenario Simulator for {req.corporate_id}...")
        
        # 1. Fetch baseline analysis or run default analysis
        state = await engine_instance.execute_analysis(req.corporate_id)
        original_prob = state.default_probability
        
        # 2. Adjust default probability based on macro shocks
        # Basel III macro stress test logic: interest rate + inflation + fuel shock
        shock_sum = (req.interest_rate_shock * 0.035) + (req.inflation_shock * 0.02) + (req.fuel_shock * 0.015)
        new_prob = min(0.99, max(0.01, original_prob + shock_sum))
        
        # 3. Monte Carlo cash flow simulation (1000 trials, 12 months)
        months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
        base_revenue = 450000.0  # average monthly business revenue
        base_expense = 320000.0
        
        # Adjust base values for shocks
        revenue_shock_impact = base_revenue * (req.inflation_shock / 100 * -0.5)
        expense_shock_impact = base_expense * (req.inflation_shock / 100 * 0.8 + req.fuel_shock / 100 * 0.4)
        debt_service_shock = 25000.0 * (1 + req.interest_rate_shock / 100 * 1.5)
        
        monte_carlo_runs = []
        for i, m in enumerate(months):
            # Simulate 1000 trials
            trials = []
            for _ in range(1000):
                # Normal distribution noise for sales volatility
                noise = random.normalvariate(0, 40000.0)
                cf = (base_revenue + revenue_shock_impact + noise) - (base_expense + expense_shock_impact) - debt_service_shock
                trials.append(cf)
            
            trials.sort()
            p10 = trials[100]
            p50 = trials[500]
            p90 = trials[900]
            
            monte_carlo_runs.append({
                "month": m,
                "p10": round(p10, 2),
                "p50": round(p50, 2),
                "p90": round(p90, 2)
            })
            
        return {
            "status": "success",
            "corporate_id": req.corporate_id,
            "original_probability": original_prob,
            "default_probability": new_prob,
            "inflation_impact": revenue_shock_impact - expense_shock_impact,
            "interest_rate_impact": -debt_service_shock,
            "monte_carlo_runs": monte_carlo_runs
        }
    except Exception as e:
        print(f"[API] Error in scenario simulator: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/knowledge-graph", response_model=KnowledgeGraphResponse)
async def get_knowledge_graph(corporate_id: str, current_user: dict = Depends(get_current_user)):
    try:
        # Hardcode graph node relationships for fraud indicator sweep
        nodes = [
            {"id": "cust", "label": "Balaji Components (Target)", "type": "customer", "color": "#2563eb"},
            {"id": "director1", "label": "Balaji Prasad (Director)", "type": "director", "color": "#10b981"},
            {"id": "director2", "label": "Madhu Meeta (Director)", "type": "director", "color": "#10b981"},
            {"id": "phone1", "label": "+91 98765 43210 (Shared Phone)", "type": "phone", "color": "#ef4444"},
            {"id": "address1", "label": "Plot 42 Thane MIDC (Shared Address)", "type": "address", "color": "#ef4444"},
            {"id": "company2", "label": "Balaji Alloys (Shell Supplier)", "type": "company", "color": "#f59e0b"},
            {"id": "loan1", "label": "Working Capital Refinancing (₹15M)", "type": "loan", "color": "#8b5cf6"},
            {"id": "branch1", "label": "Mumbai-North Branch", "type": "branch", "color": "#6b7280"}
        ]
        
        edges = [
            {"source": "cust", "target": "director1", "label": "Has Director", "type": "director"},
            {"source": "cust", "target": "director2", "label": "Has Director", "type": "director"},
            {"source": "cust", "target": "loan1", "label": "Applied For", "type": "loan"},
            {"source": "cust", "target": "branch1", "label": "Mapped To", "type": "branch"},
            {"source": "cust", "target": "phone1", "label": "Registered Phone", "type": "phone"},
            {"source": "cust", "target": "address1", "label": "Registered Address", "type": "address"},
            {"source": "company2", "target": "phone1", "label": "Shared Phone Link (Fraud Flag)", "type": "fraud_link"},
            {"source": "company2", "target": "address1", "label": "Shared Address Link (Fraud Flag)", "type": "fraud_link"},
            {"source": "director1", "target": "company2", "label": "Common Director", "type": "director"}
        ]
        
        return {"nodes": nodes, "edges": edges}
    except Exception as e:
        print(f"[API] Error in knowledge-graph: {e}")
        raise HTTPException(status_code=500, detail=str(e))

class CounterfactualRequest(BaseModel):
    corporate_id: str
    revenue_increase_pct: float
    debt_reduction_pct: float
    litigations_resolved: int

class DigitalTwinResponse(BaseModel):
    corporate_id: str
    predicted_cashflows: List[float]
    projected_idle_fleet_pct: List[float]
    projected_stockpile_pct: List[float]
    npv_impact: float
    default_threshold: float

@app.post("/api/counterfactual")
async def run_counterfactual(req: CounterfactualRequest, current_user: dict = Depends(get_current_user)):
    try:
        # Run base analysis
        state = await engine_instance.execute_analysis(req.corporate_id)
        orig_p = state.default_probability
        
        # Calculate impact of counterfactual scenarios
        rev_impact = req.revenue_increase_pct * 0.008
        debt_impact = req.debt_reduction_pct * 0.012
        litig_impact = req.litigations_resolved * 0.15
        
        adj_p = max(0.01, min(0.99, orig_p - rev_impact - debt_impact - litig_impact))
        
        return {
            "status": "success",
            "corporate_id": req.corporate_id,
            "original_probability": orig_p,
            "adjusted_probability": adj_p,
            "mitigation_delta": orig_p - adj_p
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/borrower/{id}/digital-twin", response_model=DigitalTwinResponse)
async def get_borrower_digital_twin(id: str, current_user: dict = Depends(get_current_user)):
    try:
        # Generate digital twin forecast
        cashflows = [120000.0, 125000.0, 131000.0, 138000.0, 142000.0, 150000.0, 148000.0, 152000.0, 160000.0, 164000.0, 170000.0, 175000.0]
        idle_fleet = [78.5, 74.0, 68.2, 60.1, 52.0, 45.3, 40.0, 35.1, 28.0, 22.0, 18.0, 10.0]
        stockpile = [11.0, 18.2, 25.0, 34.1, 45.0, 52.0, 60.0, 68.0, 75.0, 80.0, 82.0, 85.0]
        
        # NPV impact: Exposure at Default * Loss Given Default
        npv_impact = 15000000.0 * 0.35
        
        return {
            "corporate_id": id,
            "predicted_cashflows": cashflows,
            "projected_idle_fleet_pct": idle_fleet,
            "projected_stockpile_pct": stockpile,
            "npv_impact": npv_impact,
            "default_threshold": 0.45
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

import io

@app.post("/api/documents/upload")
async def upload_document(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    try:
        content = await file.read()
        filename = file.filename
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("SELECT id FROM Users WHERE email = ?", (current_user["email"],))
        user_row = cursor.fetchone()
        user_id = user_row["id"] if user_row else 1
        
        # Simulating OCR extraction: Check if target contains suspicious connections
        ocr_text = f"INVOICE Ref: INV-2026-9981. Vendor: Balaji Alloys. Phone: +919876543210. Billing Target: Balaji Components Ltd. GSTIN: 27AAACB1234F1Z5. Amount: INR 4,50,000.00"
        
        status = "Verified"
        if "+919876543210" in ocr_text or "Balaji Alloys" in ocr_text:
            status = "Flagged: Shared entity relation detected"
            
        cursor.execute(
            """
            INSERT INTO document_vault 
            (user_id, filename, file_path, upload_timestamp, verification_status, ocr_content)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                user_id, 
                filename, 
                f"/vault/{filename}", 
                datetime.utcnow().isoformat(), 
                status, 
                ocr_text
            )
        )
        conn.commit()
        doc_id = cursor.lastrowid
        conn.close()
        
        log_audit(current_user["email"], "upload_document", f"Uploaded document {filename}. Status: {status}", status="success")
        
        return {
            "status": "success",
            "document_id": doc_id,
            "filename": filename,
            "verification_status": status,
            "ocr_extracted_fields": {
                "invoice_id": "INV-2026-9981",
                "vendor_name": "Balaji Alloys",
                "amount": 450000.0,
                "shared_indicator_found": True if "+919876543210" in ocr_text else False
            }
        }
    except Exception as e:
        print(f"[API] Document upload error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/reports/export")
async def export_report(
    report_type: str,  # 'board', 'risk', or 'fraud'
    current_user: dict = Depends(get_current_user)
):
    try:
        output = io.StringIO()
        filename = f"{report_type}_report_export.csv"
        
        if report_type == "board":
            output.write("Report Name,Omni-Sense Swarm Board Outline\n")
            output.write("Timestamp,2026-07-13T12:56:00Z\n")
            output.write("System Status,Operational\n")
            output.write("Risk Level,Elevated\n")
            output.write("Corporate Target,Balaji Components Ltd\n")
            output.write("Active Litigation Cases,2\n")
            output.write("Fleet Idle Rate,78.5%\n")
            output.write("Stockpile Volumetric Depletion,-89.0%\n")
            
        elif report_type == "risk":
            output.write("Corporate ID,Corporate Name,Probability of Default (PD),Loss Given Default (LGD),Exposure at Default (EAD),Expected Credit Loss (ECL)\n")
            output.write("BALAJI-001,Balaji Components Ltd,92.4%,35.0%,15000000.00,4851000.00\n")
            output.write("MADHU-001,Madhu Meeta Corp,4.0%,35.0%,500000.00,7000.00\n")
            
        elif report_type == "fraud":
            output.write("Primary Node,Connected Node,Connection Type,Shared Field,Risk Classification\n")
            output.write("Balaji Components,Balaji Alloys,Supplier Link,+919876543210 (Shared Phone),High Risk (Fraud Ring)\n")
            output.write("Balaji Components,Balaji Alloys,Supplier Link,Plot 42 Thane MIDC (Shared Address),High Risk (Fraud Ring)\n")
            output.write("Balaji Components,Balaji Prasad,Director Link,DIN-001928,Normal\n")
            
        else:
            raise HTTPException(status_code=400, detail="Invalid report type. Choose board, risk, or fraud.")
            
        output.seek(0)
        
        log_audit(current_user["email"], "export_report", f"Exported {report_type} CSV report", status="success")
        
        return StreamingResponse(
            io.BytesIO(output.getvalue().encode("utf-8")),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    except Exception as e:
        print(f"[API] Export report error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/mock/ckyc")
async def get_mock_ckyc(pan: str, current_user: dict = Depends(get_current_user)):
    return {
        "pan": pan,
        "registry_status": "Verified",
        "kyc_date": "2026-01-15T10:00:00Z",
        "photo_hash": "SHA-CKYC-PHOTO-XYZ-12345",
        "aadhaar_link_status": "Successful"
    }

@app.get("/api/mock/npci")
async def get_mock_npci(account_number: str, ifsc: str, current_user: dict = Depends(get_current_user)):
    return {
        "account_number": account_number,
        "ifsc": ifsc,
        "account_holder": "Balaji Components Ltd",
        "npci_mandate_status": "Active",
        "imps_validation_status": "Success"
    }

@app.get("/api/mock/cibil")
async def get_mock_cibil(pan: str, current_user: dict = Depends(get_current_user)):
    return {
        "pan": pan,
        "score": 780,
        "active_accounts": 3,
        "inquiries_last_6m": 2,
        "delinquencies_24m": 0,
        "summary": "Excellent credit history. Perfect repayment schedule compliance."
    }

@app.get("/api/mock/digilocker")
async def get_mock_digilocker(doc_type: str, current_user: dict = Depends(get_current_user)):
    return {
        "document_type": doc_type,
        "source": "Ministry of Corporate Affairs (MCA)",
        "verified_status": "Issued & Digitally Signed",
        "digilocker_doc_id": "DL-MCA-2026-5542"
    }

@app.post("/api/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest, current_user: dict = Depends(get_current_user)):
    """
    REST endpoint for conversational chat interface.
    """
    try:
        print(f"[API] Chat requested by {current_user['email']}: {request.command_text}")
        response = await process_voice_command(request.command_text, None, {"company_name": request.corporate_id}, current_user)
        if response is None:
            raise Exception("process_voice_command returned None")
        return ChatResponse(**response)
    except Exception as e:
        print(f"[API] Error in chat endpoint: {e}")
        import traceback
        traceback.print_exc()
        # Fallback response
        fallback_response = {
            "response_text": "I apologize, but I'm experiencing technical difficulties. Please try again.",
            "action_triggered": None,
            "screen_navigation": None,
            "state_update": {}
        }
        return ChatResponse(**fallback_response)


@app.websocket("/api/stream")
async def websocket_stream_endpoint(websocket: WebSocket):
    """
    WebSocket endpoint for real-time event streaming.
    
    This endpoint provides a persistent connection for streaming:
    - Agent execution updates
    - Tier change notifications
    - Anomaly detection alerts
    - Analysis completion events
    """
    client_id = f"client_{datetime.utcnow().timestamp()}"
    await manager.connect(websocket, client_id)
    
    try:
        while True:
            # Keep connection alive and handle incoming messages
            data = await websocket.receive_text()
            message = json.loads(data)
            
            # Echo back for acknowledgment
            await websocket.send_json({
                "status": "acknowledged",
                "timestamp": datetime.utcnow().isoformat()
            })
            
    except WebSocketDisconnect:
        manager.disconnect(websocket, client_id)
    except Exception as e:
        print(f"[WebSocket] Error in stream endpoint: {e}")
        manager.disconnect(websocket, client_id)


@app.websocket("/api/voice")
async def websocket_voice_endpoint(websocket: WebSocket):
    """
    Full-duplex WebSocket endpoint for conversational voice interaction.
    
    This endpoint handles:
    - Bi-directional audio streaming (PCM/Opus chunks)
    - Voice Activity Detection (VAD) coordination
    - Speech synthesis playback with interruption support
    - Conversational AI command processing
    
    Voice Interruption Logic:
    - If new audio chunk arrives while agent is speaking, cancel current output
    - Immediately re-route processing to the new command
    - Maintain low-latency bi-directional audio loop
    """
    client_id = f"voice_client_{datetime.utcnow().timestamp()}"
    await manager.connect(websocket, client_id)
    
    print(f"[VOICE] Voice client connected: {client_id}")
    
    try:
        while True:
            # Receive audio chunk or command
            data = await websocket.receive_text()
            message = json.loads(data)
            
            message_type = message.get("message_type")
            
            if message_type == "audio_chunk":
                # Handle incoming audio chunk from user
                audio_data = message.get("audio_data")
                is_speech = message.get("is_speech", False)
                
                if is_speech:
                    # User is speaking - interrupt any current synthesis
                    if voice_state["is_speaking"]:
                        print(f"[VOICE] Interrupting current synthesis for new input")
                        voice_state["interruption_requested"] = True
                        voice_state["is_speaking"] = False
                    
                    # Process speech input (in real implementation, send to STT service)
                    await websocket.send_json({
                        "message_type": "speech_detected",
                        "timestamp": datetime.utcnow().isoformat(),
                        "status": "processing"
                    })
                
                # Echo acknowledgment
                await websocket.send_json({
                    "message_type": "audio_ack",
                    "timestamp": datetime.utcnow().isoformat()
                })
            
            elif message_type == "voice_command":
                # Process conversational voice command
                command_text = message.get("command_text", "")
                intent = message.get("intent")
                parameters = message.get("parameters", {})
                
                print(f"[VOICE] Command received: {command_text}")
                
                # Process command and generate response
                response = await process_voice_command(command_text, intent, parameters)
                
                # Send response
                await websocket.send_json({
                    "message_type": "voice_response",
                    "payload": response,
                    "timestamp": datetime.utcnow().isoformat()
                })
            
            elif message_type == "synthesis_complete":
                # Speech synthesis playback completed
                voice_state["is_speaking"] = False
                voice_state["interruption_requested"] = False
                print(f"[VOICE] Synthesis complete")
            
            elif message_type == "synthesis_interrupt":
                # Frontend requests interruption
                voice_state["interruption_requested"] = True
                voice_state["is_speaking"] = False
                print(f"[VOICE] Synthesis interrupted by frontend")
            
            else:
                # Unknown message type
                await websocket.send_json({
                    "message_type": "error",
                    "error": f"Unknown message type: {message_type}",
                    "timestamp": datetime.utcnow().isoformat()
                })
    
    except WebSocketDisconnect:
        manager.disconnect(websocket, client_id)
        print(f"[VOICE] Voice client disconnected: {client_id}")
    except Exception as e:
        print(f"[VOICE] Error in voice endpoint: {e}")
        manager.disconnect(websocket, client_id)


# REST endpoints for loans, support tickets, fraud analytics, and admin
@app.get("/api/loans/applications")
async def get_loan_applications(current_user: dict = Depends(check_permission("view_loans"))):
    conn = get_db_connection()
    cursor = conn.cursor()
    if current_user["role"] == "Customer":
        cursor.execute("SELECT id FROM Users WHERE email = ?", (current_user["email"],))
        user_row = cursor.fetchone()
        cursor.execute("SELECT id FROM customers WHERE user_id = ?", (user_row["id"],))
        cust = cursor.fetchone()
        if cust:
            cursor.execute("SELECT * FROM loan_applications WHERE customer_id = ? ORDER BY created_at DESC", (cust["id"],))
            rows = cursor.fetchall()
        else:
            rows = []
    else:
        cursor.execute("SELECT * FROM loan_applications ORDER BY created_at DESC")
        rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

@app.post("/api/loans/applications")
async def create_loan_application(req: LoanApplicationCreate, current_user: dict = Depends(check_permission("apply_loan"))):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, name FROM Users WHERE email = ?", (current_user["email"],))
    user_row = cursor.fetchone()
    cursor.execute("SELECT id FROM customers WHERE user_id = ?", (user_row["id"],))
    cust = cursor.fetchone()
    if not cust:
        conn.close()
        raise HTTPException(status_code=400, detail="Customer profile not found")
        
    cursor.execute(
        "INSERT INTO loan_applications (customer_id, customer_name, amount, term_months, purpose, status, created_at) VALUES (?, ?, ?, ?, ?, 'pending', ?)",
        (cust["id"], user_row["name"], req.amount, req.term_months, req.purpose, datetime.utcnow().isoformat())
    )
    conn.commit()
    conn.close()
    log_audit(current_user["email"], "create_loan", f"Submitted loan application for ₹{req.amount:,.2f}", status="success")
    return {"status": "success", "message": "Loan application submitted."}

@app.get("/api/support/tickets")
async def get_support_tickets(current_user: dict = Depends(check_permission("view_support_tickets"))):
    conn = get_db_connection()
    cursor = conn.cursor()
    if current_user["role"] == "Customer":
        cursor.execute("SELECT id FROM Users WHERE email = ?", (current_user["email"],))
        user_row = cursor.fetchone()
        cursor.execute("SELECT id FROM customers WHERE user_id = ?", (user_row["id"],))
        cust = cursor.fetchone()
        if cust:
            cursor.execute("SELECT * FROM support_tickets WHERE customer_id = ? ORDER BY created_at DESC", (cust["id"],))
            rows = cursor.fetchall()
        else:
            rows = []
    else:
        cursor.execute("SELECT * FROM support_tickets ORDER BY created_at DESC")
        rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

@app.post("/api/support/tickets")
async def create_support_ticket(req: SupportTicketCreate, current_user: dict = Depends(check_permission("create_support_ticket"))):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, name FROM Users WHERE email = ?", (current_user["email"],))
    user_row = cursor.fetchone()
    cursor.execute("SELECT id FROM customers WHERE user_id = ?", (user_row["id"],))
    cust = cursor.fetchone()
    if not cust:
        conn.close()
        raise HTTPException(status_code=400, detail="Customer profile not found")
        
    cursor.execute(
        "INSERT INTO support_tickets (customer_id, customer_name, subject, description, status, created_at) VALUES (?, ?, ?, ?, 'open', ?)",
        (cust["id"], user_row["name"], req.subject, req.description, datetime.utcnow().isoformat())
    )
    conn.commit()
    conn.close()
    log_audit(current_user["email"], "create_ticket", f"Submitted support ticket: {req.subject}", status="success")
    return {"status": "success", "message": "Support ticket created."}

@app.get("/api/fraud/suspicious-transactions")
async def get_suspicious_transactions(current_user: dict = Depends(check_permission("view_suspicious_transactions"))):
    conn = get_db_connection()
    cursor = cursor = conn.cursor()
    cursor.execute("SELECT * FROM transactions WHERE is_suspicious = 1 ORDER BY timestamp DESC")
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

@app.get("/api/admin/system-health")
async def get_system_health(current_user: dict = Depends(check_permission("view_system_health"))):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT count(*) FROM Users")
    user_count = cursor.fetchone()[0]
    conn.close()
    return {
        "status": "operational",
        "cpu_usage": 14.2,
        "ram_usage": 42.1,
        "database_size_mb": 4.2,
        "active_socket_connections": sum(len(conns) for conns in manager.active_connections.values()),
        "auth_failure_alerts": 0,
        "average_api_latency_ms": 42
    }


# --- NEW PREMIUM FINTECH ENDPOINTS ---
from pydantic import BaseModel

class StatusUpdate(BaseModel):
    status: str

@app.get("/api/transactions")
async def get_transactions(
    query: Optional[str] = None,
    category: Optional[str] = None,
    is_suspicious: Optional[int] = None,
    current_user: dict = Depends(get_current_user)
):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    sql = "SELECT * FROM transactions WHERE 1=1"
    params = []
    
    # Customer RBAC filter
    if current_user["role"] == "Customer":
        cursor.execute("SELECT id FROM Users WHERE email = ?", (current_user["email"],))
        user_row = cursor.fetchone()
        if user_row:
            sql += " AND user_id = ?"
            params.append(user_row["id"])
        else:
            conn.close()
            return []
            
    if query:
        sql += " AND (description LIKE ? OR category LIKE ?)"
        params.append(f"%{query}%")
        params.append(f"%{query}%")
        
    if category and category.lower() != "all":
        sql += " AND category = ?"
        params.append(category)
        
    if is_suspicious is not None:
        sql += " AND is_suspicious = ?"
        params.append(is_suspicious)
        
    sql += " ORDER BY timestamp DESC"
    cursor.execute(sql, params)
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

@app.get("/api/customer/insights")
async def get_customer_insights(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "Customer":
        raise HTTPException(status_code=403, detail="Insights are only available for Customers")
        
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT id FROM Users WHERE email = ?", (current_user["email"],))
    user_row = cursor.fetchone()
    if not user_row:
        conn.close()
        raise HTTPException(status_code=404, detail="User not found")
        
    user_id = user_row["id"]
    
    cursor.execute("SELECT * FROM customers WHERE user_id = ?", (user_id,))
    cust = cursor.fetchone()
    if not cust:
        conn.close()
        raise HTTPException(status_code=404, detail="Customer financial profile not found")
        
    cursor.execute("""
        SELECT category, SUM(amount) as total, COUNT(*) as count 
        FROM transactions 
        WHERE user_id = ? AND type = 'debit' 
        GROUP BY category
    """, (user_id,))
    spending_categories = [dict(row) for row in cursor.fetchall()]
    
    cursor.execute("SELECT * FROM transactions WHERE user_id = ? ORDER BY timestamp DESC LIMIT 10", (user_id,))
    recent_txs = [dict(row) for row in cursor.fetchall()]
    
    conn.close()
    
    recommendations = [
        {"title": "Enable FD Auto-Sweep", "desc": "Earn up to 7.2% interest on savings exceeding ₹1,00,000.", "impact": "High Yield"},
        {"title": "Reduce peak energy usage", "desc": "Shift heavy equipment operations past peak hours to save 12% on electric utilities.", "impact": "Cost Reduction"},
        {"title": "Transit logistics audit", "desc": "Consolidate supplier transport toll charges to reduce fuel margins by 8%.", "impact": "Efficiency"}
    ]
    
    return {
        "profile": dict(cust),
        "spending_categories": spending_categories,
        "recent_transactions": recent_txs,
        "recommendations": recommendations,
        "monthly_budget": {
            "allocated": 60000.0,
            "used": cust["expenses"],
            "remaining": max(0, 60000.0 - cust["expenses"])
        }
    }

@app.post("/api/loans/applications/{app_id}/status")
async def update_loan_status(
    app_id: int, 
    payload: StatusUpdate, 
    current_user: dict = Depends(check_permission("restructure_loan"))
):
    if payload.status not in ["approved", "rejected", "pending"]:
        raise HTTPException(status_code=400, detail="Invalid status. Must be 'approved', 'rejected', or 'pending'.")
        
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM loan_applications WHERE id = ?", (app_id,))
    loan_app = cursor.fetchone()
    if not loan_app:
        conn.close()
        raise HTTPException(status_code=404, detail="Loan application not found")
        
    cursor.execute("UPDATE loan_applications SET status = ? WHERE id = ?", (payload.status, app_id))
    conn.commit()
    conn.close()
    
    log_audit(
        current_user["email"], 
        "update_loan_status", 
        f"Updated loan application #{app_id} status to '{payload.status}' for customer {loan_app['customer_name']}", 
        status="success"
    )
    return {"status": "success", "message": f"Loan application status updated to {payload.status}."}

@app.post("/api/support/tickets/{ticket_id}/resolve")
async def resolve_support_ticket(
    ticket_id: int, 
    current_user: dict = Depends(check_permission("view_support_tickets"))
):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM support_tickets WHERE id = ?", (ticket_id,))
    ticket = cursor.fetchone()
    if not ticket:
        conn.close()
        raise HTTPException(status_code=404, detail="Support ticket not found")
        
    cursor.execute("UPDATE support_tickets SET status = 'resolved' WHERE id = ?", (ticket_id,))
    conn.commit()
    conn.close()
    
    log_audit(
        current_user["email"], 
        "resolve_ticket", 
        f"Resolved support ticket #{ticket_id}: '{ticket['subject']}' for customer {ticket['customer_name']}", 
        status="success"
    )
    return {"status": "success", "message": "Support ticket marked as resolved."}
# --- END NEW PREMIUM FINTECH ENDPOINTS ---


class ConversationMemory:
    def __init__(self):
        self.history = []
        self.last_context = None

    def add_user_message(self, text):
        self.history.append({"role": "user", "text": text})
        if len(self.history) > 10:
            self.history.pop(0)

    def add_bot_message(self, text, context=None):
        self.history.append({"role": "bot", "text": text})
        if context:
            self.last_context = context
        if len(self.history) > 10:
            self.history.pop(0)

memory = ConversationMemory()

async def process_voice_command(command_text: str, intent: Optional[str], parameters: Dict[str, Any], user: Optional[dict] = None) -> Dict[str, Any]:
    """
    Process conversational voice command using Groq, Local LLM, or tailorable heuristic handlers
    incorporating the user's role, DB queries, and specific dashboard summaries.
    """
    command_lower = command_text.lower()
    memory.add_user_message(command_text)
    
    # 1. Determine user role & profile details
    user_role = user.get("role", "Customer") if user else "Customer"
    user_name = user.get("name", "User") if user else "User"
    user_email = user.get("email", "customer@omnisense.com") if user else "customer@omnisense.com"
    
    # 2. Heuristics for the role-specific enterprise dashboard triggers
    markdown_response = None
    action = None
    screen_nav = None
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Fetch user ID for DB references
    cursor.execute("SELECT id FROM Users WHERE email = ?", (user_email,))
    user_row = cursor.fetchone()
    uid = user_row["id"] if user_row else None

    # Global DB write commands from Chat/Voice
    import re
    if any(k in command_lower for k in ["change budget", "set budget", "update budget", "change the budget", "change the thing", "set the thing"]):
        num_match = re.search(r'(\d+)', command_lower)
        if num_match:
            val = float(num_match.group(1))
            cursor.execute("INSERT OR REPLACE INTO budgets (user_id, allocated) VALUES (?, ?)", (uid, val))
            conn.commit()
            markdown_response = f"Successfully updated your monthly budget limit to **₹{val:,.2f}** in the database."
            screen_nav = "screen_0"
        else:
            markdown_response = "Please specify a numeric value to update your budget."
            
    elif any(k in command_lower for k in ["income", "monthy income", "monthly income"]):
        num_match = re.search(r'(\d+)', command_lower)
        if num_match:
            val = float(num_match.group(1))
            cursor.execute("UPDATE customers SET income = ? WHERE user_id = ?", (val, uid))
            conn.commit()
            markdown_response = f"Successfully updated monthly income to **₹{val:,.2f}** in the database."
            screen_nav = "screen_0"
        else:
            markdown_response = "Please specify a numeric value to update your monthly income."
    
    # ----------------------------------------------------
    # ROLE: CUSTOMER TRIGGERS
    # ----------------------------------------------------
    if user_role == "Customer":
        # 1. Explain my expenses
        if any(k in command_lower for k in ["explain my expenses", "expense", "spend"]):
            cursor.execute("SELECT amount, category, description, timestamp FROM transactions ORDER BY timestamp DESC LIMIT 5")
            txs = cursor.fetchall()
            rows_str = ""
            total_spent = 0.0
            for tx in txs:
                rows_str += f"| {tx['timestamp'][:10]} | {tx['category']} | ₹{tx['amount']:,.2f} | {tx['description']} |\n"
                if tx['category'] != 'Salary Deposit':
                    total_spent += tx['amount']
            markdown_response = f"""### 📊 Category Expense Assessment
Hello {user_name}, here is a breakdown of your recent checking expenses:

| Date | Category | Amount | Description |
| :--- | :--- | :--- | :--- |
{rows_str}

**AI Spending Analysis**: Your highest non-fixed cost was **Raw Materials** & **Outbound Wire Transfers**. Based on category spending, you spent **₹{total_spent:,.2f}** this week. Your utilities are stable. We recommend optimizing cargo/logistics budgets to increase saving velocity.
"""
            screen_nav = "screen_1"
            
        # 2. Help me save money
        elif any(k in command_lower for k in ["help me save money", "save money", "saving", "budget advice"]):
            markdown_response = f"""### 💡 AI Savings Recommendations
Hello {user_name}, we analyzed your cashflow and compiled these savings recommendations:

- **Optimize Utilities**: Reducing peak facility equipment draw can lower utility expenses by **12%** monthly.
- **FD Auto-Sweep**: Enable Sweep-in Fixed Deposits. By sweeping savings above **₹1,00,000.00** into a sweep account, you earn **7.2% interest** (up from 3.5%).
- **Logistics Consolidations**: High ATM withdrawals indicate cash velocity leaks. Use corporate Fastag toll cards for bulk logistics savings.
- **Budget Alerts**: We set up a **₹40,000.00** soft cap alert on your retail expenses.
"""
            screen_nav = "screen_1"
            
        # 3. Show transaction history
        elif any(k in command_lower for k in ["show transaction history", "transaction", "history", "recent payments"]):
            cursor.execute("SELECT id, amount, type, category, timestamp, description FROM transactions ORDER BY timestamp DESC LIMIT 6")
            txs = cursor.fetchall()
            rows_str = ""
            for tx in txs:
                icon = "🟢" if tx['type'] == 'credit' else "🔴"
                rows_str += f"| **#TR-{tx['id']}** | {tx['timestamp'][:16]} | {icon} {tx['type'].upper()} | ₹{tx['amount']:,.2f} | {tx['category']} | {tx['description']} |\n"
            markdown_response = f"""### 💸 Recent Transactions History
Showing 6 most recent transactions in active branch:

| ID | Timestamp | Type | Amount | Category | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
{rows_str}
"""
            screen_nav = "screen_1"
            
        # 4. Budget planning
        elif any(k in command_lower for k in ["budget planning", "budget", "plan budget"]):
            cursor.execute("SELECT income, savings, expenses FROM customers WHERE user_id = ?", (uid,))
            cust = cursor.fetchone()
            inc = cust["income"] if cust else 120000.0
            exp = cust["expenses"] if cust else 45000.0
            markdown_response = f"""### 📅 Monthly Budget Planning
Here is your current budget utilization matrix:

| Category | Allocated Budget | Actual Spending | Variance | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Logistics/Fuel** | ₹30,000.00 | ₹12,000.00 | +₹18,000.00 | ✅ Safe |
| **Material/Stock** | ₹1,00,000.00 | ₹85,000.00 | +₹15,000.00 | ✅ Safe |
| **Utilities/Bills**| ₹5,000.00 | ₹4,500.00 | +₹500.00 | ✅ Safe |
| **Outbound Wire** | ₹0.00 | ₹9,50,000.00 | -₹9,50,000.00 | 🚨 Over Budget |

**AI Insight**: Total monthly income is **₹{inc:,.2f}**. Fixed allocation is **₹{exp:,.2f}**. Variable wire overrides pushed the balance into negative variance.
"""
            screen_nav = "screen_1"
            
        # 5. Investment suggestions
        elif any(k in command_lower for k in ["investment suggestions", "investment", "invest", "yield"]):
            markdown_response = f"""### 📈 Personalized Investment Products
Based on your credit profile, we suggest these yield-maximizing products:

1. **Omni-Flex Fixed Deposit**: 1-Year Tenure. **7.5% p.a.** yield with pre-mature withdrawal support.
2. **Liquid Mutual Funds**: Low Risk. **6.8% return**. Ideal for corporate liquidity sweeps.
3. **Gold Bond Scheme**: Sovereign guarantee. **2.5% fixed interest** + gold appreciation index.
"""
            screen_nav = "screen_1"
            
        # Fallback loan request check
        elif any(k in command_lower for k in ["loan", "afford", "home loan", "lakh"]):
            # default home loan check
            amount = 1000000.0
            cursor.execute("SELECT c.*, u.name FROM customers c JOIN Users u ON c.user_id = u.id WHERE u.email = ?", (user_email,))
            cust = cursor.fetchone()
            if cust:
                income = cust["income"]
                savings = cust["savings"]
                expenses = cust["expenses"]
                credit_score = cust["credit_score"]
                debt = cust["debt"]
                rate = 0.085 / 12
                months = 180
                emi = amount * (rate * (1 + rate)**months) / ((1 + rate)**months - 1)
                disposable = income - expenses
                dti = ((debt * 0.015 + emi) / income) * 100
                emi_percent = (emi / disposable) * 100 if disposable > 0 else 100
                markdown_response = f"""### 🏠 Home Loan Affordability Assessment

**Client Name**: {cust["name"]}
**Requested Loan**: ₹10.0 Lakh (Home Loan)
**Interest Rate**: 8.5% p.a.
**Tenure**: 15 Years

| Financial Metric | Current Value | Threshold / Recommended | Status |
| :--- | :--- | :--- | :--- |
| **Monthly Income** | ₹{income:,.2f} | - | - |
| **Estimated EMI** | ₹{emi:,.2f} | < 50% Disposable Income | {"✅ Safe" if emi < disposable * 0.5 else "❌ High"} |
| **Credit Score** | {credit_score} | > 750 (Excellent) | {"✅ Excellent" if credit_score >= 750 else "⚠️ Average"} |

**AI Recommendation**: **Highly Affordable**. The proposed EMI takes up only {emi_percent:.1f}% of your disposable income.
"""
                screen_nav = "screen_1"
            else:
                markdown_response = "I apologize, but I could not locate your customer financial profile."
                
    # ----------------------------------------------------
    # ROLE: LOAN OFFICER TRIGGERS
    # ----------------------------------------------------
    elif user_role == "Loan Officer":
        # 1. Analyze loan eligibility
        if any(k in command_lower for k in ["analyze loan eligibility", "eligibility", "eligible"]):
            markdown_response = f"""### 📋 Loan Eligibility Appraisal
Running credit diagnostics on active branch applicants:

- **Madhu Meeta**: Monthly income ₹1,20,000.00, credit score **780 (Excellent)**, current debt ₹2,00,000.00.
  - **Verdict**: **ELIGIBLE (🟢 Auto-Approve)**. Disposable income supports ₹10L home loan.
- **Balaji Components Ltd**: Credit score **540 (Poor)**, default risk triggers at Tier 3.
  - **Verdict**: **INELIGIBLE (🔴 Manual Restructure Required)**. Physical velocity has collapsed.
"""
            screen_nav = "screen_3"
            
        # 2. Generate emi
        elif any(k in command_lower for k in ["generate emi", "calculate emi", "emi"]):
            markdown_response = f"""### 🧮 EMI Amortization Schedule
Amortization simulation for a standard corporate refinance package:

- **Principal**: ₹5,00,00,000.00
- **Rate**: 10.5% p.a.
- **Tenure**: 60 Months (5 Years)
- **Monthly EMI**: **₹10,74,685.73**
- **Total Interest Payable**: ₹1,44,81,143.90
- **Total Repayment Amount**: ₹6,44,81,143.90

*Note: Enabling velocity-linked adjustments can reduce interest margins by up to 50 bps based on Fastag logistics transits.*
"""
            screen_nav = "screen_3"
            
        # 3. Explain credit score
        elif any(k in command_lower for k in ["explain credit score", "credit score"]):
            markdown_response = f"""### 📈 Credit Score Anomaly Explanation
Credit scoring bands for active portfolios:

- **Excellent (750-900)**: Prompt payment histories, <20% credit utilization.
- **Fair/Good (650-749)**: Minor litigation risks, stable cashflows.
- **Poor/Critical (<650)**: High probability of defaults, GST filing delays.

**Balaji Components (540)**: Flagged due to physical toll transits collapsing by **62.1%** and supplier court cases in Bombay High Court.
"""
            screen_nav = "screen_3"
            
        # 4. Recommend loan products
        elif any(k in command_lower for k in ["recommend loan products", "recommend loan", "products"]):
            markdown_response = f"""### 📦 Current Loan Products Matrix
Lending desk products and interest spreads:

| Product Code | Description | Interest Rate | Max Tenure | Risk Weight |
| :--- | :--- | :--- | :--- | :--- |
| **MORT-HL** | Retail Home Loan | 8.5% p.a. | 20 Years | Low (35%) |
| **CORP-WC** | Working Capital Refinance| 9.8% p.a. | 5 Years | Medium (75%) |
| **VEH-FL** | Logistics Fleet Finance | 8.9% p.a. | 7 Years | Low (50%) |
| **REST-MSME**| Velocity-Linked Restructure| 10.5% p.a. | 8 Years | High (120%) |
"""
            screen_nav = "screen_3"
            
        # Fallback list applications
        elif any(k in command_lower for k in ["loan", "application", "applications"]):
            cursor.execute("SELECT * FROM loan_applications ORDER BY created_at DESC")
            apps = cursor.fetchall()
            table_rows = ""
            for app in apps:
                table_rows += f"| **#APP-{app['id']}** | {app['customer_name']} | ₹{app['amount']:,.2f} | {app['purpose']} | {app['created_at'][:10]} | `{app['status']}` |\n"
            markdown_response = f"""### 📋 Loan Applications Workflow Manager
| App ID | Customer Name | Amount | Purpose | Date | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
{table_rows if table_rows else "| No active applications | - | - | - | - | - |\n"}
"""
            screen_nav = "screen_3"
            
    # ----------------------------------------------------
    # ROLE: FRAUD ANALYST TRIGGERS
    # ----------------------------------------------------
    elif user_role == "Fraud Analyst":
        # 1. Find suspicious transactions
        if any(k in command_lower for k in ["find suspicious transactions", "suspicious", "fraud", "flagged"]):
            cursor.execute("SELECT * FROM transactions WHERE is_suspicious = 1 ORDER BY timestamp DESC")
            rows = cursor.fetchall()
            table_rows = ""
            for row in rows:
                table_rows += f"| **#TR-{row['id']}** | {row['timestamp'][:16]} | ₹{row['amount']:,.2f} | {row['category']} | {row['description']} | **92%** |\n"
            markdown_response = f"""### 🚨 Flagged Suspicious Transactions List
| ID | Timestamp | Amount | Category | Description | Risk Score |
| :- | :--- | :--- | :--- | :--- | :--- |
{table_rows if table_rows else "| No suspicious transactions detected today | - | - | - | - | - |\n"}
"""
            screen_nav = "screen_2"
            
        # 2. Explain fraud patterns
        elif any(k in command_lower for k in ["explain fraud patterns", "fraud patterns", "patterns"]):
            markdown_response = f"""### 🛡️ Fraud Pattern Explanations
Active system detection patterns:

- **Structuring Pattern (ATM Velocity)**: Executing multiple withdrawals under ₹50,000.00 at high-risk coords in quick succession.
- **Divergent Wire Pattern**: Outbound wire transfers of high values to offshore logistics companies without matching Fastag transits.
- **Stockpile Volumetric Anomaly**: High reported revenues on GST filings combined with over **80% depletion** of physical stockpile assets (detected by SAR satellites).
"""
            screen_nav = "screen_2"
            
        # 3. Generate investigation reports
        elif any(k in command_lower for k in ["generate investigation reports", "investigation report", "report", "investigate"]):
            markdown_response = f"""### 📝 AML Suspicious Transaction Investigation Report
**Case ID**: Case-2026-TR-004
**Target Entity**: Balaji Components Ltd
**Transaction ID**: TR-004 (Outbound Wire)
**Value**: ₹9,50,000.00

**Findings**:
- GST filings indicate continuous logistics movement.
- Physical toll transits collapsed by **62.1%**.
- SAR satellite imagery shows factory raw stockpiles depleted to **11.0%**.

**Recommended Actions**: Immediate locking of checking balances. Escalate to branch compliance manager.
"""
            screen_nav = "screen_2"
            
        # 4. Risk scoring
        elif any(k in command_lower for k in ["risk scoring", "risk score", "scoring"]):
            markdown_response = f"""### 🧠 AI Anomaly Risk Scoring Methodology
Our AI risk scoring model utilizes three main indicators:

- **Litigation Factor (Weight 41%)**: Calculated from active court disputes.
- **Logistics Factor (Weight 34%)**: Calculated from weekly Fastag toll transits.
- **Volumetric Depot Factor (Weight 25%)**: Calculated from SAR satellite depot stockpile depletion.

**Scoring Equation**:
\\[Risk = (0.41 \\times Litig) + (0.34 \\times TollDiverge) + (0.25 \\times DepotDeplet)\\]
Active Entity Score: **92.4% (Critical Risk - Tier 3)**
"""
            screen_nav = "screen_2"
            
    # ----------------------------------------------------
    # ROLE: BRANCH MANAGER TRIGGERS
    # ----------------------------------------------------
    elif user_role == "Branch Manager":
        # 1. Branch performance
        if any(k in command_lower for k in ["branch performance", "performance"]):
            branch_id = user.get("branch_id", "Mumbai-North") or "Mumbai-North"
            cursor.execute("SELECT SUM(amount) as total FROM transactions WHERE branch_id = ? AND type = 'credit'", (branch_id,))
            credit_row = cursor.fetchone()
            total_credit = credit_row["total"] if credit_row["total"] else 350000.0
            
            cursor.execute("SELECT COUNT(*) as count FROM loan_applications WHERE status = 'pending'")
            pending_loans = cursor.fetchone()["count"]
            
            markdown_response = f"""### 🏢 Branch Performance Report ({branch_id})
**Branch Manager**: {user_name}

- **Deposits Volume**: ₹{total_credit:,.2f}
- **Onboarding Rate**: 12 new accounts today
- **Pending Approvals**: {pending_loans} loan cases pending review
- **SLA Resolution**: **98.4%** Customer SLA Compliance
- **General Health Indicator**: **88.2%** (Good)
"""
            screen_nav = "screen_1"
            
        # 2. Employee productivity
        elif any(k in command_lower for k in ["employee productivity", "employee", "productivity"]):
            markdown_response = f"""### 👥 Branch Employee Productivity Log
Mumbai-North Active Staff SLAs:

- **Amit S. (Loan Officer)**: Processed 14 cases, SLA compliance **98%**.
- **Neha K. (Fraud Analyst)**: Flagged 2 cases, SLA compliance **95%**.
- **Rajesh P. (Customer Support)**: Resolved 29 tickets, SLA compliance **92%**.
"""
            screen_nav = "screen_1"
            
        # 3. Customer growth
        elif any(k in command_lower for k in ["customer growth", "growth", "new accounts"]):
            markdown_response = f"""### 📈 Branch Customer Onboarding Growth
Branch account volume analytics:

- **This Week**: +84 active retail users.
- **This Month**: +342 active retail users.
- **Growth Rate**: **+8.4% YoY**.
"""
            screen_nav = "screen_1"
            
        # 4. Pending approvals
        elif any(k in command_lower for k in ["pending approvals", "approvals"]):
            markdown_response = f"""### 🔓 Pending Manager Approvals List
Decisions waiting for manager overrides:

1. **Balaji Components GST Override**: Discrepancy of 66.3% between GST filings and transits velocity.
2. **TR-004 High-Value Outbound Wire Exception**: Wire transfer of ₹9,50,000.00 to offshore logistics.
"""
            screen_nav = "screen_1"
            
    # ----------------------------------------------------
    # ROLE: SUPER ADMIN TRIGGERS
    # ----------------------------------------------------
    elif user_role == "Super Admin":
        # 1. Overall platform analytics
        if any(k in command_lower for k in ["overall platform analytics", "platform analytics", "platform"]):
            cursor.execute("SELECT COUNT(*) FROM Users")
            user_count = cursor.fetchone()[0]
            cursor.execute("SELECT COUNT(*) FROM Branches")
            branch_count = cursor.fetchone()[0]
            cursor.execute("SELECT COUNT(*) FROM transactions")
            tx_count = cursor.fetchone()[0]
            markdown_response = f"""### 🌐 Global Platform Operational Analytics
Global admin telemetry dashboard:

- **Total Active Users**: {user_count} accounts
- **Total Active Branches**: {branch_count} branches
- **Global Transaction Volume**: {tx_count} records logged
- **Database Status**: Stable
"""
            screen_nav = "screen_2"
            
        # 2. System health
        elif any(k in command_lower for k in ["system health", "health", "server"]):
            markdown_response = f"""### 🖥️ System Health & Performance Audit
- **FastAPI Web Server**: ✅ Online | CPU: 14.2%, RAM: 42.1%, Latency: 42ms
- **Database Pool**: ✅ Connected | Size: 4.2 MB, Connections: 4 active
- **WebSocket Hub**: ✅ Active | Active channels: 1 concurrent stream
- **Authentication**: ✅ Secure | JWT active
- **Swarm Swarm Agents**: ✅ Online | Eye, Chaser, and Auditor active
"""
            screen_nav = "screen_2"
            
        # 3. User statistics
        elif any(k in command_lower for k in ["user statistics", "user stats", "statistics"]):
            cursor.execute("SELECT role, COUNT(*) as count FROM Users GROUP BY role")
            rows = cursor.fetchall()
            tbl_rows = ""
            for r in rows:
                tbl_rows += f"| {r['role']} | {r['count']} users |\n"
            markdown_response = f"""### 👥 User Account Statistics
User distribution by role in database:

| Role | Active Count |
| :--- | :--- |
{tbl_rows}
"""
            screen_nav = "screen_2"
            
        # 4. AI performance
        elif any(k in command_lower for k in ["ai performance", "ai stats"]):
            markdown_response = f"""### 🤖 AI Swarm Agent Execution Speeds
Performance statistics of LangGraph agents:

| Agent | Function | Avg Latency | Confidence | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Auditor** | Litigations & GST | 245ms | 85% | ✅ Idle |
| **Chaser** | Mobility & Tolls | 312ms | 92% | ✅ Idle |
| **Eye** | Satellites & depot | 456ms | 88% | ✅ Idle |
"""
            screen_nav = "screen_2"
            
        # 5. Executive reports
        elif any(k in command_lower for k in ["executive reports", "executive report", "report"]):
            markdown_response = f"""### 📊 Executive Platform Operations Summary
Consolidated executive summary of OmniSense:

- **Lending operations**: Retail and corporate loans are operating within Basel-III limits.
- **Fraud Operations**: System AML scoring flagged outbound cash structuring anomalies.
- **IT Health**: Server CPU/RAM logs are well within green limits.
"""
            screen_nav = "screen_2"
            
    # Close DB Connection
    conn.close()
    
    if markdown_response:
        memory.add_bot_message(markdown_response, screen_nav)
        return {
            "response_text": markdown_response,
            "action_triggered": action,
            "screen_navigation": screen_nav,
            "state_update": {}
        }
        
    # 3. LLM AI processing (Groq / local Ollama)
    system_prompt = f"""You are Omni-Sense, a highly intelligent tactical AI assistant for a fintech intelligence system.
You analyze corporate risk, detect anomalies in logistics, and simulate loan restructuring.
Active User Role: {user_role}
Active User Name: {user_name}

IMPORTANT: You MUST respond with ONLY a valid JSON object. Do not include markdown code blocks or any other text.
The JSON must have the following structure:
{{
  "response_text": "Your response here. Use markdown formatting where appropriate.",
  "action_triggered": "one of: run_analysis, highlight_shap, null",
  "screen_navigation": "one of: screen_0 (Workspace), screen_1 (Maps), screen_2 (Logs), screen_3 (Restructure), screen_4 (Help), null",
  "state_update": {{}}
}}

Context Mapping Rules:
- If the user asks for "money stuff", "restructuring", "emi", or "financials", set screen_navigation to "screen_3".
- If the user asks for "help", "commands", or "how to use", set screen_navigation to "screen_4".
- If the user asks to "run analysis" or "analyze", set action_triggered to "run_analysis" and screen_navigation to "screen_2".
- If the user asks "why" or "explain risk", set action_triggered to "highlight_shap" and screen_navigation to "screen_2".
- If the user asks for "workspace", "hub", or "dashboard", set screen_navigation to "screen_0".
"""

    llm_messages = [{"role": "system", "content": system_prompt}]
    for msg in memory.history[-5:]:
        llm_messages.append({"role": "user" if msg["role"] == "user" else "assistant", "content": msg["text"]})

    response_content = None
    try:
        groq_key = os.environ.get("GROQ_API_KEY")
        if groq_key:
            from groq import AsyncGroq
            client = AsyncGroq(api_key=groq_key)
            chat_completion = await client.chat.completions.create(
                messages=llm_messages,
                model="llama3-8b-8192",
                response_format={"type": "json_object"},
                temperature=0.3
            )
            response_content = chat_completion.choices[0].message.content
        else:
            # Fallback to local Ollama (Llama 3.2)
            try:
                async with httpx.AsyncClient() as client:
                    response = await client.post(
                        "http://127.0.0.1:11434/api/chat",
                        json={
                            "model": "llama3.2",
                            "messages": llm_messages,
                            "stream": False,
                            "format": "json"
                        },
                        timeout=5.0
                    )
                    if response.status_code == 200:
                        response_content = response.json()["message"]["content"]
            except Exception as e:
                print(f"[LLM] Local Ollama connection failed: {e}")
                response_content = None

        if response_content:
            try:
                data = json.loads(response_content)
                bot_text = data.get("response_text", "Understood.")
                bot_nav = data.get("screen_navigation")
                bot_action = data.get("action_triggered")
                memory.add_bot_message(bot_text, bot_nav)
                return {
                    "response_text": bot_text,
                    "action_triggered": bot_action,
                    "screen_navigation": bot_nav,
                    "state_update": data.get("state_update", {})
                }
            except Exception as e:
                print(f"[LLM] Failed to parse LLM response: {e}")

    except Exception as e:
        print(f"[LLM] Exception in LLM processing: {e}")

    # Standard fallback shortcuts
    fast_response = None
    fast_nav = None
    fast_action = None

    if any(k in command_lower for k in ["command center", "geographic", "anomaly map", "screen 1"]):
        fast_response = "Accessing tactical command center. Displaying real-time geographic anomaly mapping."
        fast_nav = "screen_1"
    elif any(k in command_lower for k in ["diagnostic log", "cascade log", "screen 2"]):
        fast_response = "Opening diagnostic terminal. Streaming multi-agent cascade logs."
        fast_nav = "screen_2"
    elif any(k in command_lower for k in ["money stuff", "restructur", "financial", "simulator", "screen 3"]):
        fast_response = "Accessing the restructuring simulator for the financial parameters."
        fast_nav = "screen_3"
    elif any(k in command_lower for k in ["help", "guide", "voice automation", "command guide", "screen 4", "commands"]):
        fast_response = "Opening the voice automation commands guide."
        fast_nav = "screen_4"
    elif any(k in command_lower for k in ["run tri-agent", "analyze the target", "start analysis", "run analysis", "analyze"]):
        fast_response = "Initiating full tri-agent analysis. Auditor, Chaser, and Eye agents are now processing background streams."
        fast_action = "run_analysis"
        fast_nav = "screen_2"
    elif any(k in command_lower for k in ["current result", "what are the results", "analysis results", "threat level", "status"]):
        tier = engine_instance.state.current_tier.value
        prob = engine_instance.state.default_probability * 100
        fast_response = f"Based on the recent cascade, the entity is currently at {tier.replace('_', ' ')}. The default probability is calculated at {prob:.1f} percent. I have detected anomalies in multiple streams."
        fast_nav = "screen_2"
    elif any(k in command_lower for k in ["why is the entity", "explain the risk", "risk factor", "logistics collapse", "why"]):
        fast_response = "The primary risk drivers are supplier litigation at 41%, logistics collapse at 34%, and raw material depletion at 25%. The physical proxies are diverging significantly from GST reports."
        fast_action = "highlight_shap"
        fast_nav = "screen_2"
    elif any(g in command_lower for g in ["hello", "hi ", "hey ", "test"]):
        fast_response = f"Hello {user_name}. I am Omni-Sense, your tailorable AI assistant. Active role: {user_role}. System is operational."
        fast_nav = "screen_1"
    else:
        fast_response = f"Understood {user_name}. As a {user_role}, you queried: '{command_text}'. Systems are analyzing."
        
    memory.add_bot_message(fast_response, fast_nav)
    return {
        "response_text": fast_response,
        "action_triggered": fast_action,
        "screen_navigation": fast_nav,
        "state_update": {}
    }


async def broadcast_telemetry_loop():
    """Simulates real-time telemetry updates for active entities and broadcasts to WebSockets."""
    print("[TELEMETRY] Live telemetry generator loop started")
    
    fleet_velocity = 18.0
    stockpile_coverage = 89.0
    voltage_drop = 4.2
    
    while True:
        try:
            await asyncio.sleep(4.0)
            if any(len(conns) > 0 for conns in manager.active_connections.values()):
                # Simulates active sensor variations
                fleet_velocity = max(2.0, fleet_velocity - 0.5) if fleet_velocity > 4 else max(2.0, fleet_velocity + random.uniform(-0.5, 0.5))
                stockpile_coverage = max(10.0, stockpile_coverage - random.uniform(0.1, 0.5))
                voltage_drop = max(1.0, min(20.0, voltage_drop + random.uniform(-0.3, 0.5)))
                
                telemetry_event = {
                    "message_type": "stream_event",
                    "payload": {
                        "event_type": "agent_update",
                        "corporate_id": "BALAJI-001",
                        "timestamp": datetime.utcnow().isoformat(),
                        "data": {
                            "agent_type": "chaser",
                            "message": f"Logistics live update. Transit velocity: {fleet_velocity:.1f}/week. Stockpile level: {stockpile_coverage:.1f}%. Voltage drop: {voltage_drop:.1f}%",
                            "data_payload": {
                                "weekly_transits": int(fleet_velocity),
                                "avg_velocity": round(fleet_velocity, 1),
                                "idle_percentage": round(100 - (fleet_velocity / 18.0 * 100), 1),
                                "stockpile_coverage": round(stockpile_coverage, 1),
                                "voltage_drop": round(voltage_drop, 1)
                            },
                            "confidence": 0.95,
                            "current_tier": "tier_3" if fleet_velocity < 6 else ("tier_2" if fleet_velocity < 12 else "tier_1"),
                            "default_probability": round(0.1 + (18.0 - fleet_velocity) / 18.0 * 0.85, 2),
                            "execution_time_ms": 110.0
                        }
                    },
                    "timestamp": datetime.utcnow().isoformat()
                }
                
                await manager.broadcast_to_all(telemetry_event)
        except Exception as e:
            print(f"[TELEMETRY] Loop error: {e}")

@app.on_event("startup")
async def startup_event():
    """Initialize services on startup."""
    print("[SERVER] Project Omni-Sense API starting up...")
    init_db()
    asyncio.create_task(broadcast_telemetry_loop())
    print("[SERVER] WebSocket endpoints: /api/stream, /api/voice")
    print("[SERVER] REST endpoints: /api/analyze, /api/restructure")


# --- PRODUCTION FINTECH ADDITIONS ---
from fastapi.responses import FileResponse

class BudgetUpdate(BaseModel):
    allocated: float

class SavingsGoalCreate(BaseModel):
    title: str
    target: float
    deadline: str

class DepositRequest(BaseModel):
    amount: float

@app.get("/api/customer/budget")
async def get_budget(current_user: dict = Depends(get_current_user)):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM Users WHERE email = ?", (current_user["email"],))
    user_row = cursor.fetchone()
    if not user_row:
        conn.close()
        raise HTTPException(status_code=404, detail="User not found")
    cursor.execute("SELECT allocated FROM budgets WHERE user_id = ?", (user_row["id"],))
    row = cursor.fetchone()
    conn.close()
    if row:
        return {"allocated": row["allocated"]}
    return {"allocated": 60000.0}

@app.post("/api/customer/budget")
async def update_budget(req: BudgetUpdate, current_user: dict = Depends(get_current_user)):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM Users WHERE email = ?", (current_user["email"],))
    user_row = cursor.fetchone()
    if not user_row:
        conn.close()
        raise HTTPException(status_code=404, detail="User not found")
    user_id = user_row["id"]
    cursor.execute("INSERT OR REPLACE INTO budgets (user_id, allocated) VALUES (?, ?)", (user_id, req.allocated))
    conn.commit()
    conn.close()
    log_audit(current_user["email"], "update_budget", f"Updated monthly budget cap to ₹{req.allocated:,.2f}", status="success")
    return {"status": "success", "message": "Budget cap updated."}

@app.get("/api/customer/goals")
async def get_goals(current_user: dict = Depends(get_current_user)):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM Users WHERE email = ?", (current_user["email"],))
    user_row = cursor.fetchone()
    if not user_row:
        conn.close()
        return []
    cursor.execute("SELECT * FROM savings_goals WHERE user_id = ?", (user_row["id"],))
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

@app.post("/api/customer/goals")
async def create_goal(req: SavingsGoalCreate, current_user: dict = Depends(get_current_user)):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM Users WHERE email = ?", (current_user["email"],))
    user_row = cursor.fetchone()
    if not user_row:
        conn.close()
        raise HTTPException(status_code=404, detail="User not found")
    user_id = user_row["id"]
    cursor.execute(
        "INSERT INTO savings_goals (user_id, title, target, current, deadline) VALUES (?, ?, ?, 0, ?)",
        (user_id, req.title, req.target, req.deadline)
    )
    conn.commit()
    conn.close()
    log_audit(current_user["email"], "create_goal", f"Created savings goal: {req.title} for ₹{req.target:,.2f}", status="success")
    return {"status": "success", "message": "Savings goal created."}

@app.post("/api/customer/goals/{goal_id}/deposit")
async def deposit_goal(goal_id: int, req: DepositRequest, current_user: dict = Depends(get_current_user)):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM Users WHERE email = ?", (current_user["email"],))
    user_row = cursor.fetchone()
    if not user_row:
        conn.close()
        raise HTTPException(status_code=404, detail="User not found")
    cursor.execute("SELECT * FROM savings_goals WHERE id = ? AND user_id = ?", (goal_id, user_row["id"]))
    goal = cursor.fetchone()
    if not goal:
        conn.close()
        raise HTTPException(status_code=404, detail="Savings goal not found")
    new_balance = goal["current"] + req.amount
    cursor.execute("UPDATE savings_goals SET current = ? WHERE id = ?", (new_balance, goal_id))
    conn.commit()
    conn.close()
    log_audit(current_user["email"], "deposit_goal", f"Deposited ₹{req.amount:,.2f} into goal: {goal['title']}", status="success")
    return {"status": "success", "message": "Deposit recorded."}

@app.get("/api/notifications")
async def get_notifications(current_user: dict = Depends(get_current_user)):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM Users WHERE email = ?", (current_user["email"],))
    user_row = cursor.fetchone()
    if not user_row:
        conn.close()
        return []
    cursor.execute("SELECT * FROM Notifications WHERE user_id = ? ORDER BY created_at DESC", (user_row["id"],))
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

@app.post("/api/notifications/{n_id}/read")
async def mark_notification_read(n_id: int, current_user: dict = Depends(get_current_user)):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM Users WHERE email = ?", (current_user["email"],))
    user_row = cursor.fetchone()
    if not user_row:
        conn.close()
        raise HTTPException(status_code=404, detail="User not found")
    cursor.execute("UPDATE Notifications SET is_read = 1 WHERE id = ? AND user_id = ?", (n_id, user_row["id"]))
    conn.commit()
    conn.close()
    return {"status": "success", "message": "Notification marked as read."}

@app.post("/api/admin/backup")
async def backup_database(current_user: dict = Depends(check_permission("view_system_health"))):
    from database import DB_PATH
    log_audit(current_user["email"], "backup_db", "Triggered database backup snapshot download", status="success")
    return FileResponse(
        path=DB_PATH,
        filename="omnisense_production_backup.db",
        media_type="application/octet-stream"
    )

@app.get("/api/admin/ai-monitoring")
async def get_ai_monitoring(current_user: dict = Depends(check_permission("view_system_health"))):
    return {
        "avg_latency_ms": 320,
        "token_usage": [
            {"date": "07-08", "tokens": 42000},
            {"date": "07-09", "tokens": 58000},
            {"date": "07-10", "tokens": 71000},
            {"date": "07-11", "tokens": 49000},
            {"date": "07-12", "tokens": 85000},
            {"date": "07-13", "tokens": 124000}
        ],
        "guardrail_exceptions": 0,
        "hallucination_index": 0.01
    }

@app.get("/api/financial/wealth")
async def get_wealth_analytics(current_user: dict = Depends(get_current_user)):
    return {
        "allocation": [
            {"name": "Equities", "value": 45},
            {"name": "Debt Funds", "value": 30},
            {"name": "FD Sweep", "value": 15},
            {"name": "Gold", "value": 10}
        ],
        "watchlist": [
            {"symbol": "TATASTEEL", "name": "Tata Steel Ltd", "price": 142.50, "change": 1.2},
            {"symbol": "RELIANCE", "name": "Reliance Industries Ltd", "price": 2420.10, "change": -0.8},
            {"symbol": "HDFCBANK", "name": "HDFC Bank Ltd", "price": 1610.40, "change": 0.4},
            {"symbol": "ADANIENT", "name": "Adani Enterprises Ltd", "price": 3120.00, "change": -2.4}
        ],
        "tax_optimizations": [
            {"title": "Section 80C ELSS", "desc": "Invest up to ₹1,50,000 in equity linked savings mutual funds to save up to ₹46,800 in taxes.", "status": "Optimized"},
            {"title": "Section 80D Health Premium", "desc": "Claim up to ₹25,000 for family health insurance premiums.", "status": "Action Needed"}
        ]
    }

@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown."""
    print("[SERVER] Project Omni-Sense API shutting down...")
    
    # Close all WebSocket connections
    for client_id, connections in manager.active_connections.items():
        for connection in connections:
            try:
                await connection.close()
            except:
                pass


if __name__ == "__main__":
    import uvicorn
    
    print("=" * 60)
    print("PROJECT OMNI-SENSE - TIERED SPATIAL CREDIT INTELLIGENCE")
    print("Early Warning System API Server")
    print("=" * 60)
    
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
