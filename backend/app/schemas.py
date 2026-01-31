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
    password: str = Field(..., min_length=6, description="Пароль (минимум 6 символов, любой длины)")


class UserRegister(UserCreate):
    trainer_code: Optional[str] = None


class UserResponse(UserBase):
    id: str
    onboarding_seen: bool
    locale: str
    avatar: Optional[str] = None
    trainer_connection_code: Optional[str] = None
    phone_verified: bool
    timezone: Optional[str] = None
    subscription_plan: Optional[str] = None
    subscription_expires_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


class UserWithTrainer(UserResponse):
    trainer: Optional["UserResponse"] = None


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    avatar: Optional[str] = None
    locale: Optional[str] = None
    # Поля для клиентов (только для тренеров)
    client_format: Optional[str] = None  # 'online', 'offline', 'both'
    workouts_package: Optional[int] = None
    package_expiry_date: Optional[datetime] = None
    is_active: Optional[bool] = None


# Client update schema (для обновления данных клиента тренером, включая онбординг)
class ClientUpdate(BaseModel):
    # Основные данные
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    avatar: Optional[str] = None
    client_format: Optional[str] = None
    workouts_package: Optional[int] = None
    package_expiry_date: Optional[datetime] = None
    is_active: Optional[bool] = None
    # Данные онбординга
    weight: Optional[float] = None
    height: Optional[float] = None
    age: Optional[int] = None
    goals: Optional[List[str]] = None
    restrictions: Optional[List[str]] = None
    activity_level: Optional[str] = None


# Auth schemas
class LoginRequest(BaseModel):
    email: EmailStr = Field(..., description="Email пользователя", example="user@example.com")
    password: str = Field(..., min_length=6, max_length=72, description="Пароль (6-72 символа). Пароли длиннее 72 символов будут обрезаны.", example="password123")


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
    password: str = Field(..., min_length=6, max_length=72, description="Пароль (6-72 символа). Пароли длиннее 72 символов будут обрезаны.", example="password123")
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


# Workout schemas
from app.models import AttendanceStatus, WorkoutFormat

class WorkoutBase(BaseModel):
    title: str
    start: datetime
    end: datetime
    location: Optional[str] = None
    format: Optional[WorkoutFormat] = None
    program_day_id: Optional[str] = None
    trainer_id: Optional[str] = None  # Для тренеров: ID клиента, для клиентов: ID тренера
    user_id: Optional[str] = None  # Для тренеров: ID клиента (альтернатива trainer_id)


class WorkoutCreate(WorkoutBase):
    recurrence_series_id: Optional[str] = None
    recurrence_frequency: Optional[str] = None  # daily, weekly, monthly
    recurrence_interval: Optional[int] = None
    recurrence_days_of_week: Optional[List[int]] = None
    recurrence_end_date: Optional[datetime] = None
    recurrence_occurrences: Optional[int] = None


class WorkoutUpdate(BaseModel):
    title: Optional[str] = None
    start: Optional[datetime] = None
    end: Optional[datetime] = None
    location: Optional[str] = None
    attendance: Optional[AttendanceStatus] = None
    coach_note: Optional[str] = None
    format: Optional[WorkoutFormat] = None


class WorkoutResponse(WorkoutBase):
    id: str
    user_id: str
    attendance: AttendanceStatus
    coach_note: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# Training Program schemas
class ProgramExerciseBase(BaseModel):
    title: str
    sets: int = 1
    reps: Optional[int] = None
    duration: Optional[str] = None
    rest: Optional[str] = None
    weight: Optional[str] = None
    description: Optional[str] = None
    video_url: Optional[str] = None


class ProgramExerciseCreate(ProgramExerciseBase):
    pass


class ProgramExerciseResponse(ProgramExerciseBase):
    id: str
    order: int

    class Config:
        from_attributes = True


class ProgramBlockBase(BaseModel):
    type: str  # warmup, main, cooldown
    title: str
    exercises: List[ProgramExerciseCreate] = []


class ProgramBlockResponse(BaseModel):
    id: str
    type: str
    title: str
    order: int
    exercises: List[ProgramExerciseResponse] = []

    class Config:
        from_attributes = True


class ProgramDayBase(BaseModel):
    name: str
    blocks: List[ProgramBlockBase] = []
    notes: Optional[str] = None


class ProgramDayCreate(ProgramDayBase):
    source_template_id: Optional[str] = None


class ProgramDayResponse(BaseModel):
    id: str
    name: str
    order: int
    notes: Optional[str] = None
    owner: str
    source_template_id: Optional[str] = None
    program_id: str
    blocks: List[ProgramBlockResponse] = []

    class Config:
        from_attributes = True


class TrainingProgramBase(BaseModel):
    title: str
    description: Optional[str] = None


class TrainingProgramCreate(TrainingProgramBase):
    user_id: Optional[str] = None  # ID клиента (только для тренеров)


class TrainingProgramUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None


class TrainingProgramResponse(TrainingProgramBase):
    id: str
    owner: str
    user_id: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# Metrics schemas
class BodyMetricBase(BaseModel):
    label: str
    unit: str
    target: Optional[float] = None


class BodyMetricCreate(BodyMetricBase):
    pass


class BodyMetricResponse(BodyMetricBase):
    id: str
    user_id: str
    created_at: datetime

    class Config:
        from_attributes = True


