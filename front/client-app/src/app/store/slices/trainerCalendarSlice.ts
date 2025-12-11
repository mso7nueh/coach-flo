import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import dayjs from 'dayjs'
import type { AttendanceStatus, RecurrenceRule } from './calendarSlice'

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

const today = dayjs()

const sampleTrainerWorkouts: TrainerWorkout[] = [
    {
        id: crypto.randomUUID(),
        clientId: '1',
        title: 'Силовая тренировка',
        start: today.hour(9).minute(0).toISOString(),
        end: today.hour(10).minute(30).toISOString(),
        location: 'Зал №2',
        format: 'offline',
        programDayId: 'day-1',
        attendance: 'scheduled',
    },
    {
        id: crypto.randomUUID(),
        clientId: '2',
        title: 'Функциональная тренировка',
        start: today.hour(11).minute(0).toISOString(),
        end: today.hour(12).minute(0).toISOString(),
        format: 'online',
        programDayId: 'day-2',
        attendance: 'scheduled',
    },
    {
        id: crypto.randomUUID(),
        clientId: '1',
        title: 'Кардио',
        start: today.add(1, 'day').hour(10).minute(0).toISOString(),
        end: today.add(1, 'day').hour(11).minute(0).toISOString(),
        location: 'Зал №1',
        format: 'offline',
        attendance: 'scheduled',
    },
    {
        id: crypto.randomUUID(),
        clientId: '3',
        title: 'Силовая тренировка',
        start: today.add(1, 'day').hour(18).minute(0).toISOString(),
        end: today.add(1, 'day').hour(19).minute(30).toISOString(),
        location: 'Зал №2',
        format: 'offline',
        programDayId: 'day-1',
        attendance: 'scheduled',
    },
    {
        id: crypto.randomUUID(),
        clientId: '2',
        title: 'Растяжка',
        start: today.add(2, 'day').hour(19).minute(0).toISOString(),
        end: today.add(2, 'day').hour(19).minute(45).toISOString(),
        format: 'online',
        attendance: 'scheduled',
    },
    {
        id: crypto.randomUUID(),
        clientId: '1',
        title: 'Функциональная тренировка',
        start: today.add(3, 'day').hour(9).minute(0).toISOString(),
        end: today.add(3, 'day').hour(10).minute(0).toISOString(),
        location: 'Зал №2',
        format: 'offline',
        programDayId: 'day-2',
        attendance: 'scheduled',
    },
    {
        id: crypto.randomUUID(),
        clientId: '3',
        title: 'Кардио',
        start: today.add(4, 'day').hour(10).minute(0).toISOString(),
        end: today.add(4, 'day').hour(11).minute(0).toISOString(),
        location: 'Зал №1',
        format: 'offline',
        attendance: 'scheduled',
    },
    {
        id: crypto.randomUUID(),
        clientId: '2',
        title: 'Силовая тренировка',
        start: today.subtract(1, 'day').hour(11).minute(0).toISOString(),
        end: today.subtract(1, 'day').hour(12).minute(30).toISOString(),
        format: 'online',
        programDayId: 'day-1',
        attendance: 'completed',
    },
    {
        id: crypto.randomUUID(),
        clientId: '1',
        title: 'Растяжка',
        start: today.subtract(2, 'day').hour(20).minute(0).toISOString(),
        end: today.subtract(2, 'day').hour(20).minute(45).toISOString(),
        format: 'offline',
        attendance: 'completed',
    },
    {
        id: crypto.randomUUID(),
        clientId: '3',
        title: 'Функциональная тренировка',
        start: today.subtract(3, 'day').hour(18).minute(0).toISOString(),
        end: today.subtract(3, 'day').hour(19).minute(0).toISOString(),
        location: 'Зал №2',
        format: 'offline',
        programDayId: 'day-2',
        attendance: 'missed',
        coachNote: 'Клиент не пришел',
    },
]

const initialState: TrainerCalendarState = {
    workouts: sampleTrainerWorkouts,
    view: 'week',
    currentDate: dayjs().startOf('week').toISOString(),
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
            state.currentDate = dayjs().startOf('week').toISOString()
        },
        goToPreviousWeek(state) {
            state.currentDate = dayjs(state.currentDate).subtract(1, 'week').startOf('week').toISOString()
        },
        goToNextWeek(state) {
            state.currentDate = dayjs(state.currentDate).add(1, 'week').startOf('week').toISOString()
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

