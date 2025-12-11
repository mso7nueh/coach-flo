import { createSlice, nanoid, type PayloadAction } from '@reduxjs/toolkit'

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
}

const sampleTiles: DashboardTile[] = [
    {
        id: 'sessions-7',
        labelKey: 'dashboard.tiles.sessions',
        value: '4',
        secondaryValue: '12',
        period: '7d',
        category: 'training',
        highlight: true,
    },
    {
        id: 'attendance',
        labelKey: 'dashboard.tiles.attendance',
        value: '82%',
        period: '30d',
        category: 'attendance',
    },
    {
        id: 'next-session',
        labelKey: 'dashboard.tiles.nextSession',
        value: '15 ноя, 18:00',
        period: '7d',
        category: 'schedule',
    },
    {
        id: 'weight',
        labelKey: 'dashboard.tiles.weight',
        value: '78.4 кг',
        secondaryValue: '-1.3 кг',
        period: '30d',
        category: 'vitals',
        showTodayValue: false, // вес не меняется в течение дня
    },
    {
        id: 'sleep',
        labelKey: 'dashboard.tiles.sleep',
        value: '7 ч 20 м',
        todayValue: '6 ч 30 м',
        secondaryValue: '+0.3 ч',
        period: '7d',
        category: 'vitals',
        showTodayValue: true,
    },
    {
        id: 'steps',
        labelKey: 'dashboard.tiles.steps',
        value: '9 800',
        todayValue: '8 200',
        secondaryValue: '+4.2%',
        period: '7d',
        category: 'vitals',
        showTodayValue: true,
    },
    {
        id: 'heartRate',
        labelKey: 'dashboard.tiles.heartRate',
        value: '72 уд/мин',
        todayValue: '68 уд/мин',
        secondaryValue: '↓ -3',
        period: '7d',
        category: 'vitals',
        showTodayValue: true,
    },
    {
        id: 'calories',
        labelKey: 'dashboard.tiles.calories',
        value: '2 450 ккал',
        todayValue: '1 850 ккал',
        secondaryValue: '↑ +120',
        period: '7d',
        category: 'vitals',
        showTodayValue: true,
    },
]

const trainerNotes: TrainerNote[] = [
    {
        id: nanoid(),
        title: 'Нагрузка',
        content: 'Следить за пульсом в диапазоне 130-140, добавить кардио по утрам дважды в неделю.',
        updatedAt: new Date().toISOString(),
    },
    {
        id: nanoid(),
        title: 'Диета',
        content: 'Отправить обновленный план питания после контрольного взвешивания 20 ноября.',
        updatedAt: new Date().toISOString(),
    },
]

const initialState: DashboardState = {
    tiles: sampleTiles,
    availableTiles: sampleTiles,
    period: '7d',
    trainerNotes,
    configurationOpened: false,
    metricGoals: {
        weight: 72.0,
        sleep: 8.0,
    },
}

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
} = dashboardSlice.actions
export default dashboardSlice.reducer

