import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

export type WorkoutLevel = 'beginner' | 'intermediate' | 'advanced'
export type WorkoutGoal = 'weight_loss' | 'muscle_gain' | 'endurance' | 'flexibility' | 'general'
export type MuscleGroup =
    | 'chest'
    | 'back'
    | 'shoulders'
    | 'arms'
    | 'legs'
    | 'core'
    | 'cardio'
    | 'full_body'
export type Equipment = 'bodyweight' | 'dumbbells' | 'barbell' | 'machine' | 'cable' | 'kettlebell' | 'resistance_bands'

export interface Exercise {
    id: string
    name: string
    muscleGroup: MuscleGroup
    equipment: Equipment[]
    description?: string
    instructions?: string
    startingPosition?: string
    executionInstructions?: string
    notes?: string
    imageUrl?: string
    videoUrl?: string
    visibility: 'all' | 'client' | 'trainer' // 'all' - видно всем клиентам, 'client' - только конкретному клиенту, 'trainer' - только тренеру
    clientId?: string // ID клиента, если visibility === 'client'
}

export interface WorkoutExercise {
    exerciseId: string
    exercise?: Exercise
    sets?: number
    reps?: number
    duration?: number
    rest?: number
    weight?: number
    notes?: string
    tempo?: string
    superset?: boolean
}

export interface WorkoutTemplate {
    id: string
    name: string
    duration: number
    level: WorkoutLevel
    goal: WorkoutGoal
    description?: string
    warmup: WorkoutExercise[]
    main: WorkoutExercise[]
    cooldown: WorkoutExercise[]
    muscleGroups: MuscleGroup[]
    equipment: Equipment[]
    isCustom: boolean
}

interface LibraryState {
    workouts: WorkoutTemplate[]
    exercises: Exercise[]
    workoutFilters: {
        level?: WorkoutLevel
        goal?: WorkoutGoal
        muscleGroup?: MuscleGroup
        equipment?: Equipment
    }
    exerciseFilters: {
        muscleGroup?: MuscleGroup
        equipment?: Equipment
    }
    selectedWorkoutId: string | null
    selectedExerciseId: string | null
}

const sampleExercises: Exercise[] = [
    {
        id: '1',
        name: 'Приседания',
        muscleGroup: 'legs',
        equipment: ['bodyweight', 'barbell', 'dumbbells'],
        description: 'Базовое упражнение для ног',
        visibility: 'all',
    },
    {
        id: '2',
        name: 'Жим лёжа',
        muscleGroup: 'chest',
        equipment: ['barbell', 'dumbbells'],
        description: 'Упражнение для грудных мышц',
        visibility: 'all',
    },
    {
        id: '3',
        name: 'Становая тяга',
        muscleGroup: 'back',
        equipment: ['barbell'],
        description: 'Комплексное упражнение для спины',
        visibility: 'all',
    },
    {
        id: '4',
        name: 'Подтягивания',
        muscleGroup: 'back',
        equipment: ['bodyweight'],
        description: 'Упражнение для спины и бицепса',
        visibility: 'all',
    },
    {
        id: '5',
        name: 'Отжимания',
        muscleGroup: 'chest',
        equipment: ['bodyweight'],
        description: 'Базовое упражнение для груди',
        visibility: 'all',
    },
]

const sampleWorkouts: WorkoutTemplate[] = [
    {
        id: '1',
        name: 'Фулбоди для начинающих',
        duration: 45,
        level: 'beginner',
        goal: 'general',
        description: 'Комплексная тренировка для всего тела',
        warmup: [
            {
                exerciseId: 'warmup-1',
                duration: 5,
                notes: 'Разминка суставов',
            },
        ],
        main: [
            {
                exerciseId: '1',
                sets: 3,
                reps: 12,
                rest: 60,
            },
            {
                exerciseId: '5',
                sets: 3,
                reps: 10,
                rest: 60,
            },
        ],
        cooldown: [
            {
                exerciseId: 'cooldown-1',
                duration: 5,
                notes: 'Растяжка',
            },
        ],
        muscleGroups: ['full_body'],
        equipment: ['bodyweight'],
        isCustom: false,
    },
]

