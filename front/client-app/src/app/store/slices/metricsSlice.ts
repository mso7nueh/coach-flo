import { createSlice, nanoid, type PayloadAction, createAsyncThunk } from '@reduxjs/toolkit'
import dayjs from 'dayjs'
import { apiClient } from '@/shared/api/client'
import type { BodyMetric as ApiBodyMetric, BodyMetricEntry as ApiBodyMetricEntry } from '@/shared/api/client'

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

export interface BodyMetricTargetHistoryItem {
  id: string
  targetValue: number
  changedAt: string
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
  bodyMetricTargetHistory: Record<string, BodyMetricTargetHistoryItem[]>
  nutritionEntries: DailyNutritionEntry[]
}

const savedPeriod = typeof window !== 'undefined' ? localStorage.getItem('metrics_period') as MetricsPeriod : null;
const initialState: MetricsState = {
  period: savedPeriod || '4w',
  bodyMetrics: [],
  bodyMetricEntries: [],
  exerciseMetrics: [],
  exerciseMetricEntries: [],
  bodyMetricGoals: {},
  exerciseMetricGoals: {},
  bodyMetricStartValues: {},
  bodyMetricTargetHistory: {},
  nutritionEntries: [],
}

const mapApiBodyMetricToState = (metric: ApiBodyMetric): BodyMetricDescriptor => ({
  id: metric.id,
  label: metric.label,
  unit: metric.unit,
  target: metric.target || undefined,
})

const mapApiBodyMetricEntryToState = (entry: ApiBodyMetricEntry, unit: string): BodyMetricEntry => ({
  id: entry.id,
  metricId: entry.metric_id,
  value: entry.value,
  unit,
  recordedAt: entry.recorded_at,
})

export const fetchBodyMetrics = createAsyncThunk(
  'metrics/fetchBodyMetrics',
  async (params?: { user_id?: string }) => {
    const metrics = await apiClient.getBodyMetrics(params?.user_id)
    return metrics.map(mapApiBodyMetricToState)
  }
)

export const fetchBodyMetricEntries = createAsyncThunk(
  'metrics/fetchBodyMetricEntries',
  async (params: { metric_id?: string; user_id?: string; start_date?: string; end_date?: string } | undefined, { getState }) => {
    const entries = await apiClient.getBodyMetricEntries(params)
    // Получаем unit из уже загруженных метрик в state, чтобы избежать дополнительного запроса
    const state = getState() as { metrics: MetricsState }
    let metrics = state.metrics.bodyMetrics
    let metricMap = new Map(metrics.map(m => [m.id, m.unit]))

    // Если метрики еще не загружены, загружаем их (fallback)
    if (metrics.length === 0) {
      const loadedMetrics = await apiClient.getBodyMetrics()
      metrics = loadedMetrics.map(mapApiBodyMetricToState)
      metricMap = new Map(metrics.map(m => [m.id, m.unit]))
    }

    return entries.map(entry => mapApiBodyMetricEntryToState(entry, metricMap.get(entry.metric_id) || ''))
  }
)

const mapApiExerciseMetricToState = (metric: any): ExerciseMetricDescriptor => ({
  id: metric.id,
  label: metric.label,
  muscleGroup: metric.muscle_group || '',
})

const mapApiExerciseMetricEntryToState = (entry: any): ExerciseMetricEntry => ({
  id: entry.id,
  exerciseId: entry.exercise_metric_id,
  date: entry.date,
  weight: entry.weight || 0,
  repetitions: entry.repetitions || 0,
  sets: entry.sets || 0,
})

export const fetchExerciseMetrics = createAsyncThunk(
  'metrics/fetchExerciseMetrics',
  async (params?: { user_id?: string }) => {
    const metrics = await apiClient.getExerciseMetrics(params?.user_id)
    return metrics.map(mapApiExerciseMetricToState)
  }
)

export const fetchExerciseMetricEntries = createAsyncThunk(
  'metrics/fetchExerciseMetricEntries',
  async (params?: { exercise_metric_id?: string; user_id?: string; start_date?: string; end_date?: string }) => {
    const entries = await apiClient.getExerciseMetricEntries(params)
    return entries.map(mapApiExerciseMetricEntryToState)
  }
)

