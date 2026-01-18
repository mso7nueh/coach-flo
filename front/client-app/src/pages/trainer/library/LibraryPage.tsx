import {
    ActionIcon,
    Badge,
    Button,
    Card,
    Group,
    Modal,
    Select,
    Stack,
    Tabs,
    Text,
    TextInput,
    Textarea,
    Title,
    SimpleGrid,
    Menu,
    NumberInput,
    Divider,
    Anchor,
    Radio,
    ScrollArea,
} from '@mantine/core'
import { useTranslation } from 'react-i18next'
import { useAppDispatch } from '@/shared/hooks/useAppDispatch'
import { useAppSelector } from '@/shared/hooks/useAppSelector'
import {
    addWorkout,
    removeWorkout,
    cloneExercise,
    setWorkoutFilters,
    setExerciseFilters,
    fetchExercises,
    fetchWorkoutTemplates,
    createExerciseApi,
    updateExerciseApi,
    deleteExerciseApi,
    createWorkoutApi,
    updateWorkoutApi,
} from '@/app/store/slices/librarySlice'
import {
    createProgram,
    createProgramDay,
    fetchPrograms,
    fetchProgramDays,
    updateProgramDay,
    deleteProgramDayApi,
    deleteProgram,
    addExerciseToProgramDayApi,
    updateExerciseInProgramDayApi,
    removeExerciseFromProgramDayApi,
    selectProgram,
    selectProgramDay,
    reorderDays,
    type ProgramExercise,
    type ProgramBlockInput,
} from '@/app/store/slices/programSlice'
import { notifications } from '@mantine/notifications'
import { useDisclosure } from '@mantine/hooks'
import { useState, useMemo, useEffect } from 'react'
import { useForm } from '@mantine/form'
import { DragDropContext, Draggable, Droppable, type DropResult } from '@hello-pangea/dnd'
import {
    IconPlus,
    IconTrash,
    IconEdit,
    IconCopy,
    IconBarbell,
    IconCalendarEvent,
    IconDotsVertical,
    IconVideo,
    IconExternalLink,
    IconPlayerPlay,
    IconEye,
    IconTemplate,
    IconBooks,
    IconFlame,
    IconStretching,
    IconClock,
    IconRepeat,
    IconDeviceFloppy,
} from '@tabler/icons-react'
import type {
    WorkoutTemplate,
    Exercise,
    WorkoutLevel,
    WorkoutGoal,
    MuscleGroup,
    WorkoutExercise,
} from '@/app/store/slices/librarySlice'

