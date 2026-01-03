import { createSlice, type PayloadAction, createAsyncThunk } from '@reduxjs/toolkit'
import { apiClient, type User as ApiUser } from '@/shared/api/client'

export type UserRole = 'client' | 'trainer'
export type SupportedLocale = 'en' | 'ru'

export interface TrainerInfo {
    id: string
    fullName: string
    email?: string
    phone?: string
    avatar?: string
    description?: string
    connectionCode?: string
}

interface UserState {
    id: string
    fullName: string
    email: string
    phone?: string
    avatar?: string
    role: UserRole
    onboardingSeen: boolean
    locale: SupportedLocale
    trainer?: TrainerInfo
    onboardingMetrics?: OnboardingMetrics
    trainerConnectionCode?: string
    isAuthenticated: boolean
    token?: string
}

const initialState: UserState = {
    id: '',
    fullName: '',
    email: '',
    phone: '',
    avatar: undefined,
    role: 'client',
    onboardingSeen: false,
    locale: 'ru',
    trainer: undefined,
    trainerConnectionCode: undefined,
    isAuthenticated: false,
    token: undefined,
}

export interface LoginCredentials {
    email: string
    password: string
}

export interface RegisterData {
        fullName: string
        email: string
        password: string
        phone?: string
        role?: UserRole
        confirmPassword?: string
        trainerCode?: string
    }

export interface OnboardingMetrics {
    weight?: number
    height?: number
    age?: number
    goals?: string[]
    restrictions?: string[]
    activityLevel?: 'low' | 'medium' | 'high'
}

const mapApiUserToState = (apiUser: ApiUser): Omit<UserState, 'isAuthenticated' | 'token'> => {
    return {
        id: apiUser.id,
        fullName: apiUser.full_name,
        email: apiUser.email,
        phone: apiUser.phone || undefined,
        avatar: apiUser.avatar || undefined,
        role: apiUser.role,
        onboardingSeen: apiUser.onboarding_seen,
        locale: (apiUser.locale as SupportedLocale) || 'ru',
        trainerConnectionCode: apiUser.trainer_connection_code || undefined,
        trainer: apiUser.trainer ? {
            id: apiUser.trainer.id,
            fullName: apiUser.trainer.full_name,
            email: apiUser.trainer.email,
            phone: apiUser.trainer.phone || undefined,
            avatar: apiUser.trainer.avatar || undefined,
            connectionCode: apiUser.trainer.trainer_connection_code || undefined,
        } : undefined,
    }
}

export const loginUser = createAsyncThunk(
    'user/login',
    async (credentials: { email: string; password: string }) => {
        const response = await apiClient.login(credentials.email, credentials.password)
        return {
            user: mapApiUserToState(response.user),
            token: response.token,
        }
    }
)

export const registerUserStep1 = createAsyncThunk(
    'user/registerStep1',
    async (data: {
        full_name: string
        email: string
        password: string
        phone: string
        role: UserRole
        trainer_code?: string
    }) => {
        return await apiClient.registerStep1(data)
    }
)

export const registerUserStep2 = createAsyncThunk(
    'user/registerStep2',
    async (data: { phone: string; code: string }) => {
        const response = await apiClient.registerStep2(data.phone, data.code)
        return {
            user: mapApiUserToState(response.user),
            token: response.token,
            requiresOnboarding: response.requires_onboarding,
        }
    }
)

export const fetchCurrentUser = createAsyncThunk(
    'user/fetchCurrent',
    async (_, { rejectWithValue }) => {
        try {
            const user = await apiClient.getCurrentUser()
            return mapApiUserToState(user)
        } catch (error: any) {
            // Передаем статус ошибки для правильной обработки
            return rejectWithValue({ 
                status: error?.status || error?.response?.status,
                message: error?.message 
            })
        }
    }
)

export const sendSMS = createAsyncThunk(
    'user/sendSMS',
    async (phone: string) => {
        return await apiClient.sendSMS(phone)
    }
)

export const completeOnboardingApi = createAsyncThunk(
    'user/completeOnboardingApi',
    async (metrics: OnboardingMetrics) => {
        await apiClient.completeOnboarding({
            weight: metrics.weight,
            height: metrics.height,
            age: metrics.age,
            goals: metrics.goals,
            restrictions: metrics.restrictions,
            activity_level: metrics.activityLevel,
        })
        return metrics
    }
)