export const addBodyMetricEntryApi = createAsyncThunk(
  'metrics/addBodyMetricEntryApi',
  async (data: { metricId: string; value: number; recordedAt: string }, { rejectWithValue, getState }) => {
    try {
      const entry = await apiClient.addBodyMetricEntry({
        metric_id: data.metricId,
        value: data.value,
        recorded_at: data.recordedAt,
      })
      // Получаем unit из уже загруженных метрик в state, чтобы избежать дополнительного запроса
      const state = getState() as { metrics: MetricsState }
      const metric = state.metrics.bodyMetrics.find(m => m.id === data.metricId)
      return mapApiBodyMetricEntryToState(entry, metric?.unit || '')
    } catch (error: any) {
      return rejectWithValue(error.message || 'Ошибка добавления записи метрики')
    }
  }
)

export const addExerciseMetricEntryApi = createAsyncThunk(
  'metrics/addExerciseMetricEntryApi',
  async (data: { exerciseId: string; date: string; weight: number; repetitions: number; sets: number }, { rejectWithValue }) => {
    try {
      const entry = await apiClient.addExerciseMetricEntry({
        exercise_metric_id: data.exerciseId,
        date: data.date,
        weight: data.weight,
        repetitions: data.repetitions,
        sets: data.sets,
      })
      return mapApiExerciseMetricEntryToState(entry)
    } catch (error: any) {
      return rejectWithValue(error.message || 'Ошибка добавления записи метрики упражнения')
    }
  }
)

export const updateBodyMetricTargetApi = createAsyncThunk(
  'metrics/updateBodyMetricTargetApi',
  async (
    data: { metricId: string; target: number },
    { rejectWithValue, dispatch, getState }
  ) => {
    try {
      const metric = await apiClient.updateBodyMetricTarget(data.metricId, data.target)
      const mappedMetric = mapApiBodyMetricToState(metric)
      return mappedMetric
    } catch (error: any) {
      return rejectWithValue(error.message || 'Ошибка обновления целевого значения')
    }
  }
)

export const fetchBodyMetricTargetHistory = createAsyncThunk(
  'metrics/fetchBodyMetricTargetHistory',
  async (params: { metric_id: string; user_id?: string }) => {
    const entries = await apiClient.getBodyMetricTargetHistory(params)
    return { metricId: params.metric_id, entries }
  }
)

export const createBodyMetricApi = createAsyncThunk(
  'metrics/createBodyMetricApi',
  async (data: { label: string; unit: string; target?: number }, { rejectWithValue, dispatch }) => {
    try {
      const metric = await apiClient.createBodyMetric(data)
      const mappedMetric = mapApiBodyMetricToState(metric)
      // После создания метрики перезагружаем список метрик
      await dispatch(fetchBodyMetrics())
      return mappedMetric
    } catch (error: any) {
      return rejectWithValue(error.message || 'Ошибка создания метрики тела')
    }
  }
)

export const createExerciseMetricApi = createAsyncThunk(
  'metrics/createExerciseMetricApi',
  async (data: { label: string; muscle_group?: string }, { rejectWithValue, dispatch }) => {
    try {
      const metric = await apiClient.createExerciseMetric(data)
      const mappedMetric = mapApiExerciseMetricToState(metric)
      // После создания метрики перезагружаем список метрик
      await dispatch(fetchExerciseMetrics())
      return mappedMetric
    } catch (error: any) {
      return rejectWithValue(error.message || 'Ошибка создания метрики упражнения')
    }
  }
)

const mapApiNutritionEntryToState = (entry: any): DailyNutritionEntry => ({
  id: entry.id,
  date: entry.date,
  calories: entry.calories,
  proteins: entry.proteins || undefined,
  fats: entry.fats || undefined,
  carbs: entry.carbs || undefined,
  notes: entry.notes || undefined,
})

export const fetchNutritionEntries = createAsyncThunk(
  'metrics/fetchNutritionEntries',
  async (params?: { start_date?: string; end_date?: string; user_id?: string }) => {
    const entries = await apiClient.getNutritionEntries(params)
    return entries.map(mapApiNutritionEntryToState)
  }
)

export const upsertNutritionEntryApi = createAsyncThunk(
  'metrics/upsertNutritionEntryApi',
  async (data: Omit<DailyNutritionEntry, 'id'>, { rejectWithValue }) => {
    try {
      const entry = await apiClient.createOrUpdateNutritionEntry({
        date: data.date,
        calories: data.calories,
        proteins: data.proteins,
        fats: data.fats,
        carbs: data.carbs,
        notes: data.notes,
      })
      return mapApiNutritionEntryToState(entry)
    } catch (error: any) {
      return rejectWithValue(error.message || 'Ошибка сохранения записи питания')
    }
  }
)

