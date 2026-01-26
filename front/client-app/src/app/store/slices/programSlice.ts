import { createSlice, nanoid, type PayloadAction, createAsyncThunk } from '@reduxjs/toolkit'
import { apiClient } from '@/shared/api/client'
import type { TrainingProgram as ApiTrainingProgram, ProgramDay as ApiProgramDay } from '@/shared/api/client'

export type ProgramBlockType = 'warmup' | 'main' | 'cooldown'

export interface ProgramExercise {
  id: string
  title: string
  exerciseId?: string
  sets: number
  reps?: number
  duration?: string
  rest?: string
  weight?: string
  description?: string
  videoUrl?: string
}

export interface TrainingProgram {
  id: string
  title: string
  description?: string
  owner: 'trainer' | 'client'
}

export interface ProgramBlock {
  id: string
  type: ProgramBlockType
  title: string
  exercises: ProgramExercise[]
}

export interface ProgramDay {
  id: string
  name: string
  order: number
  blocks: ProgramBlock[]
  notes?: string
  owner: 'trainer' | 'client'
  sourceTemplateId?: string
  programId: string
}

interface ProgramState {
  programs: TrainingProgram[]
  days: ProgramDay[]
  selectedProgramId: string | null
  selectedDayId: string | null
  loading: boolean
  error: string | null
}

export interface ProgramBlockInput {
  type: ProgramBlockType
  title: string
  exercises: Array<Omit<ProgramExercise, 'id'>>
}

const initialState: ProgramState = {
  programs: [],
  days: [],
  selectedProgramId: null,
  selectedDayId: null,
  loading: false,
  error: null,
}

// Маппинг API ProgramDay в локальный формат
const mapApiProgramDayToState = (apiDay: ApiProgramDay, programId: string): ProgramDay => {
  return {
    id: apiDay.id,
    name: apiDay.name,
    order: apiDay.order ?? 0,
    blocks: (apiDay.blocks || []).map((block) => ({
      id: block.id || nanoid(),
      type: block.type as ProgramBlockType,
      title: block.title,
      exercises: (block.exercises || []).map((ex) => ({
        id: ex.id || nanoid(),
        title: ex.title,
        exerciseId: ex.exercise_id || undefined,
        sets: ex.sets || 0,
        reps: ex.reps || undefined,
        duration: ex.duration || undefined,
        rest: ex.rest || undefined,
        description: ex.description || undefined,
        videoUrl: ex.video_url || undefined,
      })),
    })),
    notes: apiDay.notes || undefined,
    owner: (apiDay.owner || 'trainer') as 'trainer' | 'client',
    sourceTemplateId: apiDay.source_template_id || undefined,
    programId,
  }
}

// Маппинг API TrainingProgram в локальный формат
const mapApiProgramToState = (apiProgram: ApiTrainingProgram): TrainingProgram => {
  return {
    id: apiProgram.id,
    title: apiProgram.title,
    description: apiProgram.description || undefined,
    owner: (apiProgram.owner || 'trainer') as 'trainer' | 'client',
  }
}

export const createProgram = createAsyncThunk(
  'program/createProgram',
  async (data: { title: string; description?: string; owner: 'trainer' | 'client'; userId?: string }, { rejectWithValue }) => {
    try {
      const program = await apiClient.createProgram({
        title: data.title,
        description: data.description,
        user_id: data.userId
      })
      // Добавляем owner из данных, так как API не возвращает owner напрямую
      return { ...mapApiProgramToState(program), owner: data.owner }
    } catch (error: any) {
      return rejectWithValue(error.message || 'Ошибка создания программы')
    }
  }
)

export const fetchPrograms = createAsyncThunk(
  'program/fetchPrograms',
  async (user_id: string | undefined, { rejectWithValue }) => {
    try {
      const programs = await apiClient.getPrograms(user_id)
      return programs.map(mapApiProgramToState)
    } catch (error: any) {
      return rejectWithValue(error.message || 'Ошибка загрузки программ')
    }
  }
)

export const fetchProgramDays = createAsyncThunk(
  'program/fetchProgramDays',
  async (programId: string, { rejectWithValue }) => {
    try {
      const days = await apiClient.getProgramDays(programId)
      return days.map(day => mapApiProgramDayToState(day, programId))
    } catch (error: any) {
      return rejectWithValue(error.message || 'Ошибка загрузки дней программы')
    }
  }
)

export const updateProgram = createAsyncThunk(
  'program/updateProgram',
  async (
    { id, data }: { id: string; data: { title?: string; description?: string } },
    { rejectWithValue }
  ) => {
    try {
      const program = await apiClient.updateProgram(id, data)
      return mapApiProgramToState(program)
    } catch (error: any) {
      return rejectWithValue(error.message || 'Ошибка обновления программы')
    }
  }
)

