import { createSlice, nanoid, type PayloadAction } from '@reduxjs/toolkit'
import dayjs from 'dayjs'

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
}

export type CalendarView = '1w' | '2w' | '4w' | 'month'

interface CalendarState {
  workouts: ClientWorkout[]
  selectedDate: string
  view: CalendarView
  currentStartDate: string
}

const today = dayjs()

const sampleWorkouts: ClientWorkout[] = [
  {
    id: nanoid(),
    title: 'Силовая тренировка',
    start: today.hour(18).minute(0).second(0).toISOString(),
    end: today.hour(19).minute(0).second(0).toISOString(),
    location: 'Зал №2',
    programDayId: 'day-1',
    attendance: 'scheduled',
  },
  {
    id: nanoid(),
    title: 'Функциональная тренировка',
    start: today.add(2, 'day').hour(18).minute(0).toISOString(),
    end: today.add(2, 'day').hour(19).minute(0).toISOString(),
    programDayId: 'day-2',
    attendance: 'scheduled',
  },
  {
    id: nanoid(),
    title: 'Кардио',
    start: today.subtract(3, 'day').hour(7).minute(30).toISOString(),
    end: today.subtract(3, 'day').hour(8).minute(15).toISOString(),
    attendance: 'completed',
  },
  {
    id: nanoid(),
    title: 'Растяжка',
    start: today.subtract(6, 'day').hour(20).minute(0).toISOString(),
    end: today.subtract(6, 'day').hour(20).minute(45).toISOString(),
    attendance: 'missed',
    coachNote: 'Перенести на следующую неделю',
  },
]

const initialState: CalendarState = {
  workouts: sampleWorkouts,
  selectedDate: today.startOf('day').toISOString(),
  view: '2w',
  currentStartDate: today.startOf('week').toISOString(),
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
      state.currentStartDate = today.startOf('week').toISOString()
    },
    goToPreviousWeek(state) {
      const current = dayjs(state.currentStartDate)
      const weeks = state.view === '1w' ? 1 : state.view === '2w' ? 2 : state.view === '4w' ? 4 : 4
      state.currentStartDate = current.subtract(weeks, 'week').startOf('week').toISOString()
    },
    goToNextWeek(state) {
      const current = dayjs(state.currentStartDate)
      const weeks = state.view === '1w' ? 1 : state.view === '2w' ? 2 : state.view === '4w' ? 4 : 4
      state.currentStartDate = current.add(weeks, 'week').startOf('week').toISOString()
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
  removeWorkoutSeries,
  removeFutureWorkouts,
} = calendarSlice.actions
export default calendarSlice.reducer

