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
}

export interface ProgramBlockInput {
  type: ProgramBlockType
  title: string
  exercises: Array<Omit<ProgramExercise, 'id'>>
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

const samplePrograms: TrainingProgram[] = [
  {
    id: 'program-1',
    title: 'Сила и выносливость',
    owner: 'trainer',
  },
  {
    id: 'program-2',
    title: 'Моя программа',
    owner: 'client',
  },
]

const sampleDays: ProgramDay[] = [
  {
    id: 'day-1',
    name: 'День 1. Ноги и грудь',
    order: 0,
    blocks: [warmupBlock, mainBlock, cooldownBlock],
    owner: 'trainer',
    programId: 'program-1',
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
    owner: 'trainer',
    programId: 'program-1',
  },
  {
    id: 'day-3',
    name: 'День 3. Кардио и стабилизация',
    order: 0,
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
    owner: 'trainer',
    programId: 'program-2',
  },
]

const initialState: ProgramState = {
  programs: samplePrograms,
  days: sampleDays,
  selectedProgramId: samplePrograms[0]?.id ?? null,
  selectedDayId: sampleDays[0]?.id ?? null,
}

const programSlice = createSlice({
  name: 'program',
  initialState,
  reducers: {
    selectProgram(state, action: PayloadAction<string>) {
      state.selectedProgramId = action.payload
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

