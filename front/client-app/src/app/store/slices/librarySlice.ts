import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit'
import { apiClient } from '@/shared/api/client'

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
  clientId?: string
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
    loading: boolean
    error: string | null
}

const initialState: LibraryState = {
    workouts: [],
    exercises: [],
    workoutFilters: {},
    exerciseFilters: {},
    selectedWorkoutId: null,
    selectedExerciseId: null,
    loading: false,
    error: null,
}

// Маппинг данных из API в формат фронтенда
const mapApiExerciseToState = (apiExercise: any): Exercise => {
    // Преобразуем muscle_groups из строки в первый элемент массива или 'chest' по умолчанию
    const muscleGroupMap: Record<string, MuscleGroup> = {
        'chest': 'chest',
        'back': 'back',
        'shoulders': 'shoulders',
        'arms': 'arms',
        'legs': 'legs',
        'core': 'core',
        'cardio': 'cardio',
        'full_body': 'full_body',
    }
    
    const muscleGroupStr = apiExercise.muscle_groups?.toLowerCase() || ''
    let muscleGroup: MuscleGroup = 'chest'
    for (const [key, value] of Object.entries(muscleGroupMap)) {
        if (muscleGroupStr.includes(key)) {
            muscleGroup = value
            break
        }
    }
    
    // Преобразуем equipment из строки в массив
    const equipmentStr = apiExercise.equipment?.toLowerCase() || ''
    const equipment: Equipment[] = []
    const equipmentMap: Record<string, Equipment> = {
        'bodyweight': 'bodyweight',
        'dumbbells': 'dumbbells',
        'barbell': 'barbell',
        'machine': 'machine',
        'cable': 'cable',
        'kettlebell': 'kettlebell',
        'resistance_bands': 'resistance_bands',
    }
    
    for (const [key, value] of Object.entries(equipmentMap)) {
        if (equipmentStr.includes(key)) {
            equipment.push(value)
        }
    }
    
    // Определяем visibility на основе trainer_id
    const visibility: 'all' | 'client' | 'trainer' = apiExercise.trainer_id ? 'trainer' : 'all'
    
    return {
        id: apiExercise.id,
        name: apiExercise.name,
        muscleGroup,
        equipment: equipment.length > 0 ? equipment : ['bodyweight'],
        description: apiExercise.description || undefined,
        instructions: undefined,
        startingPosition: undefined,
        executionInstructions: undefined,
        notes: undefined,
        imageUrl: undefined,
        videoUrl: undefined,
        visibility,
        clientId: undefined,
    }
}

export const fetchExercises = createAsyncThunk(
    'library/fetchExercises',
    async (params: { search?: string; muscle_group?: string } | undefined, { rejectWithValue }) => {
        try {
            const exercises = await apiClient.getExercises(params)
            return exercises.map(mapApiExerciseToState)
        } catch (error: any) {
            return rejectWithValue(error.message || 'Ошибка загрузки упражнений')
        }
    }
)

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
    extraReducers: (builder) => {
        builder
            .addCase(fetchExercises.pending, (state) => {
                state.loading = true
                state.error = null
            })
            .addCase(fetchExercises.fulfilled, (state, action) => {
                state.loading = false
                state.exercises = action.payload
            })
            .addCase(fetchExercises.rejected, (state, action) => {
                state.loading = false
                state.error = action.payload as string
            })
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

