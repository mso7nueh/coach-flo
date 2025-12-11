from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime
from app.models import UserRole


# User schemas
class UserBase(BaseModel):
    full_name: str
    email: EmailStr
    phone: Optional[str] = None
    role: UserRole


class UserCreate(UserBase):
    password: str = Field(..., min_length=6)


class UserRegister(UserCreate):
    trainer_code: Optional[str] = None


class UserResponse(UserBase):
    id: str
    onboarding_seen: bool
    locale: str
    avatar: Optional[str] = None
    trainer_connection_code: Optional[str] = None
    phone_verified: bool
    created_at: datetime

    class Config:
        from_attributes = True


class UserWithTrainer(UserResponse):
    trainer: Optional["UserResponse"] = None


# Auth schemas
class LoginRequest(BaseModel):
    email: EmailStr = Field(..., description="Email пользователя", example="user@example.com")
    password: str = Field(..., min_length=6, description="Пароль (минимум 6 символов)", example="password123")


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    user_id: Optional[str] = None


class LoginResponse(BaseModel):
    token: str = Field(..., description="JWT токен для аутентификации")
    user: UserResponse = Field(..., description="Информация о пользователе")


# SMS Verification schemas
class SendSMSRequest(BaseModel):
    phone: str = Field(..., description="Номер телефона в формате +7 (999) 123-45-67", example="+7 (999) 123-45-67")


class VerifySMSRequest(BaseModel):
    phone: str = Field(..., description="Номер телефона", example="+7 (999) 123-45-67")
    code: str = Field(..., description="4-значный SMS код", example="1234", min_length=4, max_length=4)


class VerifySMSResponse(BaseModel):
    verified: bool = Field(..., description="Статус верификации")
    message: str = Field(..., description="Сообщение о результате")


# Registration schemas
class RegisterStep1Request(BaseModel):
    full_name: str = Field(..., description="Полное имя пользователя", example="Иван Иванов", min_length=2)
    email: EmailStr = Field(..., description="Email пользователя", example="ivan@example.com")
    password: str = Field(..., min_length=6, description="Пароль (минимум 6 символов)", example="password123")
    phone: str = Field(..., description="Номер телефона в формате +7 (999) 123-45-67", example="+7 (999) 123-45-67")
    role: UserRole = Field(..., description="Роль пользователя: client или trainer", example="client")
    trainer_code: Optional[str] = Field(None, description="Код подключения тренера (только для клиентов)", example="TRAINER123")


class RegisterStep2Request(BaseModel):
    phone: str = Field(..., description="Номер телефона", example="+7 (999) 123-45-67")
    code: str = Field(..., description="4-значный SMS код", example="1234", min_length=4, max_length=4)


class RegisterResponse(BaseModel):
    token: str = Field(..., description="JWT токен для аутентификации")
    user: UserResponse = Field(..., description="Информация о пользователе")
    requires_onboarding: bool = Field(..., description="Требуется ли прохождение онбординга")


# Onboarding schemas
class OnboardingMetrics(BaseModel):
    weight: Optional[float] = Field(None, description="Вес в килограммах", example=75.5, ge=30, le=200)
    height: Optional[float] = Field(None, description="Рост в сантиметрах", example=180, ge=100, le=250)
    age: Optional[int] = Field(None, description="Возраст", example=30, ge=14, le=100)
    goals: Optional[List[str]] = Field(default=[], description="Список целей", example=["weight_loss", "muscle_gain"])
    restrictions: Optional[List[str]] = Field(default=[], description="Список ограничений", example=["no_dairy", "vegetarian"])
    activity_level: Optional[str] = Field(None, description="Уровень активности: low, medium, high", example="medium")


class OnboardingResponse(BaseModel):
    id: str
    user_id: str
    weight: Optional[float] = None
    height: Optional[float] = None
    age: Optional[int] = None
    goals: List[str] = []
    restrictions: List[str] = []
    activity_level: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

