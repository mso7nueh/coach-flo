import { createSlice, type PayloadAction, createAsyncThunk } from '@reduxjs/toolkit'
import dayjs from 'dayjs'
import isoWeek from 'dayjs/plugin/isoWeek'
import 'dayjs/locale/ru'
import { apiClient } from '@/shared/api/client'
import type { AttendanceStatus, RecurrenceRule } from './calendarSlice'

dayjs.extend(isoWeek)
dayjs.locale('ru')

export type TrainerCalendarView = 'week' | 'day'

export interface TrainerWorkout {
    id: string
    clientId: string
    title: string
    start: string
    end: string
    location?: string
    format: 'online' | 'offline'
    programDayId?: string
    attendance: AttendanceStatus
    coachNote?: string
    recurrence?: RecurrenceRule
}

interface TrainerCalendarState {
    workouts: TrainerWorkout[]
    view: TrainerCalendarView
    currentDate: string
    selectedClientIds: string[]
}

const mapApiWorkoutToTrainerWorkout = (workout: any): TrainerWorkout => ({
    id: workout.id,
    clientId: workout.user_id,
    title: workout.title,
    start: workout.start,
    end: workout.end,
    location: workout.location || undefined,
    format: (workout.format || 'offline') as 'online' | 'offline',
    programDayId: workout.program_day_id || undefined,
    attendance: (workout.attendance || 'scheduled') as AttendanceStatus,
    coachNote: workout.coach_note || undefined,
})

export const fetchTrainerWorkouts = createAsyncThunk(
    'trainerCalendar/fetchWorkouts',
    async (params?: { start_date?: string; end_date?: string; client_id?: string }) => {
        const workouts = await apiClient.getTrainerWorkouts({
            ...params,
            trainer_view: true, // Получаем все тренировки команды тренера
        })
        return workouts.map(mapApiWorkoutToTrainerWorkout)
    }
)

export const createTrainerWorkout = createAsyncThunk(
    'trainerCalendar/createWorkout',
    async (
        workoutData: {
            clientId: string
            title: string
            start: string
            end: string
            location?: string
            format?: 'online' | 'offline'
            programDayId?: string
        },
        { rejectWithValue }
    ) => {
        try {
            const workout = await apiClient.createWorkout({
                title: workoutData.title,
                start: workoutData.start,
                end: workoutData.end,
                location: workoutData.location,
                format: workoutData.format,
                user_id: workoutData.clientId, // Для тренера передаем ID клиента
                program_day_id: workoutData.programDayId,
            })
            return mapApiWorkoutToTrainerWorkout(workout)
        } catch (error: any) {
            return rejectWithValue(error.message || 'Ошибка создания тренировки')
        }
    }
)

export const updateTrainerWorkout = createAsyncThunk(
    'trainerCalendar/updateWorkout',
    async (
        { id, updates }: { id: string; updates: Partial<TrainerWorkout> },
        { rejectWithValue }
    ) => {
        try {
            const workout = await apiClient.updateWorkout(id, {
                title: updates.title,
                start: updates.start,
                end: updates.end,
                location: updates.location,
                format: updates.format,
                attendance: updates.attendance === 'missed' ? 'cancelled' : (updates.attendance as 'scheduled' | 'completed' | 'cancelled' | undefined),
                coach_note: updates.coachNote,
            })
            return mapApiWorkoutToTrainerWorkout(workout)
        } catch (error: any) {
            return rejectWithValue(error.message || 'Ошибка обновления тренировки')
        }
    }
)

export const deleteTrainerWorkout = createAsyncThunk(
    'trainerCalendar/deleteWorkout',
    async (id: string, { rejectWithValue }) => {
        try {
            await apiClient.deleteWorkout(id)
            return id
        } catch (error: any) {
            return rejectWithValue(error.message || 'Ошибка удаления тренировки')
        }
    }
)

const initialState: TrainerCalendarState = {
    workouts: [],
    view: 'week',
    currentDate: dayjs().startOf('isoWeek').toISOString(),
    selectedClientIds: [],
}

