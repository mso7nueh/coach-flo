import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

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
}

const initialState: FinancesState = {
    payments: [
        {
            id: '1',
            clientId: '1',
            amount: 5000,
            date: '2024-01-01',
            type: 'package',
            packageSize: 10,
            remainingSessions: 7,
            nextPaymentDate: '2024-02-01',
        },
        {
            id: '2',
            clientId: '2',
            amount: 3000,
            date: '2024-01-05',
            type: 'subscription',
            subscriptionDays: 30,
            nextPaymentDate: '2024-02-05',
        },
        {
            id: '3',
            clientId: '3',
            amount: 2000,
            date: '2024-01-10',
            type: 'single',
        },
    ],
    selectedClientId: null,
}

const financesSlice = createSlice({
    name: 'finances',
    initialState,
    reducers: {
        addPayment(state, action: PayloadAction<Omit<Payment, 'id'>>) {
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
    },
})

export const { addPayment, updatePayment, removePayment, decrementRemainingSessions, setSelectedClient } =
    financesSlice.actions
export default financesSlice.reducer