const metricsSlice = createSlice({
  name: 'metrics',
  initialState,
  reducers: {
    setMetricsPeriod(state, action: PayloadAction<MetricsPeriod>) {
      state.period = action.payload
      localStorage.setItem('metrics_period', action.payload)
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
    setBodyMetrics(state, action: PayloadAction<BodyMetricDescriptor[]>) {
      state.bodyMetrics = action.payload
    },
    setBodyMetricEntries(state, action: PayloadAction<BodyMetricEntry[]>) {
      state.bodyMetricEntries = action.payload
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchBodyMetrics.fulfilled, (state, action) => {
        state.bodyMetrics = action.payload
        action.payload.forEach((m) => {
          if (m.target != null && m.target !== undefined) {
            state.bodyMetricGoals[m.id] = m.target
          }
        })
      })
      // ... (rest of extraReducers)

      .addCase(fetchBodyMetricEntries.fulfilled, (state, action) => {
        // Объединяем новые записи с существующими, избегая дубликатов
        const existingIds = new Set(state.bodyMetricEntries.map(e => e.id))
        const newEntries = action.payload.filter(e => !existingIds.has(e.id))
        state.bodyMetricEntries = [...state.bodyMetricEntries, ...newEntries]
      })
      .addCase(fetchExerciseMetrics.fulfilled, (state, action) => {
        state.exerciseMetrics = action.payload
      })
      .addCase(fetchExerciseMetricEntries.fulfilled, (state, action) => {
        // Объединяем новые записи с существующими, избегая дубликатов
        const existingIds = new Set(state.exerciseMetricEntries.map(e => e.id))
        const newEntries = action.payload.filter(e => !existingIds.has(e.id))
        state.exerciseMetricEntries = [...state.exerciseMetricEntries, ...newEntries]
      })
      .addCase(updateBodyMetricTargetApi.fulfilled, (state, action) => {
        const metric = action.payload
        state.bodyMetricGoals[metric.id] = metric.target ?? 0
        const idx = state.bodyMetrics.findIndex((m) => m.id === metric.id)
        if (idx >= 0) {
          state.bodyMetrics[idx] = { ...state.bodyMetrics[idx], target: metric.target }
        }
      })
      .addCase(fetchBodyMetricTargetHistory.fulfilled, (state, action) => {
        const { metricId, entries } = action.payload
        state.bodyMetricTargetHistory[metricId] = entries.map((e: { id: string; target_value: number; changed_at: string }) => ({
          id: e.id,
          targetValue: e.target_value,
          changedAt: e.changed_at,
        }))
      })
      .addCase(addBodyMetricEntryApi.fulfilled, (state, action) => {
        // Добавляем новую запись или обновляем существующую
        const existingIndex = state.bodyMetricEntries.findIndex(
          (entry) =>
            entry.metricId === action.payload.metricId &&
            dayjs(entry.recordedAt).isSame(dayjs(action.payload.recordedAt), 'day')
        )
        if (existingIndex >= 0) {
          state.bodyMetricEntries[existingIndex] = action.payload
        } else {
          state.bodyMetricEntries.push(action.payload)
        }
      })
      .addCase(addExerciseMetricEntryApi.fulfilled, (state, action) => {
        // Добавляем новую запись или обновляем существующую
        const existingIndex = state.exerciseMetricEntries.findIndex(
          (entry) =>
            entry.exerciseId === action.payload.exerciseId &&
            dayjs(entry.date).isSame(dayjs(action.payload.date), 'day')
        )
        if (existingIndex >= 0) {
          state.exerciseMetricEntries[existingIndex] = action.payload
        } else {
          state.exerciseMetricEntries.push(action.payload)
        }
      })
      .addCase(fetchNutritionEntries.fulfilled, (state, action) => {
        // Объединяем новые записи с существующими, избегая дубликатов
        const existingIds = new Set(state.nutritionEntries.map(e => e.id))
        const newEntries = action.payload.filter(e => !existingIds.has(e.id))
        state.nutritionEntries = [...state.nutritionEntries, ...newEntries]
      })
      .addCase(upsertNutritionEntryApi.fulfilled, (state, action) => {
        // Добавляем новую запись или обновляем существующую
        const existingIndex = state.nutritionEntries.findIndex((entry) =>
          dayjs(entry.date).isSame(dayjs(action.payload.date), 'day')
        )
        if (existingIndex >= 0) {
          state.nutritionEntries[existingIndex] = action.payload
        } else {
          state.nutritionEntries.push(action.payload)
        }
      })
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
  setBodyMetrics,
  setBodyMetricEntries,
} = metricsSlice.actions
export default metricsSlice.reducer

