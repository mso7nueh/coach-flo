from sqlalchemy import Column, String, Integer, Boolean, Float, DateTime, ForeignKey, Text, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import enum


class UserRole(str, enum.Enum):
    CLIENT = "client"
    TRAINER = "trainer"


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, index=True)
    full_name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    phone = Column(String, unique=True, index=True, nullable=True)
    hashed_password = Column(String, nullable=False)
    role = Column(SQLEnum(UserRole), nullable=False)
    onboarding_seen = Column(Boolean, default=False)
    locale = Column(String, default="ru")
    avatar = Column(String, nullable=True)
    trainer_connection_code = Column(String, nullable=True, unique=True, index=True)
    trainer_id = Column(String, ForeignKey("users.id"), nullable=True)
    phone_verified = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Связи
    trainer = relationship("User", remote_side=[id], foreign_keys=[trainer_id])
    clients = relationship("User", foreign_keys=[trainer_id])
    onboarding = relationship("Onboarding", back_populates="user", uselist=False)
    sms_verifications = relationship("SMSVerification", back_populates="user")


class SMSVerification(Base):
    __tablename__ = "sms_verifications"

    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=True)
    phone = Column(String, nullable=False, index=True)
    code = Column(String, nullable=False)
    verified = Column(Boolean, default=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="sms_verifications")


class Onboarding(Base):
    __tablename__ = "onboardings"

    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"), unique=True, nullable=False)
    weight = Column(Float, nullable=True)
    height = Column(Float, nullable=True)
    age = Column(Integer, nullable=True)
    activity_level = Column(String, nullable=True)  # low, medium, high
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    user = relationship("User", back_populates="onboarding")


class OnboardingGoal(Base):
    __tablename__ = "onboarding_goals"

    id = Column(String, primary_key=True, index=True)
    onboarding_id = Column(String, ForeignKey("onboardings.id"), nullable=False)
    goal = Column(String, nullable=False)


class OnboardingRestriction(Base):
    __tablename__ = "onboarding_restrictions"

    id = Column(String, primary_key=True, index=True)
    onboarding_id = Column(String, ForeignKey("onboardings.id"), nullable=False)
    restriction = Column(String, nullable=False)

