import axios, { type AxiosInstance } from 'axios'

// В режиме разработки используем прокси Vite (пустая строка = относительный путь)
// В продакшне используем полный URL
const API_BASE_URL = import.meta.env.VITE_API_URL || ''

export type AttendanceStatus = 'scheduled' | 'completed' | 'cancelled' | 'missed'

export interface User {
  id: string
  full_name: string
  email: string
  phone: string | null
  role: 'client' | 'trainer'
  onboarding_seen: boolean
  locale: string
  avatar: string | null
  trainer_connection_code: string | null
  phone_verified: boolean
  created_at: string
  trainer?: User | null
  timezone?: string | null // Часовой пояс пользователя (например, 'Europe/Moscow')
  subscription_plan?: string | null
  subscription_expires_at?: string | null
  workouts_package?: number | null
}

export interface OnboardingResponse {
  id: string
  user_id: string
  weight: number | null
  height: number | null
  age: number | null
  goals: string[]
  restrictions: string[]
  activity_level: string | null
  created_at: string
}

export interface RegisterStep1Response {
  verified: boolean
  message: string
}

export interface RegisterStep2Response {
  token: string
  user: User
  requires_onboarding: boolean
}

export interface LoginResponse {
  token: string
  user: User
}

export interface VerifySMSResponse {
  verified: boolean
  message: string
}

export interface UserSettings {
  locale: string
  notificationSettings: {
    email: boolean
    smsEnabled: boolean
    reminderBeforeMinutes: number
    workoutReminders: boolean
    workoutScheduled: boolean
    workoutCompleted: boolean
    metricsUpdate: boolean
    trainerNote: boolean
  }
}

export interface Workout {
  id: string
  user_id: string
  title: string
  start: string
  end: string
  location?: string | null
  format?: 'online' | 'offline' | null
  attendance?: AttendanceStatus | null
  coach_note?: string | null
  trainer_id?: string | null
  program_day_id?: string | null
  created_at: string
}

export interface TrainingProgram {
  id: string
  user_id: string
  title: string
  description?: string | null
  owner?: string
  created_at: string
}

export interface ProgramDay {
  id: string
  program_id: string
  name: string
  order?: number
  notes?: string | null
  blocks?: ProgramDayBlock[]
  source_template_id?: string | null
  owner?: string
  created_at: string
}

export interface ProgramDayBlock {
  id?: string
  type: 'warmup' | 'main' | 'cooldown'
  title: string
  exercises: ProgramDayExercise[]
}

export interface ProgramDayExercise {
  id?: string
  title: string
  exercise_id?: string | null
  sets?: number | null
  reps?: number | null
  weight?: string | null
  duration?: string | null
  rest?: string | null
  description?: string | null
  video_url?: string | null
}

export interface BodyMetric {
  id: string
  user_id: string
  label: string
  unit: string
  target?: number | null
  created_at: string
}

export interface BodyMetricEntry {
  id: string
  metric_id: string
  value: number
  recorded_at: string
  created_at: string
}

export interface ExerciseMetric {
  id: string
  user_id: string
  label: string
  muscle_group?: string | null
  created_at: string
}

export interface ExerciseMetricEntry {
  id: string
  exercise_metric_id: string
  date: string
  weight?: number | null
  repetitions?: number | null
  sets?: number | null
  created_at: string
}

export interface NutritionEntry {
  id: string
  user_id: string
  date: string
  calories: number
  proteins?: number | null
  fats?: number | null
  carbs?: number | null
  notes?: string | null
  created_at: string
}

export interface DashboardStats {
  total_workouts: number
  completed_workouts: number
  attendance_rate: number
  today_workouts: number
  next_workout?: Workout | null
  goal?: {
    headline: string
    description: string
    milestone: string
    days_left: number
    progress?: number
  } | null
  progress_photos?: Array<{
    id: string
    date: string
    url: string
  }> | null
}

export interface Note {
  id: string
  trainer_id: string
  client_id: string
  title: string
  content?: string | null
  created_at: string
}

export interface ExerciseTemplate {
  id: string
  trainer_id: string
  exercise_id: string
  name: string
  sets: number
  reps?: number | null
  duration?: number | null
  rest?: number | null
  weight?: number | null
  notes?: string | null
  created_at: string
  updated_at?: string | null
}

// Создаем axios instance
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  // Настраиваем максимальное количество редиректов
  maxRedirects: 5, // Разрешаем редиректы, но обрабатываем их в interceptor для сохранения токена
})

