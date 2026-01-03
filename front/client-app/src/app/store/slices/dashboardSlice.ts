import { createSlice, type PayloadAction, createAsyncThunk } from '@reduxjs/toolkit'
import { apiClient } from '@/shared/api/client'
import type { DashboardStats } from '@/shared/api/client'

export type MetricPeriod = '7d' | '14d' | '30d'

export interface DashboardTile {
    id: string
    labelKey: string
    value: string
    secondaryValue?: string // изменение за период
    todayValue?: string // значение за сегодня (для метрик, которые меняются в течение дня)
    period: MetricPeriod
    category: 'attendance' | 'schedule' | 'vitals' | 'training'
    highlight?: boolean
    showTodayValue?: boolean // показывать ли значение за сегодня
}

export interface TrainerNote {
    id: string
    title: string
    content: string
    updatedAt: string
}

export interface MetricGoal {
    metricId: string
    value: number
}

interface DashboardState {
    tiles: DashboardTile[]
    availableTiles: DashboardTile[]
    period: MetricPeriod
    trainerNotes: TrainerNote[]
    configurationOpened: boolean
    metricGoals: Record<string, number>
    stats: DashboardStats | null
    loading: boolean
    error: string | null
}

const initialState: DashboardState = {
    tiles: [],
    availableTiles: [],
    period: '7d',
    trainerNotes: [],
    configurationOpened: false,
    metricGoals: {},
    stats: null,
    loading: false,
    error: null,
}

export const fetchDashboardStats = createAsyncThunk(
    'dashboard/fetchStats',
    async (period: '7d' | '14d' | '30d') => {
        return await apiClient.getDashboardStats(period)
    }
)

export const fetchTrainerNotes = createAsyncThunk(
    'dashboard/fetchNotes',
    async () => {
        const notes = await apiClient.getNotes()
        return notes.map((note) => ({
            id: note.id,
            title: note.title,
            content: note.content || '',
            updatedAt: note.created_at,
        }))
    }
)

const dashboardSlice = createSlice({
    name: 'dashboard',
    initialState,
    reducers: {
        setDashboardPeriod(state, action: PayloadAction<MetricPeriod>) {
            state.period = action.payload
        },
        toggleTile(state, action: PayloadAction<string>) {
            const exists = state.tiles.find((tile) => tile.id === action.payload)
            if (exists) {
                state.tiles = state.tiles.filter((tile) => tile.id !== action.payload)
            } else {
                const toAdd = state.availableTiles.find((tile) => tile.id === action.payload)
                if (toAdd) {
                    state.tiles.push(toAdd)
                }
            }
        },
        reorderTiles(state, action: PayloadAction<{ from: number; to: number }>) {
            const { from, to } = action.payload
            if (from === to || from < 0 || to < 0 || from >= state.tiles.length || to >= state.tiles.length) {
                return
            }
            const [moved] = state.tiles.splice(from, 1)
            state.tiles.splice(to, 0, moved)
        },
        updateTrainerNote(state, action: PayloadAction<TrainerNote>) {
            const index = state.trainerNotes.findIndex((note) => note.id === action.payload.id)
            if (index >= 0) {
                state.trainerNotes[index] = action.payload
            } else {
                state.trainerNotes.push(action.payload)
            }
        },
        removeTrainerNote(state, action: PayloadAction<string>) {
            state.trainerNotes = state.trainerNotes.filter((note) => note.id !== action.payload)
        },
        openConfiguration(state) {
            state.configurationOpened = true
        },
        closeConfiguration(state) {
            state.configurationOpened = false
        },
        setMetricGoal(state, action: PayloadAction<{ metricId: string; value: number }>) {
            state.metricGoals[action.payload.metricId] = action.payload.value
        },
        setStats(state, action: PayloadAction<DashboardStats>) {
            state.stats = action.payload
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchDashboardStats.pending, (state) => {
                state.loading = true
                state.error = null
            })
            .addCase(fetchDashboardStats.fulfilled, (state, action) => {
                state.loading = false
                state.stats = action.payload
            })
            .addCase(fetchDashboardStats.rejected, (state, action) => {
                state.loading = false
                state.error = action.error.message || 'Ошибка загрузки статистики'
            })
            .addCase(fetchTrainerNotes.fulfilled, (state, action) => {
                state.trainerNotes = action.payload
            })
    },
})

export const {
    setDashboardPeriod,
    toggleTile,
    reorderTiles,
    updateTrainerNote,
    removeTrainerNote,
    openConfiguration,
    closeConfiguration,
    setMetricGoal,
    setStats,
} = dashboardSlice.actions
export default dashboardSlice.reducer