export const copyProgram = createAsyncThunk(
  'program/copyProgram',
  async ({ programId, targetUserId }: { programId: string; targetUserId?: string }, { rejectWithValue }) => {
    try {
      const program = await apiClient.copyProgram(programId, targetUserId)
      return mapApiProgramToState(program)
    } catch (error: any) {
      return rejectWithValue(error.message || 'Ошибка копирования программы')
    }
  }
)

export const deleteProgram = createAsyncThunk(
  'program/deleteProgram',
  async (id: string, { rejectWithValue }) => {
    try {
      await apiClient.deleteProgram(id)
      return id
    } catch (error: any) {
      return rejectWithValue(error.message || 'Ошибка удаления программы')
    }
  }
)

export const createProgramDay = createAsyncThunk(
  'program/createProgramDay',
  async (
    data: {
      programId: string
      name: string
      notes?: string
      blocks?: ProgramBlockInput[]
      sourceTemplateId?: string
    },
    { rejectWithValue }
  ) => {
    try {
      const apiBlocks = data.blocks?.map(block => ({
        type: block.type,
        title: block.title,
        exercises: block.exercises.map(ex => ({
          title: ex.title,
          sets: ex.sets || 1, // sets обязательное поле, по умолчанию 1
          reps: ex.reps || null,
          // weight, duration, rest должны быть строками или null для бэкенда
          weight: ex.weight != null ? String(ex.weight) : null,
          duration: ex.duration != null ? String(ex.duration) : null,
          rest: ex.rest != null ? String(ex.rest) : null,
        })),
      })) || [
          { type: 'warmup' as const, title: 'Разминка', exercises: [] },
          { type: 'main' as const, title: 'Основная часть', exercises: [] },
          { type: 'cooldown' as const, title: 'Заминка', exercises: [] },
        ]

      const day = await apiClient.createProgramDay(data.programId, {
        name: data.name,
        notes: data.notes,
        blocks: apiBlocks,
        source_template_id: data.sourceTemplateId,
      })
      return { day: mapApiProgramDayToState(day, data.programId), programId: data.programId }
    } catch (error: any) {
      return rejectWithValue(error.message || 'Ошибка создания дня программы')
    }
  }
)

export const updateProgramDay = createAsyncThunk(
  'program/updateProgramDay',
  async (
    { programId, dayId, data }: { programId: string; dayId: string; data: { name?: string; order?: number; blocks?: ProgramBlockInput[] } },
    { rejectWithValue }
  ) => {
    try {
      const apiData: any = { ...data }
      if (data.blocks) {
        apiData.blocks = data.blocks.map(block => ({
          type: block.type,
          title: block.title,
          exercises: block.exercises.map(ex => ({
            title: ex.title,
            exercise_id: ex.exerciseId,
            sets: ex.sets || 1,
            reps: ex.reps || null,
            weight: ex.weight != null ? String(ex.weight) : null,
            duration: ex.duration != null ? String(ex.duration) : null,
            rest: ex.rest != null ? String(ex.rest) : null,
          })),
        }))
      }
      const day = await apiClient.updateProgramDay(programId, dayId, apiData)
      return mapApiProgramDayToState(day, programId)
    } catch (error: any) {
      return rejectWithValue(error.message || 'Ошибка обновления дня программы')
    }
  }
)

export const deleteProgramDayApi = createAsyncThunk(
  'program/deleteProgramDayApi',
  async ({ programId, dayId }: { programId: string; dayId: string }, { rejectWithValue }) => {
    try {
      await apiClient.deleteProgramDay(programId, dayId)
      return dayId
    } catch (error: any) {
      return rejectWithValue(error.message || 'Ошибка удаления дня программы')
    }
  }
)

export const addExerciseToProgramDayApi = createAsyncThunk(
  'program/addExerciseToProgramDayApi',
  async (
    {
      programId,
      dayId,
      blockId,
      exercise,
    }: {
      programId: string
      dayId: string
      blockId: string
      exercise: Omit<ProgramExercise, 'id'>
    },
    { rejectWithValue }
  ) => {
    try {
      await apiClient.addExerciseToProgramDay(programId, dayId, blockId, {
        title: exercise.title,
        sets: exercise.sets,
        reps: exercise.reps ? parseInt(String(exercise.reps)) : undefined,
        weight: exercise.weight ? parseFloat(String(exercise.weight)) : undefined,
        duration: exercise.duration ? parseInt(String(exercise.duration).replace(/\s*мин\s*/g, '')) || undefined : undefined,
        rest: exercise.rest ? parseFloat(String(exercise.rest).replace(/\s*(сек|мин|sec|min)\s*/g, '')) || undefined : undefined,
      })
      // После добавления упражнения нужно перезагрузить день программы
      const day = await apiClient.getProgramDay(programId, dayId)
      return mapApiProgramDayToState(day, programId)
    } catch (error: any) {
      return rejectWithValue(error.message || 'Ошибка добавления упражнения')
    }
  }
)