// Interceptor для автоматической передачи Bearer токена в каждом запросе
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token')
    if (token) {
      if (!config.headers) {
        config.headers = {} as any
      }
      if (typeof (config.headers as any).set === 'function') {
        ; (config.headers as any).set('Authorization', `Bearer ${token}`)
      } else {
        ; (config.headers as any)['Authorization'] = `Bearer ${token}`
      }
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Interceptor для обработки ошибок
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Обработка 307 Temporary Redirect - исправляем URL и повторяем запрос
    if (error.response?.status === 307 || error.response?.status === 308) {
      const redirectUrl = error.response?.headers?.location
      if (redirectUrl) {
        // Повторяем запрос на новый URL с теми же параметрами
        const config = error.config
        config.url = redirectUrl
        // Убеждаемся, что токен передается
        const token = localStorage.getItem('auth_token')
        if (token && config.headers) {
          config.headers['Authorization'] = `Bearer ${token}`
        }
        return api.request(config)
      }
    }

    // Обработка 401 Unauthorized
    if (error.response?.status === 401) {
      const token = localStorage.getItem('auth_token')
      console.error('401 Unauthorized error:', {
        url: error.config?.url,
        method: error.config?.method,
        hasToken: !!token,
        tokenLength: token?.length,
        response: error.response?.data,
      })

      // Удаляем токен только если это не запрос на логин/регистрацию
      const isAuthRequest = error.config?.url?.includes('/auth/login') ||
        error.config?.url?.includes('/auth/register') ||
        error.config?.url?.includes('/auth/send-sms') ||
        error.config?.url?.includes('/auth/verify-sms')

      if (!isAuthRequest && token) {
        localStorage.removeItem('auth_token')
      }
    }

    const errorMessage =
      error.response?.data?.detail ||
      error.response?.data?.message ||
      error.response?.data?.error ||
      JSON.stringify(error.response?.data) ||
      `HTTP error! status: ${error.response?.status}`
    const customError = new Error(errorMessage)
      ; (customError as any).data = error.response?.data
      ; (customError as any).status = error.response?.status
    return Promise.reject(customError)
  }
)

// Функция для сохранения токена
const setToken = (token: string | null) => {
  if (token) {
    localStorage.setItem('auth_token', token)
  } else {
    localStorage.removeItem('auth_token')
  }
}

// Функция для получения токена
const getToken = (): string | null => {
  return localStorage.getItem('auth_token')
}

// Auth API
export const sendSMS = async (phone: string): Promise<VerifySMSResponse> => {
  const { data } = await api.post<VerifySMSResponse>('/api/auth/send-sms', { phone })
  return data
}

export const verifySMS = async (phone: string, code: string): Promise<VerifySMSResponse> => {
  const { data } = await api.post<VerifySMSResponse>('/api/auth/verify-sms', { phone, code })
  return data
}

export const registerStep1 = async (data: {
  full_name: string
  email: string
  password: string
  phone: string
  role: 'client' | 'trainer'
  trainer_code?: string
}): Promise<RegisterStep1Response> => {
  const { data: response } = await api.post<RegisterStep1Response>('/api/auth/register/step1', data)
  return response
}

export const registerStep2 = async (phone: string, code: string): Promise<RegisterStep2Response> => {
  const { data: response } = await api.post<RegisterStep2Response>('/api/auth/register/step2', { phone, code })
  setToken(response.token)
  return response
}

export const login = async (email: string, password: string): Promise<LoginResponse> => {
  const { data: response } = await api.post<LoginResponse>('/api/auth/login', { email, password })
  setToken(response.token)
  return response
}

export const logout = () => {
  setToken(null)
  // Перенаправляем на страницу входа только если мы не на ней
  if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
    window.location.href = '/login'
  }
}

// User API
export const getCurrentUser = async (): Promise<User> => {
  const { data } = await api.get<User>('/api/users/me')
  return data
}

export const updateUser = async (data: {
  full_name?: string
  email?: string
  phone?: string
  avatar?: string
  locale?: string
}): Promise<User> => {
  const { data: response } = await api.put<User>('/api/users/me', data)
  return response
}

export const linkTrainer = async (connection_code: string): Promise<void> => {
  await api.post<void>('/api/users/link-trainer', { connection_code })
}

export const unlinkTrainer = async (): Promise<void> => {
  await api.post<void>('/api/users/unlink-trainer', {})
}

export const getSettings = async (): Promise<UserSettings> => {
  const { data } = await api.get<UserSettings>('/api/users/me/settings/')
  return data
}

export const updateSettings = async (data: {
  locale: string
  notificationSettings: UserSettings['notificationSettings']
}): Promise<UserSettings> => {
  const { data: response } = await api.put<UserSettings>('/api/users/me/settings/', data)
  return response
}