class BodyMetricEntryBase(BaseModel):
    value: float
    recorded_at: datetime


class BodyMetricEntryCreate(BodyMetricEntryBase):
    metric_id: str


class BodyMetricEntryResponse(BodyMetricEntryBase):
    id: str
    metric_id: str
    created_at: datetime

    class Config:
        from_attributes = True


class BodyMetricTargetUpdate(BaseModel):
    target: float


class BodyMetricTargetHistoryResponse(BaseModel):
    id: str
    metric_id: str
    target_value: float
    changed_at: datetime

    class Config:
        from_attributes = True


class ExerciseMetricBase(BaseModel):
    label: str
    muscle_group: Optional[str] = None


class ExerciseMetricCreate(ExerciseMetricBase):
    pass


class ExerciseMetricResponse(ExerciseMetricBase):
    id: str
    user_id: str
    created_at: datetime

    class Config:
        from_attributes = True


class ExerciseMetricEntryBase(BaseModel):
    date: datetime
    weight: Optional[float] = None
    repetitions: Optional[int] = None
    sets: Optional[int] = None


class ExerciseMetricEntryCreate(ExerciseMetricEntryBase):
    exercise_metric_id: str


class ExerciseMetricEntryResponse(ExerciseMetricEntryBase):
    id: str
    exercise_metric_id: str
    created_at: datetime

    class Config:
        from_attributes = True


# Nutrition schemas
class NutritionEntryBase(BaseModel):
    date: datetime
    calories: float
    proteins: Optional[float] = None
    fats: Optional[float] = None
    carbs: Optional[float] = None
    notes: Optional[str] = None


class NutritionEntryCreate(NutritionEntryBase):
    pass


class NutritionEntryResponse(NutritionEntryBase):
    id: str
    user_id: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# Finance schemas
from app.models import PaymentType

class PaymentBase(BaseModel):
    client_id: str
    amount: float
    date: datetime
    type: PaymentType
    package_size: Optional[int] = None
    subscription_days: Optional[int] = None
    notes: Optional[str] = None


class PaymentCreate(PaymentBase):
    pass


class PaymentResponse(PaymentBase):
    id: str
    trainer_id: str
    remaining_sessions: Optional[int] = None
    next_payment_date: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# Exercise Library schemas
class ExerciseBase(BaseModel):
    name: str
    description: Optional[str] = None
    muscle_groups: Optional[str] = None
    equipment: Optional[str] = None
    difficulty: Optional[str] = None
    starting_position: Optional[str] = None
    execution_instructions: Optional[str] = None
    video_url: Optional[str] = None
    notes: Optional[str] = None
    visibility: Optional[str] = 'all'  # 'all', 'client', 'trainer'
    client_id: Optional[str] = None


class ExerciseCreate(ExerciseBase):
    pass


class ExerciseResponse(ExerciseBase):
    id: str
    trainer_id: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# Exercise Template schemas
class ExerciseTemplateBase(BaseModel):
    exercise_id: str
    name: str
    sets: int = 1
    reps: Optional[int] = None
    duration: Optional[int] = None  # minutes
    rest: Optional[int] = None  # seconds
    weight: Optional[float] = None  # kg
    notes: Optional[str] = None


class ExerciseTemplateCreate(ExerciseTemplateBase):
    pass


class ExerciseTemplateUpdate(BaseModel):
    exercise_id: Optional[str] = None
    name: Optional[str] = None
    sets: Optional[int] = None
    reps: Optional[int] = None
    duration: Optional[int] = None
    rest: Optional[int] = None
    weight: Optional[float] = None
    notes: Optional[str] = None


class ExerciseTemplateResponse(ExerciseTemplateBase):
    id: str
    trainer_id: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# Trainer Notes schemas
class TrainerNoteBase(BaseModel):
    client_id: str
    title: str
    content: Optional[str] = None


class TrainerNoteCreate(TrainerNoteBase):
    pass


class TrainerNoteUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None


class TrainerNoteResponse(TrainerNoteBase):
    id: str
    trainer_id: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# Dashboard schemas
class GoalResponse(BaseModel):
    headline: str
    description: str
    milestone: str
    days_left: int
    progress: Optional[int] = None

    class Config:
        from_attributes = True


class ProgressPhotoResponse(BaseModel):
    id: str
    date: datetime
    url: str
    thumbnail_url: Optional[str] = None
    notes: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class DashboardStats(BaseModel):
    total_workouts: int
    completed_workouts: int
    attendance_rate: float
    today_workouts: int
    next_workout: Optional[WorkoutResponse] = None
    goal: Optional[GoalResponse] = None
    progress_photos: List[ProgressPhotoResponse] = []


# Notification schemas
class NotificationBase(BaseModel):
    user_id: str
    sender_id: Optional[str] = None
    type: str
    title: str
    content: Optional[str] = None
    link: Optional[str] = None


class NotificationResponse(NotificationBase):
    id: str
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True


class NotificationUpdate(BaseModel):
    is_read: Optional[bool] = None


# Dashboard Settings schemas
class DashboardSettingsUpdate(BaseModel):
    tile_ids: Optional[List[str]] = None
    period: Optional[str] = None  # 7d, 14d, 30d


class DashboardSettingsResponse(BaseModel):
    tile_ids: List[str] = []
    period: str = "7d"

    class Config:
        from_attributes = True
