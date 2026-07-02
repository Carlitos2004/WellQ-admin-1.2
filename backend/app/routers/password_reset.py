import secrets
import uuid
import smtplib
import asyncio
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timedelta

from fastapi import APIRouter, Body, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.db.neon import get_db
from app.models_db import AdminUser, PasswordResetToken
from app.routers.auth import hash_password, verify_password

router = APIRouter(prefix="/api/auth", tags=["Recuperacion de password"])

RESET_EXPIRES = timedelta(minutes=10)
MAX_ATTEMPTS = 5

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    email: EmailStr
    code: str
    new_password: str

def send_email_sync(recipient_email: str, code: str):
    msg = MIMEMultipart("alternative")
    msg["Subject"] = "Codigo de recuperacion - WellQ Admin"
    msg["From"] = f"{settings.smtp_from_name} <{settings.smtp_user}>"
    msg["To"] = recipient_email

    html_content = f"""
        <div style="font-family:Arial,sans-serif;background:#020817;padding:24px;color:#e5faff;">
          <div style="max-width:520px;margin:auto;background:#07101d;border:1px solid rgba(34,211,238,.35);border-radius:16px;padding:28px;">
            <p style="color:#67e8f9;font-weight:700;margin:0 0 16px;">WellQ Admin</p>
            <h2 style="color:white;margin:0 0 12px;">Recuperacion de acceso</h2>
            <p style="color:#a8b3c7;">Usa este codigo para cambiar tu contrasena. Expira en 10 minutos.</p>
            <div style="margin:24px 0;padding:18px;border-radius:14px;background:rgba(34,211,238,.10);text-align:center;">
              <span style="font-size:32px;letter-spacing:8px;font-weight:800;color:#67e8f9;">{code}</span>
            </div>
            <p style="color:#64748b;font-size:12px;">Si no solicitaste este cambio, ignora este correo.</p>
          </div>
        </div>
    """
    
    part = MIMEText(html_content, "html")
    msg.attach(part)

    try:
        server = smtplib.SMTP(settings.smtp_host, settings.smtp_port)
        server.starttls()
        server.login(settings.smtp_user, settings.smtp_app_password)
        server.send_message(msg)
        server.quit()
    except Exception as exc:
        print(f"[SMTP] Error enviando correo: {exc}")
        raise exc

async def send_password_reset_email(email: str, code: str) -> None:
    if not settings.smtp_user or not settings.smtp_app_password:
        print(f"[WellQ Password Reset Local] email={email} code={code}")
        return

    try:
        await asyncio.to_thread(send_email_sync, email, code)
    except Exception as exc:
        print(f"[SMTP] email send failed: {exc}")
        raise HTTPException(
            status_code=502,
            detail="No se pudo enviar el correo de recuperacion.",
        )

def public_forgot_response() -> dict:
    return {
        "status": "success",
        "message": "Si el correo existe, enviaremos un codigo de recuperacion.",
        "data": {},
    }

async def get_latest_valid_reset(
    db: AsyncSession,
    email: str,
) -> PasswordResetToken | None:
    now = datetime.utcnow()

    result = await db.execute(
        select(PasswordResetToken)
        .where(PasswordResetToken.email == email)
        .where(PasswordResetToken.used_at.is_(None))
        .where(PasswordResetToken.expires_at > now)
        .order_by(desc(PasswordResetToken.created_at))
    )

    return result.scalars().first()

# ==============================================================================
# ENDPOINT: #68 - POST /api/password-reset/forgot-password
# Descripción: Solicitar codigo de recuperacion de password
# ==============================================================================
@router.post(
    "/forgot-password",
    summary="Solicitar codigo de recuperacion de password",
    status_code=status.HTTP_200_OK,
)
async def forgot_password(
    payload: ForgotPasswordRequest = Body(...),
    db: AsyncSession = Depends(get_db),
):
    email = payload.email.strip().lower()

    result = await db.execute(select(AdminUser).where(AdminUser.email == email))
    user: AdminUser | None = result.scalars().first()

    if not user:
        return public_forgot_response()

    code = f"{secrets.randbelow(1_000_000):06d}"

    reset = PasswordResetToken(
        reset_id=f"rst-{uuid.uuid4().hex[:12]}",
        user_id=user.user_id,
        email=user.email,
        code_hash=hash_password(code),
        expires_at=datetime.utcnow() + RESET_EXPIRES,
    )

    await send_password_reset_email(user.email, code)

    db.add(reset)
    await db.commit()

    return public_forgot_response()

# ==============================================================================
# ENDPOINT: #69 - POST /api/password-reset/verify-reset-code
# Descripción: Verificar codigo de recuperacion
# ==============================================================================
@router.post(
    "/verify-reset-code",
    summary="Verificar codigo de recuperacion",
    status_code=status.HTTP_200_OK,
)
async def verify_reset_code(
    payload: ResetPasswordRequest = Body(...),
    db: AsyncSession = Depends(get_db),
):
    email = payload.email.strip().lower()
    code = payload.code.strip()

    reset = await get_latest_valid_reset(db, email)

    if not reset:
        raise HTTPException(status_code=400, detail="Codigo invalido o expirado")

    if reset.attempts >= MAX_ATTEMPTS:
        raise HTTPException(status_code=429, detail="Demasiados intentos")

    if not verify_password(code, reset.code_hash):
        reset.attempts += 1
        db.add(reset)
        await db.commit()
        raise HTTPException(status_code=400, detail="Codigo invalido o expirado")

    return {
        "status": "success",
        "message": "Codigo verificado correctamente.",
    }

# ==============================================================================
# ENDPOINT: #70 - POST /api/password-reset/reset-password
# Descripción: Cambiar password usando codigo de recuperacion
# ==============================================================================
@router.post(
    "/reset-password",
    summary="Cambiar password usando codigo de recuperacion",
    status_code=status.HTTP_200_OK,
)
async def reset_password(
    payload: ResetPasswordRequest = Body(...),
    db: AsyncSession = Depends(get_db),
):
    email = payload.email.strip().lower()
    code = payload.code.strip()
    new_password = payload.new_password

    if len(new_password) < 8:
        raise HTTPException(
            status_code=400,
            detail="La contrasena debe tener al menos 8 caracteres",
        )

    result = await db.execute(select(AdminUser).where(AdminUser.email == email))
    user: AdminUser | None = result.scalars().first()

    if not user:
        raise HTTPException(status_code=400, detail="Codigo invalido o expirado")

    reset = await get_latest_valid_reset(db, email)

    if not reset:
        raise HTTPException(status_code=400, detail="Codigo invalido o expirado")

    if reset.attempts >= MAX_ATTEMPTS:
        raise HTTPException(status_code=429, detail="Demasiados intentos")

    if not verify_password(code, reset.code_hash):
        reset.attempts += 1
        db.add(reset)
        await db.commit()
        raise HTTPException(status_code=400, detail="Codigo invalido o expirado")

    user.password_hash = hash_password(new_password)
    reset.used_at = datetime.utcnow()

    db.add(user)
    db.add(reset)
    await db.commit()

    return {
        "status": "success",
        "message": "Contrasena actualizada correctamente.",
    }