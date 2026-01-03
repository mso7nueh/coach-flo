import { createSlice, nanoid, type PayloadAction, createAsyncThunk } from '@reduxjs/toolkit'
import dayjs from 'dayjs'
import isoWeek from 'dayjs/plugin/isoWeek'
import 'dayjs/locale/ru'

dayjs.extend(isoWeek)
dayjs.locale('ru')
import { apiClient } from '@/shared/api/client'
import type { Workout } from '@/shared/api/client'

export type AttendanceStatus = 'scheduled' | 'completed' | 'missed'
export type RecurrenceFrequency = 'daily' | 'weekly' | 'monthly'
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6 // 0 = Sunday, 1 = Monday, etc.

export interface RecurrenceRule {
  frequency: RecurrenceFrequency
  interval: number // Повторять каждые N дней/недель/месяцев
  daysOfWeek?: DayOfWeek[] // Для weekly: дни недели
  endDate?: string // Дата окончания повторений
  occurrences?: number // Количество повторений
  seriesId: string // ID серии повторяющихся тренировок
}

export interface ClientWorkout {
  id: string
  title: string
  start: string
  end: string
  location?: string
  programDayId?: string
  attendance: AttendanceStatus
  coachNote?: string
  recurrence?: RecurrenceRule // Правило повторения
  trainerId?: string
  withTrainer?: boolean
  format?: 'online' | 'offline'
}

export type CalendarView = '1w' | '2w' | '4w' | 'month'

interface TrainerAvailabilitySlot {
  start: string
  end: string
}

type TrainerAvailabilityMap = Record<string, Record<string, TrainerAvailabilitySlot[]>>

interface CalendarState {
  workouts: ClientWorkout[]
  selectedDate: string
  view: CalendarView
  currentStartDate: string
  trainerAvailability: TrainerAvailabilityMap
  loading: boolean
  error: string | null
}

const today = dayjs()

const mapApiWorkoutToState = (workout: Workout): ClientWorkout => ({
  id: workout.id,
  title: workout.title,
  start: workout.start,
  end: workout.end,
  location: workout.location || undefined,
  programDayId: workout.program_day_id || undefined,
  attendance: workout.attendance as AttendanceStatus,
  coachNote: workout.coach_note || undefined,
  trainerId: workout.trainer_id || undefined,
  withTrainer: !!workout.trainer_id,
  format: workout.format || undefined,
})

export const fetchWorkouts = createAsyncThunk(
  'calendar/fetchWorkouts',
  async (params?: { start_date?: string; end_date?: string }) => {
    const workouts = await apiClient.getWorkouts(params)
    return workouts.map(mapApiWorkoutToState)
  }
)

export const createWorkout = createAsyncThunk(
  'calendar/createWorkout',
  async (
    workoutData: {
      title: string
      start: string
      end: string
      location?: string
      format?: 'online' | 'offline'
      trainerId?: string
      programDayId?: string
      recurrence?: RecurrenceRule
    },
    { rejectWithValue }
  ) => {
    try {
      const apiData: Parameters<typeof apiClient.createWorkout>[0] = {
        title: workoutData.title,
        start: workoutData.start,
        end: workoutData.end,
        location: workoutData.location,
        format: workoutData.format,
        trainer_id: workoutData.trainerId,
        program_day_id: workoutData.programDayId,
      }

      // Преобразуем recurrence в формат API
      if (workoutData.recurrence) {
        apiData.recurrence_frequency = workoutData.recurrence.frequency
        apiData.recurrence_interval = workoutData.recurrence.interval
        apiData.recurrence_days_of_week = workoutData.recurrence.daysOfWeek
        apiData.recurrence_end_date = workoutData.recurrence.endDate
        apiData.recurrence_occurrences = workoutData.recurrence.occurrences
      }

      const workout = await apiClient.createWorkout(apiData)
      return mapApiWorkoutToState(workout)
    } catch (error: any) {
      return rejectWithValue(error.message || 'Ошибка создания тренировки')
    }
  }
)

const initialState: CalendarState = {
  workouts: [],
  selectedDate: today.startOf('day').toISOString(),
  view: '1w', // Календарь отображает одну неделю
  currentStartDate: today.startOf('isoWeek').toISOString(),
  trainerAvailability: {},
  loading: false,
  error: null,
}