export const updateExerciseInProgramDayApi = createAsyncThunk(
  'program/updateExerciseInProgramDayApi',
  async (
    {
      programId,
      dayId,
      blockId,
      exerciseId,
      exercise,
    }: {
      programId: string
      dayId: string
      blockId: string
      exerciseId: string
      exercise: ProgramExercise
    },
    { rejectWithValue }
  ) => {
    try {
      await apiClient.updateExerciseInProgramDay(programId, dayId, blockId, exerciseId, {
        title: exercise.title,
        sets: exercise.sets,
        reps: exercise.reps ? parseInt(String(exercise.reps)) : undefined,
        weight: exercise.weight ? parseFloat(String(exercise.weight)) : undefined,
        duration: exercise.duration ? parseInt(String(exercise.duration).replace(/\s*мин\s*/g, '')) || undefined : undefined,
        rest: exercise.rest ? parseFloat(String(exercise.rest).replace(/\s*(сек|мин|sec|min)\s*/g, '')) || undefined : undefined,
      })
      // После обновления упражнения нужно перезагрузить день программы
      const day = await apiClient.getProgramDay(programId, dayId)
      return mapApiProgramDayToState(day, programId)
    } catch (error: any) {
      return rejectWithValue(error.message || 'Ошибка обновления упражнения')
    }
  }
)

export const removeExerciseFromProgramDayApi = createAsyncThunk(
  'program/removeExerciseFromProgramDayApi',
  async (
    { programId, dayId, blockId, exerciseId }: { programId: string; dayId: string; blockId: string; exerciseId: string },
    { rejectWithValue }
  ) => {
    try {
      await apiClient.removeExerciseFromProgramDay(programId, dayId, blockId, exerciseId)
      // После удаления упражнения нужно перезагрузить день программы
      const day = await apiClient.getProgramDay(programId, dayId)
      return mapApiProgramDayToState(day, programId)
    } catch (error: any) {
      return rejectWithValue(error.message || 'Ошибка удаления упражнения')
    }
  }
)