const userSlice = createSlice({
    name: 'user',
    initialState,
    reducers: {
        login(state, action: PayloadAction<{ user: Omit<UserState, 'isAuthenticated' | 'token'>; token: string }>) {
            state.isAuthenticated = true
            state.token = action.payload.token
            state.id = action.payload.user.id
            state.fullName = action.payload.user.fullName
            state.email = action.payload.user.email
            state.phone = action.payload.user.phone
            state.avatar = action.payload.user.avatar
            state.role = action.payload.user.role
            state.onboardingSeen = action.payload.user.onboardingSeen
            state.locale = action.payload.user.locale
            state.trainer = action.payload.user.trainer
            state.onboardingMetrics = action.payload.user.onboardingMetrics
        },
        register(state, action: PayloadAction<{ user: Omit<UserState, 'isAuthenticated' | 'token'>; token: string }>) {
            state.isAuthenticated = true
            state.token = action.payload.token
            state.id = action.payload.user.id
            state.fullName = action.payload.user.fullName
            state.email = action.payload.user.email
            state.phone = action.payload.user.phone
            state.avatar = action.payload.user.avatar
            state.role = action.payload.user.role
            state.onboardingSeen = action.payload.user.onboardingSeen
            state.locale = action.payload.user.locale
            state.trainer = action.payload.user.trainer
            state.onboardingMetrics = action.payload.user.onboardingMetrics
        },
        switchRole(state, action: PayloadAction<UserRole>) {
            state.role = action.payload
        },
        markOnboardingSeen(state) {
            state.onboardingSeen = true
        },
        completeOnboarding(state, action: PayloadAction<OnboardingMetrics>) {
            state.onboardingSeen = true
            state.onboardingMetrics = action.payload
        },
        linkTrainer(state, action: PayloadAction<{ connectionCode: string }>) {
            // В мок-режиме просто создаём тренера по коду
            if (state.role === 'client') {
                state.trainer = {
                    id: `trainer-${action.payload.connectionCode}`,
                    fullName: `Coach ${action.payload.connectionCode}`,
                    connectionCode: action.payload.connectionCode,
                }
            }
        },
        unlinkTrainer(state) {
            if (state.role === 'client') {
                state.trainer = undefined
            }
        },
        setLocale(state, action: PayloadAction<SupportedLocale>) {
            state.locale = action.payload
        },
        updateProfile(state, action: PayloadAction<Partial<Pick<UserState, 'fullName' | 'email' | 'phone' | 'avatar'>>>) {
            return { ...state, ...action.payload }
        },
        updateOnboardingMetrics(state, action: PayloadAction<Partial<OnboardingMetrics>>) {
            if (!state.onboardingMetrics) {
                state.onboardingMetrics = {}
            }
            state.onboardingMetrics = {
                ...state.onboardingMetrics,
                ...action.payload,
            }
        },
        updateTrainerProfile(state, action: PayloadAction<Partial<Pick<TrainerInfo, 'fullName' | 'email' | 'phone' | 'avatar' | 'description'>>>) {
            if (state.role === 'trainer') {
                if (!state.trainer) {
                    state.trainer = {
                        id: state.id,
                        fullName: state.fullName,
                        email: state.email,
                        phone: state.phone,
                        avatar: state.avatar,
                    }
                }
                state.trainer = { ...state.trainer, ...action.payload }
            }
        },
        generateConnectionCode(state) {
            if (state.role === 'trainer') {
                const code = Math.random().toString(36).substring(2, 8).toUpperCase()
                state.trainerConnectionCode = code
            }
        },
        logout(state) {
            apiClient.logout()
            return {
                ...initialState,
                locale: state.locale,
            }
        },
        setToken(state, action: PayloadAction<string>) {
            state.token = action.payload
            state.isAuthenticated = true
            apiClient.setToken(action.payload)
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(loginUser.fulfilled, (state, action) => {
                state.isAuthenticated = true
                state.token = action.payload.token
                Object.assign(state, action.payload.user)
            })
            .addCase(loginUser.rejected, (state) => {
                state.isAuthenticated = false
                state.token = undefined
            })
            .addCase(registerUserStep2.fulfilled, (state, action) => {
                state.isAuthenticated = true
                state.token = action.payload.token
                state.onboardingSeen = !action.payload.requiresOnboarding
                Object.assign(state, action.payload.user)
            })
            .addCase(fetchCurrentUser.fulfilled, (state, action) => {
                Object.assign(state, action.payload)
                state.isAuthenticated = true
            })
            .addCase(fetchCurrentUser.rejected, (state, action) => {
                // Разлогиниваем только при ошибках авторизации (401), а не при всех ошибках
                const status = (action.payload as any)?.status || (action.error as any)?.status
                if (status === 401) {
                    state.isAuthenticated = false
                    state.token = undefined
                    apiClient.logout()
                }
                // При других ошибках (сеть, сервер) не разлогиниваем пользователя
            })
            .addCase(completeOnboardingApi.fulfilled, (state, action) => {
                state.onboardingSeen = true
                state.onboardingMetrics = action.payload
            })
    },
})

export const {
    login,
    register,
    switchRole,
    markOnboardingSeen,
    completeOnboarding,
    linkTrainer,
    unlinkTrainer,
    setLocale,
    updateProfile,
    updateOnboardingMetrics,
    updateTrainerProfile,
    generateConnectionCode,
    logout,
    setToken,
} = userSlice.actions
export default userSlice.reducer