const calendarSlice = createSlice({
  name: 'calendar',
  initialState,
  reducers: {
    setSelectedDate(state, action: PayloadAction<string>) {
      state.selectedDate = action.payload
    },
    setCalendarView(state, action: PayloadAction<CalendarView>) {
      state.view = action.payload
    },
    setCurrentStartDate(state, action: PayloadAction<string>) {
      state.currentStartDate = action.payload
    },
    goToToday(state) {
      const today = dayjs().startOf('day')
      state.selectedDate = today.toISOString()
      state.currentStartDate = today.startOf('isoWeek').toISOString()
    },
    goToPreviousWeek(state) {
      const current = dayjs(state.currentStartDate)
      // Всегда переходим на 1 неделю назад для последовательной навигации
      state.currentStartDate = current.subtract(1, 'week').startOf('isoWeek').toISOString()
    },
    goToNextWeek(state) {
      const current = dayjs(state.currentStartDate)
      // Всегда переходим на 1 неделю вперед для последовательной навигации
      state.currentStartDate = current.add(1, 'week').startOf('isoWeek').toISOString()
    },
    updateWorkoutAttendance(state, action: PayloadAction<{ workoutId: string; attendance: AttendanceStatus }>) {
      const workout = state.workouts.find((item) => item.id === action.payload.workoutId)
      if (workout) {
        workout.attendance = action.payload.attendance
      }
    },
    scheduleWorkout(state, action: PayloadAction<Omit<ClientWorkout, 'id'>>) {
      const workout: ClientWorkout = { ...action.payload, id: nanoid() }
      state.workouts.push(workout)

      // Если указано правило повторения, создаем серию тренировок
      if (action.payload.recurrence) {
        const { recurrence } = action.payload
        const startDate = dayjs(workout.start)
        const endDate = recurrence.endDate ? dayjs(recurrence.endDate) : null
        const maxOccurrences = recurrence.occurrences || 52 // Максимум 52 повторения по умолчанию

        let currentDate = startDate
        let count = 1

        while (count < maxOccurrences) {
          if (endDate && currentDate.isAfter(endDate)) {
            break
          }

          // Вычисляем следующую дату в зависимости от частоты
          if (recurrence.frequency === 'daily') {
            currentDate = currentDate.add(recurrence.interval, 'day')
          } else if (recurrence.frequency === 'weekly') {
            if (recurrence.daysOfWeek && recurrence.daysOfWeek.length > 0) {
              // Находим следующий день недели из списка
              const currentDay = currentDate.day()
              const nextDay = recurrence.daysOfWeek.find((day) => day > currentDay) ?? recurrence.daysOfWeek[0]
              const daysToAdd = nextDay > currentDay ? nextDay - currentDay : 7 - currentDay + nextDay
              currentDate = currentDate.add(daysToAdd || recurrence.interval * 7, 'day')
            } else {
              currentDate = currentDate.add(recurrence.interval, 'week')
            }
          } else if (recurrence.frequency === 'monthly') {
            currentDate = currentDate.add(recurrence.interval, 'month')
          }

          if (endDate && currentDate.isAfter(endDate)) {
            break
          }

          const duration = dayjs(workout.end).diff(dayjs(workout.start), 'minute')
          const newWorkout: ClientWorkout = {
            ...workout,
            id: nanoid(),
            start: currentDate.toISOString(),
            end: currentDate.add(duration, 'minute').toISOString(),
            recurrence: {
              ...recurrence,
              seriesId: recurrence.seriesId || workout.id,
            },
          }
          state.workouts.push(newWorkout)
          count++
        }
      }
    },
    updateWorkout(state, action: PayloadAction<ClientWorkout>) {
      const index = state.workouts.findIndex((item) => item.id === action.payload.id)
      if (index >= 0) {
        state.workouts[index] = action.payload
      }
    },
    removeWorkout(state, action: PayloadAction<string>) {
      state.workouts = state.workouts.filter((item) => item.id !== action.payload)
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
      state.selectedDate = updatedStart.toISOString()
    },
    removeWorkoutSeries(state, action: PayloadAction<string>) {
      // Удаляем все тренировки из серии
      const workout = state.workouts.find((w) => w.id === action.payload)
      if (workout?.recurrence?.seriesId) {
        const seriesId = workout.recurrence.seriesId
        state.workouts = state.workouts.filter(
          (w) => !w.recurrence || w.recurrence.seriesId !== seriesId,
        )
      } else {
        state.workouts = state.workouts.filter((item) => item.id !== action.payload)
      }
    },
    removeFutureWorkouts(state, action: PayloadAction<{ workoutId: string; fromDate: string }>) {
      // Удаляем все будущие тренировки из серии, начиная с указанной даты
      const workout = state.workouts.find((w) => w.id === action.payload.workoutId)
      if (workout?.recurrence?.seriesId) {
        const seriesId = workout.recurrence.seriesId
        const fromDate = dayjs(action.payload.fromDate)
        state.workouts = state.workouts.filter((w) => {
          if (w.recurrence?.seriesId === seriesId) {
            return dayjs(w.start).isBefore(fromDate) || w.id === action.payload.workoutId
          }
          return true
        })
      } else {
        state.workouts = state.workouts.filter((item) => item.id !== action.payload.workoutId)
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchWorkouts.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchWorkouts.fulfilled, (state, action) => {
        state.loading = false
        state.workouts = action.payload
      })
      .addCase(fetchWorkouts.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message || 'Ошибка загрузки тренировок'
      })
      .addCase(createWorkout.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(createWorkout.fulfilled, (state, action) => {
        state.loading = false
        // Добавляем созданную тренировку в state
        const existingIndex = state.workouts.findIndex(w => w.id === action.payload.id)
        if (existingIndex >= 0) {
          state.workouts[existingIndex] = action.payload
        } else {
          state.workouts.push(action.payload)
        }
      })
      .addCase(createWorkout.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
  },
})

export const {
  setSelectedDate,
  setCalendarView,
  setCurrentStartDate,
  goToToday,
  goToPreviousWeek,
  goToNextWeek,
  updateWorkoutAttendance,
  scheduleWorkout,
  updateWorkout,
  removeWorkout,
  moveWorkout,
  removeWorkoutSeries,
  removeFutureWorkouts,
} = calendarSlice.actions
export default calendarSlice.reducer

