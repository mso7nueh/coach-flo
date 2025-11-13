import { createSlice, nanoid, type PayloadAction } from '@reduxjs/toolkit'

export type ProgramBlockType = 'warmup' | 'main' | 'cooldown'

export interface ProgramExercise {
  id: string
  title: string
  sets: number
  reps?: number
  duration?: string
  rest?: string
  weight?: string
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
}

interface ProgramState {
  days: ProgramDay[]
  selectedDayId: string | null
}

const warmupBlock: ProgramBlock = {
  id: nanoid(),
  type: 'warmup',
  title: 'Разминка',
  exercises: [
    {
      id: nanoid(),
      title: 'Беговая дорожка',
      duration: '8 мин',
      sets: 1,
    },
    {
      id: nanoid(),
      title: 'Мобилизация плеч',
      duration: '5 мин',
      sets: 1,
    },
  ],
}

const mainBlock: ProgramBlock = {
  id: nanoid(),
  type: 'main',
  title: 'Основная часть',
  exercises: [
    {
      id: nanoid(),
      title: 'Приседания со штангой',
      sets: 4,
      reps: 8,
      rest: '90 сек',
      weight: '70 кг',
    },
    {
      id: nanoid(),
      title: 'Жим лёжа',
      sets: 4,
      reps: 6,
      rest: '120 сек',
      weight: '80 кг',
    },
    {
      id: nanoid(),
      title: 'Тяга верхнего блока',
      sets: 3,
      reps: 10,
      rest: '75 сек',
      weight: '55 кг',
    },
  ],
}

const cooldownBlock: ProgramBlock = {
  id: nanoid(),
  type: 'cooldown',
  title: 'Заминка',
  exercises: [
    {
      id: nanoid(),
      title: 'Растяжка ног',
      duration: '5 мин',
      sets: 1,
    },
    {
      id: nanoid(),
      title: 'Дыхательные упражнения',
      duration: '3 мин',
      sets: 1,
    },
  ],
}

const sampleDays: ProgramDay[] = [
  {
    id: 'day-1',
    name: 'День 1. Ноги и грудь',
    order: 0,
    blocks: [warmupBlock, mainBlock, cooldownBlock],
  },
  {
    id: 'day-2',
    name: 'День 2. Спина и плечи',
    order: 1,
    blocks: [
      {
        ...warmupBlock,
        id: nanoid(),
        exercises: warmupBlock.exercises.map((exercise) => ({ ...exercise, id: nanoid() })),
      },
      {
        ...mainBlock,
        id: nanoid(),
        exercises: [
          {
            id: nanoid(),
            title: 'Тяга в наклоне',
            sets: 4,
            reps: 8,
            rest: '90 сек',
            weight: '65 кг',
          },
          {
            id: nanoid(),
            title: 'Жим стоя',
            sets: 4,
            reps: 6,
            rest: '120 сек',
            weight: '45 кг',
          },
          {
            id: nanoid(),
            title: 'Подтягивания',
            sets: 3,
            reps: 8,
            rest: '90 сек',
            weight: 'с весом',
          },
        ],
      },
      {
        ...cooldownBlock,
        id: nanoid(),
        exercises: cooldownBlock.exercises.map((exercise) => ({ ...exercise, id: nanoid() })),
      },
    ],
  },
  {
    id: 'day-3',
    name: 'День 3. Кардио и стабилизация',
    order: 2,
    blocks: [
      {
        ...warmupBlock,
        id: nanoid(),
        exercises: warmupBlock.exercises.map((exercise) => ({ ...exercise, id: nanoid() })),
      },
      {
        id: nanoid(),
        type: 'main',
        title: 'Основная часть',
        exercises: [
          {
            id: nanoid(),
            title: 'Интервальный бег',
            duration: '20 мин',
            sets: 1,
          },
          {
            id: nanoid(),
            title: 'Планка',
            duration: '3x60 сек',
            sets: 3,
          },
          {
            id: nanoid(),
            title: 'Русские скручивания',
            sets: 3,
            reps: 16,
          },
        ],
      },
      {
        ...cooldownBlock,
        id: nanoid(),
        exercises: cooldownBlock.exercises.map((exercise) => ({ ...exercise, id: nanoid() })),
      },
    ],
  },
]

const initialState: ProgramState = {
  days: sampleDays,
  selectedDayId: sampleDays[0]?.id ?? null,
}

const programSlice = createSlice({
  name: 'program',
  initialState,
  reducers: {
    selectProgramDay(state, action: PayloadAction<string>) {
      state.selectedDayId = action.payload
    },
    addProgramDay(state, action: PayloadAction<{ name: string }>) {
      const newDay: ProgramDay = {
        id: nanoid(),
        name: action.payload.name,
        order: state.days.length,
        blocks: [
          { id: nanoid(), type: 'warmup', title: 'Разминка', exercises: [] },
          { id: nanoid(), type: 'main', title: 'Основная часть', exercises: [] },
          { id: nanoid(), type: 'cooldown', title: 'Заминка', exercises: [] },
        ],
      }
      state.days.push(newDay)
      state.selectedDayId = newDay.id
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
        order: state.days.length,
        blocks: day.blocks.map((block) => ({
          ...block,
          id: nanoid(),
          exercises: block.exercises.map((exercise) => ({ ...exercise, id: nanoid() })),
        })),
      }
      state.days.push(cloned)
      state.selectedDayId = cloned.id
    },
    deleteProgramDay(state, action: PayloadAction<string>) {
      state.days = state.days.filter((item) => item.id !== action.payload)
      state.days = state.days.map((item, index) => ({ ...item, order: index }))
      if (state.selectedDayId === action.payload) {
        state.selectedDayId = state.days[0]?.id ?? null
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
      const { from, to } = action.payload
      if (from === to || from < 0 || to < 0 || from >= state.days.length || to >= state.days.length) {
        return
      }
      const [moved] = state.days.splice(from, 1)
      state.days.splice(to, 0, moved)
      state.days = state.days.map((day, index) => ({ ...day, order: index }))
    },
  },
})

export const {
  selectProgramDay,
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