const trainerCalendarSlice = createSlice({
    name: 'trainerCalendar',
    initialState,
    reducers: {
        addWorkout(state, action: PayloadAction<Omit<TrainerWorkout, 'id'>>) {
            const newWorkout: TrainerWorkout = {
                ...action.payload,
                id: crypto.randomUUID(),
            }
            state.workouts.push(newWorkout)
        },
        updateWorkout(state, action: PayloadAction<{ id: string; updates: Partial<TrainerWorkout> }>) {
            const index = state.workouts.findIndex((w) => w.id === action.payload.id)
            if (index !== -1) {
                state.workouts[index] = { ...state.workouts[index], ...action.payload.updates }
            }
        },
        removeWorkout(state, action: PayloadAction<string>) {
            state.workouts = state.workouts.filter((w) => w.id !== action.payload)
        },
        updateWorkoutTime(state, action: PayloadAction<{ id: string; start: string; end: string }>) {
            const workout = state.workouts.find((w) => w.id === action.payload.id)
            if (workout) {
                workout.start = action.payload.start
                workout.end = action.payload.end
            }
        },
        updateWorkoutAttendance(state, action: PayloadAction<{ id: string; attendance: AttendanceStatus }>) {
            const workout = state.workouts.find((w) => w.id === action.payload.id)
            if (workout) {
                workout.attendance = action.payload.attendance
            }
        },
        setView(state, action: PayloadAction<TrainerCalendarView>) {
            state.view = action.payload
        },
        setCurrentDate(state, action: PayloadAction<string>) {
            state.currentDate = action.payload
        },
        goToToday(state) {
            state.currentDate = dayjs().startOf('isoWeek').toISOString()
        },
        goToPreviousWeek(state) {
            state.currentDate = dayjs(state.currentDate).subtract(1, 'week').startOf('isoWeek').toISOString()
        },
        goToNextWeek(state) {
            state.currentDate = dayjs(state.currentDate).add(1, 'week').startOf('isoWeek').toISOString()
        },
        goToPreviousDay(state) {
            state.currentDate = dayjs(state.currentDate).subtract(1, 'day').toISOString()
        },
        goToNextDay(state) {
            state.currentDate = dayjs(state.currentDate).add(1, 'day').toISOString()
        },
        setSelectedClients(state, action: PayloadAction<string[]>) {
            state.selectedClientIds = action.payload
        },
        toggleClientFilter(state, action: PayloadAction<string>) {
            const index = state.selectedClientIds.indexOf(action.payload)
            if (index === -1) {
                state.selectedClientIds.push(action.payload)
            } else {
                state.selectedClientIds.splice(index, 1)
            }
        },
        moveWorkout(state, action: PayloadAction<{ id: string; targetDate: string }>) {
            const workout = state.workouts.find((item) => item.id === action.payload.id)
            if (!workout) {
                return
            }
            const duration = dayjs(workout.end).diff(dayjs(workout.start), 'minute')
            const sourceStart = dayjs(workout.start)
            const targetDate = dayjs(action.payload.targetDate)
            const updatedStart = targetDate.hour(sourceStart.hour()).minute(sourceStart.minute()).second(0)
            workout.start = updatedStart.toISOString()
            workout.end = updatedStart.add(duration, 'minute').toISOString()
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchTrainerWorkouts.pending, (_state) => {
                // Можно добавить loading state если нужно
            })
            .addCase(fetchTrainerWorkouts.fulfilled, (state, action) => {
                state.workouts = action.payload
            })
            .addCase(fetchTrainerWorkouts.rejected, (_state) => {
                // Можно добавить error state если нужно
            })
            .addCase(createTrainerWorkout.fulfilled, (state, action) => {
                // Добавляем созданную тренировку в state
                const existingIndex = state.workouts.findIndex(w => w.id === action.payload.id)
                if (existingIndex >= 0) {
                    state.workouts[existingIndex] = action.payload
                } else {
                    state.workouts.push(action.payload)
                }
            })
            .addCase(updateTrainerWorkout.fulfilled, (state, action) => {
                // Обновляем тренировку в state
                const index = state.workouts.findIndex(w => w.id === action.payload.id)
                if (index >= 0) {
                    state.workouts[index] = action.payload
                }
            })
            .addCase(deleteTrainerWorkout.fulfilled, (state, action) => {
                // Удаляем тренировку из state
                state.workouts = state.workouts.filter(w => w.id !== action.payload)
            })
    },
})

export const {
    addWorkout,
    updateWorkout,
    removeWorkout,
    updateWorkoutTime,
    updateWorkoutAttendance,
    setView,
    setCurrentDate,
    goToToday,
    goToPreviousWeek,
    goToNextWeek,
    goToPreviousDay,
    goToNextDay,
    setSelectedClients,
    toggleClientFilter,
    moveWorkout,
} = trainerCalendarSlice.actions
export default trainerCalendarSlice.reducer

