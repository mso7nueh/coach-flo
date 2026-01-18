import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit'
import { apiClient } from '@/shared/api/client'
import dayjs from 'dayjs'

export type PaymentType = 'single' | 'package' | 'subscription'

export interface Payment {
    id: string
    clientId: string
    amount: number
    date: string
    type: PaymentType
    packageSize?: number
    remainingSessions?: number
    subscriptionDays?: number
    nextPaymentDate?: string
    notes?: string
}

interface FinancesState {
    payments: Payment[]
    selectedClientId: string | null
    loading: boolean
    error: string | null
}

const initialState: FinancesState = {
    payments: [],
    selectedClientId: null,
    loading: false,
    error: null,
}

// Маппинг API Payment в локальный формат
const mapApiPaymentToState = (apiPayment: any): Payment => {
    return {
        id: apiPayment.id,
        clientId: apiPayment.client_id,
        amount: apiPayment.amount,
        date: dayjs(apiPayment.date).format('YYYY-MM-DD'),
        type: apiPayment.type,
        packageSize: apiPayment.package_size || undefined,
        remainingSessions: apiPayment.remaining_sessions || undefined,
        subscriptionDays: apiPayment.subscription_days || undefined,
        nextPaymentDate: apiPayment.next_payment_date ? dayjs(apiPayment.next_payment_date).format('YYYY-MM-DD') : undefined,
        notes: apiPayment.notes || undefined,
    }
}

// Async thunks для работы с API
export const fetchPayments = createAsyncThunk(
    'finances/fetchPayments',
    async (params: { client_id?: string; start_date?: string; end_date?: string } | undefined, { rejectWithValue }) => {
        try {
            const payments = await apiClient.getPayments(params)
            return payments.map(mapApiPaymentToState)
        } catch (error: any) {
            return rejectWithValue(error.message || 'Ошибка загрузки платежей')
        }
    }
)

export const createPaymentApi = createAsyncThunk(
    'finances/createPaymentApi',
    async (
        data: {
            client_id: string
            amount: number
            date: string
            type: 'single' | 'package' | 'subscription'
            package_size?: number
            subscription_days?: number
            notes?: string
        },
        { rejectWithValue, dispatch }
    ) => {
        try {
            const payment = await apiClient.createPayment(data)
            const mappedPayment = mapApiPaymentToState(payment)
            // После создания перезагружаем список платежей
            await dispatch(fetchPayments())
            return mappedPayment
        } catch (error: any) {
            return rejectWithValue(error.message || 'Ошибка создания платежа')
        }
    }
)

export const deletePaymentApi = createAsyncThunk(
    'finances/deletePaymentApi',
    async (paymentId: string, { rejectWithValue, dispatch }) => {
        try {
            await apiClient.deletePayment(paymentId)
            // После удаления перезагружаем список платежей
            await dispatch(fetchPayments())
            return paymentId
        } catch (error: any) {
            return rejectWithValue(error.message || 'Ошибка удаления платежа')
        }
    }
)

const financesSlice = createSlice({
    name: 'finances',
    initialState,
    reducers: {
        addPayment(state, action: PayloadAction<Omit<Payment, 'id'>>) {
            // Локальное добавление (для обратной совместимости)
            const newPayment: Payment = {
                ...action.payload,
                id: crypto.randomUUID(),
            }
            state.payments.push(newPayment)
        },
        updatePayment(state, action: PayloadAction<{ id: string; updates: Partial<Payment> }>) {
            const index = state.payments.findIndex((p) => p.id === action.payload.id)
            if (index !== -1) {
                state.payments[index] = { ...state.payments[index], ...action.payload.updates }
            }
        },
        removePayment(state, action: PayloadAction<string>) {
            // Локальное удаление (для обратной совместимости)
            state.payments = state.payments.filter((p) => p.id !== action.payload)
        },
        decrementRemainingSessions(state, action: PayloadAction<string>) {
            const payment = state.payments.find((p) => p.id === action.payload)
            if (payment && payment.remainingSessions !== undefined && payment.remainingSessions > 0) {
                payment.remainingSessions -= 1
            }
        },
        setSelectedClient(state, action: PayloadAction<string | null>) {
            state.selectedClientId = action.payload
        },
        setPayments(state, action: PayloadAction<Payment[]>) {
            state.payments = action.payload
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchPayments.pending, (state) => {
                state.loading = true
                state.error = null
            })
            .addCase(fetchPayments.fulfilled, (state, action) => {
                state.loading = false
                state.payments = action.payload
            })
            .addCase(fetchPayments.rejected, (state, action) => {
                state.loading = false
                state.error = action.payload as string
            })
            .addCase(createPaymentApi.fulfilled, (state, action) => {
                // Платеж уже добавлен через fetchPayments, но можно добавить и локально для оптимизации
                const existingIndex = state.payments.findIndex(p => p.id === action.payload.id)
                if (existingIndex === -1) {
                    state.payments.push(action.payload)
                }
            })
            .addCase(deletePaymentApi.fulfilled, (state, action) => {
                // Платеж уже удален через fetchPayments, но можно удалить и локально для оптимизации
                state.payments = state.payments.filter(p => p.id !== action.payload)
            })
    },
})

export const { addPayment, updatePayment, removePayment, decrementRemainingSessions, setSelectedClient, setPayments } =
    financesSlice.actions
// fetchPayments, createPaymentApi, deletePaymentApi уже экспортированы при определении выше
export default financesSlice.reducer

