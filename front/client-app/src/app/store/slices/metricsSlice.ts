import { createSlice, nanoid, type PayloadAction } from '@reduxjs/toolkit'
import dayjs from 'dayjs'

export type MetricsPeriod = '1w' | '4w' | '12w' | 'all'

export interface BodyMetricEntry {
  id: string
  metricId: string
  value: number
  unit: string
  recordedAt: string
}

export interface BodyMetricDescriptor {
  id: string
  label: string
  unit: string
  target?: number
  latestChange?: number
  latestDate?: string
}

export interface ExerciseMetricEntry {
  id: string
  exerciseId: string
  date: string
  weight: number
  repetitions: number
  sets: number
}

export interface ExerciseMetricDescriptor {
  id: string
  label: string
  muscleGroup: string
}

export interface DailyNutritionEntry {
  id: string
  date: string
  calories: number
  proteins?: number
  fats?: number
  carbs?: number
  notes?: string
}

interface MetricsState {
  period: MetricsPeriod
  bodyMetrics: BodyMetricDescriptor[]
  bodyMetricEntries: BodyMetricEntry[]
  exerciseMetrics: ExerciseMetricDescriptor[]
  exerciseMetricEntries: ExerciseMetricEntry[]
  bodyMetricGoals: Record<string, number>
  exerciseMetricGoals: Record<string, { weight?: number; repetitions?: number }>
  bodyMetricStartValues: Record<string, number>
  nutritionEntries: DailyNutritionEntry[]
}

const today = dayjs()

const bodyDescriptors: BodyMetricDescriptor[] = [
  { id: 'weight', label: 'Вес', unit: 'кг', latestChange: -1.3, latestDate: today.toISOString() },
  { id: 'bodyFat', label: 'Жировая масса', unit: '%', latestChange: -0.6, latestDate: today.subtract(7, 'day').toISOString() },
  { id: 'muscleMass', label: 'Мышечная масса', unit: 'кг', latestChange: 0.3, latestDate: today.subtract(7, 'day').toISOString() },
  { id: 'waist', label: 'Талия', unit: 'см', latestChange: -2, latestDate: today.subtract(14, 'day').toISOString() },
  { id: 'chest', label: 'Грудь', unit: 'см', latestChange: 1, latestDate: today.subtract(14, 'day').toISOString() },
  { id: 'hips', label: 'Бёдра', unit: 'см', latestChange: -1, latestDate: today.subtract(14, 'day').toISOString() },
  { id: 'steps', label: 'Шаги', unit: 'шагов' },
  { id: 'sleep', label: 'Сон', unit: 'ч' },
]

const bodyEntries: BodyMetricEntry[] = bodyDescriptors.flatMap((descriptor) => {
  return Array.from({ length: 8 }).map((_, index) => ({
    id: nanoid(),
    metricId: descriptor.id,
    value: descriptor.id === 'sleep' ? 7 + Math.random() * 1 : descriptor.id === 'steps' ? 8000 + Math.random() * 3000 : 70 + Math.random() * 5,
    unit: descriptor.unit,
    recordedAt: today.subtract(index, 'week').toISOString(),
  }))
})

const exerciseDescriptors: ExerciseMetricDescriptor[] = [
  { id: 'bench_press', label: 'Жим лёжа', muscleGroup: 'Грудь' },
  { id: 'squat', label: 'Приседания', muscleGroup: 'Ноги' },
  { id: 'deadlift', label: 'Становая тяга', muscleGroup: 'Спина' },
  { id: 'oh_press', label: 'Жим стоя', muscleGroup: 'Плечи' },
  { id: 'pullups', label: 'Подтягивания', muscleGroup: 'Спина' },
]

const exerciseEntries: ExerciseMetricEntry[] = exerciseDescriptors.flatMap((descriptor) => {
  return Array.from({ length: 6 }).map((_, index) => ({
    id: nanoid(),
    exerciseId: descriptor.id,
    date: today.subtract(index, 'week').toISOString(),
    weight: descriptor.id === 'pullups' ? 0 : 40 + Math.random() * 50,
    repetitions: 6 + Math.floor(Math.random() * 4),
    sets: 3,
  }))
})

const initialState: MetricsState = {
  period: '4w',
  bodyMetrics: bodyDescriptors,
  bodyMetricEntries: bodyEntries,
  exerciseMetrics: exerciseDescriptors,
  exerciseMetricEntries: exerciseEntries,
  bodyMetricGoals: {
    weight: 72.0,
    sleep: 8.0,
  },
  exerciseMetricGoals: {},
  bodyMetricStartValues: {},
  nutritionEntries: [],
}