// Onboarding API
export const completeOnboarding = async (data: {
  weight?: number
  height?: number
  age?: number
  goals?: string[]
  restrictions?: string[]
  activity_level?: 'low' | 'medium' | 'high'
}): Promise<OnboardingResponse> => {
  // Для этого эндпоинта слеш не нужен
  const { data: response } = await api.post<OnboardingResponse>('/api/onboarding/complete', data)
  return response
}

export const getOnboarding = async (): Promise<OnboardingResponse> => {
  const { data } = await api.get<OnboardingResponse>('/api/onboarding/')
  return data
}

export const updateOnboarding = async (data: {
  weight?: number
  height?: number
  age?: number
  goals?: string[]
  restrictions?: string[]
  activity_level?: 'low' | 'medium' | 'high'
}): Promise<OnboardingResponse> => {
  const { data: response } = await api.put<OnboardingResponse>('/api/onboarding/', data)
  return response
}

// Workouts API
export const createWorkout = async (data: {
  title: string
  start: string
  end: string
  location?: string
  format?: 'online' | 'offline'
  trainer_id?: string
  user_id?: string // Для тренеров: ID клиента, для которого создается тренировка
  program_day_id?: string
  recurrence_series_id?: string
  recurrence_frequency?: string // 'daily' | 'weekly' | 'monthly'
  recurrence_interval?: number
  recurrence_days_of_week?: number[]
  recurrence_end_date?: string
  recurrence_occurrences?: number
}): Promise<Workout> => {
  // Добавляем слэш в конце, чтобы избежать редиректа
  const { data: response } = await api.post<Workout>('/api/workouts/', data)
  return response
}

export const getWorkouts = async (params?: {
  start_date?: string
  end_date?: string
  client_id?: string
  trainer_view?: boolean
}): Promise<Workout[]> => {
  // Добавляем слэш в конце, чтобы избежать редиректа
  const { data } = await api.get<Workout[]>('/api/workouts/', { params })
  return data
}

export const getWorkout = async (workout_id: string): Promise<Workout> => {
  const { data } = await api.get<Workout>(`/api/workouts/${workout_id}`)
  return data
}

export const updateWorkout = async (
  workout_id: string,
  data: {
    title?: string
    start?: string
    end?: string
    location?: string
    format?: 'online' | 'offline'
    attendance?: AttendanceStatus
    coach_note?: string
  }
): Promise<Workout> => {
  const { data: response } = await api.put<Workout>(`/api/workouts/${workout_id}`, data)
  return response
}

export const deleteWorkout = async (workout_id: string, delete_series?: boolean): Promise<void> => {
  await api.delete<void>(`/api/workouts/${workout_id}`, { params: { delete_series } })
}

// Programs API
export const createProgram = async (data: {
  title: string
  description?: string
  user_id?: string  // ID клиента (только для тренеров)
}): Promise<TrainingProgram> => {
  // Добавляем слэш в конце, чтобы избежать редиректа
  const { data: response } = await api.post<TrainingProgram>('/api/programs/', data)
  return response
}

export const getPrograms = async (user_id?: string): Promise<TrainingProgram[]> => {
  // Добавляем слэш в конце, чтобы избежать редиректа
  const params = user_id ? { user_id } : undefined
  const { data } = await api.get<TrainingProgram[]>('/api/programs/', { params })
  return data
}

export const getProgram = async (program_id: string): Promise<TrainingProgram> => {
  const { data } = await api.get<TrainingProgram>(`/api/programs/${program_id}`)
  return data
}

export const updateProgram = async (
  program_id: string,
  data: {
    title?: string
    description?: string
  }
): Promise<TrainingProgram> => {
  const { data: response } = await api.put<TrainingProgram>(`/api/programs/${program_id}`, data)
  return response
}

export const copyProgram = async (program_id: string, target_user_id?: string): Promise<TrainingProgram> => {
  const params = target_user_id ? { target_user_id } : undefined
  const { data } = await api.post<TrainingProgram>(`/api/programs/${program_id}/copy`, null, { params })
  return data
}

export const deleteProgram = async (program_id: string): Promise<void> => {
  await api.delete<void>(`/api/programs/${program_id}`)
}

export const createProgramDay = async (
  program_id: string,
  data: {
    name: string
    notes?: string
    blocks?: ProgramDayBlock[]
    source_template_id?: string
  }
): Promise<ProgramDay> => {
  const { data: response } = await api.post<ProgramDay>(`/api/programs/${program_id}/days`, data)
  return response
}

