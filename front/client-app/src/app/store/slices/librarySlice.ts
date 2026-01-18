import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit'
import { apiClient, type ProgramDayBlock } from '@/shared/api/client'

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
    
    // Определяем visibility из API ответа, если не указано - по умолчанию 'all'
    const visibility: 'all' | 'client' | 'trainer' = apiExercise.visibility || 'all'
    
    return {
        id: apiExercise.id,
        name: apiExercise.name,
        muscleGroup,
        equipment: equipment.length > 0 ? equipment : ['bodyweight'],
        description: apiExercise.description || undefined,
        instructions: undefined,
        startingPosition: apiExercise.starting_position || undefined,
        executionInstructions: apiExercise.execution_instructions || undefined,
        notes: apiExercise.notes || undefined,
        imageUrl: undefined,
        videoUrl: apiExercise.video_url || undefined,
        visibility,
        clientId: apiExercise.client_id || undefined,
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

export const createWorkoutApi = createAsyncThunk(
    'library/createWorkoutApi',
        async (
        workoutData: Omit<WorkoutTemplate, 'id'> & { programId?: string },
        { rejectWithValue, getState }
    ) => {
        try {
            // Используем существующий эндпоинт POST /api/programs/{program_id}/days/
            // для сохранения шаблона тренировки как дня программы
            // Если programId не передан, создаем локально (для обратной совместимости)
            
            if (!workoutData.programId) {
                // Если нет programId, сохраняем только локально
                const newWorkout: WorkoutTemplate = {
                    ...workoutData,
                    id: crypto.randomUUID(),
                    isCustom: true,
                }
                return newWorkout
            }
            
            // Получаем список упражнений из состояния для маппинга
            const state = getState() as any
            const exercisesList: Exercise[] = state.library?.exercises || []
            
            // Преобразуем данные из формата WorkoutTemplate в формат ProgramDay
            const blocks: ProgramDayBlock[] = []
            
            // Добавляем блок warmup
            if (workoutData.warmup.length > 0) {
                blocks.push({
                    type: 'warmup',
                    title: 'Разминка',
                    exercises: workoutData.warmup.map(ex => {
                        const exercise = exercisesList.find(e => e.id === ex.exerciseId)
                        return {
                            title: exercise?.name || ex.exerciseId || 'Упражнение',
                            sets: ex.sets || 1,
                            reps: ex.reps || null,
                            duration: ex.duration ? String(ex.duration) : null,
                            rest: ex.rest ? String(ex.rest) : null,
                            weight: ex.weight ? String(ex.weight) : null,
                        }
                    }),
                })
            }
            
            // Добавляем блок main
            if (workoutData.main.length > 0) {
                blocks.push({
                    type: 'main',
                    title: 'Основная часть',
                    exercises: workoutData.main.map(ex => {
                        const exercise = exercisesList.find(e => e.id === ex.exerciseId)
                        return {
                            title: exercise?.name || ex.exerciseId || 'Упражнение',
                            sets: ex.sets || 1,
                            reps: ex.reps || null,
                            duration: ex.duration ? String(ex.duration) : null,
                            rest: ex.rest ? String(ex.rest) : null,
                            weight: ex.weight ? String(ex.weight) : null,
                        }
                    }),
                })
            }
            
            // Добавляем блок cooldown
            if (workoutData.cooldown.length > 0) {
                blocks.push({
                    type: 'cooldown',
                    title: 'Заминка',
                    exercises: workoutData.cooldown.map(ex => {
                        const exercise = exercisesList.find(e => e.id === ex.exerciseId)
                        return {
                            title: exercise?.name || ex.exerciseId || 'Упражнение',
                            sets: ex.sets || 1,
                            reps: ex.reps || null,
                            duration: ex.duration ? String(ex.duration) : null,
                            rest: ex.rest ? String(ex.rest) : null,
                            weight: ex.weight ? String(ex.weight) : null,
                        }
                    }),
                })
            }
            
            // Если нет блоков, создаем пустые блоки
            if (blocks.length === 0) {
                blocks.push(
                    { type: 'warmup', title: 'Разминка', exercises: [] },
                    { type: 'main', title: 'Основная часть', exercises: [] },
                    { type: 'cooldown', title: 'Заминка', exercises: [] }
                )
            }
            
            // Создаем день программы через API
            const day = await apiClient.createProgramDay(workoutData.programId, {
                name: workoutData.name,
                notes: workoutData.description || undefined,
                blocks,
                source_template_id: undefined, // Шаблоны тренировок не имеют source_template_id
            })
            
            // Преобразуем ответ обратно в формат WorkoutTemplate для локального состояния
            const newWorkout: WorkoutTemplate = {
                id: day.id, // Используем ID дня программы как ID шаблона
                name: day.name,
                duration: workoutData.duration,
                level: workoutData.level,
                goal: workoutData.goal,
                description: day.notes || workoutData.description,
                warmup: (day.blocks?.find(b => b.type === 'warmup')?.exercises || []).map(ex => {
                    // Находим упражнение по названию
                    const exercise = exercisesList.find(e => e.name === ex.title)
                    return {
                        exerciseId: exercise?.id || '',
                        sets: ex.sets ?? undefined,
                        reps: ex.reps || undefined,
                        duration: ex.duration ? parseFloat(ex.duration) : undefined,
                        rest: ex.rest ? parseFloat(ex.rest) : undefined,
                        weight: ex.weight ? parseFloat(ex.weight) : undefined,
                    }
                }),
                main: (day.blocks?.find(b => b.type === 'main')?.exercises || []).map(ex => {
                    const exercise = exercisesList.find(e => e.name === ex.title)
                    return {
                        exerciseId: exercise?.id || '',
                        sets: ex.sets ?? undefined,
                        reps: ex.reps || undefined,
                        duration: ex.duration ? parseFloat(ex.duration) : undefined,
                        rest: ex.rest ? parseFloat(ex.rest) : undefined,
                        weight: ex.weight ? parseFloat(ex.weight) : undefined,
                    }
                }),
                cooldown: (day.blocks?.find(b => b.type === 'cooldown')?.exercises || []).map(ex => {
                    const exercise = exercisesList.find(e => e.name === ex.title)
                    return {
                        exerciseId: exercise?.id || '',
                        sets: ex.sets ?? undefined,
                        reps: ex.reps || undefined,
                        duration: ex.duration ? parseFloat(ex.duration) : undefined,
                        rest: ex.rest ? parseFloat(ex.rest) : undefined,
                        weight: ex.weight ? parseFloat(ex.weight) : undefined,
                    }
                }),
                muscleGroups: workoutData.muscleGroups,
                equipment: workoutData.equipment,
                isCustom: true,
            }
            
            return newWorkout
        } catch (error: any) {
            return rejectWithValue(error.message || 'Ошибка создания тренировки')
        }
    }
)

export const updateWorkoutApi = createAsyncThunk(
    'library/updateWorkoutApi',
        async (
        { id, updates }: { id: string; updates: Partial<WorkoutTemplate> & { programId?: string } },
        { rejectWithValue }
    ) => {
        try {
            // Если нет programId, обновляем только локально
            if (!updates.programId) {
                return { id, ...updates }
            }
            
            // Используем существующий эндпоинт PUT /api/programs/{program_id}/days/{day_id}
            // для обновления шаблона тренировки
            
            // Обновляем название дня программы
            if (updates.name) {
                await apiClient.updateProgramDay(updates.programId, id, {
                    name: updates.name,
                })
            }
            
            // Если обновляются упражнения, нужно обновить весь день программы
            // Для этого нужно получить текущий день, обновить блоки и пересоздать
            // Но это сложно, поэтому пока обновляем только название
            // TODO: Реализовать полное обновление блоков через API
            
            // Возвращаем обновленные данные
            return { id, ...updates }
        } catch (error: any) {
            return rejectWithValue(error.message || 'Ошибка обновления тренировки')
        }
    }
)

export const createExerciseApi = createAsyncThunk(
    'library/createExerciseApi',
    async (exerciseData: Omit<Exercise, 'id'>, { rejectWithValue, dispatch }) => {
        try {
            // Преобразуем данные из формата фронтенда в формат бэкенда
            const muscleGroupMap: Record<MuscleGroup, string> = {
                'chest': 'Грудь',
                'back': 'Спина',
                'shoulders': 'Плечи',
                'arms': 'Руки',
                'legs': 'Ноги',
                'core': 'Пресс',
                'cardio': 'Кардио',
                'full_body': 'Все тело',
            }
            
            const equipmentMap: Record<Equipment, string> = {
                'bodyweight': 'Собственный вес',
                'dumbbells': 'Гантели',
                'barbell': 'Штанга',
                'machine': 'Тренажер',
                'cable': 'Трос',
                'kettlebell': 'Гиря',
                'resistance_bands': 'Эспандер',
            }
            
            const muscleGroups = muscleGroupMap[exerciseData.muscleGroup] || ''
            const equipment = exerciseData.equipment.map(eq => equipmentMap[eq] || eq).join(', ')
            
            // Валидация: если visibility='client', то client_id обязателен
            if (exerciseData.visibility === 'client' && !exerciseData.clientId) {
                throw new Error('client_id обязателен когда visibility="client"')
            }
            
            // Если visibility!='client', то client_id должен быть null
            const clientId = exerciseData.visibility === 'client' ? exerciseData.clientId : null
            
            const apiData = {
                name: exerciseData.name,
                description: exerciseData.description || undefined,
                muscle_groups: muscleGroups || undefined,
                equipment: equipment || undefined,
                difficulty: undefined, // Пока не используется на фронтенде
                starting_position: exerciseData.startingPosition || undefined,
                execution_instructions: exerciseData.executionInstructions || undefined,
                video_url: exerciseData.videoUrl || undefined,
                notes: exerciseData.notes || undefined,
                visibility: exerciseData.visibility || 'all',
                client_id: clientId || null,
            }
            
            const createdExercise = await apiClient.createExercise(apiData)
            const mappedExercise = mapApiExerciseToState(createdExercise)
            
            // После создания перезагружаем список упражнений
            await dispatch(fetchExercises())
            
            return mappedExercise
        } catch (error: any) {
            return rejectWithValue(error.message || 'Ошибка создания упражнения')
        }
    }
)

export const updateExerciseApi = createAsyncThunk(
    'library/updateExerciseApi',
    async ({ id, updates }: { id: string; updates: Partial<Exercise> }, { rejectWithValue, dispatch }) => {
        try {
            // Преобразуем данные из формата фронтенда в формат бэкенда
            const muscleGroupMap: Record<MuscleGroup, string> = {
                'chest': 'Грудь',
                'back': 'Спина',
                'shoulders': 'Плечи',
                'arms': 'Руки',
                'legs': 'Ноги',
                'core': 'Пресс',
                'cardio': 'Кардио',
                'full_body': 'Все тело',
            }
            
            const equipmentMap: Record<Equipment, string> = {
                'bodyweight': 'Собственный вес',
                'dumbbells': 'Гантели',
                'barbell': 'Штанга',
                'machine': 'Тренажер',
                'cable': 'Трос',
                'kettlebell': 'Гиря',
                'resistance_bands': 'Эспандер',
            }
            
            const muscleGroups = updates.muscleGroup ? muscleGroupMap[updates.muscleGroup] || '' : undefined
            const equipment = updates.equipment ? updates.equipment.map(eq => equipmentMap[eq] || eq).join(', ') : undefined
            
            // Валидация: если visibility='client', то client_id обязателен
            if (updates.visibility === 'client' && !updates.clientId) {
                throw new Error('client_id обязателен когда visibility="client"')
            }
            
            // Если visibility!='client', то client_id должен быть null
            const clientId = updates.visibility === 'client' 
                ? updates.clientId 
                : (updates.visibility !== undefined ? null : undefined)
            
            const apiData: any = {}
            if (updates.name !== undefined) apiData.name = updates.name
            if (updates.description !== undefined) apiData.description = updates.description
            if (muscleGroups !== undefined) apiData.muscle_groups = muscleGroups
            if (equipment !== undefined) apiData.equipment = equipment
            if (updates.startingPosition !== undefined) apiData.starting_position = updates.startingPosition
            if (updates.executionInstructions !== undefined) apiData.execution_instructions = updates.executionInstructions
            if (updates.videoUrl !== undefined) apiData.video_url = updates.videoUrl
            if (updates.notes !== undefined) apiData.notes = updates.notes
            if (updates.visibility !== undefined) apiData.visibility = updates.visibility
            if (clientId !== undefined) apiData.client_id = clientId
            
            const updatedExercise = await apiClient.updateExercise(id, apiData)
            const mappedExercise = mapApiExerciseToState(updatedExercise)
            
            // После обновления перезагружаем список упражнений
            await dispatch(fetchExercises())
            
            return mappedExercise
        } catch (error: any) {
            return rejectWithValue(error.message || 'Ошибка обновления упражнения')
        }
    }
)

export const deleteExerciseApi = createAsyncThunk(
    'library/deleteExerciseApi',
    async (exerciseId: string, { rejectWithValue, dispatch }) => {
        try {
            await apiClient.deleteExercise(exerciseId)
            // После удаления перезагружаем список упражнений
            await dispatch(fetchExercises())
            return exerciseId
        } catch (error: any) {
            return rejectWithValue(error.message || 'Ошибка удаления упражнения')
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
            .addCase(createExerciseApi.fulfilled, (state, action) => {
                // Упражнение уже добавлено через fetchExercises, но можно добавить и локально для оптимизации
                const existingIndex = state.exercises.findIndex(e => e.id === action.payload.id)
                if (existingIndex === -1) {
                    state.exercises.push(action.payload)
                }
            })
            .addCase(updateExerciseApi.fulfilled, (state, action) => {
                // Упражнение уже обновлено через fetchExercises, но можно обновить и локально для оптимизации
                const index = state.exercises.findIndex(e => e.id === action.payload.id)
                if (index !== -1) {
                    state.exercises[index] = action.payload
                }
            })
            .addCase(deleteExerciseApi.fulfilled, (state, action) => {
                // Упражнение уже удалено через fetchExercises, но можно удалить и локально для оптимизации
                state.exercises = state.exercises.filter(e => e.id !== action.payload)
            })
            .addCase(createWorkoutApi.fulfilled, (state, action) => {
                // Добавляем тренировку в локальное состояние
                const existingIndex = state.workouts.findIndex(w => w.id === action.payload.id)
                if (existingIndex === -1) {
                    state.workouts.push(action.payload)
                }
            })
            .addCase(updateWorkoutApi.fulfilled, (state, action) => {
                // Обновляем тренировку в локальном состоянии
                const index = state.workouts.findIndex(w => w.id === action.payload.id)
                if (index !== -1) {
                    state.workouts[index] = { ...state.workouts[index], ...action.payload }
                }
            })
    },
})

export const {
    addWorkout,
    updateWorkout,
    removeWorkout,
    cloneWorkout,
    removeExercise,
    cloneExercise,
    setWorkoutFilters,
    setExerciseFilters,
    setSelectedWorkout,
    setSelectedExercise,
} = librarySlice.actions
export default librarySlice.reducer

