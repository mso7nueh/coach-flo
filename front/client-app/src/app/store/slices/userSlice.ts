import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

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
            return {
                ...initialState,
                locale: state.locale,
            }
        },
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
} = userSlice.actions
export default userSlice.reducer

