# =============================================================
# ReleaseGuard AI — Built with IBM Bob
# © IBM Bob | ibm.com/products/watsonx
# =============================================================


import hashlib
import hmac
import os
import re
import secrets
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, HTTPException, Request, Response

from ..database import CURRENT_USER_ID, get_db

router = APIRouter(prefix="/api/auth", tags=["authentication"])

SESSION_COOKIE_NAME = "releaseguard_session"
SESSION_MAX_AGE = 60 * 60 * 24 * 7
PASSWORD_SCRYPT_N = 16384
PASSWORD_SCRYPT_R = 8
PASSWORD_SCRYPT_P = 1
EMAIL_PATTERN = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")


def _hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    password_hash = hashlib.scrypt(
        password.encode("utf-8"),
        salt=salt,
        n=PASSWORD_SCRYPT_N,
        r=PASSWORD_SCRYPT_R,
        p=PASSWORD_SCRYPT_P,
    )
    return f"scrypt${salt.hex()}${password_hash.hex()}"


def _verify_password(password: str, stored_hash: str) -> bool:
    try:
        algorithm, salt_hex, hash_hex = stored_hash.split("$", 2)
        if algorithm != "scrypt":
            return False
        salt = bytes.fromhex(salt_hex)
        expected_hash = bytes.fromhex(hash_hex)
        actual_hash = hashlib.scrypt(
            password.encode("utf-8"),
            salt=salt,
            n=PASSWORD_SCRYPT_N,
            r=PASSWORD_SCRYPT_R,
            p=PASSWORD_SCRYPT_P,
        )
        return hmac.compare_digest(actual_hash, expected_hash)
    except (ValueError, TypeError):
        return False


def _public_user(row):
    return {
        "id": row["id"],
        "name": row["name"],
        "email": row["email"],
        "role": "CONTRIBUTOR",
        "roleTitle": "Workspace member",
        "avatar": "",
        "clearanceLevel": "TIER_4_STANDARD",
        "organization": "ReleaseGuard",
        "department": "Workspace",
        "permissions": {
            "canOverrideVerdict": False,
            "canExecuteRollback": False,
            "canTriggerSimulations": False,
            "canConfigureWebhooks": False,
            "canApproveFinOps": False,
        },
        "mfaEnabled": False,
        "lastLogin": "Active now",
    }


def get_session_user(token: str):
    if not token:
        return None

    token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
    conn = get_db()
    row = conn.execute(
        """
        SELECT users.id, users.name, users.email
        FROM user_sessions
        JOIN users ON users.id = user_sessions.user_id
        WHERE user_sessions.token_hash = ?
          AND user_sessions.expires_at > ?
        """,
        (token_hash, datetime.now(timezone.utc).isoformat()),
    ).fetchone()
    conn.close()
    return _public_user(row) if row else None


def user_owns_repository(user_id: str, repo_id: str) -> bool:
    conn = get_db()
    row = conn.execute(
        "SELECT 1 FROM repositories WHERE id = ? AND owner_id = ?",
        (repo_id, user_id),
    ).fetchone()
    conn.close()
    return row is not None


def user_owns_pull_request(user_id: str, pr_id: str) -> bool:
    conn = get_db()
    row = conn.execute(
        """
        SELECT 1 FROM pull_requests p
        JOIN repositories r ON r.id = p.repo_id
        WHERE p.id = ? AND r.owner_id = ?
        """,
        (pr_id, user_id),
    ).fetchone()
    conn.close()
    return row is not None


def user_owns_incident(user_id: str, incident_id: str) -> bool:
    conn = get_db()
    row = conn.execute(
        """
        SELECT 1 FROM incidents i
        JOIN repositories r ON r.id = i.repo_id
        WHERE i.id = ? AND r.owner_id = ?
        """,
        (incident_id, user_id),
    ).fetchone()
    conn.close()
    return row is not None


