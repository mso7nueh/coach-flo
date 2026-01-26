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
    notification_settings = Column(Text, nullable=True)  # JSON строка с настройками уведомлений
    timezone = Column(String, nullable=True)  # Часовой пояс пользователя (IANA Time Zone Database)
    # Поля для клиентов (управляются тренером)
    client_format = Column(String, nullable=True)  # 'online', 'offline', 'both'
    workouts_package = Column(Integer, nullable=True)  # Количество тренировок в пакете
    package_expiry_date = Column(DateTime(timezone=True), nullable=True)  # Дата окончания пакета
    is_active = Column(Boolean, default=True)  # Активен ли клиент
    
    # Subscription fields
    subscription_plan = Column(String, nullable=True)  # starter, pro, studio, enterprise
    subscription_expires_at = Column(DateTime(timezone=True), nullable=True)
    yookassa_payment_id = Column(String, nullable=True)  # Last payment ID
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Связи
    trainer = relationship("User", remote_side=[id], foreign_keys=[trainer_id])
    clients = relationship("User", foreign_keys=[trainer_id], overlaps="trainer")
    onboarding = relationship("Onboarding", back_populates="user", uselist=False)
    sms_verifications = relationship("SMSVerification", back_populates="user")
    # Relationships - SQLAlchemy определит foreign_keys автоматически из ForeignKey определений
    workouts = relationship("Workout", back_populates="user", lazy="select", foreign_keys="[Workout.user_id]")
    trainer_workouts = relationship("Workout", back_populates="trainer", lazy="select", foreign_keys="[Workout.trainer_id]")
    training_programs = relationship("TrainingProgram", back_populates="user", lazy="select")
    body_metrics = relationship("BodyMetric", back_populates="user", lazy="select")
    exercise_metrics = relationship("ExerciseMetric", back_populates="user", lazy="select")
    nutrition_entries = relationship("NutritionEntry", back_populates="user", lazy="select")
    payments_as_trainer = relationship("Payment", back_populates="trainer", lazy="select", foreign_keys="[Payment.trainer_id]")
    payments_as_client = relationship("Payment", back_populates="client", lazy="select", foreign_keys="[Payment.client_id]")
    exercises = relationship("Exercise", back_populates="trainer", lazy="select", foreign_keys="[Exercise.trainer_id]")
    client_exercises = relationship("Exercise", back_populates="client", lazy="select", foreign_keys="[Exercise.client_id]")
    trainer_notes = relationship("TrainerNote", back_populates="trainer", lazy="select", foreign_keys="[TrainerNote.trainer_id]")
    client_notes = relationship("TrainerNote", back_populates="client", lazy="select", foreign_keys="[TrainerNote.client_id]")
    user_goals = relationship("UserGoal", back_populates="user", lazy="select")
    progress_photos = relationship("ProgressPhoto", back_populates="user", lazy="select")


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


class PendingRegistration(Base):
    __tablename__ = "pending_registrations"

    id = Column(String, primary_key=True, index=True)
    phone = Column(String, nullable=False, index=True)
    full_name = Column(String, nullable=False)
    email = Column(String, nullable=False, index=True)
    hashed_password = Column(String, nullable=False)
    role = Column(SQLEnum(UserRole), nullable=False)
    trainer_id = Column(String, ForeignKey("users.id"), nullable=True)
    trainer_connection_code = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True), nullable=False)


# Workout models
class AttendanceStatus(str, enum.Enum):
    SCHEDULED = "scheduled"
    COMPLETED = "completed"
    MISSED = "missed"


class WorkoutFormat(str, enum.Enum):
    ONLINE = "online"
    OFFLINE = "offline"