const programSlice = createSlice({
  name: 'program',
  initialState,
  reducers: {
    selectProgram(state, action: PayloadAction<string | null>) {
      state.selectedProgramId = action.payload
      if (!action.payload) {
        state.selectedDayId = null
        return
      }
      const programDays = state.days
        .filter((day) => day.programId === action.payload)
        .sort((a, b) => a.order - b.order)
      state.selectedDayId = programDays[0]?.id ?? null
    },
    selectProgramDay(state, action: PayloadAction<string>) {
      const day = state.days.find((item) => item.id === action.payload)
      if (day) {
        state.selectedDayId = action.payload
        state.selectedProgramId = day.programId
      }
    },
    addProgram(state, action: PayloadAction<{ title: string; owner: 'trainer' | 'client'; description?: string }>) {
      const newProgram: TrainingProgram = {
        id: nanoid(),
        title: action.payload.title,
        description: action.payload.description,
        owner: action.payload.owner,
      }
      state.programs.push(newProgram)
      state.selectedProgramId = newProgram.id
      state.selectedDayId = null
    },
    addProgramDay(
      state,
      action: PayloadAction<{
        name: string
        programId: string
        blocks?: ProgramBlockInput[]
        sourceTemplateId?: string
      }>,
    ) {
      const program = state.programs.find((item) => item.id === action.payload.programId)
      const owner = program?.owner ?? 'trainer'
      const programDays = state.days.filter((day) => day.programId === action.payload.programId)
      const buildBlocks = () => {
        const baseBlocks: ProgramBlockInput[] =
          action.payload.blocks ??
          [
            { type: 'warmup', title: 'Разминка', exercises: [] },
            { type: 'main', title: 'Основная часть', exercises: [] },
            { type: 'cooldown', title: 'Заминка', exercises: [] },
          ]
        return baseBlocks.map((block) => ({
          id: nanoid(),
          type: block.type,
          title: block.title,
          exercises: block.exercises.map((exercise) => ({ ...exercise, id: nanoid() })),
        }))
      }

      const newDay: ProgramDay = {
        id: nanoid(),
        name: action.payload.name,
        order: programDays.length,
        blocks: buildBlocks(),
        owner,
        sourceTemplateId: action.payload.sourceTemplateId,
        programId: action.payload.programId,
      }
      state.days.push(newDay)
      state.selectedDayId = newDay.id
      state.selectedProgramId = newDay.programId
    },
    renameProgramDay(state, action: PayloadAction<{ id: string; name: string }>) {
      const day = state.days.find((item) => item.id === action.payload.id)
      if (day) {
        day.name = action.payload.name
      }
    },
    duplicateProgramDay(state, action: PayloadAction<string>) {
      const day = state.days.find((item) => item.id === action.payload)
      if (!day) {
        return
      }
      const cloned: ProgramDay = {
        ...day,
        id: nanoid(),
        name: `${day.name} (копия)`,
        order: state.days.filter((d) => d.programId === day.programId).length,
        blocks: day.blocks.map((block) => ({
          ...block,
          id: nanoid(),
          exercises: block.exercises.map((exercise) => ({ ...exercise, id: nanoid() })),
        })),
      }
      state.days.push(cloned)
      state.selectedDayId = cloned.id
      state.selectedProgramId = cloned.programId
    },
    deleteProgramDay(state, action: PayloadAction<string>) {
      const target = state.days.find((item) => item.id === action.payload)
      if (!target) {
        return
      }
      state.days = state.days.filter((item) => item.id !== action.payload)
      const reordered = state.days
        .filter((day) => day.programId === target.programId)
        .sort((a, b) => a.order - b.order)
        .map((day, index) => ({ ...day, order: index }))
      state.days = [
        ...state.days.filter((day) => day.programId !== target.programId),
        ...reordered,
      ]
      if (state.selectedDayId === action.payload) {
        const nextDay = reordered[0]
        state.selectedDayId = nextDay?.id ?? null
        state.selectedProgramId = nextDay?.programId ?? state.programs[0]?.id ?? null
      }
    },
    addExercise(
      state,
      action: PayloadAction<{ dayId: string; blockId: string; exercise: Omit<ProgramExercise, 'id'> }>,
    ) {
      const day = state.days.find((item) => item.id === action.payload.dayId)
      const block = day?.blocks.find((item) => item.id === action.payload.blockId)
      if (block) {
        block.exercises.push({ ...action.payload.exercise, id: nanoid() })
      }
    },
    updateExercise(state, action: PayloadAction<{ dayId: string; blockId: string; exercise: ProgramExercise }>) {
      const day = state.days.find((item) => item.id === action.payload.dayId)
      const block = day?.blocks.find((item) => item.id === action.payload.blockId)
      if (block) {
        const index = block.exercises.findIndex((item) => item.id === action.payload.exercise.id)
        if (index >= 0) {
          block.exercises[index] = action.payload.exercise
        }
      }
    },
    removeExercise(state, action: PayloadAction<{ dayId: string; blockId: string; exerciseId: string }>) {
      const day = state.days.find((item) => item.id === action.payload.dayId)
      const block = day?.blocks.find((item) => item.id === action.payload.blockId)
      if (block) {
        block.exercises = block.exercises.filter((item) => item.id !== action.payload.exerciseId)
      }
    },
    reorderDays(state, action: PayloadAction<{ from: number; to: number }>) {
      const programId = state.selectedProgramId
      if (!programId) {
        return
      }
      const programDays = state.days
        .filter((day) => day.programId === programId)
        .sort((a, b) => a.order - b.order)
      const { from, to } = action.payload
      if (from === to || from < 0 || to < 0 || from >= programDays.length || to >= programDays.length) {
        return
      }
      const [moved] = programDays.splice(from, 1)
      programDays.splice(to, 0, moved)
      programDays.forEach((day, index) => {
        const target = state.days.find((d) => d.id === day.id)
        if (target) {
          target.order = index
        }
      })
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchPrograms.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchPrograms.fulfilled, (state, action) => {
        state.loading = false
        state.programs = action.payload
        // Автоматически выбираем первую программу, если нет выбранной
        if (!state.selectedProgramId && action.payload.length > 0) {
          state.selectedProgramId = action.payload[0].id
        }
      })
      .addCase(fetchPrograms.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
      .addCase(fetchProgramDays.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchProgramDays.fulfilled, (state, action) => {
        state.loading = false
        // Обновляем дни для программы, удаляя старые и добавляя новые
        state.days = state.days.filter(d => d.programId !== action.meta.arg)
        state.days.push(...action.payload)
        // Автоматически выбираем первый день, если нет выбранного
        if (!state.selectedDayId && action.payload.length > 0) {
          state.selectedDayId = action.payload[0].id
        }
      })
      .addCase(fetchProgramDays.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
      .addCase(createProgram.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(createProgram.fulfilled, (state, action) => {
        state.loading = false
        state.programs.push(action.payload)
        state.selectedProgramId = action.payload.id
        state.selectedDayId = null
      })
      .addCase(createProgram.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
      .addCase(updateProgram.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(updateProgram.fulfilled, (state, action) => {
        state.loading = false
        const index = state.programs.findIndex(p => p.id === action.payload.id)
        if (index >= 0) {
          state.programs[index] = action.payload
        }
      })
      .addCase(updateProgram.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
      .addCase(copyProgram.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(copyProgram.fulfilled, (state, action) => {
        state.loading = false
        state.programs.push(action.payload)
        state.selectedProgramId = action.payload.id
        state.selectedDayId = null
      })
      .addCase(copyProgram.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
      .addCase(deleteProgram.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(deleteProgram.fulfilled, (state, action) => {
        state.loading = false
        state.programs = state.programs.filter(p => p.id !== action.payload)
        state.days = state.days.filter(d => d.programId !== action.payload)
        // Если удалили выбранную программу, выбираем первую доступную
        if (state.selectedProgramId === action.payload) {
          state.selectedProgramId = state.programs.length > 0 ? state.programs[0].id : null
          state.selectedDayId = null
        }
      })
      .addCase(deleteProgram.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
      .addCase(createProgramDay.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(createProgramDay.fulfilled, (state, action) => {
        state.loading = false
        const existingIndex = state.days.findIndex(d => d.id === action.payload.day.id)
        if (existingIndex >= 0) {
          state.days[existingIndex] = action.payload.day
        } else {
          state.days.push(action.payload.day)
        }
        state.selectedDayId = action.payload.day.id
        state.selectedProgramId = action.payload.programId
      })
      .addCase(createProgramDay.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
      .addCase(updateProgramDay.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(updateProgramDay.fulfilled, (state, action) => {
        state.loading = false
        const index = state.days.findIndex(d => d.id === action.payload.id)
        if (index >= 0) {
          state.days[index] = action.payload
        }
      })
      .addCase(updateProgramDay.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
      .addCase(deleteProgramDayApi.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(deleteProgramDayApi.fulfilled, (state, action) => {
        state.loading = false
        const target = state.days.find((item) => item.id === action.payload)
        if (target) {
          state.days = state.days.filter((item) => item.id !== action.payload)
          const reordered = state.days
            .filter((day) => day.programId === target.programId)
            .sort((a, b) => a.order - b.order)
            .map((day, index) => ({ ...day, order: index }))
          state.days = [
            ...state.days.filter((day) => day.programId !== target.programId),
            ...reordered,
          ]
          if (state.selectedDayId === action.payload) {
            const nextDay = reordered[0]
            state.selectedDayId = nextDay?.id ?? null
            state.selectedProgramId = nextDay?.programId ?? state.programs[0]?.id ?? null
          }
        }
      })
      .addCase(deleteProgramDayApi.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
      .addCase(addExerciseToProgramDayApi.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(addExerciseToProgramDayApi.fulfilled, (state, action) => {
        state.loading = false
        const index = state.days.findIndex(d => d.id === action.payload.id)
        if (index >= 0) {
          state.days[index] = action.payload
        }
      })
      .addCase(addExerciseToProgramDayApi.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
      .addCase(updateExerciseInProgramDayApi.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(updateExerciseInProgramDayApi.fulfilled, (state, action) => {
        state.loading = false
        const index = state.days.findIndex(d => d.id === action.payload.id)
        if (index >= 0) {
          state.days[index] = action.payload
        }
      })
      .addCase(updateExerciseInProgramDayApi.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
      .addCase(removeExerciseFromProgramDayApi.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(removeExerciseFromProgramDayApi.fulfilled, (state, action) => {
        state.loading = false
        const index = state.days.findIndex(d => d.id === action.payload.id)
        if (index >= 0) {
          state.days[index] = action.payload
        }
      })
      .addCase(removeExerciseFromProgramDayApi.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
  },
})

export const {
  selectProgram,
  selectProgramDay,
  addProgram,
  addProgramDay,
  renameProgramDay,
  duplicateProgramDay,
  deleteProgramDay,
  addExercise,
  updateExercise,
  removeExercise,
  reorderDays,
} = programSlice.actions
export default programSlice.reducer