def _issue_session(user_id: str, response: Response):
    token = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(seconds=SESSION_MAX_AGE)
    conn = get_db()
    conn.execute(
        """
        INSERT INTO user_sessions (id, user_id, token_hash, expires_at, created_at)
        VALUES (?, ?, ?, ?, ?)
        """,
        (uuid.uuid4().hex, user_id, token_hash, expires_at.isoformat(), now.isoformat()),
    )
    conn.commit()
    conn.close()

    secure_cookie = os.getenv("SESSION_COOKIE_SECURE", "").lower()
    if not secure_cookie:
        secure_cookie = "true" if os.getenv("ENVIRONMENT", "").lower() in {"production", "prod"} else "false"
    response.set_cookie(
        key=SESSION_COOKIE_NAME,
        value=token,
        max_age=SESSION_MAX_AGE,
        httponly=True,
        secure=secure_cookie == "true",
        samesite="none" if secure_cookie == "true" else "lax",
        path="/",
    )


def _request_user(request: Request):
    return get_session_user(request.cookies.get(SESSION_COOKIE_NAME, ""))


def set_current_user_id(user_id: str):
    return CURRENT_USER_ID.set(user_id)


def reset_current_user_id(context_token):
    CURRENT_USER_ID.reset(context_token)


@router.post("/register", status_code=201)
def register(payload: dict, response: Response):
    name = str((payload or {}).get("name", "")).strip()
    email = str((payload or {}).get("email", "")).strip().lower()
    password = str((payload or {}).get("password", ""))
    if not name or len(name) > 80:
        raise HTTPException(status_code=400, detail="Name must be between 1 and 80 characters")
    if len(email) > 254 or not EMAIL_PATTERN.fullmatch(email):
        raise HTTPException(status_code=400, detail="Enter a valid email address")
    if len(password) < 12 or len(password) > 256:
        raise HTTPException(status_code=400, detail="Password must be between 12 and 256 characters")

    user_id = f"user_{uuid.uuid4().hex}"
    now = datetime.now(timezone.utc).isoformat()
    conn = get_db()
    try:
        existing_user_count = conn.execute("SELECT COUNT(*) FROM users").fetchone()[0]
        conn.execute(
            "INSERT INTO users (id, name, email, password_hash, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
            (user_id, name, email, _hash_password(password), now, now),
        )
        conn.commit()
        if existing_user_count == 0:
            conn.execute("UPDATE repositories SET owner_id = ? WHERE owner_id IS NULL", (user_id,))
            conn.commit()
        user = conn.execute("SELECT id, name, email FROM users WHERE id = ?", (user_id,)).fetchone()
    except Exception as exc:
        conn.close()
        if "UNIQUE constraint failed" in str(exc):
            raise HTTPException(status_code=409, detail="An account with this email already exists") from exc
        raise
    conn.close()
    _issue_session(user_id, response)
    return _public_user(user)


@router.post("/login")
def login(payload: dict, response: Response):
    email = str((payload or {}).get("email", "")).strip().lower()
    password = str((payload or {}).get("password", ""))
    conn = get_db()
    user = conn.execute(
        "SELECT id, name, email, password_hash FROM users WHERE email = ? COLLATE NOCASE",
        (email,),
    ).fetchone()
    conn.close()
    if user is None or not _verify_password(password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    _issue_session(user["id"], response)
    return _public_user(user)


@router.get("/me")
def current_user(request: Request):
    user = _request_user(request)
    if user is None:
        raise HTTPException(status_code=401, detail="Authentication required")
    return user


@router.post("/logout")
def logout(request: Request, response: Response):
    token = request.cookies.get(SESSION_COOKIE_NAME, "")
    if token:
        token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
        conn = get_db()
        conn.execute("DELETE FROM user_sessions WHERE token_hash = ?", (token_hash,))
        conn.commit()
        conn.close()
    response.delete_cookie(key=SESSION_COOKIE_NAME, path="/", httponly=True, samesite="lax")
    return {"status": "signed_out"}