export const getProgramDays = async (program_id: string): Promise<ProgramDay[]> => {
  const { data } = await api.get<ProgramDay[]>(`/api/programs/${program_id}/days`)
  return data
}

export const getProgramDay = async (program_id: string, day_id: string): Promise<ProgramDay> => {
  const { data } = await api.get<ProgramDay>(`/api/programs/${program_id}/days/${day_id}`)
  return data
}

export const updateProgramDay = async (
  program_id: string,
  day_id: string,
  data: {
    name?: string
    order?: number
  }
): Promise<ProgramDay> => {
  const { data: response } = await api.put<ProgramDay>(`/api/programs/${program_id}/days/${day_id}`, data)
  return response
}

export const deleteProgramDay = async (program_id: string, day_id: string): Promise<void> => {
  await api.delete<void>(`/api/programs/${program_id}/days/${day_id}`)
}

export const addExerciseToProgramDay = async (
  program_id: string,
  day_id: string,
  block_id: string,
  data: {
    title: string
    sets: number
    reps?: number
    duration?: number
    rest?: number
    weight?: number
  }
): Promise<any> => {
  const { data: response } = await api.post(`/api/programs/${program_id}/days/${day_id}/blocks/${block_id}/exercises`, data)
  return response
}

export const updateExerciseInProgramDay = async (
  program_id: string,
  day_id: string,
  block_id: string,
  exercise_id: string,
  data: {
    title?: string
    sets?: number
    reps?: number
    duration?: number
    rest?: number
    weight?: number
  }
): Promise<any> => {
  const { data: response } = await api.put(
    `/api/programs/${program_id}/days/${day_id}/blocks/${block_id}/exercises/${exercise_id}`,
    data
  )
  return response
}

export const removeExerciseFromProgramDay = async (
  program_id: string,
  day_id: string,
  block_id: string,
  exercise_id: string
): Promise<void> => {
  await api.delete(`/api/programs/${program_id}/days/${day_id}/blocks/${block_id}/exercises/${exercise_id}`)
}

// Metrics API
export const createBodyMetric = async (data: {
  label: string
  unit: string
  target?: number
}): Promise<BodyMetric> => {
  const { data: response } = await api.post<BodyMetric>('/api/metrics/body', data)
  return response
}

export const getBodyMetrics = async (user_id?: string): Promise<BodyMetric[]> => {
  const { data } = await api.get<BodyMetric[]>('/api/metrics/body', { params: user_id ? { user_id } : undefined })
  return data
}

export const addBodyMetricEntry = async (data: {
  metric_id: string
  value: number
  recorded_at: string
}): Promise<BodyMetricEntry> => {
  const { data: response } = await api.post<BodyMetricEntry>('/api/metrics/body/entries', data)
  return response
}

export const getBodyMetricEntries = async (params?: {
  metric_id?: string
  user_id?: string
  start_date?: string
  end_date?: string
}): Promise<BodyMetricEntry[]> => {
  const { data } = await api.get<BodyMetricEntry[]>('/api/metrics/body/entries', { params })
  return data
}

export const createExerciseMetric = async (data: {
  label: string
  muscle_group?: string
}): Promise<ExerciseMetric> => {
  const { data: response } = await api.post<ExerciseMetric>('/api/metrics/exercise', data)
  return response
}

export const getExerciseMetrics = async (user_id?: string): Promise<ExerciseMetric[]> => {
  const { data } = await api.get<ExerciseMetric[]>('/api/metrics/exercise', { params: user_id ? { user_id } : undefined })
  return data
}

export const addExerciseMetricEntry = async (data: {
  exercise_metric_id: string
  date: string
  weight?: number
  repetitions?: number
  sets?: number
}): Promise<ExerciseMetricEntry> => {
  const { data: response } = await api.post<ExerciseMetricEntry>('/api/metrics/exercise/entries', data)
  return response
}

export const getExerciseMetricEntries = async (params?: {
  exercise_metric_id?: string
  user_id?: string
  start_date?: string
  end_date?: string
}): Promise<ExerciseMetricEntry[]> => {
  const { data } = await api.get<ExerciseMetricEntry[]>('/api/metrics/exercise/entries', { params })
  return data
}

// Nutrition API
export const createOrUpdateNutritionEntry = async (data: {
  date: string
  calories: number
  proteins?: number
  fats?: number
  carbs?: number
  notes?: string
}): Promise<NutritionEntry> => {
  const { data: response } = await api.post<NutritionEntry>('/api/nutrition/', data)
  return response
}

