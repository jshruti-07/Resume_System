import secrets
from typing import Any
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.exceptions import DuplicateException, UnauthorizedException, NotFoundException
from app.core.security import create_access_token, hash_password, verify_password
from app.models.user import User


class AuthService:
    VALID_ROLES = {"admin", "hr", "viewer"}

    @staticmethod
    def register(
        db: Session,
        name: str,
        email: str,
        password: str,
        role: str = "hr",
    ) -> Any:
        from app.models.vendor import Vendor
        processed_email = email.lower().strip()
        
        # Check both tables for existing email
        existing_user = db.query(User).filter(User.email == processed_email).first()
        existing_vendor = db.query(Vendor).filter(Vendor.email == processed_email).first()
        
        if existing_user is not None or existing_vendor is not None:
            raise DuplicateException(message="Email already registered")

        normalized_role = role.strip().lower()
        
        if normalized_role == "vendor":
            vendor = Vendor(
                name=name.strip(),
                email=processed_email,
                hashed_password=hash_password(password),
                company_name=name.strip(), # Use name as company_name for self-signup
                is_active=True
            )
            db.add(vendor)
            db.commit()
            db.refresh(vendor)
            return vendor
        else:
            if normalized_role not in AuthService.VALID_ROLES:
                normalized_role = "hr"
            user = User(
                name=name.strip(),
                email=processed_email,
                hashed_password=hash_password(password),
                role=normalized_role,
                is_active=True,
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            return user

    @staticmethod
    def login(db: Session, email: str, password: str) -> dict:
        processed_email = email.lower().strip()
        
        # 1. Try HR User
        user = db.query(User).filter(User.email == processed_email).first()
        if user:
            if not verify_password(password, user.hashed_password):
                raise UnauthorizedException(message="Invalid credentials")
            if not user.is_active:
                raise UnauthorizedException(message="User is inactive")
            
            access_token = create_access_token(
                data={"sub": user.email, "role": user.role},
                expires_delta=timedelta(minutes=settings.access_token_expire_minutes),
            )
            return {
                "access_token": access_token,
                "token_type": "bearer",
                "user": user,
                "role": user.role
            }

        # 2. Try Vendor
        from app.models.vendor import Vendor
        vendor = db.query(Vendor).filter(Vendor.email == processed_email).first()
        if vendor:
            if not verify_password(password, vendor.hashed_password):
                raise UnauthorizedException(message="Invalid credentials")
            if not vendor.is_active:
                raise UnauthorizedException(message="Vendor account is inactive")
            
            access_token = create_access_token(
                data={"sub": vendor.email, "role": "vendor", "vendor_id": vendor.id},
                expires_delta=timedelta(minutes=settings.access_token_expire_minutes),
            )
            return {
                "access_token": access_token,
                "token_type": "bearer",
                "vendor": vendor,
                "role": "vendor"
            }

        raise UnauthorizedException(message="Invalid credentials")

    @staticmethod
    def request_password_reset(db: Session, email: str) -> str:
        processed_email = email.lower().strip()
        print(f"DEBUG: Requesting reset for '{processed_email}'")
        user = db.query(User).filter(User.email == processed_email).first()
        if user is None:
            print(f"DEBUG: User not found for '{processed_email}'")
            # For debugging, let's see what users are in the DB
            all_emails = [u.email for u in db.query(User).all()]
            print(f"DEBUG: Available users: {all_emails}")
            raise NotFoundException(message="User not found")

        token = secrets.token_urlsafe(32)
        user.reset_token = token
        user.reset_token_expires = datetime.now(timezone.utc) + timedelta(hours=1)
        
        db.commit()
        
        # In a real app, send email here
        print(f"DEBUG: Password reset request for {email}. Token: {token}")
        print(f"DEBUG: Reset link: http://localhost:5173/reset-password/{token}")
        
        return token

    @staticmethod
    def reset_password(db: Session, token: str, new_password: str) -> User:
        user = db.query(User).filter(User.reset_token == token).first()
        
        if user is None:
            raise UnauthorizedException(message="Invalid or expired token")
            
        if user.reset_token_expires < datetime.now(timezone.utc):
            raise UnauthorizedException(message="Token has expired")
            
        user.hashed_password = hash_password(new_password)
        user.reset_token = None
        user.reset_token_expires = None
        
        db.commit()
        db.refresh(user)
        return user