const initialState: LibraryState = {
    workouts: sampleWorkouts,
    exercises: sampleExercises,
    workoutFilters: {},
    exerciseFilters: {},
    selectedWorkoutId: null,
    selectedExerciseId: null,
}

const librarySlice = createSlice({
    name: 'library',
    initialState,
    reducers: {
        addWorkout(state, action: PayloadAction<Omit<WorkoutTemplate, 'id'>>) {
            const newWorkout: WorkoutTemplate = {
                ...action.payload,
                id: crypto.randomUUID(),
                isCustom: true,
            }
            state.workouts.push(newWorkout)
        },
        updateWorkout(state, action: PayloadAction<{ id: string; updates: Partial<WorkoutTemplate> }>) {
            const index = state.workouts.findIndex((w) => w.id === action.payload.id)
            if (index !== -1) {
                state.workouts[index] = { ...state.workouts[index], ...action.payload.updates }
            }
        },
        removeWorkout(state, action: PayloadAction<string>) {
            state.workouts = state.workouts.filter((w) => w.id !== action.payload)
            if (state.selectedWorkoutId === action.payload) {
                state.selectedWorkoutId = null
            }
        },
        cloneWorkout(state, action: PayloadAction<string>) {
            const workout = state.workouts.find((w) => w.id === action.payload)
            if (workout) {
                const cloned: WorkoutTemplate = {
                    ...workout,
                    id: crypto.randomUUID(),
                    name: `${workout.name} (копия)`,
                    isCustom: true,
                }
                state.workouts.push(cloned)
            }
        },
        addExercise(state, action: PayloadAction<Omit<Exercise, 'id'>>) {
            const newExercise: Exercise = {
                ...action.payload,
                id: crypto.randomUUID(),
            }
            state.exercises.push(newExercise)
        },
        updateExercise(state, action: PayloadAction<{ id: string; updates: Partial<Exercise> }>) {
            const index = state.exercises.findIndex((e) => e.id === action.payload.id)
            if (index !== -1) {
                state.exercises[index] = { ...state.exercises[index], ...action.payload.updates }
            }
        },
        removeExercise(state, action: PayloadAction<string>) {
            state.exercises = state.exercises.filter((e) => e.id !== action.payload)
            if (state.selectedExerciseId === action.payload) {
                state.selectedExerciseId = null
            }
        },
        cloneExercise(state, action: PayloadAction<string>) {
            const exercise = state.exercises.find((e) => e.id === action.payload)
            if (exercise) {
                const cloned: Exercise = {
                    ...exercise,
                    id: crypto.randomUUID(),
                    name: `${exercise.name} (копия)`,
                }
                state.exercises.push(cloned)
            }
        },
        setWorkoutFilters(state, action: PayloadAction<LibraryState['workoutFilters']>) {
            state.workoutFilters = { ...state.workoutFilters, ...action.payload }
        },
        setExerciseFilters(state, action: PayloadAction<LibraryState['exerciseFilters']>) {
            state.exerciseFilters = { ...state.exerciseFilters, ...action.payload }
        },
        setSelectedWorkout(state, action: PayloadAction<string | null>) {
            state.selectedWorkoutId = action.payload
        },
        setSelectedExercise(state, action: PayloadAction<string | null>) {
            state.selectedExerciseId = action.payload
        },
    },
})

export const {
    addWorkout,
    updateWorkout,
    removeWorkout,
    cloneWorkout,
    addExercise,
    updateExercise,
    removeExercise,
    cloneExercise,
    setWorkoutFilters,
    setExerciseFilters,
    setSelectedWorkout,
    setSelectedExercise,
} = librarySlice.actions
export default librarySlice.reducer

