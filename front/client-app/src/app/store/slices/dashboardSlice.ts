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
    clientId?: string // Добавляем опциональное поле для фильтрации заметок по клиенту
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

const defaultTiles: DashboardTile[] = [
    { id: 'weight', labelKey: 'dashboard.bodyOverview.weight', value: '—', period: '7d', category: 'vitals', highlight: true, showTodayValue: false },
    { id: 'sleep', labelKey: 'dashboard.bodyOverview.sleep', value: '—', period: '7d', category: 'vitals', highlight: true, showTodayValue: true },
    { id: 'heartRate', labelKey: 'dashboard.bodyOverview.heartRate', value: '—', period: '7d', category: 'vitals', highlight: true, showTodayValue: true },
    { id: 'steps', labelKey: 'dashboard.bodyOverview.steps', value: '—', period: '7d', category: 'vitals', highlight: true, showTodayValue: true },
    { id: 'water', labelKey: 'metricsPage.water.title', value: '—', period: '7d', category: 'vitals', highlight: true, showTodayValue: true },
]

const savedPeriod = typeof window !== 'undefined' ? localStorage.getItem('dashboard_period') as MetricPeriod : null;
const savedTileIds = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('dashboard_tiles') || 'null') as string[] | null : null;

// Helper function to save tile IDs to localStorage
const saveTileIds = (tiles: DashboardTile[]) => {
    if (typeof window !== 'undefined') {
        localStorage.setItem('dashboard_tiles', JSON.stringify(tiles.map(t => t.id)))
    }
}

const initialState: DashboardState = {
    tiles: savedTileIds
        ? defaultTiles.filter(t => savedTileIds.includes(t.id))
        : [...defaultTiles],
    availableTiles: [...defaultTiles],
    period: savedPeriod || '7d',
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

export const createNoteApi = createAsyncThunk(
    'dashboard/createNote',
    async (data: { client_id?: string; title: string; content?: string }) => {
        const note = await apiClient.createNote({
            client_id: data.client_id || '',
            title: data.title,
            content: data.content,
        })
        return {
            id: note.id,
            title: note.title,
            content: note.content || '',
            updatedAt: note.created_at,
        }
    }
)

export const updateNoteApi = createAsyncThunk(
    'dashboard/updateNote',
    async (data: { note_id: string; title?: string; content?: string }) => {
        const note = await apiClient.updateNote(data.note_id, {
            title: data.title,
            content: data.content,
        })
        return {
            id: note.id,
            title: note.title,
            content: note.content || '',
            updatedAt: note.created_at,
        }
    }
)

export const deleteNoteApi = createAsyncThunk(
    'dashboard/deleteNote',
    async (note_id: string) => {
        await apiClient.deleteNote(note_id)
        return note_id
    }
)

// Dashboard settings API
export const fetchDashboardSettings = createAsyncThunk(
    'dashboard/fetchSettings',
    async () => {
        return await apiClient.getDashboardSettings()
    }
)

export const saveDashboardSettings = createAsyncThunk(
    'dashboard/saveSettings',
    async (settings: { tile_ids?: string[]; period?: string }) => {
        return await apiClient.updateDashboardSettings(settings)
    }
)

const dashboardSlice = createSlice({
    name: 'dashboard',
    initialState,
    reducers: {
        setDashboardPeriod(state, action: PayloadAction<MetricPeriod>) {
            state.period = action.payload
            localStorage.setItem('dashboard_period', action.payload)
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
            saveTileIds(state.tiles)
        },
        reorderTiles(state, action: PayloadAction<{ from: number; to: number }>) {
            const { from, to } = action.payload
            if (from === to || from < 0 || to < 0 || from >= state.tiles.length || to >= state.tiles.length) {
                return
            }
            const [moved] = state.tiles.splice(from, 1)
            state.tiles.splice(to, 0, moved)
            saveTileIds(state.tiles)
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
        syncAvailableTiles(state, action: PayloadAction<{ metricId: string; label: string }[]>) {
            // Базовые тайлы (хардкодированные)
            const baseTiles: DashboardTile[] = [
                { id: 'weight', labelKey: 'dashboard.bodyOverview.weight', value: '—', period: '7d', category: 'vitals', highlight: true, showTodayValue: false },
                { id: 'sleep', labelKey: 'dashboard.bodyOverview.sleep', value: '—', period: '7d', category: 'vitals', highlight: true, showTodayValue: true },
                { id: 'heartRate', labelKey: 'dashboard.bodyOverview.heartRate', value: '—', period: '7d', category: 'vitals', highlight: true, showTodayValue: true },
                { id: 'steps', labelKey: 'dashboard.bodyOverview.steps', value: '—', period: '7d', category: 'vitals', highlight: true, showTodayValue: true },
                { id: 'water', labelKey: 'metricsPage.water.title', value: '—', period: '7d', category: 'vitals', highlight: true, showTodayValue: true },
            ]

            // Добавляем динамические метрики
            const dynamicTiles: DashboardTile[] = action.payload
                .filter(m => {
                    const label = m.label.toLowerCase()
                    const isBase = [
                        'weight', 'вес',
                        'sleep', 'сон',
                        'heart', 'пульс',
                        'step', 'шаг',
                        'water', 'вода'
                    ].some(keyword => label.includes(keyword))
                    return !isBase
                })
                .map(m => ({
                    id: m.metricId,
                    labelKey: m.label, // Для динамических метрик используем label напрямую
                    value: '—',
                    period: '7d' as MetricPeriod,
                    category: 'vitals' as const,
                    highlight: false,
                    showTodayValue: true,
                }))

            state.availableTiles = [...baseTiles, ...dynamicTiles]

            // Восстанавливаем динамические тайлы из localStorage
            const savedIds = typeof window !== 'undefined'
                ? JSON.parse(localStorage.getItem('dashboard_tiles') || 'null') as string[] | null
                : null

            if (savedIds) {
                // Добавляем динамические тайлы которые были сохранены, но ещё не в tiles
                for (const tile of dynamicTiles) {
                    if (savedIds.includes(tile.id) && !state.tiles.some(t => t.id === tile.id)) {
                        state.tiles.push(tile)
                    }
                }
            }
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
            .addCase(createNoteApi.fulfilled, (state, action) => {
                const existingIndex = state.trainerNotes.findIndex((note) => note.id === action.payload.id)
                if (existingIndex >= 0) {
                    state.trainerNotes[existingIndex] = action.payload
                } else {
                    state.trainerNotes.push(action.payload)
                }
            })
            .addCase(updateNoteApi.fulfilled, (state, action) => {
                const index = state.trainerNotes.findIndex((note) => note.id === action.payload.id)
                if (index >= 0) {
                    state.trainerNotes[index] = action.payload
                }
            })
            .addCase(deleteNoteApi.fulfilled, (state, action) => {
                state.trainerNotes = state.trainerNotes.filter((note) => note.id !== action.payload)
            })
            // Dashboard settings from API
            .addCase(fetchDashboardSettings.fulfilled, (state, action) => {
                const { tile_ids, period } = action.payload
                if (tile_ids && tile_ids.length > 0) {
                    // Восстанавливаем тайлы по их ID из availableTiles
                    const restoredTiles = tile_ids
                        .map(id => state.availableTiles.find(t => t.id === id))
                        .filter((t): t is DashboardTile => t !== undefined)
                    if (restoredTiles.length > 0) {
                        state.tiles = restoredTiles
                    }
                }
                if (period) {
                    state.period = period as MetricPeriod
                }
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
    syncAvailableTiles,
} = dashboardSlice.actions
export default dashboardSlice.reducer