export const getNutritionEntries = async (params?: {
  start_date?: string
  end_date?: string
  user_id?: string
}): Promise<NutritionEntry[]> => {
  const { data } = await api.get<NutritionEntry[]>('/api/nutrition/', { params })
  return data
}

export const getNutritionEntry = async (entry_id: string): Promise<NutritionEntry> => {
  const { data } = await api.get<NutritionEntry>(`/api/nutrition/${entry_id}`)
  return data
}

export const updateNutritionEntry = async (
  entry_id: string,
  data: {
    date: string
    calories: number
    proteins?: number
    fats?: number
    carbs?: number
    notes?: string
  }
): Promise<NutritionEntry> => {
  const { data: response } = await api.put<NutritionEntry>(`/api/nutrition/${entry_id}`, data)
  return response
}

export const deleteNutritionEntry = async (entry_id: string): Promise<void> => {
  await api.delete<void>(`/api/nutrition/${entry_id}`)
}

// Dashboard API
export const getDashboardStats = async (period?: '7d' | '14d' | '30d'): Promise<DashboardStats> => {
  const { data } = await api.get<DashboardStats>('/api/dashboard/stats', { params: { period } })
  return data
}

export interface DashboardSettings {
  tile_ids: string[]
  period: string
}

export const getDashboardSettings = async (): Promise<DashboardSettings> => {
  const { data } = await api.get<DashboardSettings>('/api/dashboard/settings')
  return data
}

export const updateDashboardSettings = async (settings: Partial<DashboardSettings>): Promise<DashboardSettings> => {
  const { data } = await api.put<DashboardSettings>('/api/dashboard/settings', settings)
  return data
}

// Progress Photos API
export interface ProgressPhoto {
  id: string
  date: string
  url: string
  thumbnail_url?: string
  notes?: string
  created_at: string
}

export const getProgressPhotos = async (): Promise<ProgressPhoto[]> => {
  const { data } = await api.get<ProgressPhoto[]>('/api/progress-photos/')
  return data
}

