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
            date: '2024-10-01',
            type: 'package',
            packageSize: 10,
            remainingSessions: 7,
            nextPaymentDate: '2024-11-01',
        },
        {
            id: '2',
            clientId: '2',
            amount: 3000,
            date: '2024-10-05',
            type: 'subscription',
            subscriptionDays: 30,
            nextPaymentDate: '2024-11-05',
        },
        {
            id: '3',
            clientId: '3',
            amount: 2000,
            date: '2024-10-10',
            type: 'single',
        },
        {
            id: '4',
            clientId: '1',
            amount: 4500,
            date: '2024-09-15',
            type: 'package',
            packageSize: 8,
            remainingSessions: 0,
            nextPaymentDate: '2024-10-15',
        },
        {
            id: '5',
            clientId: '2',
            amount: 3000,
            date: '2024-09-10',
            type: 'subscription',
            subscriptionDays: 30,
            nextPaymentDate: '2024-10-10',
        },
        {
            id: '6',
            clientId: '4',
            amount: 6000,
            date: '2024-09-20',
            type: 'package',
            packageSize: 12,
            remainingSessions: 5,
            nextPaymentDate: '2024-10-20',
        },
        {
            id: '7',
            clientId: '3',
            amount: 2500,
            date: '2024-09-25',
            type: 'single',
        },
        {
            id: '8',
            clientId: '1',
            amount: 5000,
            date: '2024-08-01',
            type: 'package',
            packageSize: 10,
            remainingSessions: 0,
            nextPaymentDate: '2024-09-01',
        },
        {
            id: '9',
            clientId: '2',
            amount: 3000,
            date: '2024-08-05',
            type: 'subscription',
            subscriptionDays: 30,
            nextPaymentDate: '2024-09-05',
        },
        {
            id: '10',
            clientId: '4',
            amount: 5500,
            date: '2024-08-15',
            type: 'package',
            packageSize: 11,
            remainingSessions: 0,
            nextPaymentDate: '2024-09-15',
        },
        {
            id: '11',
            clientId: '3',
            amount: 1800,
            date: '2024-08-20',
            type: 'single',
        },
        {
            id: '12',
            clientId: '1',
            amount: 4800,
            date: '2024-07-10',
            type: 'package',
            packageSize: 9,
            remainingSessions: 0,
            nextPaymentDate: '2024-08-10',
        },
        {
            id: '13',
            clientId: '2',
            amount: 3000,
            date: '2024-07-05',
            type: 'subscription',
            subscriptionDays: 30,
            nextPaymentDate: '2024-08-05',
        },
        {
            id: '14',
            clientId: '4',
            amount: 6200,
            date: '2024-07-20',
            type: 'package',
            packageSize: 13,
            remainingSessions: 0,
            nextPaymentDate: '2024-08-20',
        },
        {
            id: '15',
            clientId: '3',
            amount: 2200,
            date: '2024-07-25',
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