export const LibraryPage = () => {
    const { t } = useTranslation()
    const dispatch = useAppDispatch()
    const { workouts, exercises, workoutFilters, exerciseFilters } = useAppSelector((state) => state.library)
    const { programs, days, selectedProgramId, selectedDayId } = useAppSelector((state) => state.program)
    const clients = useAppSelector((state) => state.clients.clients)
    const [activeTab, setActiveTab] = useState<string>('exercises')
    const [workoutModalOpened, { open: openWorkoutModal, close: closeWorkoutModal }] = useDisclosure(false)
    const [viewWorkoutModalOpened, { open: openViewWorkoutModal, close: closeViewWorkoutModal }] = useDisclosure(false)
    const [exerciseModalOpened, { open: openExerciseModal, close: closeExerciseModal }] = useDisclosure(false)
    const [viewExerciseModalOpened, { open: openViewExerciseModal, close: closeViewExerciseModal }] = useDisclosure(false)
    const [editingWorkout, setEditingWorkout] = useState<WorkoutTemplate | null>(null)
    const [viewingWorkout, setViewingWorkout] = useState<WorkoutTemplate | null>(null)
    const [editingExercise, setEditingExercise] = useState<Exercise | null>(null)
    const [viewingExercise, setViewingExercise] = useState<Exercise | null>(null)
    const [addExerciseModalOpened, { open: openAddExerciseModal, close: closeAddExerciseModal }] = useDisclosure(false)
    const [currentBlockType, setCurrentBlockType] = useState<'warmup' | 'main' | 'cooldown' | null>(null)
    const [editingWorkoutExercise, setEditingWorkoutExercise] = useState<{ blockType: 'warmup' | 'main' | 'cooldown'; index: number } | null>(null)
    
    const trainerPrograms = useMemo(() => programs.filter((p) => p.owner === 'trainer'), [programs])
    const trainerDays = useMemo(() => days.filter((d) => d.owner === 'trainer'), [days])
    const selectedDay = useMemo(() => trainerDays.find((item) => item.id === selectedDayId) ?? null, [trainerDays, selectedDayId])
    const [programRenameModalOpened, { open: openProgramRename, close: closeProgramRename }] = useDisclosure(false)
    const [programExerciseModalOpened, { open: openProgramExerciseModal, close: closeProgramExerciseModal }] = useDisclosure(false)
    const [programTemplatePickerOpened, { open: openProgramTemplatePicker, close: closeProgramTemplatePicker }] = useDisclosure(false)
    const [programExerciseLibraryOpened, { open: openProgramExerciseLibrary, close: closeProgramExerciseLibrary }] = useDisclosure(false)
    const [programTemplateModalOpened, { open: openProgramTemplateModal, close: closeProgramTemplateModal }] = useDisclosure(false)
    const [programRenameDraft, setProgramRenameDraft] = useState('')
    const [programEditingExercise, setProgramEditingExercise] = useState<{
        exercise: ProgramExercise | null
        blockId: string
    } | null>(null)
    const [programExerciseLibraryTargetBlock, setProgramExerciseLibraryTargetBlock] = useState<string | null>(null)
    const [programExerciseForm, setProgramExerciseForm] = useState<Omit<ProgramExercise, 'id'>>({
        title: '',
        sets: 3,
        reps: undefined,
        duration: undefined,
        rest: undefined,
        weight: undefined,
    })
    const [programTemplateName, setProgramTemplateName] = useState('')

    const workoutForm = useForm<Omit<WorkoutTemplate, 'id' | 'isCustom'>>({
        initialValues: {
            name: '',
            duration: 60,
            level: 'beginner',
            goal: 'general',
            description: '',
            warmup: [],
            main: [],
            cooldown: [],
            muscleGroups: [],
            equipment: [],
        },
        validate: {
            name: (value) => {
                if (!value || value.trim().length < 2) {
                    return t('trainer.library.workoutForm.nameRequired')
                }
                const isDuplicate = workouts.some(
                    (w) => w.name.toLowerCase().trim() === value.toLowerCase().trim() && w.id !== editingWorkout?.id
                )
                if (isDuplicate) {
                    return t('trainer.library.workoutForm.nameDuplicate')
                }
                return null
            },
        },
    })

    const exerciseForm = useForm<Omit<Exercise, 'id'>>({
        initialValues: {
            name: '',
            muscleGroup: 'chest',
            equipment: [],
            description: '',
            startingPosition: '',
            executionInstructions: '',
            notes: '',
            videoUrl: '',
            visibility: 'all' as const,
            clientId: undefined,
        },
        validate: {
            executionInstructions: (value) => {
                if (!value || value.trim().length === 0) {
                    return t('trainer.library.exerciseForm.executionInstructionsRequired')
                }
                return null
            },
            clientId: (value, values) => {
                if (values.visibility === 'client' && !value) {
                    return t('trainer.library.exerciseForm.clientIdRequired')
                }
                return null
            },
        },
    })

    const workoutExerciseForm = useForm<{ exerciseId: string; sets?: number; reps?: number; duration?: number; rest?: number; weight?: number; notes?: string }>({
        initialValues: {
            exerciseId: '',
            sets: undefined,
            reps: undefined,
            duration: undefined,
            rest: undefined,
            weight: undefined,
            notes: '',
        },
    })

    const filteredWorkouts = useMemo(() => {
        return workouts.filter((w) => {
            if (workoutFilters.level && w.level !== workoutFilters.level) return false
            if (workoutFilters.goal && w.goal !== workoutFilters.goal) return false
            if (workoutFilters.muscleGroup && !w.muscleGroups.includes(workoutFilters.muscleGroup)) return false
            if (workoutFilters.equipment && !w.equipment.includes(workoutFilters.equipment)) return false
            return true
        })
    }, [workouts, workoutFilters])

    const filteredExercises = useMemo(() => {
        return exercises.filter((e) => {
            if (exerciseFilters.muscleGroup && e.muscleGroup !== exerciseFilters.muscleGroup) return false
            if (exerciseFilters.equipment && !e.equipment.includes(exerciseFilters.equipment)) return false
            return true
        })
    }, [exercises, exerciseFilters])

    const handleCreateWorkout = () => {
        setEditingWorkout(null)
        workoutForm.reset()
        openWorkoutModal()
    }

    const handleEditWorkout = (workout: WorkoutTemplate) => {
        setEditingWorkout(workout)
        workoutForm.setValues({
            name: workout.name,
            duration: workout.duration,
            level: workout.level,
            goal: workout.goal,
            description: workout.description || '',
            warmup: workout.warmup,
            main: workout.main,
            cooldown: workout.cooldown,
            muscleGroups: workout.muscleGroups,
            equipment: workout.equipment,
        })
        openWorkoutModal()
    }

    const handleSaveWorkout = async (values: typeof workoutForm.values) => {
        try {
            if (editingWorkout) {
                // Обновляем шаблон тренировки через API
                await dispatch(
                    updateWorkoutApi({
                        id: editingWorkout.id,
                        updates: values,
                    }),
                ).unwrap()
                notifications.show({
                    title: t('common.success'),
                    message: t('trainer.library.workoutUpdated'),
                    color: 'green',
                })
            } else {
                // Создаем шаблон тренировки через правильный API endpoint
                await dispatch(createWorkoutApi({ ...values, isCustom: true })).unwrap()
                notifications.show({
                    title: t('common.success'),
                    message: t('trainer.library.workoutCreated'),
                    color: 'green',
                })
            }
            closeWorkoutModal()
            workoutForm.reset()
            setEditingWorkout(null)
        } catch (error: any) {
            notifications.show({
                title: t('common.error'),
                message: error || t('trainer.library.error.createWorkout'),
                color: 'red',
            })
        }
    }


    const accessibleExercisesForProgram = useMemo(() => {
        return exercises.filter((exercise) => {
            if (exercise.visibility === 'all') {
                return true
            }
            if (exercise.visibility === 'trainer') {
                return true
            }
            return false
        })
    }, [exercises])

    const exercisesMapForProgram = useMemo(
        () =>
            accessibleExercisesForProgram.reduce<Record<string, Exercise>>((acc, exercise) => {
                acc[exercise.id] = exercise
                return acc
            }, {}),
        [accessibleExercisesForProgram],
    )

    const accessibleTemplatesForProgram = useMemo(() => {
        return workouts
    }, [workouts])

    const resolveProgramId = () => selectedProgramId ?? trainerPrograms[0]?.id ?? null

    const handleProgramDayClick = (dayId: string) => {
        dispatch(selectProgramDay(dayId))
    }

    const handleAddTrainerProgram = async () => {
        const ownerProgramsCount = trainerPrograms.length + 1
        const defaultTitle = `${t('program.newProgramTrainer')} ${ownerProgramsCount}`
        try {
            await dispatch(createProgram({ title: defaultTitle, owner: 'trainer' })).unwrap()
            // Перезагружаем программы после создания
            await dispatch(fetchPrograms())
            notifications.show({
                title: t('common.success'),
                message: t('program.programCreated'),
                color: 'green',
            })
        } catch (error: any) {
            notifications.show({
                title: t('common.error'),
                message: error || t('program.error.createProgram'),
                color: 'red',
            })
        }
    }

    const handleAddTrainerDay = async () => {
        let targetProgramId = resolveProgramId()
        if (!targetProgramId) {
            await handleAddTrainerProgram()
            targetProgramId = resolveProgramId()
            if (!targetProgramId) {
                return
            }
        }
        const trainingsCount = trainerDays.filter((day) => day.programId === targetProgramId).length + 1
        const defaultName = t('program.trainingName', { count: trainingsCount })
        try {
            await dispatch(
                createProgramDay({
                    name: defaultName,
                    programId: targetProgramId,
                })
            ).unwrap()
            // Перезагружаем дни программы после создания
            await dispatch(fetchProgramDays(targetProgramId))
            notifications.show({
                title: t('common.success'),
                message: t('program.dayCreated'),
                color: 'green',
            })
        } catch (error: any) {
            notifications.show({
                title: t('common.error'),
                message: error || t('program.error.createDay'),
                color: 'red',
            })
        }
    }

    const handleAddTrainerDayFromTemplate = async (template: WorkoutTemplate) => {
        let targetProgramId = resolveProgramId()
        if (!targetProgramId) {
            await handleAddTrainerProgram()
            targetProgramId = resolveProgramId()
            if (!targetProgramId) {
                return
            }
        }
        const toProgramExercise = (item: WorkoutExercise): Omit<ProgramExercise, 'id'> => {
            const linkedExercise = item.exerciseId ? exercisesMapForProgram[item.exerciseId] : undefined
            return {
                title: linkedExercise?.name ?? item.exercise?.name ?? t('program.newExercise'),
                sets: item.sets ?? 1,
                reps: item.reps,
                duration: item.duration ? `${item.duration} ${t('program.minutesShort')}` : undefined,
                rest: item.rest ? `${item.rest} ${t('program.secondsShort')}` : undefined,
                weight: item.weight ? `${item.weight}` : undefined,
            }
        }
        const blocks: ProgramBlockInput[] = []
        if (template.warmup.length > 0) {
            blocks.push({
                type: 'warmup',
                title: t('program.sections.warmup'),
                exercises: template.warmup.map(toProgramExercise),
            })
        }
        if (template.main.length > 0) {
            blocks.push({
                type: 'main',
                title: t('program.sections.main'),
                exercises: template.main.map(toProgramExercise),
            })
        }
        if (template.cooldown.length > 0) {
            blocks.push({
                type: 'cooldown',
                title: t('program.sections.cooldown'),
                exercises: template.cooldown.map(toProgramExercise),
            })
        }
        const trainingsCount = trainerDays.filter((day) => day.programId === targetProgramId).length + 1
        const defaultName = t('program.trainingName', { count: trainingsCount })
        try {
            await dispatch(
                createProgramDay({
                    name: defaultName,
                    programId: targetProgramId,
                    blocks,
                    sourceTemplateId: template.id,
                })
            ).unwrap()
            // Перезагружаем дни программы после создания
            await dispatch(fetchProgramDays(targetProgramId))
            closeProgramTemplatePicker()
            notifications.show({
                title: t('common.success'),
                message: t('program.dayCreated'),
                color: 'green',
            })
        } catch (error: any) {
            notifications.show({
                title: t('common.error'),
                message: error || t('program.error.createDay'),
                color: 'red',
            })
        }
    }

    const handleDuplicateTrainerDay = async (dayId: string) => {
        const day = trainerDays.find((d) => d.id === dayId)
        if (!day) {
            return
        }
        try {
            const blocks: ProgramBlockInput[] = day.blocks.map(block => ({
                type: block.type,
                title: block.title,
                exercises: block.exercises.map(ex => ({
                    title: ex.title,
                    sets: ex.sets,
                    reps: ex.reps,
                    duration: ex.duration,
                    rest: ex.rest,
                    weight: ex.weight,
                })),
            }))
            await dispatch(
                createProgramDay({
                    name: `${day.name} (копия)`,
                    programId: day.programId,
                    blocks,
                    sourceTemplateId: day.sourceTemplateId,
                })
            ).unwrap()
            // Перезагружаем дни программы после копирования
            await dispatch(fetchProgramDays(day.programId))
            notifications.show({
                title: t('common.success'),
                message: t('program.dayDuplicated'),
                color: 'green',
            })
        } catch (error: any) {
            notifications.show({
                title: t('common.error'),
                message: error || t('program.error.duplicateDay'),
                color: 'red',
            })
        }
    }

    const handleSaveTrainerRename = async () => {
        if (selectedDay && programRenameDraft.trim()) {
            try {
                await dispatch(
                    updateProgramDay({
                        programId: selectedDay.programId,
                        dayId: selectedDay.id,
                        data: { name: programRenameDraft.trim() },
                    })
                ).unwrap()
                // Перезагружаем дни программы после переименования
                await dispatch(fetchProgramDays(selectedDay.programId))
                closeProgramRename()
                notifications.show({
                    title: t('common.success'),
                    message: t('program.dayRenamed'),
                    color: 'green',
                })
            } catch (error: any) {
                notifications.show({
                    title: t('common.error'),
                    message: error || t('program.error.renameDay'),
                    color: 'red',
                })
            }
        }
    }

    const handleProgramDragEnd = async (result: DropResult) => {
        if (!result.destination || !selectedProgramId) {
            return
        }
        const sourceIndex = result.source.index
        const destinationIndex = result.destination.index
        if (sourceIndex === destinationIndex) {
            return
        }
        // Обновляем порядок локально для быстрого отклика
        dispatch(reorderDays({ from: sourceIndex, to: destinationIndex }))
        
        // Обновляем порядок через API для каждого дня программы
        const reorderedDays = [...visibleProgramDays]
        const [moved] = reorderedDays.splice(sourceIndex, 1)
        reorderedDays.splice(destinationIndex, 0, moved)
        
        // Обновляем порядок каждого дня через API
        try {
            await Promise.all(
                reorderedDays.map((day, index) =>
                    dispatch(
                        updateProgramDay({
                            programId: selectedProgramId,
                            dayId: day.id,
                            data: { order: index },
                        })
                    ).unwrap()
                )
            )
            // Перезагружаем дни программы после изменения порядка
            await dispatch(fetchProgramDays(selectedProgramId))
        } catch (error: any) {
            // В случае ошибки перезагружаем дни программы
            dispatch(fetchProgramDays(selectedProgramId))
            notifications.show({
                title: t('common.error'),
                message: error || t('program.error.reorderDays'),
                color: 'red',
            })
        }
    }

    const handleAddProgramExercise = (blockId: string) => {
        setProgramEditingExercise({ exercise: null, blockId })
        setProgramExerciseForm({
            title: '',
            sets: 3,
            reps: undefined,
            duration: undefined,
            rest: undefined,
            weight: undefined,
        })
        openProgramExerciseModal()
    }

    const handleEditProgramExercise = (exercise: ProgramExercise, blockId: string) => {
        setProgramEditingExercise({ exercise, blockId })
        setProgramExerciseForm({
            title: exercise.title,
            sets: exercise.sets,
            reps: exercise.reps,
            duration: exercise.duration,
            rest: exercise.rest,
            weight: exercise.weight,
        })
        openProgramExerciseModal()
    }

    const handleSaveProgramExercise = async () => {
        if (!selectedDay || !programEditingExercise || !programExerciseForm.title.trim()) {
            return
        }
        try {
            if (programEditingExercise.exercise) {
                await dispatch(
                    updateExerciseInProgramDayApi({
                        programId: selectedDay.programId,
                        dayId: selectedDay.id,
                        blockId: programEditingExercise.blockId,
                        exerciseId: programEditingExercise.exercise.id,
                        exercise: {
                            ...programEditingExercise.exercise,
                            ...programExerciseForm,
                        },
                    })
                ).unwrap()
                notifications.show({
                    title: t('common.success'),
                    message: t('program.exerciseUpdated'),
                    color: 'green',
                })
            } else {
                await dispatch(
                    addExerciseToProgramDayApi({
                        programId: selectedDay.programId,
                        dayId: selectedDay.id,
                        blockId: programEditingExercise.blockId,
                        exercise: programExerciseForm,
                    })
                ).unwrap()
                notifications.show({
                    title: t('common.success'),
                    message: t('program.exerciseAdded'),
                    color: 'green',
                })
            }
            // Перезагружаем дни программы после сохранения упражнения
            await dispatch(fetchProgramDays(selectedDay.programId))
            closeProgramExerciseModal()
            setProgramEditingExercise(null)
        } catch (error: any) {
            notifications.show({
                title: t('common.error'),
                message: error || t('program.error.saveExercise'),
                color: 'red',
            })
        }
    }

    const handleDeleteProgramExercise = async (exerciseId: string, blockId: string) => {
        if (!selectedDay) {
            return
        }
        if (confirm(t('common.delete') + '?')) {
            try {
                await dispatch(
                    removeExerciseFromProgramDayApi({
                        programId: selectedDay.programId,
                        dayId: selectedDay.id,
                        blockId,
                        exerciseId,
                    })
                ).unwrap()
                // Перезагружаем дни программы после удаления упражнения
                await dispatch(fetchProgramDays(selectedDay.programId))
                notifications.show({
                    title: t('common.success'),
                    message: t('program.exerciseDeleted'),
                    color: 'green',
                })
            } catch (error: any) {
                notifications.show({
                    title: t('common.error'),
                    message: error || t('program.error.deleteExercise'),
                    color: 'red',
                })
            }
        }
    }

    const handleOpenProgramExerciseLibrary = (blockId: string) => {
        setProgramExerciseLibraryTargetBlock(blockId)
        openProgramExerciseLibrary()
    }

    const handleAddProgramExerciseFromLibrary = async (exercise: Exercise) => {
        if (!selectedDay || !programExerciseLibraryTargetBlock) {
            return
        }
        try {
            await dispatch(
                addExerciseToProgramDayApi({
                    programId: selectedDay.programId,
                    dayId: selectedDay.id,
                    blockId: programExerciseLibraryTargetBlock,
                    exercise: {
                        title: exercise.name,
                        sets: 3,
                        reps: 10,
                        duration: undefined,
                        rest: undefined,
                        weight: undefined,
                    },
                })
            ).unwrap()
            // Перезагружаем дни программы после добавления упражнения
            await dispatch(fetchProgramDays(selectedDay.programId))
            closeProgramExerciseLibrary()
            setProgramExerciseLibraryTargetBlock(null)
            notifications.show({
                title: t('common.success'),
                message: t('program.exerciseAdded'),
                color: 'green',
            })
        } catch (error: any) {
            notifications.show({
                title: t('common.error'),
                message: error || t('program.error.addExercise'),
                color: 'red',
            })
        }
    }

    const handleCloseProgramExerciseModal = () => {
        closeProgramExerciseModal()
        setProgramEditingExercise(null)
        setProgramExerciseForm({
            title: '',
            sets: 3,
            reps: undefined,
            duration: undefined,
            rest: undefined,
            weight: undefined,
        })
    }

    const handleSaveProgramAsTemplate = () => {
        if (!selectedDay || !programTemplateName.trim()) {
            return
        }
        console.log('Saving template:', programTemplateName, selectedDay)
        closeProgramTemplateModal()
        setProgramTemplateName('')
    }

    const visibleProgramDays = useMemo(() => {
        const programId = selectedProgramId ?? trainerPrograms[0]?.id ?? null
        if (!programId) {
            return []
        }
        return trainerDays.filter((day) => day.programId === programId).sort((a, b) => a.order - b.order)
    }, [trainerDays, selectedProgramId, trainerPrograms])


    // Загружаем упражнения при открытии вкладки упражнений
    useEffect(() => {
        if (activeTab === 'exercises') {
            dispatch(fetchExercises())
        }
    }, [activeTab, dispatch])
    
    // Загружаем шаблоны тренировок при открытии вкладки тренировок
    useEffect(() => {
        if (activeTab === 'workouts') {
            dispatch(fetchWorkoutTemplates())
        }
    }, [activeTab, dispatch])
    
    // Загружаем программы при открытии вкладки программ
    useEffect(() => {
        if (activeTab === 'programs') {
            dispatch(fetchPrograms()).then((result) => {
                if (fetchPrograms.fulfilled.match(result) && result.payload.length > 0 && !selectedProgramId) {
                    const trainerPrograms = result.payload.filter((p) => p.owner === 'trainer')
                    if (trainerPrograms.length > 0) {
                        dispatch(selectProgram(trainerPrograms[0].id))
                    }
                }
            })
        }
    }, [activeTab, dispatch, selectedProgramId])
    
    // Загружаем дни программы при выборе программы
    useEffect(() => {
        if (activeTab === 'programs' && selectedProgramId) {
            dispatch(fetchProgramDays(selectedProgramId))
        }
    }, [activeTab, dispatch, selectedProgramId])

    const handleCreateExercise = () => {
        setEditingExercise(null)
        exerciseForm.reset()
        openExerciseModal()
    }

    const handleEditExercise = (exercise: Exercise) => {
        setEditingExercise(exercise)
        exerciseForm.setValues({
            name: exercise.name,
            muscleGroup: exercise.muscleGroup,
            equipment: exercise.equipment,
            description: exercise.description || '',
            startingPosition: exercise.startingPosition || '',
            executionInstructions: exercise.executionInstructions || '',
            notes: exercise.notes || '',
            videoUrl: exercise.videoUrl || '',
            visibility: exercise.visibility || 'all',
            clientId: exercise.clientId,
        })
        openExerciseModal()
    }

    const handleSaveExercise = async (values: typeof exerciseForm.values) => {
        try {
            if (editingExercise) {
                await dispatch(
                    updateExerciseApi({
                        id: editingExercise.id,
                        updates: values,
                    }),
                ).unwrap()
                notifications.show({
                    title: t('common.success'),
                    message: t('trainer.library.exerciseUpdated'),
                    color: 'green',
                })
            } else {
                await dispatch(createExerciseApi(values)).unwrap()
                notifications.show({
                    title: t('common.success'),
                    message: t('trainer.library.exerciseCreated'),
                    color: 'green',
                })
            }
            closeExerciseModal()
            exerciseForm.reset()
            setEditingExercise(null)
        } catch (error: any) {
            notifications.show({
                title: t('common.error'),
                message: error || t('trainer.library.error.createExercise'),
                color: 'red',
            })
        }
    }

    return (
        <Stack gap="lg">
            <Group justify="space-between">
                <Title order={2}>{t('trainer.library.title')}</Title>
            </Group>

            <Tabs value={activeTab} onChange={(value) => setActiveTab(value || 'exercises')}>
                <Tabs.List>
                    <Tabs.Tab value="exercises" leftSection={<IconBarbell size={16} />}>
                        {t('trainer.library.exercises')}
                    </Tabs.Tab>
                    <Tabs.Tab value="workouts" leftSection={<IconCalendarEvent size={16} />}>
                        {t('trainer.library.workouts')}
                    </Tabs.Tab>
                    <Tabs.Tab value="programs" leftSection={<IconTemplate size={16} />}>
                        {t('program.programsTitle')}
                    </Tabs.Tab>
                </Tabs.List>

                <Tabs.Panel value="exercises" pt="lg">
                    <Stack gap="md">
                        <Group justify="space-between">
                            <Group gap="md">
                                <Select
                                    placeholder={t('trainer.library.filters.muscleGroup')}
                                    data={[
                                        { value: 'chest', label: t('trainer.library.muscleChest') },
                                        { value: 'back', label: t('trainer.library.muscleBack') },
                                        { value: 'shoulders', label: t('trainer.library.muscleShoulders') },
                                        { value: 'arms', label: t('trainer.library.muscleArms') },
                                        { value: 'legs', label: t('trainer.library.muscleLegs') },
                                        { value: 'core', label: t('trainer.library.muscleCore') },
                                        { value: 'cardio', label: t('trainer.library.muscleCardio') },
                                        { value: 'full_body', label: t('trainer.library.muscleFullBody') },
                                    ]}
                                    clearable
                                    value={exerciseFilters.muscleGroup || null}
                                    onChange={(value) =>
                                        dispatch(setExerciseFilters({ muscleGroup: (value as MuscleGroup) || undefined }))
                                    }
                                />
                            </Group>
                            <Button leftSection={<IconPlus size={16} />} onClick={handleCreateExercise}>
                                {t('trainer.library.createExercise')}
                            </Button>
                        </Group>

                        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
                            {filteredExercises.map((exercise) => (
                                <Card 
                                    key={exercise.id} 
                                    withBorder 
                                    padding="md"
                                    style={{ cursor: 'pointer' }}
                                    onClick={(e) => {
                                        const target = e.target as HTMLElement
                                        if (!target.closest('[data-menu-trigger]') && !target.closest('[data-menu-dropdown]')) {
                                            handleEditExercise(exercise)
                                        }
                                    }}
                                >
                                    <Stack gap="sm">
                                        <Group justify="space-between" align="flex-start">
                                            <Stack gap={4} style={{ flex: 1 }}>
                                                <Text fw={600} size="lg">
                                                    {exercise.name}
                                                </Text>
                                                <Group gap="xs">
                                                    <Badge size="sm" variant="light">
                                                        {exercise.muscleGroup === 'chest'
                                                            ? t('trainer.library.muscleChest')
                                                            : exercise.muscleGroup === 'back'
                                                            ? t('trainer.library.muscleBack')
                                                            : exercise.muscleGroup === 'shoulders'
                                                            ? t('trainer.library.muscleShoulders')
                                                            : exercise.muscleGroup === 'arms'
                                                            ? t('trainer.library.muscleArms')
                                                            : exercise.muscleGroup === 'legs'
                                                            ? t('trainer.library.muscleLegs')
                                                            : exercise.muscleGroup === 'core'
                                                            ? t('trainer.library.muscleCore')
                                                            : exercise.muscleGroup === 'cardio'
                                                            ? t('trainer.library.muscleCardio')
                                                            : t('trainer.library.muscleFullBody')}
                                                    </Badge>
                                                </Group>
                                            </Stack>
                                            <Menu shadow="md" width={200} position="bottom-end">
                                                <Menu.Target>
                                                    <ActionIcon 
                                                        variant="subtle"
                                                        data-menu-trigger
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                        }}
                                                        onMouseDown={(e) => {
                                                            e.stopPropagation()
                                                        }}
                                                    >
                                                        <IconDotsVertical size={16} />
                                                    </ActionIcon>
                                                </Menu.Target>
                                                <Menu.Dropdown data-menu-dropdown onClick={(e) => e.stopPropagation()}>
                                                    <Menu.Item leftSection={<IconEye size={16} />} onClick={(e) => {
                                                        e.stopPropagation()
                                                        setViewingExercise(exercise)
                                                        openViewExerciseModal()
                                                    }}>
                                                        {t('trainer.library.view')}
                                                    </Menu.Item>
                                                    <Menu.Item leftSection={<IconEdit size={16} />} onClick={(e) => {
                                                        e.stopPropagation()
                                                        handleEditExercise(exercise)
                                                    }}>
                                                        {t('trainer.library.edit')}
                                                    </Menu.Item>
                                                    <Menu.Item leftSection={<IconCopy size={16} />} onClick={(e) => {
                                                        e.stopPropagation()
                                                        dispatch(cloneExercise(exercise.id))
                                                    }}>
                                                        {t('trainer.library.clone')}
                                                    </Menu.Item>
                                                    <Menu.Divider />
                                                    <Menu.Item
                                                        color="red"
                                                        leftSection={<IconTrash size={16} />}
                                                        onClick={async (e) => {
                                                            e.stopPropagation()
                                                            try {
                                                                await dispatch(deleteExerciseApi(exercise.id)).unwrap()
                                                                notifications.show({
                                                                    title: t('common.success'),
                                                                    message: t('trainer.library.exerciseDeleted'),
                                                                    color: 'green',
                                                                })
                                                            } catch (error: any) {
                                                                notifications.show({
                                                                    title: t('common.error'),
                                                                    message: error || t('trainer.library.error.deleteExercise'),
                                                                    color: 'red',
                                                                })
                                                            }
                                                        }}
                                                    >
                                                        {t('trainer.library.delete')}
                                                    </Menu.Item>
                                                </Menu.Dropdown>
                                            </Menu>
                                        </Group>
                                        {exercise.description && (
                                            <Text size="sm" c="dimmed" lineClamp={2}>
                                                {exercise.description}
                                            </Text>
                                        )}
                                    </Stack>
                                </Card>
                            ))}
                        </SimpleGrid>
                    </Stack>
                </Tabs.Panel>

                <Tabs.Panel value="workouts" pt="lg">
                    <Stack gap="md">
                        <Group justify="space-between">
                            <Group gap="md">
                                <Select
                                    placeholder={t('trainer.library.filters.level')}
                                    data={[
                                        { value: 'beginner', label: t('trainer.library.levelBeginner') },
                                        { value: 'intermediate', label: t('trainer.library.levelIntermediate') },
                                        { value: 'advanced', label: t('trainer.library.levelAdvanced') },
                                    ]}
                                    clearable
                                    value={workoutFilters.level || null}
                                    onChange={(value) =>
                                        dispatch(setWorkoutFilters({ level: (value as WorkoutLevel) || undefined }))
                                    }
                                />
                                <Select
                                    placeholder={t('trainer.library.filters.goal')}
                                    data={[
                                        { value: 'weight_loss', label: t('trainer.library.goalWeightLoss') },
                                        { value: 'muscle_gain', label: t('trainer.library.goalMuscleGain') },
                                        { value: 'endurance', label: t('trainer.library.goalEndurance') },
                                        { value: 'flexibility', label: t('trainer.library.goalFlexibility') },
                                        { value: 'general', label: t('trainer.library.goalGeneral') },
                                    ]}
                                    clearable
                                    value={workoutFilters.goal || null}
                                    onChange={(value) =>
                                        dispatch(setWorkoutFilters({ goal: (value as WorkoutGoal) || undefined }))
                                    }
                                />
                            </Group>
                            <Button leftSection={<IconPlus size={16} />} onClick={handleCreateWorkout}>
                                {t('trainer.library.createWorkout')}
                            </Button>
                        </Group>

                        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
                            {filteredWorkouts.map((workout) => (
                                <Card 
                                    key={workout.id} 
                                    withBorder 
                                    padding="md"
                                    style={{ cursor: 'pointer' }}
                                    onClick={(e) => {
                                        const target = e.target as HTMLElement
                                        if (!target.closest('[data-menu-trigger]') && !target.closest('[data-menu-dropdown]')) {
                                            setViewingWorkout(workout)
                                            openViewWorkoutModal()
                                        }
                                    }}
                                >
                                    <Stack gap="sm">
                                        <Group justify="space-between" align="flex-start">
                                            <Stack gap={4} style={{ flex: 1 }}>
                                                <Text fw={600} size="lg">
                                                    {workout.name}
                                                </Text>
                                                <Group gap="xs">
                                                    <Badge size="sm" variant="light">
                                                        {workout.duration} мин
                                                    </Badge>
                                                    <Badge size="sm" variant="light" color="blue">
                                                        {workout.level === 'beginner'
                                                            ? t('trainer.library.levelBeginner')
                                                            : workout.level === 'intermediate'
                                                            ? t('trainer.library.levelIntermediate')
                                                            : t('trainer.library.levelAdvanced')}
                                                    </Badge>
                                                </Group>
                                            </Stack>
                                            <Menu shadow="md" width={200} position="bottom-end">
                                                <Menu.Target>
                                                    <ActionIcon 
                                                        variant="subtle"
                                                        data-menu-trigger
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                        }}
                                                        onMouseDown={(e) => {
                                                            e.stopPropagation()
                                                        }}
                                                    >
                                                        <IconDotsVertical size={16} />
                                                    </ActionIcon>
                                                </Menu.Target>
                                                <Menu.Dropdown data-menu-dropdown onClick={(e) => e.stopPropagation()}>
                                                    <Menu.Item leftSection={<IconEye size={16} />} onClick={(e) => {
                                                        e.stopPropagation()
                                                        setViewingWorkout(workout)
                                                        openViewWorkoutModal()
                                                    }}>
                                                        {t('trainer.library.view')}
                                                    </Menu.Item>
                                                    <Menu.Item leftSection={<IconEdit size={16} />} onClick={(e) => {
                                                        e.stopPropagation()
                                                        handleEditWorkout(workout)
                                                    }}>
                                                        {t('trainer.library.edit')}
                                                    </Menu.Item>
                                                    <Menu.Item leftSection={<IconCopy size={16} />} onClick={(e) => {
                                                        e.stopPropagation()
                                                        const clonedWorkout = workouts.find((w) => w.id === workout.id)
                                                        if (clonedWorkout) {
                                                            const cloned: WorkoutTemplate = {
                                                                ...clonedWorkout,
                                                                id: crypto.randomUUID(),
                                                                name: `${clonedWorkout.name} (копия)`,
                                                                isCustom: true,
                                                            }
                                                            dispatch(addWorkout({ ...cloned, isCustom: true }))
                                                            setTimeout(() => {
                                                                handleEditWorkout(cloned)
                                                            }, 0)
                                                        }
                                                    }}>
                                                        {t('trainer.library.clone')}
                                                    </Menu.Item>
                                                    <Menu.Divider />
                                                    <Menu.Item
                                                        color="red"
                                                        leftSection={<IconTrash size={16} />}
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            dispatch(removeWorkout(workout.id))
                                                        }}
                                                    >
                                                        {t('trainer.library.delete')}
                                                    </Menu.Item>
                                                </Menu.Dropdown>
                                            </Menu>
                                        </Group>
                                        {workout.description && (
                                            <Text size="sm" c="dimmed" lineClamp={2}>
                                                {workout.description}
                                            </Text>
                                        )}
                                    </Stack>
                                </Card>
                            ))}
                        </SimpleGrid>
                    </Stack>
                </Tabs.Panel>

                <Tabs.Panel value="programs" pt="lg">
                    <Group align="flex-start" gap="xl">
                        <Card withBorder>
                            <Stack gap="md">
                                <Group justify="space-between" align="center">
                                    <Title order={4}>{t('program.programsTitle')}</Title>
                                    <Group gap="xs">
                                        <Button variant="light" leftSection={<IconPlus size={16} />} onClick={handleAddTrainerProgram}>
                                            {t('program.addProgram')}
                                        </Button>
                                    </Group>
                                </Group>
                                <ScrollArea type="auto" offsetScrollbars>
                                    <Group gap="sm" wrap="nowrap">
                                        {trainerPrograms.map((program) => {
                                            const isActive = program.id === selectedProgramId
                                            return (
                                                <Card
                                                    key={program.id}
                                                    withBorder
                                                    padding="md"
                                                    style={{
                                                        minWidth: 220,
                                                        borderColor: isActive ? 'var(--mantine-color-violet-4)' : 'var(--mantine-color-gray-3)',
                                                        backgroundColor: isActive ? 'var(--mantine-color-violet-0)' : 'var(--mantine-color-white)',
                                                        cursor: 'pointer',
                                                    }}
                                                    onClick={() => dispatch(selectProgram(program.id))}
                                                >
                                                    <Stack gap={4}>
                                                        <Group justify="space-between">
                                                            <Text fw={600}>{program.title}</Text>
                                                            <Group gap="xs">
                                                                <Badge size="xs" color="gray" variant="light">
                                                                    {t(`program.owner.trainer`)}
                                                                </Badge>
                                                                <Menu position="bottom-end">
                                                                    <Menu.Target>
                                                                        <ActionIcon
                                                                            variant="subtle"
                                                                            color="gray"
                                                                            size="sm"
                                                                            onClick={(e) => {
                                                                                e.stopPropagation()
                                                                            }}
                                                                        >
                                                                            <IconDotsVertical size={14} />
                                                                        </ActionIcon>
                                                                    </Menu.Target>
                                                                    <Menu.Dropdown>
                                                                        <Menu.Item
                                                                            leftSection={<IconTrash size={16} />}
                                                                            color="red"
                                                                            onClick={async (e) => {
                                                                                e.stopPropagation()
                                                                                if (confirm(t('common.delete') + '?')) {
                                                                                    try {
                                                                                        await dispatch(deleteProgram(program.id)).unwrap()
                                                                                        // Перезагружаем список программ после удаления
                                                                                        await dispatch(fetchPrograms())
                                                                                        notifications.show({
                                                                                            title: t('common.success'),
                                                                                            message: t('program.programDeleted'),
                                                                                            color: 'green',
                                                                                        })
                                                                                    } catch (error: any) {
                                                                                        notifications.show({
                                                                                            title: t('common.error'),
                                                                                            message: error || t('program.error.deleteProgram'),
                                                                                            color: 'red',
                                                                                        })
                                                                                    }
                                                                                }
                                                                            }}
                                                                        >
                                                                            {t('common.delete')}
                                                                        </Menu.Item>
                                                                    </Menu.Dropdown>
                                                                </Menu>
                                                            </Group>
                                                        </Group>
                                                        {program.description ? (
                                                            <Text size="xs" c="dimmed">
                                                                {program.description}
                                                            </Text>
                                                        ) : null}
                                                    </Stack>
                                                </Card>
                                            )
                                        })}
                                    </Group>
                                </ScrollArea>
                                <Group justify="space-between" align="center">
                                    <Text fw={600}>{t('program.trainingsTitle')}</Text>
                                    <Group gap="xs">
                                        <Button variant="light" leftSection={<IconTemplate size={16} />} onClick={openProgramTemplatePicker}>
                                            {t('program.addTrainingFromTemplate')}
                                        </Button>
                                        <Button variant="light" leftSection={<IconPlus size={16} />} onClick={handleAddTrainerDay}>
                                            {t('program.addTraining')}
                                        </Button>
                                    </Group>
                                </Group>
                                <DragDropContext onDragEnd={handleProgramDragEnd}>
                                    <Droppable droppableId="program-days">
                                        {(provided) => (
                                            <Stack gap="xs" ref={provided.innerRef} {...provided.droppableProps}>
                                                {visibleProgramDays.map((day, index) => {
                                                    return (
                                                        <Draggable
                                                            draggableId={day.id}
                                                            index={index}
                                                            key={day.id}
                                                        >
                                                            {(dragProvided) => (
                                                                <Card
                                                                    withBorder
                                                                    padding="md"
                                                                    radius="md"
                                                                    ref={dragProvided.innerRef}
                                                                    {...dragProvided.draggableProps}
                                                                    {...dragProvided.dragHandleProps}
                                                                    onClick={() => handleProgramDayClick(day.id)}
                                                                    style={{
                                                                        backgroundColor: day.id === selectedDayId ? 'var(--mantine-color-violet-1)' : 'var(--mantine-color-white)',
                                                                        borderColor: day.id === selectedDayId ? 'var(--mantine-color-violet-4)' : 'var(--mantine-color-gray-3)',
                                                                        borderWidth: day.id === selectedDayId ? 2 : 1,
                                                                        cursor: 'pointer',
                                                                        transition: 'all 0.2s',
                                                                    }}
                                                                    onMouseEnter={(e) => {
                                                                        if (day.id !== selectedDayId) {
                                                                            e.currentTarget.style.backgroundColor = 'var(--mantine-color-gray-0)'
                                                                            e.currentTarget.style.borderColor = 'var(--mantine-color-violet-3)'
                                                                        }
                                                                    }}
                                                                    onMouseLeave={(e) => {
                                                                        if (day.id !== selectedDayId) {
                                                                            e.currentTarget.style.backgroundColor = 'var(--mantine-color-white)'
                                                                            e.currentTarget.style.borderColor = 'var(--mantine-color-gray-3)'
                                                                        }
                                                                    }}
                                                                >
                                                                    <Group justify="space-between" align="flex-start">
                                                                        <Stack gap={4} style={{ flex: 1 }}>
                                                                            <Group gap="xs">
                                                                                <Badge
                                                                                    variant="light"
                                                                                    color="violet"
                                                                                    size="sm"
                                                                                    style={{ minWidth: '28px', justifyContent: 'center' }}
                                                                                >
                                                                                    {(day.order ?? index) + 1}
                                                                                </Badge>
                                                                                <Text fw={600} size="sm" c={day.id === selectedDayId ? 'violet.7' : 'gray.8'}>
                                                                                    {day.name}
                                                                                </Text>
                                                                            </Group>
                                                                            <Group gap="xs" ml={36}>
                                                                                <Text size="xs" c="dimmed">
                                                                                    {day.blocks.reduce((sum, block) => sum + block.exercises.length, 0)}{' '}
                                                                                    {t('program.exercises')}
                                                                                </Text>
                                                                            </Group>
                                                                        </Stack>
                                                                        <Menu position="right-start">
                                                                            <Menu.Target>
                                                                                <ActionIcon variant="subtle" color="gray">
                                                                                    <IconDotsVertical size={16} />
                                                                                </ActionIcon>
                                                                            </Menu.Target>
                                                                            <Menu.Dropdown>
                                                                                <Menu.Item
                                                                                    leftSection={<IconEdit size={16} />}
                                                                                    onClick={() => {
                                                                                        if (day.id === selectedDayId) {
                                                                                            setProgramRenameDraft(day.name)
                                                                                            openProgramRename()
                                                                                        } else {
                                                                                            dispatch(selectProgramDay(day.id))
                                                                                            setTimeout(() => {
                                                                                                setProgramRenameDraft(day.name)
                                                                                                openProgramRename()
                                                                                            }, 100)
                                                                                        }
                                                                                    }}
                                                                                >
                                                                                    {t('common.edit')}
                                                                                </Menu.Item>
                                                                                <Menu.Item
                                                                                    leftSection={<IconCopy size={16} />}
                                                                                    onClick={async () => {
                                                                                        try {
                                                                                            const blocks: ProgramBlockInput[] = day.blocks.map(block => ({
                                                                                                type: block.type,
                                                                                                title: block.title,
                                                                                                exercises: block.exercises.map(ex => ({
                                                                                                    title: ex.title,
                                                                                                    sets: ex.sets,
                                                                                                    reps: ex.reps,
                                                                                                    duration: ex.duration,
                                                                                                    rest: ex.rest,
                                                                                                    weight: ex.weight,
                                                                                                })),
                                                                                            }))
                                                                                            await dispatch(
                                                                                                createProgramDay({
                                                                                                    name: `${day.name} (копия)`,
                                                                                                    programId: day.programId,
                                                                                                    blocks,
                                                                                                    sourceTemplateId: day.sourceTemplateId,
                                                                                                })
                                                                                            ).unwrap()
                                                                                            // Перезагружаем дни программы после копирования
                                                                                            await dispatch(fetchProgramDays(day.programId))
                                                                                            notifications.show({
                                                                                                title: t('common.success'),
                                                                                                message: t('program.dayDuplicated'),
                                                                                                color: 'green',
                                                                                            })
                                                                                        } catch (error: any) {
                                                                                            notifications.show({
                                                                                                title: t('common.error'),
                                                                                                message: error || t('program.error.duplicateDay'),
                                                                                                color: 'red',
                                                                                            })
                                                                                        }
                                                                                    }}
                                                                                >
                                                                                    {t('common.duplicate')}
                                                                                </Menu.Item>
                                                                                <Menu.Item
                                                                                    leftSection={<IconTrash size={16} />}
                                                                                    color="red"
                                                                                    onClick={async () => {
                                                                                        if (confirm(t('common.delete') + '?')) {
                                                                                            try {
                                                                                                await dispatch(
                                                                                                    deleteProgramDayApi({
                                                                                                        programId: day.programId,
                                                                                                        dayId: day.id,
                                                                                                    })
                                                                                                ).unwrap()
                                                                                                // Перезагружаем дни программы после удаления
                                                                                                await dispatch(fetchProgramDays(day.programId))
                                                                                                notifications.show({
                                                                                                    title: t('common.success'),
                                                                                                    message: t('program.dayDeleted'),
                                                                                                    color: 'green',
                                                                                                })
                                                                                            } catch (error: any) {
                                                                                                notifications.show({
                                                                                                    title: t('common.error'),
                                                                                                    message: error || t('program.error.deleteDay'),
                                                                                                    color: 'red',
                                                                                                })
                                                                                            }
                                                                                        }
                                                                                    }}
                                                                                >
                                                                                    {t('common.delete')}
                                                                                </Menu.Item>
                                                                            </Menu.Dropdown>
                                                                        </Menu>
                                                                    </Group>
                                                                </Card>
                                                            )}
                                                        </Draggable>
                                                    )
                                                })}
                                                {provided.placeholder}
                                            </Stack>
                                        )}
                                    </Droppable>
                                </DragDropContext>
                            </Stack>
                        </Card>
                        <ScrollArea w="100%" h={620}>
                            {selectedDay ? (
                                <Stack gap="xl">
                                    <Group justify="space-between">
                                        <Title order={2}>{selectedDay.name}</Title>
                                        <Group gap="xs">
                                            <Button variant="light" leftSection={<IconCopy size={16} />} onClick={() => handleDuplicateTrainerDay(selectedDay.id)}>
                                                {t('program.copyDay')}
                                            </Button>
                                            <Button variant="light" leftSection={<IconDeviceFloppy size={16} />} onClick={openProgramTemplateModal}>
                                                {t('program.saveAsTemplate')}
                                            </Button>
                                        </Group>
                                    </Group>
                                    <Group gap="lg" wrap="wrap" align="flex-start">
                                        {selectedDay.blocks.map((block) => {
                                                const getBlockConfig = () => {
                                                    switch (block.type) {
                                                        case 'warmup':
                                                            return {
                                                                icon: <IconStretching size={24} />,
                                                                color: 'blue',
                                                                gradient: { from: 'blue.1', to: 'blue.0' },
                                                                borderColor: 'blue.3',
                                                            }
                                                        case 'main':
                                                            return {
                                                                icon: <IconFlame size={24} />,
                                                                color: 'violet',
                                                                gradient: { from: 'violet.1', to: 'violet.0' },
                                                                borderColor: 'violet.3',
                                                            }
                                                        case 'cooldown':
                                                            return {
                                                                icon: <IconStretching size={24} />,
                                                                color: 'green',
                                                                gradient: { from: 'green.1', to: 'green.0' },
                                                                borderColor: 'green.3',
                                                            }
                                                        default:
                                                            return {
                                                                icon: <IconBarbell size={24} />,
                                                                color: 'gray',
                                                                gradient: { from: 'gray.1', to: 'gray.0' },
                                                                borderColor: 'gray.3',
                                                            }
                                                    }
                                                }
                                                const config = getBlockConfig()

                                                return (
                                                    <Card
                                                        key={block.id}
                                                        withBorder
                                                        padding="lg"
                                                        style={{
                                                            borderColor: `var(--mantine-color-${config.borderColor})`,
                                                            backgroundColor: `var(--mantine-color-${config.gradient.to})`,
                                                            minWidth: 280,
                                                            maxWidth: 320,
                                                            width: '100%',
                                                            flex: '1 1 280px',
                                                        }}
                                                    >
                                                        <Stack gap="md">
                                                            <Group justify="space-between" mb="xs">
                                                                <Group gap="sm">
                                                                    <div
                                                                        style={{
                                                                            padding: '8px',
                                                                            borderRadius: '8px',
                                                                            backgroundColor: `var(--mantine-color-${config.color}-1)`,
                                                                            display: 'flex',
                                                                            alignItems: 'center',
                                                                            justifyContent: 'center',
                                                                        }}
                                                                    >
                                                                        {config.icon}
                                                                    </div>
                                                                    <Text fw={700} size="lg" c={`${config.color}.7`}>
                                                                        {t(`program.sections.${block.type}`)}
                                                                    </Text>
                                                                </Group>
                                                                <Badge variant="light" color={config.color} size="lg" style={{ fontWeight: 600 }}>
                                                                    {block.exercises.length}
                                                                </Badge>
                                                            </Group>
                                                            <Stack gap="sm">
                                                                {block.exercises.map((exercise, index) => (
                                                                    <Card
                                                                        key={exercise.id}
                                                                        padding="md"
                                                                        withBorder
                                                                        style={{
                                                                            backgroundColor: 'var(--mantine-color-white)',
                                                                            borderColor: `var(--mantine-color-${config.color}-2)`,
                                                                            transition: 'all 0.2s',
                                                                        }}
                                                                        onMouseEnter={(e) => {
                                                                            e.currentTarget.style.transform = 'translateY(-2px)'
                                                                            e.currentTarget.style.boxShadow = 'var(--mantine-shadow-sm)'
                                                                        }}
                                                                        onMouseLeave={(e) => {
                                                                            e.currentTarget.style.transform = 'translateY(0)'
                                                                            e.currentTarget.style.boxShadow = 'none'
                                                                        }}
                                                                    >
                                                                        <Group justify="space-between" align="flex-start">
                                                                            <Stack gap="xs" style={{ flex: 1 }}>
                                                                                <Group gap="xs">
                                                                                    <Badge
                                                                                        variant="light"
                                                                                        color={config.color}
                                                                                        size="sm"
                                                                                        style={{ minWidth: '24px', justifyContent: 'center' }}
                                                                                    >
                                                                                        {index + 1}
                                                                                    </Badge>
                                                                                    <Text fw={600} size="sm">
                                                                                        {exercise.title}
                                                                                    </Text>
                                                                                </Group>
                                                                                <Group gap="md" wrap="wrap">
                                                                                    {exercise.sets && (
                                                                                        <Group gap={4}>
                                                                                            <IconRepeat size={14} color="var(--mantine-color-gray-6)" />
                                                                                            <Text size="xs" c="dimmed">
                                                                                                {exercise.sets} {t('program.sets')}
                                                                                            </Text>
                                                                                        </Group>
                                                                                    )}
                                                                                    {exercise.reps && (
                                                                                        <Group gap={4}>
                                                                                            <IconBarbell size={14} color="var(--mantine-color-gray-6)" />
                                                                                            <Text size="xs" c="dimmed">
                                                                                                {exercise.reps} {t('program.reps')}
                                                                                            </Text>
                                                                                        </Group>
                                                                                    )}
                                                                                    {exercise.duration && (
                                                                                        <Group gap={4}>
                                                                                            <IconClock size={14} color="var(--mantine-color-gray-6)" />
                                                                                            <Text size="xs" c="dimmed">
                                                                                                {exercise.duration}
                                                                                            </Text>
                                                                                        </Group>
                                                                                    )}
                                                                                    {exercise.rest && (
                                                                                        <Group gap={4}>
                                                                                            <IconClock size={14} color="var(--mantine-color-gray-6)" />
                                                                                            <Text size="xs" c="dimmed">
                                                                                                {exercise.rest}
                                                                                            </Text>
                                                                                        </Group>
                                                                                    )}
                                                                                    {exercise.weight && (
                                                                                        <Badge variant="light" color={config.color} size="sm">
                                                                                            {exercise.weight}
                                                                                        </Badge>
                                                                                    )}
                                                                                </Group>
                                                                            </Stack>
                                                                            <Group gap="xs">
                                                                                <ActionIcon
                                                                                    variant="subtle"
                                                                                    size="sm"
                                                                                    color={config.color}
                                                                                    onClick={() => handleEditProgramExercise(exercise, block.id)}
                                                                                >
                                                                                    <IconEdit size={14} />
                                                                                </ActionIcon>
                                                                                <ActionIcon
                                                                                    variant="subtle"
                                                                                    size="sm"
                                                                                    color="red"
                                                                                    onClick={() => handleDeleteProgramExercise(exercise.id, block.id)}
                                                                                >
                                                                                    <IconTrash size={14} />
                                                                                </ActionIcon>
                                                                            </Group>
                                                                        </Group>
                                                                    </Card>
                                                                ))}
                                                                {block.exercises.length === 0 ? (
                                                                    <Card
                                                                        padding="xl"
                                                                        style={{
                                                                            backgroundColor: 'var(--mantine-color-gray-0)',
                                                                            borderStyle: 'dashed',
                                                                            borderColor: `var(--mantine-color-${config.color}-3)`,
                                                                        }}
                                                                    >
                                                                        <Stack align="center" gap="xs">
                                                                            <Text c="dimmed" size="sm" ta="center">
                                                                                {t('program.noExercises')}
                                                                            </Text>
                                                                        </Stack>
                                                                    </Card>
                                                                ) : null}
                                                            </Stack>
                                                            <Group mt="sm" gap="xs">
                                                                <Button
                                                                    variant="light"
                                                                    color={config.color}
                                                                    leftSection={<IconPlus size={16} />}
                                                                    onClick={() => handleAddProgramExercise(block.id)}
                                                                    fullWidth
                                                                >
                                                                    {t('program.addExercise')}
                                                                </Button>
                                                                <Button
                                                                    variant="outline"
                                                                    color={config.color}
                                                                    leftSection={<IconBooks size={16} />}
                                                                    onClick={() => handleOpenProgramExerciseLibrary(block.id)}
                                                                    fullWidth
                                                                >
                                                                    {t('program.addFromLibrary')}
                                                                </Button>
                                                            </Group>
                                                        </Stack>
                                                    </Card>
                                                )
                                            })}
                                        </Group>
                                </Stack>
                            ) : (
                                <Card withBorder>
                                    <Stack gap="sm" align="center">
                                        <Title order={3}>{t('program.emptyState')}</Title>
                                        <Button leftSection={<IconPlus size={16} />} onClick={handleAddTrainerDay}>
                                            {t('program.addDay')}
                                        </Button>
                                    </Stack>
                                </Card>
                            )}
                        </ScrollArea>
                    </Group>
                </Tabs.Panel>
            </Tabs>

            <Modal
                opened={viewWorkoutModalOpened}
                onClose={closeViewWorkoutModal}
                title={viewingWorkout?.name || t('trainer.library.workoutDetails')}
                size="xl"
                styles={{
                    body: { maxHeight: '85vh', overflowY: 'auto', paddingBottom: 'var(--mantine-spacing-xl)' },
                }}
            >
                {viewingWorkout && (
                    <Stack gap="lg">
                        <Group justify="space-between">
                            <Group gap="md">
                                <Badge size="lg" variant="light">
                                    {viewingWorkout.duration} {t('program.minutes')}
                                </Badge>
                                <Badge size="lg" variant="light" color="blue">
                                    {viewingWorkout.level === 'beginner'
                                        ? t('trainer.library.levelBeginner')
                                        : viewingWorkout.level === 'intermediate'
                                        ? t('trainer.library.levelIntermediate')
                                        : t('trainer.library.levelAdvanced')}
                                </Badge>
                                <Badge size="lg" variant="light" color="violet">
                                    {viewingWorkout.goal === 'weight_loss'
                                        ? t('trainer.library.goalWeightLoss')
                                        : viewingWorkout.goal === 'muscle_gain'
                                        ? t('trainer.library.goalMuscleGain')
                                        : viewingWorkout.goal === 'endurance'
                                        ? t('trainer.library.goalEndurance')
                                        : viewingWorkout.goal === 'flexibility'
                                        ? t('trainer.library.goalFlexibility')
                                        : t('trainer.library.goalGeneral')}
                                </Badge>
                            </Group>
                            <Group gap="xs">
                                <Button 
                                    variant="light" 
                                    leftSection={<IconEdit size={16} />}
                                    onClick={() => {
                                        closeViewWorkoutModal()
                                        handleEditWorkout(viewingWorkout)
                                    }}
                                >
                                    {t('trainer.library.edit')}
                                </Button>
                            </Group>
                        </Group>

                        {viewingWorkout.description && (
                            <Card withBorder padding="md">
                                <Stack gap="xs">
                                    <Text fw={600} size="sm" c="dimmed" tt="uppercase">
                                        {t('trainer.library.workoutForm.description')}
                                    </Text>
                                    <Text>{viewingWorkout.description}</Text>
                                </Stack>
                            </Card>
                        )}

                        <SimpleGrid cols={{ base: 1, md: 3 }} spacing="md">
                            <Card withBorder padding="md">
                                <Stack gap="md">
                                    <Text fw={700} size="lg" c="blue.7">
                                        {t('program.sections.warmup')}
                                    </Text>
                                    <Badge variant="light" color="blue" size="lg">
                                        {viewingWorkout.warmup.length} {t('program.exercises')}
                                    </Badge>
                                    <Stack gap="xs">
                                        {viewingWorkout.warmup.length === 0 ? (
                                            <Text size="sm" c="dimmed">
                                                {t('program.noExercises')}
                                            </Text>
                                        ) : (
                                            viewingWorkout.warmup.map((ex, idx) => {
                                                const exercise = exercises.find((e) => e.id === ex.exerciseId)
                                                return (
                                                    <Card key={idx} padding="xs" withBorder style={{ backgroundColor: 'var(--mantine-color-blue-0)' }}>
                                                        <Group gap="xs">
                                                            <Badge variant="light" color="blue" size="sm">
                                                                {idx + 1}
                                                            </Badge>
                                                            <Text size="sm" fw={500}>
                                                                {exercise?.name || ex.exerciseId}
                                                            </Text>
                                                        </Group>
                                                        {(ex.sets || ex.reps || ex.duration || ex.rest) && (
                                                            <Text size="xs" c="dimmed" mt={4} ml={28}>
                                                                {ex.sets && `${ex.sets} ${t('program.sets')}`}
                                                                {ex.reps && ` × ${ex.reps} ${t('program.reps')}`}
                                                                {ex.duration && ` × ${ex.duration} мин`}
                                                                {ex.rest && ` · ${ex.rest}`}
                                                            </Text>
                                                        )}
                                                    </Card>
                                                )
                                            })
                                        )}
                                    </Stack>
                                </Stack>
                            </Card>

                            <Card withBorder padding="md">
                                <Stack gap="md">
                                    <Text fw={700} size="lg" c="violet.7">
                                        {t('program.sections.main')}
                                    </Text>
                                    <Badge variant="light" color="violet" size="lg">
                                        {viewingWorkout.main.length} {t('program.exercises')}
                                    </Badge>
                                    <Stack gap="xs">
                                        {viewingWorkout.main.length === 0 ? (
                                            <Text size="sm" c="dimmed">
                                                {t('program.noExercises')}
                                            </Text>
                                        ) : (
                                            viewingWorkout.main.map((ex, idx) => {
                                                const exercise = exercises.find((e) => e.id === ex.exerciseId)
                                                return (
                                                    <Card key={idx} padding="xs" withBorder style={{ backgroundColor: 'var(--mantine-color-violet-0)' }}>
                                                        <Group gap="xs">
                                                            <Badge variant="light" color="violet" size="sm">
                                                                {idx + 1}
                                                            </Badge>
                                                            <Text size="sm" fw={500}>
                                                                {exercise?.name || ex.exerciseId}
                                                            </Text>
                                                        </Group>
                                                        {(ex.sets || ex.reps || ex.duration || ex.weight || ex.rest) && (
                                                            <Text size="xs" c="dimmed" mt={4} ml={28}>
                                                                {ex.sets && `${ex.sets} ${t('program.sets')}`}
                                                                {ex.reps && ` × ${ex.reps} ${t('program.reps')}`}
                                                                {ex.duration && ` × ${ex.duration} мин`}
                                                                {ex.weight && ` · ${ex.weight} кг`}
                                                                {ex.rest && ` · ${ex.rest}`}
                                                            </Text>
                                                        )}
                                                    </Card>
                                                )
                                            })
                                        )}
                                    </Stack>
                                </Stack>
                            </Card>

                            <Card withBorder padding="md">
                                <Stack gap="md">
                                    <Text fw={700} size="lg" c="green.7">
                                        {t('program.sections.cooldown')}
                                    </Text>
                                    <Badge variant="light" color="green" size="lg">
                                        {viewingWorkout.cooldown.length} {t('program.exercises')}
                                    </Badge>
                                    <Stack gap="xs">
                                        {viewingWorkout.cooldown.length === 0 ? (
                                            <Text size="sm" c="dimmed">
                                                {t('program.noExercises')}
                                            </Text>
                                        ) : (
                                            viewingWorkout.cooldown.map((ex, idx) => {
                                                const exercise = exercises.find((e) => e.id === ex.exerciseId)
                                                return (
                                                    <Card key={idx} padding="xs" withBorder style={{ backgroundColor: 'var(--mantine-color-green-0)' }}>
                                                        <Group gap="xs">
                                                            <Badge variant="light" color="green" size="sm">
                                                                {idx + 1}
                                                            </Badge>
                                                            <Text size="sm" fw={500}>
                                                                {exercise?.name || ex.exerciseId}
                                                            </Text>
                                                        </Group>
                                                        {(ex.sets || ex.reps || ex.duration || ex.rest) && (
                                                            <Text size="xs" c="dimmed" mt={4} ml={28}>
                                                                {ex.sets && `${ex.sets} ${t('program.sets')}`}
                                                                {ex.reps && ` × ${ex.reps} ${t('program.reps')}`}
                                                                {ex.duration && ` × ${ex.duration} мин`}
                                                                {ex.rest && ` · ${ex.rest}`}
                                                            </Text>
                                                        )}
                                                    </Card>
                                                )
                                            })
                                        )}
                                    </Stack>
                                </Stack>
                            </Card>
                        </SimpleGrid>

                        <Group justify="flex-end">
                            <Button variant="subtle" onClick={closeViewWorkoutModal}>
                                {t('common.close')}
                            </Button>
                            <Button 
                                leftSection={<IconEdit size={16} />}
                                onClick={() => {
                                    closeViewWorkoutModal()
                                    handleEditWorkout(viewingWorkout)
                                }}
                            >
                                {t('trainer.library.edit')}
                            </Button>
                        </Group>
                    </Stack>
                )}
            </Modal>

            <Modal
                opened={workoutModalOpened}
                onClose={closeWorkoutModal}
                title={editingWorkout ? t('trainer.library.editWorkout') : t('trainer.library.createWorkout')}
                size="xl"
                styles={{
                    body: { maxHeight: '85vh', overflowY: 'auto', paddingBottom: 'calc(var(--mantine-spacing-xl) * 2)' },
                }}
            >
                <form onSubmit={workoutForm.onSubmit(handleSaveWorkout)}>
                    <Stack gap="md" style={{ paddingBottom: 'var(--mantine-spacing-md)' }}>
                        <TextInput label={t('trainer.library.workoutForm.name')} required {...workoutForm.getInputProps('name')} />
                        <Group grow>
                            <NumberInput
                                label={t('trainer.library.workoutForm.duration')}
                                required
                                min={1}
                                {...workoutForm.getInputProps('duration')}
                            />
                            <Select
                                label={t('trainer.library.workoutForm.level')}
                                data={[
                                    { value: 'beginner', label: t('trainer.library.levelBeginner') },
                                    { value: 'intermediate', label: t('trainer.library.levelIntermediate') },
                                    { value: 'advanced', label: t('trainer.library.levelAdvanced') },
                                ]}
                                required
                                {...workoutForm.getInputProps('level')}
                            />
                            <Select
                                label={t('trainer.library.workoutForm.goal')}
                                data={[
                                    { value: 'weight_loss', label: t('trainer.library.goalWeightLoss') },
                                    { value: 'muscle_gain', label: t('trainer.library.goalMuscleGain') },
                                    { value: 'endurance', label: t('trainer.library.goalEndurance') },
                                    { value: 'flexibility', label: t('trainer.library.goalFlexibility') },
                                    { value: 'general', label: t('trainer.library.goalGeneral') },
                                ]}
                                required
                                {...workoutForm.getInputProps('goal')}
                            />
                        </Group>
                        <Textarea label={t('trainer.library.workoutForm.description')} {...workoutForm.getInputProps('description')} />
                        
                        <Divider label={t('trainer.library.workoutForm.warmup')} labelPosition="left" />
                        <Stack gap="xs">
                            {workoutForm.values.warmup.map((ex, index) => {
                                const exercise = exercises.find((e) => e.id === ex.exerciseId)
                                return (
                                    <Card 
                                        key={index} 
                                        padding="sm" 
                                        withBorder
                                        style={{ cursor: 'pointer' }}
                                        onClick={() => {
                                            setCurrentBlockType('warmup')
                                            setEditingWorkoutExercise({ blockType: 'warmup', index })
                                            workoutExerciseForm.setValues({
                                                exerciseId: ex.exerciseId,
                                                sets: ex.sets,
                                                reps: ex.reps,
                                                duration: ex.duration,
                                                rest: ex.rest,
                                                weight: ex.weight,
                                                notes: ex.notes || '',
                                            })
                                            openAddExerciseModal()
                                        }}
                                    >
                                        <Group justify="space-between">
                                            <Text fw={500}>{exercise?.name || ex.exerciseId}</Text>
                                            <ActionIcon
                                                color="red"
                                                variant="subtle"
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    const newWarmup = workoutForm.values.warmup.filter((_, i) => i !== index)
                                                    workoutForm.setFieldValue('warmup', newWarmup)
                                                }}
                                            >
                                                <IconTrash size={16} />
                                            </ActionIcon>
                                        </Group>
                                        {(ex.sets || ex.reps || ex.duration || ex.rest) && (
                                            <Text size="xs" c="dimmed" mt={4}>
                                                {ex.sets && `${ex.sets} ${t('program.sets')}`}
                                                {ex.reps && ` × ${ex.reps} ${t('program.reps')}`}
                                                {ex.duration && ` × ${ex.duration} мин`}
                                                {ex.rest && ` · отдых ${ex.rest} сек`}
                                            </Text>
                                        )}
                                    </Card>
                                )
                            })}
                            <Button
                                variant="light"
                                leftSection={<IconPlus size={16} />}
                                onClick={() => {
                                    setCurrentBlockType('warmup')
                                    setEditingWorkoutExercise(null)
                                    workoutExerciseForm.reset()
                                    openAddExerciseModal()
                                }}
                            >
                                {t('trainer.library.workoutForm.addExercise')}
                            </Button>
                        </Stack>

                        <Divider label={t('trainer.library.workoutForm.main')} labelPosition="left" />
                        <Stack gap="xs">
                            {workoutForm.values.main.map((ex, index) => {
                                const exercise = exercises.find((e) => e.id === ex.exerciseId)
                                return (
                                    <Card 
                                        key={index} 
                                        padding="sm" 
                                        withBorder
                                        style={{ cursor: 'pointer' }}
                                        onClick={() => {
                                            setCurrentBlockType('main')
                                            setEditingWorkoutExercise({ blockType: 'main', index })
                                            workoutExerciseForm.setValues({
                                                exerciseId: ex.exerciseId,
                                                sets: ex.sets,
                                                reps: ex.reps,
                                                duration: ex.duration,
                                                rest: ex.rest,
                                                weight: ex.weight,
                                                notes: ex.notes || '',
                                            })
                                            openAddExerciseModal()
                                        }}
                                    >
                                        <Group justify="space-between">
                                            <Text fw={500}>{exercise?.name || ex.exerciseId}</Text>
                                            <ActionIcon
                                                color="red"
                                                variant="subtle"
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    const newMain = workoutForm.values.main.filter((_, i) => i !== index)
                                                    workoutForm.setFieldValue('main', newMain)
                                                }}
                                            >
                                                <IconTrash size={16} />
                                            </ActionIcon>
                                        </Group>
                                        {(ex.sets || ex.reps || ex.duration || ex.weight || ex.rest) && (
                                            <Text size="xs" c="dimmed" mt={4}>
                                                {ex.sets && `${ex.sets} ${t('program.sets')}`}
                                                {ex.reps && ` × ${ex.reps} ${t('program.reps')}`}
                                                {ex.duration && ` × ${ex.duration} мин`}
                                                {ex.weight && ` · ${ex.weight} кг`}
                                                {ex.rest && ` · отдых ${ex.rest} сек`}
                                            </Text>
                                        )}
                                    </Card>
                                )
                            })}
                            <Button
                                variant="light"
                                leftSection={<IconPlus size={16} />}
                                onClick={() => {
                                    setCurrentBlockType('main')
                                    setEditingWorkoutExercise(null)
                                    workoutExerciseForm.reset()
                                    openAddExerciseModal()
                                }}
                            >
                                {t('trainer.library.workoutForm.addExercise')}
                            </Button>
                        </Stack>

                        <Divider label={t('trainer.library.workoutForm.cooldown')} labelPosition="left" />
                        <Stack gap="xs">
                            {workoutForm.values.cooldown.map((ex, index) => {
                                const exercise = exercises.find((e) => e.id === ex.exerciseId)
                                return (
                                    <Card 
                                        key={index} 
                                        padding="sm" 
                                        withBorder
                                        style={{ cursor: 'pointer' }}
                                        onClick={() => {
                                            setCurrentBlockType('cooldown')
                                            setEditingWorkoutExercise({ blockType: 'cooldown', index })
                                            workoutExerciseForm.setValues({
                                                exerciseId: ex.exerciseId,
                                                sets: ex.sets,
                                                reps: ex.reps,
                                                duration: ex.duration,
                                                rest: ex.rest,
                                                weight: ex.weight,
                                                notes: ex.notes || '',
                                            })
                                            openAddExerciseModal()
                                        }}
                                    >
                                        <Group justify="space-between">
                                            <Text fw={500}>{exercise?.name || ex.exerciseId}</Text>
                                            <ActionIcon
                                                color="red"
                                                variant="subtle"
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    const newCooldown = workoutForm.values.cooldown.filter((_, i) => i !== index)
                                                    workoutForm.setFieldValue('cooldown', newCooldown)
                                                }}
                                            >
                                                <IconTrash size={16} />
                                            </ActionIcon>
                                        </Group>
                                        {(ex.sets || ex.reps || ex.duration || ex.rest) && (
                                            <Text size="xs" c="dimmed" mt={4}>
                                                {ex.sets && `${ex.sets} ${t('program.sets')}`}
                                                {ex.reps && ` × ${ex.reps} ${t('program.reps')}`}
                                                {ex.duration && ` × ${ex.duration} мин`}
                                                {ex.rest && ` · отдых ${ex.rest} сек`}
                                            </Text>
                                        )}
                                    </Card>
                                )
                            })}
                            <Button
                                variant="light"
                                leftSection={<IconPlus size={16} />}
                                onClick={() => {
                                    setCurrentBlockType('cooldown')
                                    setEditingWorkoutExercise(null)
                                    workoutExerciseForm.reset()
                                    openAddExerciseModal()
                                }}
                            >
                                {t('trainer.library.workoutForm.addExercise')}
                            </Button>
                        </Stack>

                        <Group justify="flex-end" mt="xl" mb="md">
                            <Button variant="subtle" onClick={closeWorkoutModal}>
                                {t('common.cancel')}
                            </Button>
                            <Button type="submit">{t('common.save')}</Button>
                        </Group>
                    </Stack>
                </form>
            </Modal>

            <Modal
                opened={exerciseModalOpened}
                onClose={closeExerciseModal}
                title={editingExercise ? t('trainer.library.editExercise') : t('trainer.library.createExercise')}
                size="xl"
                styles={{
                    body: { maxHeight: '85vh', overflowY: 'auto', paddingBottom: 'calc(var(--mantine-spacing-xl) * 2)' },
                }}
            >
                <form onSubmit={exerciseForm.onSubmit(handleSaveExercise)}>
                    <Stack gap="lg" style={{ paddingBottom: 'var(--mantine-spacing-md)' }}>
                        <Group grow>
                            <TextInput 
                                label={t('trainer.library.exerciseForm.name')} 
                                required 
                                {...exerciseForm.getInputProps('name')} 
                            />
                            <Select
                                label={t('trainer.library.exerciseForm.muscleGroup')}
                                data={[
                                    { value: 'chest', label: t('trainer.library.muscleChest') },
                                    { value: 'back', label: t('trainer.library.muscleBack') },
                                    { value: 'shoulders', label: t('trainer.library.muscleShoulders') },
                                    { value: 'arms', label: t('trainer.library.muscleArms') },
                                    { value: 'legs', label: t('trainer.library.muscleLegs') },
                                    { value: 'core', label: t('trainer.library.muscleCore') },
                                    { value: 'cardio', label: t('trainer.library.muscleCardio') },
                                    { value: 'full_body', label: t('trainer.library.muscleFullBody') },
                                ]}
                                required
                                {...exerciseForm.getInputProps('muscleGroup')}
                            />
                        </Group>
                        
                        <Textarea 
                            label={t('trainer.library.exerciseForm.description')} 
                            minRows={3}
                            {...exerciseForm.getInputProps('description')} 
                        />

                        <Divider label={t('trainer.library.exerciseForm.visibility')} labelPosition="left" />

                        <Radio.Group
                            value={exerciseForm.values.visibility}
                            onChange={(value) => {
                                exerciseForm.setFieldValue('visibility', value as 'all' | 'client' | 'trainer')
                                if (value !== 'client') {
                                    exerciseForm.setFieldValue('clientId', undefined)
                                }
                            }}
                        >
                            <Stack gap="xs">
                                <Radio 
                                    value="trainer" 
                                    label={t('trainer.library.exerciseForm.visibilityTrainer')}
                                    description={t('trainer.library.exerciseForm.visibilityTrainerDescription')}
                                />
                                <Radio 
                                    value="all" 
                                    label={t('trainer.library.exerciseForm.visibilityAll')}
                                    description={t('trainer.library.exerciseForm.visibilityAllDescription')}
                                />
                                <Radio 
                                    value="client" 
                                    label={t('trainer.library.exerciseForm.visibilityClient')}
                                    description={t('trainer.library.exerciseForm.visibilityClientDescription')}
                                />
                            </Stack>
                        </Radio.Group>

                        {exerciseForm.values.visibility === 'client' && (
                            <Select
                                label={t('trainer.library.exerciseForm.selectClient')}
                                placeholder={t('trainer.library.exerciseForm.selectClientPlaceholder')}
                                data={clients.map((client) => ({ value: client.id, label: client.fullName }))}
                                required
                                {...exerciseForm.getInputProps('clientId')}
                            />
                        )}

                        <Divider label={t('trainer.library.exerciseForm.startingPosition')} labelPosition="left" />
                        
                        <Textarea 
                            label={t('trainer.library.exerciseForm.startingPosition')}
                            placeholder={t('trainer.library.exerciseForm.startingPositionPlaceholder')}
                            minRows={4}
                            {...exerciseForm.getInputProps('startingPosition')} 
                        />

                        <Textarea 
                            label={t('trainer.library.exerciseForm.executionInstructions')}
                            placeholder={t('trainer.library.exerciseForm.executionInstructionsPlaceholder')}
                            minRows={6}
                            required
                            {...exerciseForm.getInputProps('executionInstructions')} 
                        />

                        <Divider label={t('trainer.library.exerciseForm.video')} labelPosition="left" />

                        <TextInput 
                            label={t('trainer.library.exerciseForm.videoUrl')}
                            placeholder={t('trainer.library.exerciseForm.videoUrlPlaceholder')}
                            leftSection={<IconVideo size={16} />}
                            {...exerciseForm.getInputProps('videoUrl')} 
                        />

                        {exerciseForm.values.videoUrl && exerciseForm.values.videoUrl.trim() && (
                            <Card withBorder padding="md" style={{ backgroundColor: 'var(--mantine-color-gray-0)' }}>
                                <Stack gap="sm">
                                    <Group justify="space-between">
                                        <Text size="sm" fw={500}>
                                            {t('trainer.library.exerciseForm.videoPreview')}
                                        </Text>
                                        <Anchor 
                                            href={exerciseForm.values.videoUrl} 
                                            target="_blank" 
                                            size="xs"
                                            style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                                        >
                                            <IconExternalLink size={14} />
                                            {t('trainer.library.exerciseForm.openInNewTab')}
                                        </Anchor>
                                    </Group>
                                    <div style={{ 
                                        position: 'relative', 
                                        paddingBottom: '56.25%', 
                                        height: 0, 
                                        overflow: 'hidden',
                                        borderRadius: '8px',
                                        backgroundColor: 'var(--mantine-color-gray-2)',
                                        border: '1px solid var(--mantine-color-gray-3)',
                                        minHeight: '300px',
                                    }}>
                                        {(() => {
                                            const url = exerciseForm.values.videoUrl.trim()
                                            if (!url) return null
                                            
                                            const getYouTubeVideoId = (url: string): string | null => {
                                                const patterns = [
                                                    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/,
                                                    /youtube\.com\/embed\/([^&\n?#]+)/,
                                                    /youtube\.com\/v\/([^&\n?#]+)/,
                                                ]
                                                
                                                for (const pattern of patterns) {
                                                    const match = url.match(pattern)
                                                    if (match && match[1]) {
                                                        return match[1]
                                                    }
                                                }
                                                return null
                                            }
                                            
                                            const getVimeoVideoId = (url: string): string | null => {
                                                const patterns = [
                                                    /vimeo\.com\/(\d+)/,
                                                    /vimeo\.com\/video\/(\d+)/,
                                                ]
                                                
                                                for (const pattern of patterns) {
                                                    const match = url.match(pattern)
                                                    if (match && match[1]) {
                                                        return match[1]
                                                    }
                                                }
                                                return null
                                            }
                                            
                                            const getRutubeVideoId = (url: string): string | null => {
                                                const patterns = [
                                                    /rutube\.ru\/video\/([^\/\?\n]+)/,
                                                    /rutube\.ru\/play\/embed\/([^\/\?\n]+)/,
                                                    /rutube\.ru\/video\/embed\/([^\/\?\n]+)/,
                                                ]
                                                
                                                for (const pattern of patterns) {
                                                    const match = url.match(pattern)
                                                    if (match && match[1]) {
                                                        return match[1]
                                                    }
                                                }
                                                return null
                                            }
                                            
                                            const youtubeVideoId = getYouTubeVideoId(url)
                                            if (youtubeVideoId) {
                                                return (
                                                    <iframe
                                                        key={`youtube-${youtubeVideoId}-${url}`}
                                                        src={`https://www.youtube.com/embed/${youtubeVideoId}?enablejsapi=1&rel=0`}
                                                        title="Video player"
                                                        style={{
                                                            position: 'absolute',
                                                            top: 0,
                                                            left: 0,
                                                            width: '100%',
                                                            height: '100%',
                                                            border: 'none',
                                                        }}
                                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                                        allowFullScreen
                                                        loading="eager"
                                                    />
                                                )
                                            }
                                            
                                            const vimeoVideoId = getVimeoVideoId(url)
                                            if (vimeoVideoId) {
                                                return (
                                                    <iframe
                                                        key={`vimeo-${vimeoVideoId}-${url}`}
                                                        src={`https://player.vimeo.com/video/${vimeoVideoId}?autoplay=0&title=0&byline=0&portrait=0`}
                                                        title="Video player"
                                                        style={{
                                                            position: 'absolute',
                                                            top: 0,
                                                            left: 0,
                                                            width: '100%',
                                                            height: '100%',
                                                            border: 'none',
                                                        }}
                                                        allow="autoplay; fullscreen; picture-in-picture"
                                                        allowFullScreen
                                                        loading="eager"
                                                    />
                                                )
                                            }
                                            
                                            const rutubeVideoId = getRutubeVideoId(url)
                                            if (rutubeVideoId) {
                                                return (
                                                    <iframe
                                                        key={`rutube-${rutubeVideoId}-${url}`}
                                                        src={`https://rutube.ru/play/embed/${rutubeVideoId}`}
                                                        title="Video player"
                                                        style={{
                                                            position: 'absolute',
                                                            top: 0,
                                                            left: 0,
                                                            width: '100%',
                                                            height: '100%',
                                                            border: 'none',
                                                        }}
                                                        allow="autoplay; fullscreen"
                                                        allowFullScreen
                                                        loading="eager"
                                                    />
                                                )
                                            }
                                            
                                            // Проверяем, является ли URL прямой ссылкой на изображение (включая GIF)
                                            const isImageUrl = /\.(gif|jpg|jpeg|png|webp|svg|bmp|ico)(\?.*)?$/i.test(url)
                                            if (isImageUrl) {
                                                return (
                                                    <img
                                                        key={`direct-image-${url}`}
                                                        src={url}
                                                        alt="Exercise preview"
                                                        style={{
                                                            position: 'absolute',
                                                            top: 0,
                                                            left: 0,
                                                            width: '100%',
                                                            height: '100%',
                                                            objectFit: 'contain',
                                                            cursor: 'pointer',
                                                        }}
                                                        onClick={() => window.open(url, '_blank')}
                                                        onError={(e) => {
                                                            // Если изображение не загрузилось, показываем fallback
                                                            const target = e.target as HTMLImageElement
                                                            target.style.display = 'none'
                                                        }}
                                                    />
                                                )
                                            }
                                            
                                            // Проверяем, является ли URL прямой ссылкой на видео файл
                                            const isDirectVideoUrl = /\.(mp4|webm|ogg|mov|avi|wmv|flv|mkv|m4v|3gp)(\?.*)?$/i.test(url)
                                            if (isDirectVideoUrl) {
                                                return (
                                                    <video
                                                        key={`direct-video-${url}`}
                                                        src={url}
                                                        controls
                                                        style={{
                                                            position: 'absolute',
                                                            top: 0,
                                                            left: 0,
                                                            width: '100%',
                                                            height: '100%',
                                                            objectFit: 'contain',
                                                        }}
                                                        preload="metadata"
                                                    >
                                                        Ваш браузер не поддерживает воспроизведение видео.
                                                        <a href={url} target="_blank" rel="noopener noreferrer">
                                                            Открыть видео в новой вкладке
                                                        </a>
                                                    </video>
                                                )
                                            }
                                            
                                            return (
                                                <div style={{
                                                    position: 'absolute',
                                                    top: 0,
                                                    left: 0,
                                                    width: '100%',
                                                    height: '100%',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    flexDirection: 'column',
                                                    gap: '12px',
                                                    padding: '20px',
                                                }}>
                                                    <IconPlayerPlay size={48} color="var(--mantine-color-gray-6)" />
                                                    <Text size="sm" c="dimmed" ta="center">
                                                        {t('trainer.library.exerciseForm.videoPreview')}
                                                    </Text>
                                                    <Text size="xs" c="dimmed" ta="center">
                                                        {t('trainer.library.exerciseForm.videoUnsupported')}
                                                    </Text>
                                                    <Button 
                                                        component="a"
                                                        href={url} 
                                                        target="_blank"
                                                        variant="light"
                                                        size="sm"
                                                        leftSection={<IconExternalLink size={16} />}
                                                    >
                                                        {t('trainer.library.exerciseForm.openVideo')}
                                                    </Button>
                                                </div>
                                            )
                                        })()}
                                    </div>
                                </Stack>
                            </Card>
                        )}

                        <Divider label={t('trainer.library.exerciseForm.notes')} labelPosition="left" />

                        <Textarea 
                            label={t('trainer.library.exerciseForm.notes')}
                            placeholder={t('trainer.library.exerciseForm.notesPlaceholder')}
                            minRows={4}
                            {...exerciseForm.getInputProps('notes')} 
                        />

                        <Group justify="flex-end" mt="xl" mb="md">
                            <Button variant="subtle" onClick={closeExerciseModal}>
                                {t('common.cancel')}
                            </Button>
                            <Button type="submit">{t('common.save')}</Button>
                        </Group>
                    </Stack>
                </form>
            </Modal>

            <Modal
                opened={viewExerciseModalOpened}
                onClose={closeViewExerciseModal}
                title={viewingExercise?.name || t('trainer.library.exerciseDetails')}
                size="xl"
                styles={{
                    body: { maxHeight: '85vh', overflowY: 'auto', paddingBottom: 'var(--mantine-spacing-xl)' },
                }}
            >
                {viewingExercise && (
                    <Stack gap="lg">
                        <Group justify="space-between">
                            <Group gap="md">
                                <Badge size="lg" variant="light">
                                    {viewingExercise.muscleGroup === 'chest'
                                        ? t('trainer.library.muscleChest')
                                        : viewingExercise.muscleGroup === 'back'
                                        ? t('trainer.library.muscleBack')
                                        : viewingExercise.muscleGroup === 'shoulders'
                                        ? t('trainer.library.muscleShoulders')
                                        : viewingExercise.muscleGroup === 'arms'
                                        ? t('trainer.library.muscleArms')
                                        : viewingExercise.muscleGroup === 'legs'
                                        ? t('trainer.library.muscleLegs')
                                        : viewingExercise.muscleGroup === 'core'
                                        ? t('trainer.library.muscleCore')
                                        : viewingExercise.muscleGroup === 'cardio'
                                        ? t('trainer.library.muscleCardio')
                                        : t('trainer.library.muscleFullBody')}
                                </Badge>
                                {viewingExercise.equipment.length > 0 && (
                                    <Group gap="xs">
                                        {viewingExercise.equipment.map((eq) => (
                                            <Badge key={eq} size="sm" variant="light" color="blue">
                                                {eq}
                                            </Badge>
                                        ))}
                                    </Group>
                                )}
                            </Group>
                            <Group gap="xs">
                                <Button 
                                    variant="light" 
                                    leftSection={<IconEdit size={16} />}
                                    onClick={() => {
                                        closeViewExerciseModal()
                                        handleEditExercise(viewingExercise)
                                    }}
                                >
                                    {t('trainer.library.edit')}
                                </Button>
                            </Group>
                        </Group>

                        {viewingExercise.description && (
                            <Card withBorder padding="md">
                                <Stack gap="xs">
                                    <Text fw={600} size="sm" c="dimmed" tt="uppercase">
                                        {t('trainer.library.exerciseForm.description')}
                                    </Text>
                                    <Text>{viewingExercise.description}</Text>
                                </Stack>
                            </Card>
                        )}

                        {viewingExercise.startingPosition && (
                            <Card withBorder padding="md">
                                <Stack gap="xs">
                                    <Text fw={600} size="sm" c="dimmed" tt="uppercase">
                                        {t('trainer.library.exerciseForm.startingPosition')}
                                    </Text>
                                    <Text>{viewingExercise.startingPosition}</Text>
                                </Stack>
                            </Card>
                        )}

                        {viewingExercise.executionInstructions && (
                            <Card withBorder padding="md">
                                <Stack gap="xs">
                                    <Text fw={600} size="sm" c="dimmed" tt="uppercase">
                                        {t('trainer.library.exerciseForm.executionInstructions')}
                                    </Text>
                                    <Text>{viewingExercise.executionInstructions}</Text>
                                </Stack>
                            </Card>
                        )}

                        {viewingExercise.videoUrl && (
                            <Card withBorder padding="md">
                                <Stack gap="sm">
                                    <Text fw={600} size="sm" c="dimmed" tt="uppercase">
                                        {t('trainer.library.exerciseForm.video')}
                                    </Text>
                                    <div style={{ 
                                        position: 'relative', 
                                        paddingBottom: '56.25%', 
                                        height: 0, 
                                        overflow: 'hidden',
                                        borderRadius: '8px',
                                        backgroundColor: 'var(--mantine-color-gray-2)',
                                        border: '1px solid var(--mantine-color-gray-3)',
                                        minHeight: '300px',
                                    }}>
                                        {(() => {
                                            const url = viewingExercise.videoUrl.trim()
                                            if (!url) return null
                                            
                                            const getYouTubeVideoId = (url: string): string | null => {
                                                const patterns = [
                                                    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/,
                                                    /youtube\.com\/embed\/([^&\n?#]+)/,
                                                    /youtube\.com\/v\/([^&\n?#]+)/,
                                                ]
                                                
                                                for (const pattern of patterns) {
                                                    const match = url.match(pattern)
                                                    if (match && match[1]) {
                                                        return match[1]
                                                    }
                                                }
                                                return null
                                            }
                                            
                                            const getVimeoVideoId = (url: string): string | null => {
                                                const patterns = [
                                                    /vimeo\.com\/(\d+)/,
                                                    /vimeo\.com\/video\/(\d+)/,
                                                ]
                                                
                                                for (const pattern of patterns) {
                                                    const match = url.match(pattern)
                                                    if (match && match[1]) {
                                                        return match[1]
                                                    }
                                                }
                                                return null
                                            }
                                            
                                            const getRutubeVideoId = (url: string): string | null => {
                                                const patterns = [
                                                    /rutube\.ru\/video\/([^\/\?\n]+)/,
                                                    /rutube\.ru\/play\/embed\/([^\/\?\n]+)/,
                                                    /rutube\.ru\/video\/embed\/([^\/\?\n]+)/,
                                                ]
                                                
                                                for (const pattern of patterns) {
                                                    const match = url.match(pattern)
                                                    if (match && match[1]) {
                                                        return match[1]
                                                    }
                                                }
                                                return null
                                            }
                                            
                                            const youtubeVideoId = getYouTubeVideoId(url)
                                            if (youtubeVideoId) {
                                                return (
                                                    <iframe
                                                        key={`youtube-${youtubeVideoId}-${url}`}
                                                        src={`https://www.youtube.com/embed/${youtubeVideoId}?enablejsapi=1&rel=0`}
                                                        title="Video player"
                                                        style={{
                                                            position: 'absolute',
                                                            top: 0,
                                                            left: 0,
                                                            width: '100%',
                                                            height: '100%',
                                                            border: 'none',
                                                        }}
                                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                                        allowFullScreen
                                                        loading="eager"
                                                    />
                                                )
                                            }
                                            
                                            const vimeoVideoId = getVimeoVideoId(url)
                                            if (vimeoVideoId) {
                                                return (
                                                    <iframe
                                                        key={`vimeo-${vimeoVideoId}-${url}`}
                                                        src={`https://player.vimeo.com/video/${vimeoVideoId}?autoplay=0&title=0&byline=0&portrait=0`}
                                                        title="Video player"
                                                        style={{
                                                            position: 'absolute',
                                                            top: 0,
                                                            left: 0,
                                                            width: '100%',
                                                            height: '100%',
                                                            border: 'none',
                                                        }}
                                                        allow="autoplay; fullscreen; picture-in-picture"
                                                        allowFullScreen
                                                        loading="eager"
                                                    />
                                                )
                                            }
                                            
                                            const rutubeVideoId = getRutubeVideoId(url)
                                            if (rutubeVideoId) {
                                                return (
                                                    <iframe
                                                        key={`rutube-${rutubeVideoId}-${url}`}
                                                        src={`https://rutube.ru/play/embed/${rutubeVideoId}`}
                                                        title="Video player"
                                                        style={{
                                                            position: 'absolute',
                                                            top: 0,
                                                            left: 0,
                                                            width: '100%',
                                                            height: '100%',
                                                            border: 'none',
                                                        }}
                                                        allow="autoplay; fullscreen"
                                                        allowFullScreen
                                                        loading="eager"
                                                    />
                                                )
                                            }
                                            
                                            // Проверяем, является ли URL прямой ссылкой на изображение (включая GIF)
                                            const isImageUrl = /\.(gif|jpg|jpeg|png|webp|svg|bmp|ico)(\?.*)?$/i.test(url)
                                            if (isImageUrl) {
                                                return (
                                                    <img
                                                        key={`direct-image-${url}`}
                                                        src={url}
                                                        alt="Exercise preview"
                                                        style={{
                                                            position: 'absolute',
                                                            top: 0,
                                                            left: 0,
                                                            width: '100%',
                                                            height: '100%',
                                                            objectFit: 'contain',
                                                            cursor: 'pointer',
                                                        }}
                                                        onClick={() => window.open(url, '_blank')}
                                                        onError={(e) => {
                                                            // Если изображение не загрузилось, показываем fallback
                                                            const target = e.target as HTMLImageElement
                                                            target.style.display = 'none'
                                                        }}
                                                    />
                                                )
                                            }
                                            
                                            // Проверяем, является ли URL прямой ссылкой на видео файл
                                            const isDirectVideoUrl = /\.(mp4|webm|ogg|mov|avi|wmv|flv|mkv|m4v|3gp)(\?.*)?$/i.test(url)
                                            if (isDirectVideoUrl) {
                                                return (
                                                    <video
                                                        key={`direct-video-${url}`}
                                                        src={url}
                                                        controls
                                                        style={{
                                                            position: 'absolute',
                                                            top: 0,
                                                            left: 0,
                                                            width: '100%',
                                                            height: '100%',
                                                            objectFit: 'contain',
                                                        }}
                                                        preload="metadata"
                                                    >
                                                        Ваш браузер не поддерживает воспроизведение видео.
                                                        <a href={url} target="_blank" rel="noopener noreferrer">
                                                            Открыть видео в новой вкладке
                                                        </a>
                                                    </video>
                                                )
                                            }
                                            
                                            return (
                                                <div style={{
                                                    position: 'absolute',
                                                    top: 0,
                                                    left: 0,
                                                    width: '100%',
                                                    height: '100%',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    flexDirection: 'column',
                                                    gap: '12px',
                                                    padding: '20px',
                                                }}>
                                                    <IconPlayerPlay size={48} color="var(--mantine-color-gray-6)" />
                                                    <Text size="sm" c="dimmed" ta="center">
                                                        {t('trainer.library.exerciseForm.videoPreview')}
                                                    </Text>
                                                    <Button 
                                                        component="a"
                                                        href={url} 
                                                        target="_blank"
                                                        variant="light"
                                                        size="sm"
                                                        leftSection={<IconExternalLink size={16} />}
                                                    >
                                                        {t('trainer.library.exerciseForm.openVideo')}
                                                    </Button>
                                                </div>
                                            )
                                        })()}
                                    </div>
                                </Stack>
                            </Card>
                        )}

                        {viewingExercise.notes && (
                            <Card withBorder padding="md">
                                <Stack gap="xs">
                                    <Text fw={600} size="sm" c="dimmed" tt="uppercase">
                                        {t('trainer.library.exerciseForm.notes')}
                                    </Text>
                                    <Text>{viewingExercise.notes}</Text>
                                </Stack>
                            </Card>
                        )}

                        <Group justify="flex-end">
                            <Button variant="subtle" onClick={closeViewExerciseModal}>
                                {t('common.close')}
                            </Button>
                            <Button 
                                leftSection={<IconEdit size={16} />}
                                onClick={() => {
                                    closeViewExerciseModal()
                                    handleEditExercise(viewingExercise)
                                }}
                            >
                                {t('trainer.library.edit')}
                            </Button>
                        </Group>
                    </Stack>
                )}
            </Modal>

            <Modal
                opened={addExerciseModalOpened}
                onClose={closeAddExerciseModal}
                title={editingWorkoutExercise ? t('trainer.library.workoutForm.editExercise') : t('trainer.library.workoutForm.addExercise')}
                size="md"
            >
                <form onSubmit={workoutExerciseForm.onSubmit((values) => {
                    if (!currentBlockType || !values.exerciseId) return
                    
                    const exerciseData = {
                        exerciseId: values.exerciseId,
                        sets: values.sets,
                        reps: values.reps,
                        duration: values.duration,
                        rest: values.rest,
                        weight: values.weight,
                        notes: values.notes,
                    }
                    
                    if (editingWorkoutExercise) {
                        const currentBlock = workoutForm.values[editingWorkoutExercise.blockType]
                        const newBlock = [...currentBlock]
                        newBlock[editingWorkoutExercise.index] = exerciseData
                        workoutForm.setFieldValue(editingWorkoutExercise.blockType, newBlock)
                    } else {
                        const currentBlock = workoutForm.values[currentBlockType]
                        workoutForm.setFieldValue(currentBlockType, [...currentBlock, exerciseData])
                    }
                    
                    closeAddExerciseModal()
                    workoutExerciseForm.reset()
                    setCurrentBlockType(null)
                    setEditingWorkoutExercise(null)
                })}>
                    <Stack gap="md">
                        <Select
                            label={t('trainer.library.workoutForm.selectExercise')}
                            placeholder={t('trainer.library.workoutForm.selectExercisePlaceholder')}
                            data={exercises.map((ex) => ({ value: ex.id, label: ex.name }))}
                            required
                            searchable
                            {...workoutExerciseForm.getInputProps('exerciseId')}
                        />
                        <Group grow>
                            <NumberInput
                                label={t('program.sets')}
                                min={0}
                                {...workoutExerciseForm.getInputProps('sets')}
                            />
                            <NumberInput
                                label={t('program.reps')}
                                min={0}
                                {...workoutExerciseForm.getInputProps('reps')}
                            />
                            <NumberInput
                                label={t('program.duration')}
                                min={0}
                                rightSection={<Text size="xs">мин</Text>}
                                {...workoutExerciseForm.getInputProps('duration')}
                            />
                        </Group>
                        <Group grow>
                            <NumberInput
                                label={t('program.rest')}
                                min={0}
                                rightSection={<Text size="xs">сек</Text>}
                                {...workoutExerciseForm.getInputProps('rest')}
                            />
                            {currentBlockType === 'main' && (
                                <NumberInput
                                    label={t('program.weight')}
                                    min={0}
                                    rightSection={<Text size="xs">кг</Text>}
                                    {...workoutExerciseForm.getInputProps('weight')}
                                />
                            )}
                        </Group>
                        <Textarea
                            label={t('trainer.library.exerciseForm.notes')}
                            placeholder={t('trainer.library.exerciseForm.notesPlaceholder')}
                            {...workoutExerciseForm.getInputProps('notes')}
                        />
                        <Group justify="flex-end" mt="md">
                            <Button variant="subtle" onClick={closeAddExerciseModal}>
                                {t('common.cancel')}
                            </Button>
                            <Button type="submit">{editingWorkoutExercise ? t('common.save') : t('common.add')}</Button>
                        </Group>
                    </Stack>
                </form>
            </Modal>

            <Modal opened={programRenameModalOpened} onClose={closeProgramRename} title={t('common.edit')}>
                <Stack gap="md">
                    <TextInput
                        value={programRenameDraft}
                        onChange={(event) => setProgramRenameDraft(event.currentTarget.value)}
                    />
                    <Group justify="flex-end">
                        <Button variant="default" onClick={closeProgramRename}>
                            {t('common.cancel')}
                        </Button>
                        <Button onClick={handleSaveTrainerRename}>{t('common.save')}</Button>
                    </Group>
                </Stack>
            </Modal>

            <Modal
                opened={programExerciseModalOpened}
                onClose={handleCloseProgramExerciseModal}
                title={programEditingExercise?.exercise ? t('program.editExercise') : t('program.addExercise')}
                size="lg"
            >
                <Stack gap="md">
                    <TextInput
                        label={t('program.exerciseName')}
                        placeholder={t('program.exerciseNamePlaceholder')}
                        value={programExerciseForm.title}
                        onChange={(event) =>
                            setProgramExerciseForm((state) => ({ ...state, title: event.currentTarget.value }))
                        }
                        required
                    />
                    <Group grow>
                        <NumberInput
                            label={t('program.sets')}
                            value={programExerciseForm.sets}
                            onChange={(value) =>
                                setProgramExerciseForm((state) => ({ ...state, sets: Number(value) || 0 }))
                            }
                            min={1}
                            required
                        />
                        <NumberInput
                            label={t('program.reps')}
                            value={programExerciseForm.reps || undefined}
                            onChange={(value) =>
                                setProgramExerciseForm((state) => ({
                                    ...state,
                                    reps: value ? Number(value) : undefined,
                                    duration: undefined,
                                }))
                            }
                            min={1}
                            placeholder={t('program.repsPlaceholder')}
                        />
                    </Group>
                    <Group grow>
                        <TextInput
                            label={t('program.duration')}
                            placeholder={t('program.durationPlaceholder')}
                            value={programExerciseForm.duration || ''}
                            onChange={(event) => {
                                const value = event.currentTarget.value
                                setProgramExerciseForm((state) => ({
                                    ...state,
                                    duration: value || undefined,
                                    reps: value ? undefined : state.reps,
                                }))
                            }}
                        />
                        <NumberInput
                            label={t('program.rest')}
                            placeholder={t('program.restPlaceholder')}
                            value={programExerciseForm.rest ? Number(programExerciseForm.rest.replace(/\s*сек\s*/g, '')) : undefined}
                            onChange={(value) =>
                                setProgramExerciseForm((state) => ({
                                    ...state,
                                    rest: value ? `${value} ${t('program.secondsShort')}` : undefined,
                                }))
                            }
                            min={0}
                            rightSection={<Text size="xs">сек</Text>}
                        />
                    </Group>
                    <TextInput
                        label={t('program.weight')}
                        placeholder={t('program.weightPlaceholder')}
                        value={programExerciseForm.weight || ''}
                        onChange={(event) =>
                            setProgramExerciseForm((state) => ({ ...state, weight: event.currentTarget.value || undefined }))
                        }
                    />
                    <Group justify="flex-end">
                        <Button variant="default" onClick={handleCloseProgramExerciseModal}>
                            {t('common.cancel')}
                        </Button>
                        <Button onClick={handleSaveProgramExercise} disabled={!programExerciseForm.title.trim()}>
                            {programEditingExercise?.exercise ? t('common.save') : t('common.add')}
                        </Button>
                    </Group>
                </Stack>
            </Modal>

            <Modal opened={programTemplatePickerOpened} onClose={closeProgramTemplatePicker} title={t('program.templateLibraryTitle')} size="lg">
                <ScrollArea h={360}>
                    <Stack gap="sm">
                        {accessibleTemplatesForProgram.length ? (
                            accessibleTemplatesForProgram.map((template) => (
                                <Card key={template.id} withBorder padding="md">
                                    <Group justify="space-between" align="flex-start">
                                        <Stack gap={2} style={{ flex: 1 }}>
                                            <Text fw={600}>{template.name}</Text>
                                            {template.description ? (
                                                <Text size="xs" c="dimmed">
                                                    {template.description}
                                                </Text>
                                            ) : null}
                                            <Text size="xs" c="dimmed">
                                                {t('program.templateDuration', { value: template.duration })}
                                            </Text>
                                        </Stack>
                                        <Button
                                            size="compact-sm"
                                            leftSection={<IconPlus size={14} />}
                                            onClick={() => handleAddTrainerDayFromTemplate(template)}
                                        >
                                            {t('program.addTemplateButton')}
                                        </Button>
                                    </Group>
                                </Card>
                            ))
                        ) : (
                            <Text c="dimmed">{t('program.templatesEmpty')}</Text>
                        )}
                    </Stack>
                </ScrollArea>
            </Modal>

            <Modal
                opened={programExerciseLibraryOpened}
                onClose={closeProgramExerciseLibrary}
                title={t('program.exerciseLibraryTitle')}
                size="lg"
            >
                <ScrollArea h={360}>
                    <Stack gap="sm">
                        {accessibleExercisesForProgram.length ? (
                            accessibleExercisesForProgram.map((exercise) => (
                                <Card key={exercise.id} withBorder padding="md">
                                    <Group justify="space-between" align="center">
                                        <Stack gap={2} style={{ flex: 1 }}>
                                            <Text fw={600}>{exercise.name}</Text>
                                            {exercise.description ? (
                                                <Text size="xs" c="dimmed">
                                                    {exercise.description}
                                                </Text>
                                            ) : null}
                                        </Stack>
                                        <Button
                                            size="compact-sm"
                                            leftSection={<IconPlus size={14} />}
                                            onClick={() => handleAddProgramExerciseFromLibrary(exercise)}
                                        >
                                            {t('common.add')}
                                        </Button>
                                    </Group>
                                </Card>
                            ))
                        ) : (
                            <Text c="dimmed">{t('program.exerciseLibraryEmpty')}</Text>
                        )}
                    </Stack>
                </ScrollArea>
            </Modal>

            <Modal opened={programTemplateModalOpened} onClose={closeProgramTemplateModal} title={t('program.saveAsTemplate')} size="md">
                <Stack gap="md">
                    <TextInput
                        label={t('program.templateName')}
                        placeholder={t('program.templateNamePlaceholder')}
                        value={programTemplateName}
                        onChange={(event) => setProgramTemplateName(event.currentTarget.value)}
                        required
                    />
                    <Text size="sm" c="dimmed">
                        {t('program.templateDescription')}
                    </Text>
                    <Group justify="flex-end">
                        <Button variant="default" onClick={closeProgramTemplateModal}>
                            {t('common.cancel')}
                        </Button>
                        <Button onClick={handleSaveProgramAsTemplate} disabled={!programTemplateName.trim()}>
                            {t('common.save')}
                        </Button>
                    </Group>
                </Stack>
            </Modal>
        </Stack>
    )
}