const metricsSlice = createSlice({
  name: 'metrics',
  initialState,
  reducers: {
    setMetricsPeriod(state, action: PayloadAction<MetricsPeriod>) {
      state.period = action.payload
    },
    addBodyMetric(state, action: PayloadAction<BodyMetricDescriptor>) {
      state.bodyMetrics.push(action.payload)
    },
    addBodyMetricEntry(state, action: PayloadAction<Omit<BodyMetricEntry, 'id'>>) {
      const existingIndex = state.bodyMetricEntries.findIndex(
        (entry) =>
          entry.metricId === action.payload.metricId &&
          dayjs(entry.recordedAt).isSame(dayjs(action.payload.recordedAt), 'day')
      )
      if (existingIndex >= 0) {
        state.bodyMetricEntries[existingIndex] = { ...state.bodyMetricEntries[existingIndex], ...action.payload }
      } else {
        state.bodyMetricEntries.push({ ...action.payload, id: nanoid() })
      }
    },
    updateBodyMetricEntry(state, action: PayloadAction<BodyMetricEntry>) {
      const index = state.bodyMetricEntries.findIndex((entry) => entry.id === action.payload.id)
      if (index >= 0) {
        state.bodyMetricEntries[index] = action.payload
      }
    },
    addExerciseMetric(state, action: PayloadAction<ExerciseMetricDescriptor>) {
      state.exerciseMetrics.push(action.payload)
    },
    addExerciseEntry(state, action: PayloadAction<Omit<ExerciseMetricEntry, 'id'>>) {
      const existingIndex = state.exerciseMetricEntries.findIndex(
        (entry) =>
          entry.exerciseId === action.payload.exerciseId &&
          dayjs(entry.date).isSame(dayjs(action.payload.date), 'day')
      )
      if (existingIndex >= 0) {
        state.exerciseMetricEntries[existingIndex] = { ...state.exerciseMetricEntries[existingIndex], ...action.payload }
      } else {
        state.exerciseMetricEntries.push({ ...action.payload, id: nanoid() })
      }
    },
    updateExerciseEntry(state, action: PayloadAction<ExerciseMetricEntry>) {
      const index = state.exerciseMetricEntries.findIndex((entry) => entry.id === action.payload.id)
      if (index >= 0) {
        state.exerciseMetricEntries[index] = action.payload
      }
    },
    setBodyMetricGoal(state, action: PayloadAction<{ metricId: string; value: number }>) {
      state.bodyMetricGoals[action.payload.metricId] = action.payload.value
    },
    setExerciseMetricGoal(state, action: PayloadAction<{ exerciseId: string; weight?: number; repetitions?: number }>) {
      if (!state.exerciseMetricGoals[action.payload.exerciseId]) {
        state.exerciseMetricGoals[action.payload.exerciseId] = {}
      }
      if (action.payload.weight !== undefined) {
        state.exerciseMetricGoals[action.payload.exerciseId].weight = action.payload.weight
      }
      if (action.payload.repetitions !== undefined) {
        state.exerciseMetricGoals[action.payload.exerciseId].repetitions = action.payload.repetitions
      }
    },
    setBodyMetricStartValue(state, action: PayloadAction<{ metricId: string; value: number }>) {
      state.bodyMetricStartValues[action.payload.metricId] = action.payload.value
    },
    upsertNutritionEntry(state, action: PayloadAction<Omit<DailyNutritionEntry, 'id'>>) {
      const existingIndex = state.nutritionEntries.findIndex((entry) =>
        dayjs(entry.date).isSame(dayjs(action.payload.date), 'day'),
      )
      if (existingIndex >= 0) {
        state.nutritionEntries[existingIndex] = {
          ...state.nutritionEntries[existingIndex],
          calories: action.payload.calories,
          proteins: action.payload.proteins,
          fats: action.payload.fats,
          carbs: action.payload.carbs,
          notes: action.payload.notes,
        }
      } else {
        state.nutritionEntries.push({
          ...action.payload,
          id: nanoid(),
        })
      }
    },
  },
})

export const {
  setMetricsPeriod,
  addBodyMetric,
  addBodyMetricEntry,
  updateBodyMetricEntry,
  addExerciseMetric,
  addExerciseEntry,
  updateExerciseEntry,
  setBodyMetricGoal,
  setExerciseMetricGoal,
  setBodyMetricStartValue,
  upsertNutritionEntry,
} = metricsSlice.actions
export default metricsSlice.reducer

