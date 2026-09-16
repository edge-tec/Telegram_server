import os
import uvicorn
from fastapi import FastAPI, HTTPException, Header, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, List
from client_manager import manager
from security import decrypt_data

app = FastAPI(
    title="Telegram MTProto Bridge Microservice",
    version="1.0.0",
    description="MTProto API bridge daemon using Telethon for personal Telegram automation"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BRIDGE_SECRET = os.getenv("BRIDGE_WEBHOOK_SECRET", "bridge-internal-secret-key-2026")

def verify_internal_secret(x_bridge_secret: Optional[str] = Header(None)):
    if x_bridge_secret != BRIDGE_SECRET:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing X-Bridge-Secret header"
        )

# Request Models
class SendCodeRequest(BaseModel):
    phone: str = Field(..., description="Phone number with country code")
    api_id: int = Field(..., description="Telegram API ID from my.telegram.org")
    api_hash: str = Field(..., description="Telegram API Hash from my.telegram.org")

class VerifyCodeRequest(BaseModel):
    auth_id: str = Field(..., description="Session ID returned from send-code")
    code: str = Field(..., description="OTP Code received via Telegram/SMS")
    password: Optional[str] = Field(None, description="2FA Cloud password if enabled")

class StartListenerRequest(BaseModel):
    account_id: str
    api_id: int
    api_hash: str
    session_string: str

class StopListenerRequest(BaseModel):
    account_id: str

class SendMessageRequest(BaseModel):
    account_id: str
    recipient_id: int
    content: Optional[str] = None
    media_path: Optional[str] = None
    message_type: str = "text"

@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "telegram-bridge",
        "active_clients": len(manager.active_clients)
    }

@app.get("/api/status", dependencies=[Depends(verify_internal_secret)])
async def get_system_status():
    return manager.get_status()

@app.post("/api/auth/send-code", dependencies=[Depends(verify_internal_secret)])
async def send_login_code(req: SendCodeRequest):
    try:
        res = await manager.initiate_login(
            phone=req.phone.strip(),
            api_id=req.api_id,
            api_hash=req.api_hash.strip()
        )
        return res
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/auth/verify-code", dependencies=[Depends(verify_internal_secret)])
async def verify_login_code(req: VerifyCodeRequest):
    try:
        res = await manager.complete_login(
            auth_id=req.auth_id,
            code=req.code.strip(),
            password=req.password
        )
        return res
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/accounts/start-listener", dependencies=[Depends(verify_internal_secret)])
async def start_listener(req: StartListenerRequest):
    try:
        success = await manager.start_account_listener(
            account_id=req.account_id,
            api_id=req.api_id,
            api_hash=req.api_hash,
            session_string=req.session_string
        )
        if not success:
            raise HTTPException(status_code=400, detail="Could not authorize session. Session may be expired.")
        return {"success": True, "account_id": req.account_id, "status": "connected"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/accounts/stop-listener", dependencies=[Depends(verify_internal_secret)])
async def stop_listener(req: StopListenerRequest):
    stopped = await manager.stop_account_listener(req.account_id)
    return {"success": True, "stopped": stopped, "account_id": req.account_id}

@app.post("/api/messages/send", dependencies=[Depends(verify_internal_secret)])
async def send_message(req: SendMessageRequest):
    try:
        result = await manager.send_message(
            account_id=req.account_id,
            recipient_id=req.recipient_id,
            content=req.content,
            media_path=req.media_path,
            message_type=req.message_type
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

if __name__ == "__main__":
    port = int(os.getenv("BRIDGE_PORT", "8001"))
    uvicorn.run(app, host="0.0.0.0", port=port)
