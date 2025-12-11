import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

export interface Client {
    id: string
    fullName: string
    email?: string
    phone?: string
    avatar?: string
    format: 'online' | 'offline' | 'both'
    // данные из онбординга
    weight?: number
    height?: number
    age?: number
    goals?: string[]
    restrictions?: string[]
    activityLevel?: 'low' | 'medium' | 'high'
    lastWorkout?: string
    nextWorkout?: string
    attendanceRate: number
    totalWorkouts: number
    completedWorkouts: number
    joinedDate: string
    // пакет тренировок
    workoutsPackage?: number // количество тренировок в пакете
    packageExpiryDate?: string // дата окончания пакета (ISO string)
    isActive: boolean // активен ли клиент (автоматически отключается после окончания пакета)
}

interface ClientsState {
    clients: Client[]
    searchQuery: string
    selectedClientId: string | null
}

const initialState: ClientsState = {
    clients: [
        {
            id: '1',
            fullName: 'Иван Петров',
            email: 'ivan@example.com',
            phone: '+7 (999) 123-45-67',
            format: 'both',
            lastWorkout: '2024-01-15T10:00:00',
            nextWorkout: '2024-01-18T18:00:00',
            attendanceRate: 85,
            totalWorkouts: 20,
            completedWorkouts: 17,
            joinedDate: '2023-09-01',
            workoutsPackage: 12,
            packageExpiryDate: '2024-12-31',
            isActive: true,
        },
        {
            id: '2',
            fullName: 'Мария Сидорова',
            email: 'maria@example.com',
            phone: '+7 (999) 234-56-78',
            format: 'online',
            lastWorkout: '2024-01-14T19:00:00',
            nextWorkout: '2024-01-17T19:00:00',
            attendanceRate: 92,
            totalWorkouts: 25,
            completedWorkouts: 23,
            joinedDate: '2023-08-15',
            workoutsPackage: 8,
            packageExpiryDate: '2024-06-30',
            isActive: true,
        },
        {
            id: '3',
            fullName: 'Алексей Козлов',
            email: 'alex@example.com',
            phone: '+7 (999) 345-67-89',
            format: 'offline',
            lastWorkout: '2024-01-13T09:00:00',
            nextWorkout: '2024-01-19T09:00:00',
            attendanceRate: 75,
            totalWorkouts: 16,
            completedWorkouts: 12,
            joinedDate: '2023-10-10',
            workoutsPackage: 16,
            packageExpiryDate: '2024-03-31',
            isActive: true,
        },
    ],
    searchQuery: '',
    selectedClientId: null,
}

const clientsSlice = createSlice({
    name: 'clients',
    initialState,
    reducers: {
        addClient(state, action: PayloadAction<Omit<Client, 'id' | 'attendanceRate' | 'totalWorkouts' | 'completedWorkouts' | 'joinedDate'>>) {
            const newClient: Client = {
                ...action.payload,
                id: crypto.randomUUID(),
                attendanceRate: 0,
                totalWorkouts: 0,
                completedWorkouts: 0,
                joinedDate: new Date().toISOString(),
                isActive: action.payload.isActive ?? true,
            }
            state.clients.push(newClient)
        },
        updateClient(state, action: PayloadAction<{ id: string; updates: Partial<Client> }>) {
            const index = state.clients.findIndex((c) => c.id === action.payload.id)
            if (index !== -1) {
                state.clients[index] = { ...state.clients[index], ...action.payload.updates }
            }
        },
        removeClient(state, action: PayloadAction<string>) {
            state.clients = state.clients.filter((c) => c.id !== action.payload)
            if (state.selectedClientId === action.payload) {
                state.selectedClientId = null
            }
        },
        setSearchQuery(state, action: PayloadAction<string>) {
            state.searchQuery = action.payload
        },
        setSelectedClient(state, action: PayloadAction<string | null>) {
            state.selectedClientId = action.payload
        },
        updateClientAttendance(state, action: PayloadAction<{ clientId: string; totalWorkouts: number; completedWorkouts: number }>) {
            const client = state.clients.find((c) => c.id === action.payload.clientId)
            if (client) {
                client.totalWorkouts = action.payload.totalWorkouts
                client.completedWorkouts = action.payload.completedWorkouts
                client.attendanceRate =
                    action.payload.totalWorkouts > 0
                        ? Math.round((action.payload.completedWorkouts / action.payload.totalWorkouts) * 100)
                        : 0
            }
        },
        checkAndDeactivateExpiredClients(state) {
            const now = new Date().toISOString()
            state.clients.forEach((client) => {
                if (client.packageExpiryDate && client.packageExpiryDate < now && client.isActive) {
                    client.isActive = false
                }
            })
        },
    },
})

export const { addClient, updateClient, removeClient, setSearchQuery, setSelectedClient, updateClientAttendance, checkAndDeactivateExpiredClients } =
    clientsSlice.actions
export default clientsSlice.reducer

