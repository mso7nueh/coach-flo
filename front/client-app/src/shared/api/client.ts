// В режиме разработки используем прокси Vite (пустая строка = относительный путь)
// В продакшне используем полный URL
const API_BASE_URL = import.meta.env.DEV 
  ? '' // Используем прокси в dev режиме
  : (import.meta.env.VITE_API_URL || 'http://45.144.221.74:8000')

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

class ApiClient {
  private baseURL: string
  private token: string | null = null

  constructor(baseURL: string) {
    this.baseURL = baseURL
    this.token = localStorage.getItem('auth_token')
  }

  setToken(token: string | null) {
    this.token = token
    if (token) {
      localStorage.setItem('auth_token', token)
    } else {
      localStorage.removeItem('auth_token')
    }
  }

  getToken(): string | null {
    return this.token
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    }

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`
    }

    const response = await fetch(url, {
      ...options,
      headers,
    })

    if (!response.ok) {
      let errorMessage = 'Произошла ошибка'
      let errorData: any = null
      try {
        errorData = await response.json()
        errorMessage = errorData.detail || errorData.message || errorData.error || JSON.stringify(errorData)
      } catch {
        errorMessage = `HTTP error! status: ${response.status}`
      }
      const error = new Error(errorMessage)
      if (errorData) {
        (error as any).data = errorData
      }
      throw error
    }

    return response.json()
  }

  async sendSMS(phone: string): Promise<VerifySMSResponse> {
    return this.request<VerifySMSResponse>('/api/auth/send-sms', {
      method: 'POST',
      body: JSON.stringify({ phone }),
    })
  }

  async verifySMS(phone: string, code: string): Promise<VerifySMSResponse> {
    return this.request<VerifySMSResponse>('/api/auth/verify-sms', {
      method: 'POST',
      body: JSON.stringify({ phone, code }),
    })
  }

  async registerStep1(data: {
    full_name: string
    email: string
    password: string
    phone: string
    role: 'client' | 'trainer'
    trainer_code?: string
  }): Promise<RegisterStep1Response> {
    return this.request<RegisterStep1Response>('/api/auth/register/step1', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async registerStep2(phone: string, code: string): Promise<RegisterStep2Response> {
    const response = await this.request<RegisterStep2Response>(
      '/api/auth/register/step2',
      {
        method: 'POST',
        body: JSON.stringify({ phone, code }),
      }
    )

    this.setToken(response.token)

    return response
  }

  async login(email: string, password: string): Promise<LoginResponse> {
    const response = await this.request<LoginResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })

    this.setToken(response.token)

    return response
  }

  async getCurrentUser(): Promise<User> {
    return this.request<User>('/api/auth/me')
  }

  async completeOnboarding(data: {
    weight?: number
    height?: number
    age?: number
    goals?: string[]
    restrictions?: string[]
    activity_level?: 'low' | 'medium' | 'high'
  }): Promise<OnboardingResponse> {
    return this.request<OnboardingResponse>('/api/onboarding/complete', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async getOnboarding(): Promise<OnboardingResponse> {
    return this.request<OnboardingResponse>('/api/onboarding/')
  }

  logout() {
    this.setToken(null)
  }
}

export const apiClient = new ApiClient(API_BASE_URL)

