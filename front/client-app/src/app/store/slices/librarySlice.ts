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

export interface ExerciseTemplate {
    id: string
    trainerId: string
    exerciseId: string
    name: string
    sets: number
    reps?: number
    duration?: number
    rest?: number
    weight?: number
    notes?: string
}

interface LibraryState {
    workouts: WorkoutTemplate[]
    exercises: Exercise[]
    exerciseTemplates: ExerciseTemplate[]
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
    exerciseTemplates: [],
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

// Маппинг данных из API workout template в формат фронтенда
const mapApiWorkoutTemplateToState = (apiTemplate: any): WorkoutTemplate => {
    const warmup: WorkoutExercise[] = []
    const main: WorkoutExercise[] = []
    const cooldown: WorkoutExercise[] = []

    // Группируем упражнения по типам блоков
    if (apiTemplate.exercises && Array.isArray(apiTemplate.exercises)) {
        apiTemplate.exercises.forEach((ex: any) => {
            const exerciseData: WorkoutExercise = {
                exerciseId: ex.exercise_id || '',
                sets: ex.sets,
                reps: ex.reps || undefined,
                duration: ex.duration || undefined,
                rest: ex.rest || undefined,
                weight: ex.weight || undefined,
                notes: ex.notes || undefined,
            }

            if (ex.block_type === 'warmup') {
                warmup.push(exerciseData)
            } else if (ex.block_type === 'main') {
                main.push(exerciseData)
            } else if (ex.block_type === 'cooldown') {
                cooldown.push(exerciseData)
            }
        })
    }

    return {
        id: apiTemplate.id,
        name: apiTemplate.title || '',
        duration: apiTemplate.duration || 60,
        level: (apiTemplate.level || 'beginner') as WorkoutLevel,
        goal: (apiTemplate.goal || 'general') as WorkoutGoal,
        description: apiTemplate.description || undefined,
        warmup,
        main,
        cooldown,
        muscleGroups: apiTemplate.muscle_groups || [],
        equipment: apiTemplate.equipment || [],
        isCustom: true,
    }
}

export const fetchWorkoutTemplates = createAsyncThunk(
    'library/fetchWorkoutTemplates',
    async (params: { search?: string; level?: string; goal?: string; muscle_group?: string; equipment?: string } | undefined, { rejectWithValue, getState }) => {
        try {
            const templates = await apiClient.getWorkoutTemplates(params)
            // Получаем список упражнений из состояния для маппинга
            const state = getState() as any
            const exercisesList: Exercise[] = state.library?.exercises || []

            // Если упражнения не загружены, загружаем их
            if (exercisesList.length === 0) {
                await apiClient.getExercises()
                // Мы не используем результат здесь, так как mapApiWorkoutTemplateToState больше не требует exercisesList
                return templates.map(template => mapApiWorkoutTemplateToState(template))
            }

            return templates.map(template => mapApiWorkoutTemplateToState(template))
        } catch (error: any) {
            return rejectWithValue(error.message || 'Ошибка загрузки шаблонов тренировок')
        }
    }
)

export const createWorkoutApi = createAsyncThunk(
    'library/createWorkoutApi',
    async (
        workoutData: Omit<WorkoutTemplate, 'id'> & { programId?: string },
        { rejectWithValue, getState, dispatch }
    ) => {
        try {
            // Используем правильный эндпоинт POST /api/library/workout-templates/ для создания шаблона тренировки
            const state = getState() as any
            const exercisesList: Exercise[] = state.library?.exercises || []

            // Преобразуем данные из формата WorkoutTemplate в формат API workout template
            const exercises: Array<{
                exercise_id: string
                block_type: 'warmup' | 'main' | 'cooldown'
                sets: number
                reps?: number
                duration?: number
                rest?: number
                weight?: number
                notes?: string
            }> = []

            // Добавляем упражнения из warmup
            workoutData.warmup.forEach(ex => {
                exercises.push({
                    exercise_id: ex.exerciseId,
                    block_type: 'warmup',
                    sets: ex.sets || 1,
                    reps: ex.reps,
                    duration: ex.duration,
                    rest: ex.rest,
                    weight: ex.weight,
                    notes: ex.notes,
                })
            })

            // Добавляем упражнения из main
            workoutData.main.forEach(ex => {
                exercises.push({
                    exercise_id: ex.exerciseId,
                    block_type: 'main',
                    sets: ex.sets || 1,
                    reps: ex.reps,
                    duration: ex.duration,
                    rest: ex.rest,
                    weight: ex.weight,
                    notes: ex.notes,
                })
            })

            // Добавляем упражнения из cooldown
            workoutData.cooldown.forEach(ex => {
                exercises.push({
                    exercise_id: ex.exerciseId,
                    block_type: 'cooldown',
                    sets: ex.sets || 1,
                    reps: ex.reps,
                    duration: ex.duration,
                    rest: ex.rest,
                    weight: ex.weight,
                    notes: ex.notes,
                })
            })

            // Создаем шаблон тренировки через правильный API endpoint
            const template = await apiClient.createWorkoutTemplate({
                title: workoutData.name,
                description: workoutData.description,
                duration: workoutData.duration,
                level: workoutData.level,
                goal: workoutData.goal,
                muscle_groups: workoutData.muscleGroups,
                equipment: workoutData.equipment,
                exercises,
            })

            // Преобразуем ответ в формат WorkoutTemplate
            const newWorkout = mapApiWorkoutTemplateToState(template)

            // После создания перезагружаем список шаблонов
            await dispatch(fetchWorkoutTemplates())

            return newWorkout
        } catch (error: any) {
            return rejectWithValue(error.message || 'Ошибка создания тренировки')
        }
    }
)

export const createWorkoutTemplateFromDayApi = createAsyncThunk(
    'library/createWorkoutTemplateFromDayApi',
    async (dayId: string, { rejectWithValue, dispatch }) => {
        try {
            const template = await apiClient.createWorkoutTemplateFromDay(dayId)
            const newWorkout = mapApiWorkoutTemplateToState(template)
            await dispatch(fetchWorkoutTemplates())
            return newWorkout
        } catch (error: any) {
            return rejectWithValue(error.message || 'Ошибка создания шаблона')
        }
    }
)

export const updateWorkoutApi = createAsyncThunk(
    'library/updateWorkoutApi',
    async (
        { id, updates }: { id: string; updates: Partial<WorkoutTemplate> & { programId?: string } },
        { rejectWithValue, getState, dispatch }
    ) => {
        try {
            const state = getState() as any
            const exercisesList: Exercise[] = state.library?.exercises || []
            const currentWorkout = state.library?.workouts?.find((w: WorkoutTemplate) => w.id === id)

            if (!currentWorkout) {
                return rejectWithValue('Тренировка не найдена')
            }

            // Объединяем текущие данные с обновлениями
            const updatedWorkout = { ...currentWorkout, ...updates }

            // Если обновляются упражнения, нужно передать их в API
            let exercises: Array<{
                exercise_id: string
                block_type: 'warmup' | 'main' | 'cooldown'
                sets: number
                reps?: number
                duration?: number
                rest?: number
                weight?: number
                notes?: string
            }> | undefined = undefined

            if (updates.warmup !== undefined || updates.main !== undefined || updates.cooldown !== undefined) {
                exercises = []

                // Добавляем упражнения из warmup
                updatedWorkout.warmup.forEach((ex: WorkoutExercise) => {
                    exercises!.push({
                        exercise_id: ex.exerciseId,
                        block_type: 'warmup',
                        sets: ex.sets || 1,
                        reps: ex.reps,
                        duration: ex.duration,
                        rest: ex.rest,
                        weight: ex.weight,
                        notes: ex.notes,
                    })
                })

                // Добавляем упражнения из main
                updatedWorkout.main.forEach((ex: WorkoutExercise) => {
                    exercises!.push({
                        exercise_id: ex.exerciseId,
                        block_type: 'main',
                        sets: ex.sets || 1,
                        reps: ex.reps,
                        duration: ex.duration,
                        rest: ex.rest,
                        weight: ex.weight,
                        notes: ex.notes,
                    })
                })

                // Добавляем упражнения из cooldown
                updatedWorkout.cooldown.forEach((ex: WorkoutExercise) => {
                    exercises!.push({
                        exercise_id: ex.exerciseId,
                        block_type: 'cooldown',
                        sets: ex.sets || 1,
                        reps: ex.reps,
                        duration: ex.duration,
                        rest: ex.rest,
                        weight: ex.weight,
                        notes: ex.notes,
                    })
                })
            }

            // Обновляем шаблон тренировки через правильный API endpoint
            const template = await apiClient.updateWorkoutTemplate(id, {
                title: updatedWorkout.name,
                description: updatedWorkout.description,
                duration: updatedWorkout.duration,
                level: updatedWorkout.level,
                goal: updatedWorkout.goal,
                muscle_groups: updatedWorkout.muscleGroups,
                equipment: updatedWorkout.equipment,
                exercises,
            })

            // Преобразуем ответ в формат WorkoutTemplate
            const mappedWorkout = mapApiWorkoutTemplateToState(template)

            // После обновления перезагружаем список шаблонов
            await dispatch(fetchWorkoutTemplates())

            return mappedWorkout
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

export const fetchExerciseTemplates = createAsyncThunk(
    'library/fetchExerciseTemplates',
    async (_, { rejectWithValue }) => {
        try {
            const templates = await apiClient.getExerciseTemplates()
            return templates.map(t => ({
                id: t.id,
                trainerId: t.trainer_id,
                exerciseId: t.exercise_id,
                name: t.name,
                sets: t.sets,
                reps: t.reps ?? undefined,
                duration: t.duration ?? undefined,
                rest: t.rest ?? undefined,
                weight: t.weight ?? undefined,
                notes: t.notes ?? undefined,
            }))
        } catch (error: any) {
            return rejectWithValue(error.message || 'Ошибка загрузки шаблонов упражнений')
        }
    }
)

export const createExerciseTemplateApi = createAsyncThunk(
    'library/createExerciseTemplateApi',
    async (data: Omit<ExerciseTemplate, 'id' | 'trainerId'>, { rejectWithValue, dispatch }) => {
        try {
            const template = await apiClient.createExerciseTemplate({
                exercise_id: data.exerciseId,
                name: data.name,
                sets: data.sets,
                reps: data.reps,
                duration: data.duration,
                rest: data.rest,
                weight: data.weight,
                notes: data.notes,
            })
            await dispatch(fetchExerciseTemplates())
            return template
        } catch (error: any) {
            return rejectWithValue(error.message || 'Ошибка создания шаблона упражнения')
        }
    }
)

export const updateExerciseTemplateApi = createAsyncThunk(
    'library/updateExerciseTemplateApi',
    async ({ id, updates }: { id: string; updates: Partial<ExerciseTemplate> }, { rejectWithValue, dispatch }) => {
        try {
            const template = await apiClient.updateExerciseTemplate(id, {
                name: updates.name,
                sets: updates.sets,
                reps: updates.reps,
                duration: updates.duration,
                rest: updates.rest,
                weight: updates.weight,
                notes: updates.notes,
            })
            await dispatch(fetchExerciseTemplates())
            return template
        } catch (error: any) {
            return rejectWithValue(error.message || 'Ошибка обновления шаблона упражнения')
        }
    }
)

export const deleteExerciseTemplateApi = createAsyncThunk(
    'library/deleteExerciseTemplateApi',
    async (templateId: string, { rejectWithValue, dispatch }) => {
        try {
            await apiClient.deleteExerciseTemplate(templateId)
            await dispatch(fetchExerciseTemplates())
            return templateId
        } catch (error: any) {
            return rejectWithValue(error.message || 'Ошибка удаления шаблона упражнения')
        }
    }
)

export const deleteWorkoutTemplateApi = createAsyncThunk(
    'library/deleteWorkoutTemplateApi',
    async (workoutId: string, { rejectWithValue, dispatch }) => {
        try {
            await apiClient.deleteWorkoutTemplate(workoutId)
            // После удаления перезагружаем список шаблонов тренировок
            await dispatch(fetchWorkoutTemplates())
            return workoutId
        } catch (error: any) {
            return rejectWithValue(error.message || 'Ошибка удаления шаблона тренировки')
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
            .addCase(fetchWorkoutTemplates.pending, (state) => {
                state.loading = true
                state.error = null
            })
            .addCase(fetchWorkoutTemplates.fulfilled, (state, action) => {
                state.loading = false
                state.workouts = action.payload
            })
            .addCase(fetchWorkoutTemplates.rejected, (state, action) => {
                state.loading = false
                state.error = action.payload as string
            })
            .addCase(createWorkoutApi.fulfilled, (state, action) => {
                // Добавляем тренировку в локальное состояние
                const existingIndex = state.workouts.findIndex(w => w.id === action.payload.id)
                if (existingIndex === -1) {
                    state.workouts.push(action.payload)
                } else {
                    state.workouts[existingIndex] = action.payload
                }
            })
            .addCase(updateWorkoutApi.fulfilled, (state, action) => {
                // Обновляем тренировку в локальном состоянии
                const index = state.workouts.findIndex(w => w.id === action.payload.id)
                if (index !== -1) {
                    state.workouts[index] = action.payload
                }
            })
            .addCase(deleteWorkoutTemplateApi.fulfilled, (state, action) => {
                // Удаляем тренировку из локального состояния
                state.workouts = state.workouts.filter(w => w.id !== action.payload)
                if (state.selectedWorkoutId === action.payload) {
                    state.selectedWorkoutId = null
                }
            })
            .addCase(fetchExerciseTemplates.pending, (state) => {
                state.loading = true
                state.error = null
            })
            .addCase(fetchExerciseTemplates.fulfilled, (state, action) => {
                state.loading = false
                state.exerciseTemplates = action.payload
            })
            .addCase(fetchExerciseTemplates.rejected, (state, action) => {
                state.loading = false
                state.error = action.payload as string
            })
            .addCase(deleteExerciseTemplateApi.fulfilled, (state, action) => {
                state.exerciseTemplates = state.exerciseTemplates.filter(t => t.id !== action.payload)
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