export const uploadProgressPhoto = async (file: File, date: string, notes?: string): Promise<ProgressPhoto> => {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('date', date)
  if (notes) {
    formData.append('notes', notes)
  }
  const { data } = await api.post<ProgressPhoto>('/api/progress-photos/', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
  return data
}

export const deleteProgressPhoto = async (photoId: string): Promise<void> => {
  await api.delete(`/api/progress-photos/${photoId}`)
}

// Notes API
export const getNotes = async (client_id?: string): Promise<Note[]> => {
  // Добавляем слэш в конце, чтобы избежать редиректа
  const { data } = await api.get<Note[]>('/api/notes/', { params: client_id ? { client_id } : undefined })
  return data
}

export const getNote = async (note_id: string): Promise<Note> => {
  const { data } = await api.get<Note>(`/api/notes/${note_id}`)
  return data
}

export const createNote = async (data: {
  client_id: string
  title: string
  content?: string
}): Promise<Note> => {
  // Добавляем слэш в конце, чтобы избежать редиректа
  const { data: response } = await api.post<Note>('/api/notes/', data)
  return response
}

export const updateNote = async (
  note_id: string,
  data: {
    title?: string
    content?: string
  }
): Promise<Note> => {
  const { data: response } = await api.put<Note>(`/api/notes/${note_id}`, data)
  return response
}

export const deleteNote = async (note_id: string): Promise<void> => {
  await api.delete<void>(`/api/notes/${note_id}`)
}

// Trainer API
export const getClients = async (search?: string): Promise<any[]> => {
  // Добавляем слэш в конце, чтобы избежать редиректа
  const params = search ? { search } : undefined
  const { data } = await api.get<any[]>('/api/clients/', { params })
  return data
}

export const createClient = async (data: {
  full_name: string
  email: string
  password: string
  phone?: string
  role: 'client'
}): Promise<any> => {
  // Добавляем слэш в конце, чтобы избежать редиректа
  const { data: response } = await api.post<any>('/api/clients/', data)
  return response
}

// Payment API
export const createOnlinePayment = async (data: {
  amount: number
  description: string
  plan_id: string
}): Promise<{ payment_id: string; confirmation_token: string; status: string }> => {
  const { data: response } = await api.post('/api/payments/create', data)
  return response
}

export const checkPaymentStatus = async (payment_id: string): Promise<{ status: string; message?: string }> => {
  const { data } = await api.post<{ status: string; message?: string }>('/api/payments/check', null, {
    params: { payment_id }
  })
  return data
}

export const updateClient = async (
  client_id: string,
  data: {
    full_name?: string
    email?: string
    phone?: string
    client_format?: 'online' | 'offline' | 'both'
    workouts_package?: number
    package_expiry_date?: string
    is_active?: boolean
    weight?: number
    height?: number
    age?: number
    goals?: string[]
    restrictions?: string[]
    activity_level?: 'low' | 'medium' | 'high'
  }
): Promise<any> => {
  const { data: response } = await api.put<any>(`/api/clients/${client_id}`, data)
  return response
}

export const deleteClient = async (client_id: string): Promise<void> => {
  await api.delete<void>(`/api/clients/${client_id}`)
}

export const getClient = async (client_id: string): Promise<any> => {
  const { data } = await api.get<any>(`/api/clients/${client_id}`)
  return data
}

export const getClientStats = async (client_id: string, period?: '7d' | '14d' | '30d'): Promise<any> => {
  const { data } = await api.get<any>(`/api/clients/${client_id}/stats`, { params: { period } })
  return data
}

export const getClientOnboarding = async (client_id: string): Promise<OnboardingResponse> => {
  const { data } = await api.get<OnboardingResponse>(`/api/clients/${client_id}/onboarding`)
  return data
}

export const getClientDashboard = async (client_id: string, period?: '7d' | '14d' | '30d'): Promise<any> => {
  // Используем статистику клиента вместо отдельного эндпоинта dashboard
  const stats = await getClientStats(client_id, period)
  // Можно добавить дополнительную логику для дашборда здесь
  return stats
}

export const getClientMetrics = async (client_id: string, period?: '7d' | '14d' | '30d'): Promise<any> => {
  // Используем метрики с user_id параметром
  const [bodyMetrics, exerciseMetrics] = await Promise.all([
    getBodyMetrics(client_id),
    getExerciseMetrics(client_id)
  ])
  return { bodyMetrics, exerciseMetrics }
}

export const getClientProgram = async (client_id: string): Promise<any> => {
  // Используем программы с user_id параметром
  const programs = await getPrograms(client_id)
  return programs
}

export const getTrainerWorkouts = async (params?: {
  start_date?: string
  end_date?: string
  client_id?: string
  trainer_view?: boolean // Для получения всех тренировок команды
}): Promise<any[]> => {
  const { data } = await api.get<any[]>('/api/workouts/', {
    params: {
      ...params,
      trainer_view: params?.trainer_view ?? true, // По умолчанию true для тренера
    }
  })
  return data
}

export const getTrainerAvailability = async (trainer_id: string, date: string): Promise<any[]> => {
  // Используем workouts эндпоинт для получения доступности тренера
  // Возвращаем тренировки на указанную дату
  const startOfDay = new Date(date).toISOString().split('T')[0] + 'T00:00:00'
  const endOfDay = new Date(date).toISOString().split('T')[0] + 'T23:59:59'
  const { data } = await api.get<any[]>('/api/workouts/', {
    params: {
      start_date: startOfDay,
      end_date: endOfDay,
      trainer_view: true,
    }
  })
  return data
}

// Finances API
export const createPayment = async (data: {
  client_id: string
  amount: number
  date: string
  type: 'single' | 'package' | 'subscription'
  package_size?: number
  subscription_days?: number
  notes?: string
}): Promise<any> => {
  // Добавляем слэш в конце, чтобы избежать редиректа
  const { data: response } = await api.post<any>('/api/finances/', data)
  return response
}

export const getPayments = async (params?: {
  client_id?: string
  start_date?: string
  end_date?: string
}): Promise<any[]> => {
  const { data } = await api.get<any[]>('/api/finances/', { params })
  return data
}

export const deletePayment = async (payment_id: string): Promise<void> => {
  await api.delete<void>(`/api/finances/${payment_id}`)
}

export const getFinanceStats = async (): Promise<any> => {
  const { data } = await api.get<any>('/api/finances/stats')
  return data
}

export const getTrainerFinanceStats = async (period?: '7d' | '14d' | '30d'): Promise<any> => {
  // Используем стандартный эндпоинт stats (period не поддерживается на бэкенде, но можно добавить логику на фронтенде)
  const { data } = await api.get<any>('/api/finances/stats')
  return data
}

export const getTrainerClientWorkouts = async (
  client_id: string,
  params?: {
    start_date?: string
    end_date?: string
  }
): Promise<any[]> => {
  // Используем workouts с client_id параметром через trainer_view
  const { data } = await api.get<any[]>('/api/workouts/', {
    params: {
      ...params,
      client_id,
      trainer_view: true,
    }
  })
  return data
}

export const getTrainerClientMetrics = async (
  client_id: string,
  params?: {
    start_date?: string
    end_date?: string
  }
): Promise<any[]> => {
  // Используем метрики с user_id параметром
  const [bodyEntries, exerciseEntries] = await Promise.all([
    getBodyMetricEntries({ ...params, user_id: client_id }),
    getExerciseMetricEntries({ ...params, user_id: client_id })
  ])
  return [...bodyEntries, ...exerciseEntries]
}

export const getTrainerClientNotes = async (client_id: string): Promise<any[]> => {
  // Используем notes с client_id параметром
  const notes = await getNotes(client_id)
  return notes
}

export const createTrainerClientNote = async (
  client_id: string,
  data: {
    title: string
    content?: string
  }
): Promise<any> => {
  // Используем createNote с client_id в данных
  const note = await createNote({ ...data, client_id })
  return note
}

export const updateTrainerClientNote = async (
  client_id: string,
  note_id: string,
  data: {
    title?: string
    content?: string
  }
): Promise<any> => {
  // Используем updateNote с note_id
  const note = await updateNote(note_id, data)
  return note
}

export const deleteTrainerClientNote = async (client_id: string, note_id: string): Promise<void> => {
  // Используем deleteNote с note_id
  await deleteNote(note_id)
}

// Library API
export const getWorkoutTemplates = async (params?: {
  search?: string
  level?: string
  goal?: string
  muscle_group?: string
  equipment?: string
}): Promise<any[]> => {
  const { data } = await api.get<any[]>('/api/library/workout-templates', { params })
  return data
}

export const getWorkoutTemplate = async (template_id: string): Promise<any> => {
  const { data } = await api.get<any>(`/api/library/workout-templates/${template_id}`)
  return data
}

export const createWorkoutTemplate = async (data: {
  title: string
  description?: string
  duration?: number
  level?: string
  goal?: string
  muscle_groups?: string[]
  equipment?: string[]
  exercises: {
    exercise_id: string
    block_type: 'warmup' | 'main' | 'cooldown'
    sets: number
    reps?: number
    duration?: number
    rest?: number
    weight?: number
    notes?: string
  }[]
}): Promise<any> => {
  // Добавляем слэш в конце, чтобы избежать редиректа
  const { data: response } = await api.post<any>('/api/library/workout-templates/', data)
  return response
}

export const updateWorkoutTemplate = async (
  template_id: string,
  data: {
    title?: string
    description?: string
    duration?: number
    level?: string
    goal?: string
    muscle_groups?: string[]
    equipment?: string[]
    exercises?: {
      exercise_id: string
      block_type: 'warmup' | 'main' | 'cooldown'
      sets: number
      reps?: number
      duration?: number
      rest?: number
      weight?: number
      notes?: string
    }[]
  }
): Promise<any> => {
  const { data: response } = await api.put<any>(`/api/library/workout-templates/${template_id}`, data)
  return response
}

export const deleteWorkoutTemplate = async (template_id: string): Promise<void> => {
  await api.delete<void>(`/api/library/workout-templates/${template_id}`)
}

export const createWorkoutTemplateFromDay = async (dayId: string): Promise<any> => {
  const response = await api.post(`/api/library/workout-templates/from-day/${dayId}`)
  return response.data
}

export const getExercises = async (params?: {
  search?: string
  muscle_group?: string
}): Promise<any[]> => {
  // Добавляем слэш в конце, чтобы избежать редиректа
  const { data } = await api.get<any[]>('/api/exercises/', { params })
  return data
}

export const getExercise = async (exercise_id: string): Promise<any> => {
  const { data } = await api.get<any>(`/api/exercises/${exercise_id}`)
  return data
}

export const createExercise = async (data: {
  name: string
  description?: string
  muscle_groups?: string
  equipment?: string
  difficulty?: string
  starting_position?: string
  execution_instructions?: string
  video_url?: string
  notes?: string
  visibility?: 'all' | 'client' | 'trainer'
  client_id?: string | null
}): Promise<any> => {
  // Добавляем слэш в конце, чтобы избежать редиректа
  const { data: response } = await api.post<any>('/api/exercises/', data)
  return response
}

export const updateExercise = async (
  exercise_id: string,
  data: {
    name?: string
    description?: string
    muscle_groups?: string
    equipment?: string
    difficulty?: string
    starting_position?: string
    execution_instructions?: string
    video_url?: string
    notes?: string
    visibility?: 'all' | 'client' | 'trainer'
    client_id?: string | null
  }
): Promise<any> => {
  const { data: response } = await api.put<any>(`/api/exercises/${exercise_id}`, data)
  return response
}

export const deleteExercise = async (exercise_id: string): Promise<void> => {
  await api.delete<void>(`/api/exercises/${exercise_id}`)
}

export const getExerciseTemplates = async (): Promise<ExerciseTemplate[]> => {
  const { data } = await api.get<ExerciseTemplate[]>('/api/library/exercise-templates')
  return data
}

export const createExerciseTemplate = async (data: {
  exercise_id: string
  name: string
  sets: number
  reps?: number
  duration?: number
  rest?: number
  weight?: number
  notes?: string
}): Promise<ExerciseTemplate> => {
  const { data: response } = await api.post<ExerciseTemplate>('/api/library/exercise-templates/', data)
  return response
}

export const updateExerciseTemplate = async (
  template_id: string,
  data: {
    name?: string
    sets?: number
    reps?: number
    duration?: number
    rest?: number
    weight?: number
    notes?: string
  }
): Promise<ExerciseTemplate> => {
  const { data: response } = await api.put<ExerciseTemplate>(`/api/library/exercise-templates/${template_id}`, data)
  return response
}

export const deleteExerciseTemplate = async (template_id: string): Promise<void> => {
  await api.delete<void>(`/api/library/exercise-templates/${template_id}`)
}

export interface Notification {
  id: string
  user_id: string
  sender_id?: string | null
  type: string
  title: string
  content?: string | null
  link?: string | null
  is_read: boolean
  created_at: string
}

// Экспортируем объект apiClient для обратной совместимости
export const apiClient = {
  sendSMS,
  verifySMS,
  registerStep1,
  registerStep2,
  login,
  logout,
  getCurrentUser,
  updateUser,
  linkTrainer,
  unlinkTrainer,
  getSettings,
  updateSettings,
  completeOnboarding,
  getOnboarding,
  updateOnboarding,
  createWorkout,
  getWorkouts,
  getWorkout,
  updateWorkout,
  deleteWorkout,
  createProgram,
  getPrograms,
  getProgram,
  updateProgram,
  deleteProgram,
  createProgramDay,
  getProgramDays,
  getProgramDay,
  updateProgramDay,
  deleteProgramDay,
  addExerciseToProgramDay,
  updateExerciseInProgramDay,
  removeExerciseFromProgramDay,
  createBodyMetric,
  getBodyMetrics,
  addBodyMetricEntry,
  getBodyMetricEntries,
  createExerciseMetric,
  getExerciseMetrics,
  addExerciseMetricEntry,
  getExerciseMetricEntries,
  createOrUpdateNutritionEntry,
  getNutritionEntries,
  getNutritionEntry,
  updateNutritionEntry,
  deleteNutritionEntry,
  getDashboardStats,
  getDashboardSettings,
  updateDashboardSettings,
  getProgressPhotos,
  uploadProgressPhoto,
  deleteProgressPhoto,
  getNotes,
  getNote,
  createNote,
  updateNote,
  deleteNote,
  getClients,
  createClient,
  updateClient,
  deleteClient,
  getClient,
  getClientStats,
  getClientOnboarding,
  getClientDashboard,
  getClientMetrics,
  getClientProgram,
  getTrainerWorkouts,
  getTrainerAvailability,
  createPayment,
  getPayments,
  deletePayment,
  getFinanceStats,
  getTrainerFinanceStats,
  getTrainerClientWorkouts,
  getTrainerClientMetrics,
  getTrainerClientNotes,
  createTrainerClientNote,
  updateTrainerClientNote,
  deleteTrainerClientNote,
  getWorkoutTemplates,
  getWorkoutTemplate,
  createWorkoutTemplate,
  updateWorkoutTemplate,
  deleteWorkoutTemplate,
  createWorkoutTemplateFromDay,
  getExercises,
  getExercise,
  createExercise,
  updateExercise,
  deleteExercise,
  getExerciseTemplates,
  createExerciseTemplate,
  updateExerciseTemplate,
  deleteExerciseTemplate,
  copyProgram,
  getToken,
  setToken,
  // Notifications
  getNotifications: async (params?: { limit?: number; skip?: number; only_unread?: boolean }): Promise<Notification[]> => {
    const { data } = await api.get<Notification[]>('/api/notifications/', { params })
    return data
  },
  markNotificationAsRead: async (notification_id: string): Promise<Notification> => {
    const { data } = await api.put<Notification>(`/api/notifications/${notification_id}/read`)
    return data
  },
  deleteNotification: async (notification_id: string): Promise<void> => {
    await api.delete<void>(`/api/notifications/${notification_id}`)
  }
}