class Workout(Base):
    __tablename__ = "workouts"

    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    trainer_id = Column(String, ForeignKey("users.id"), nullable=True, index=True)
    title = Column(String, nullable=False)
    start = Column(DateTime(timezone=True), nullable=False, index=True)
    end = Column(DateTime(timezone=True), nullable=False)
    location = Column(String, nullable=True)
    attendance = Column(SQLEnum(AttendanceStatus), default=AttendanceStatus.SCHEDULED)
    coach_note = Column(Text, nullable=True)
    program_day_id = Column(String, ForeignKey("program_days.id"), nullable=True)
    format = Column(SQLEnum(WorkoutFormat), nullable=True)
    recurrence_series_id = Column(String, nullable=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    user = relationship("User", foreign_keys=[user_id])
    trainer = relationship("User", foreign_keys=[trainer_id])


# Training Program models
class TrainingProgram(Base):
    __tablename__ = "training_programs"

    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    owner = Column(String, nullable=False)  # 'trainer' or 'client'
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    user = relationship("User")
    days = relationship("ProgramDay", back_populates="program", cascade="all, delete-orphan")


class ProgramDay(Base):
    __tablename__ = "program_days"

    id = Column(String, primary_key=True, index=True)
    program_id = Column(String, ForeignKey("training_programs.id"), nullable=False, index=True)
    name = Column(String, nullable=False)
    order = Column(Integer, nullable=False, default=0)
    notes = Column(Text, nullable=True)
    owner = Column(String, nullable=False)  # 'trainer' or 'client'
    source_template_id = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    program = relationship("TrainingProgram", back_populates="days")
    blocks = relationship("ProgramBlock", back_populates="day", cascade="all, delete-orphan", order_by="ProgramBlock.order")


class ProgramBlockType(str, enum.Enum):
    WARMUP = "warmup"
    MAIN = "main"
    COOLDOWN = "cooldown"


class ProgramBlock(Base):
    __tablename__ = "program_blocks"

    id = Column(String, primary_key=True, index=True)
    day_id = Column(String, ForeignKey("program_days.id"), nullable=False, index=True)
    type = Column(SQLEnum(ProgramBlockType), nullable=False)
    title = Column(String, nullable=False)
    order = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    day = relationship("ProgramDay", back_populates="blocks")
    exercises = relationship("ProgramExercise", back_populates="block", cascade="all, delete-orphan", order_by="ProgramExercise.order")


class ProgramExercise(Base):
    __tablename__ = "program_exercises"

    id = Column(String, primary_key=True, index=True)
    block_id = Column(String, ForeignKey("program_blocks.id"), nullable=False, index=True)
    title = Column(String, nullable=False)
    sets = Column(Integer, nullable=False, default=1)
    reps = Column(Integer, nullable=True)
    duration = Column(String, nullable=True)  # e.g., "8 мин"
    rest = Column(String, nullable=True)  # e.g., "90 сек"
    weight = Column(String, nullable=True)  # e.g., "70 кг"
    description = Column(Text, nullable=True)
    video_url = Column(String(500), nullable=True)
    order = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    block = relationship("ProgramBlock", back_populates="exercises")


# Metrics models
class BodyMetric(Base):
    __tablename__ = "body_metrics"

    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    label = Column(String, nullable=False)
    unit = Column(String, nullable=False)
    target = Column(Float, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User")
    entries = relationship("BodyMetricEntry", back_populates="metric", cascade="all, delete-orphan")


class BodyMetricEntry(Base):
    __tablename__ = "body_metric_entries"

    id = Column(String, primary_key=True, index=True)
    metric_id = Column(String, ForeignKey("body_metrics.id"), nullable=False, index=True)
    value = Column(Float, nullable=False)
    recorded_at = Column(DateTime(timezone=True), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    metric = relationship("BodyMetric", back_populates="entries")


class ExerciseMetric(Base):
    __tablename__ = "exercise_metrics"

    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    label = Column(String, nullable=False)
    muscle_group = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User")
    entries = relationship("ExerciseMetricEntry", back_populates="exercise_metric", cascade="all, delete-orphan")


class ExerciseMetricEntry(Base):
    __tablename__ = "exercise_metric_entries"

    id = Column(String, primary_key=True, index=True)
    exercise_metric_id = Column(String, ForeignKey("exercise_metrics.id"), nullable=False, index=True)
    date = Column(DateTime(timezone=True), nullable=False, index=True)
    weight = Column(Float, nullable=True)
    repetitions = Column(Integer, nullable=True)
    sets = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    exercise_metric = relationship("ExerciseMetric", back_populates="entries")


# Nutrition models
class NutritionEntry(Base):
    __tablename__ = "nutrition_entries"

    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    date = Column(DateTime(timezone=True), nullable=False, index=True)
    calories = Column(Float, nullable=False)
    proteins = Column(Float, nullable=True)
    fats = Column(Float, nullable=True)
    carbs = Column(Float, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    user = relationship("User")


# Finance models
class PaymentType(str, enum.Enum):
    SINGLE = "single"
    PACKAGE = "package"
    SUBSCRIPTION = "subscription"


class Payment(Base):
    __tablename__ = "payments"

    id = Column(String, primary_key=True, index=True)
    trainer_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    client_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    amount = Column(Float, nullable=False)
    date = Column(DateTime(timezone=True), nullable=False, index=True)
    type = Column(SQLEnum(PaymentType), nullable=False)
    package_size = Column(Integer, nullable=True)
    remaining_sessions = Column(Integer, nullable=True)
    subscription_days = Column(Integer, nullable=True)
    next_payment_date = Column(DateTime(timezone=True), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    trainer = relationship("User", foreign_keys=[trainer_id])
    client = relationship("User", foreign_keys=[client_id])


# Exercise Library models
class Exercise(Base):
    __tablename__ = "exercises"

    id = Column(String, primary_key=True, index=True)
    trainer_id = Column(String, ForeignKey("users.id"), nullable=True, index=True)  # null = общая библиотека
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    muscle_groups = Column(String, nullable=True)  # comma-separated
    equipment = Column(String, nullable=True)
    difficulty = Column(String, nullable=True)  # beginner, intermediate, advanced
    starting_position = Column(Text, nullable=True)
    execution_instructions = Column(Text, nullable=True)
    video_url = Column(String(500), nullable=True)
    notes = Column(Text, nullable=True)
    visibility = Column(String(20), default='all', nullable=False)  # 'all', 'client', 'trainer'
    client_id = Column(String, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    trainer = relationship("User", foreign_keys=[trainer_id], back_populates="exercises")
    client = relationship("User", foreign_keys=[client_id], back_populates="client_exercises")


# Trainer Notes models
class TrainerNote(Base):
    __tablename__ = "trainer_notes"

    id = Column(String, primary_key=True, index=True)
    trainer_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    client_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String, nullable=False)
    content = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    trainer = relationship("User", foreign_keys=[trainer_id])
    client = relationship("User", foreign_keys=[client_id])


# User Goals models
class UserGoal(Base):
    __tablename__ = "user_goals"

    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    headline = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    milestone = Column(String, nullable=False)
    target_date = Column(DateTime(timezone=True), nullable=False)
    progress = Column(Integer, nullable=True)  # 0-100
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    user = relationship("User", back_populates="user_goals")


# Progress Photos models
class ProgressPhoto(Base):
    __tablename__ = "progress_photos"

    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    date = Column(DateTime(timezone=True), nullable=False, index=True)
    url = Column(String, nullable=False)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="progress_photos")


# Workout Template models
class WorkoutTemplate(Base):
    __tablename__ = "workout_templates"

    id = Column(String, primary_key=True, index=True)
    trainer_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    duration = Column(Integer, nullable=True)
    level = Column(String(20), nullable=True)  # beginner, intermediate, advanced
    goal = Column(String(20), nullable=True)  # weight_loss, muscle_gain, endurance, flexibility, general
    muscle_groups = Column(Text, nullable=True)  # JSON array
    equipment = Column(Text, nullable=True)  # JSON array
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    trainer = relationship("User", foreign_keys=[trainer_id])
    exercises = relationship("WorkoutTemplateExercise", back_populates="template", cascade="all, delete-orphan", order_by="WorkoutTemplateExercise.order_index")


class WorkoutTemplateExercise(Base):
    __tablename__ = "workout_template_exercises"

    id = Column(String, primary_key=True, index=True)
    template_id = Column(String, ForeignKey("workout_templates.id"), nullable=False, index=True)
    exercise_id = Column(String, ForeignKey("exercises.id"), nullable=False, index=True)
    block_type = Column(String(20), nullable=False)  # 'warmup', 'main', 'cooldown'
    sets = Column(Integer, nullable=False)
    reps = Column(Integer, nullable=True)
    duration = Column(Integer, nullable=True)  # minutes
    rest = Column(Integer, nullable=True)  # seconds
    weight = Column(Float, nullable=True)  # kg
    notes = Column(Text, nullable=True)
    order_index = Column(Integer, nullable=False)

    template = relationship("WorkoutTemplate", back_populates="exercises")
    exercise = relationship("Exercise")


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)  # Получатель
    sender_id = Column(String, ForeignKey("users.id"), nullable=True)  # Отправитель (опционально)
    type = Column(String, nullable=False)  # 'workout_rescheduled', 'workout_completed', etc.
    title = Column(String, nullable=False)
    content = Column(Text, nullable=True)
    link = Column(String, nullable=True)  # Ссылка на объект (например, /calendar?workout_id=...)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", foreign_keys=[user_id])
    sender = relationship("User", foreign_keys=[sender_id])

