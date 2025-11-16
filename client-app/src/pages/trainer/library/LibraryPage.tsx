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
} from '@mantine/core'
import { useTranslation } from 'react-i18next'
import { useAppDispatch } from '@/shared/hooks/useAppDispatch'
import { useAppSelector } from '@/shared/hooks/useAppSelector'
import {
    addWorkout,
    updateWorkout,
    addExercise,
    updateExercise,
    removeWorkout,
    removeExercise,
    cloneExercise,
    setWorkoutFilters,
    setExerciseFilters,
} from '@/app/store/slices/librarySlice'
import { useDisclosure } from '@mantine/hooks'
import { useState, useMemo } from 'react'
import { useForm } from '@mantine/form'
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
} from '@tabler/icons-react'
import type {
    WorkoutTemplate,
    Exercise,
    WorkoutLevel,
    WorkoutGoal,
    MuscleGroup,
} from '@/app/store/slices/librarySlice'

export const LibraryPage = () => {
    const { t } = useTranslation()
    const dispatch = useAppDispatch()
    const { workouts, exercises, workoutFilters, exerciseFilters } = useAppSelector((state) => state.library)
    const clients = useAppSelector((state) => state.clients.clients)
    const [activeTab, setActiveTab] = useState<string>('workouts')
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

    const handleSaveWorkout = (values: typeof workoutForm.values) => {
        if (editingWorkout) {
            dispatch(
                updateWorkout({
                    id: editingWorkout.id,
                    updates: values,
                }),
            )
        } else {
            dispatch(addWorkout({ ...values, isCustom: true }))
        }
        closeWorkoutModal()
        workoutForm.reset()
        setEditingWorkout(null)
    }

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

    const handleSaveExercise = (values: typeof exerciseForm.values) => {
        if (editingExercise) {
            dispatch(
                updateExercise({
                    id: editingExercise.id,
                    updates: values,
                }),
            )
        } else {
            dispatch(addExercise(values))
        }
        closeExerciseModal()
        exerciseForm.reset()
        setEditingExercise(null)
    }

    return (
        <Stack gap="lg">
            <Group justify="space-between">
                <Title order={2}>{t('trainer.library.title')}</Title>
            </Group>

            <Tabs value={activeTab} onChange={(value) => setActiveTab(value || 'workouts')}>
                <Tabs.List>
                    <Tabs.Tab value="workouts" leftSection={<IconCalendarEvent size={16} />}>
                        {t('trainer.library.workouts')}
                    </Tabs.Tab>
                    <Tabs.Tab value="exercises" leftSection={<IconBarbell size={16} />}>
                        {t('trainer.library.exercises')}
                    </Tabs.Tab>
                </Tabs.List>

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
                                            setViewingExercise(exercise)
                                            openViewExerciseModal()
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
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            dispatch(removeExercise(exercise.id))
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
                                                        {(ex.sets || ex.reps || ex.duration) && (
                                                            <Text size="xs" c="dimmed" mt={4} ml={28}>
                                                                {ex.sets && `${ex.sets} ${t('program.sets')}`}
                                                                {ex.reps && ` × ${ex.reps} ${t('program.reps')}`}
                                                                {ex.duration && ` × ${ex.duration} мин`}
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
                                                        {(ex.sets || ex.reps || ex.duration) && (
                                                            <Text size="xs" c="dimmed" mt={4} ml={28}>
                                                                {ex.sets && `${ex.sets} ${t('program.sets')}`}
                                                                {ex.reps && ` × ${ex.reps} ${t('program.reps')}`}
                                                                {ex.duration && ` × ${ex.duration} мин`}
                                                                {ex.weight && ` · ${ex.weight} кг`}
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
                                                        {(ex.sets || ex.reps || ex.duration) && (
                                                            <Text size="xs" c="dimmed" mt={4} ml={28}>
                                                                {ex.sets && `${ex.sets} ${t('program.sets')}`}
                                                                {ex.reps && ` × ${ex.reps} ${t('program.reps')}`}
                                                                {ex.duration && ` × ${ex.duration} мин`}
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
                    body: { maxHeight: '85vh', overflowY: 'auto', paddingBottom: 'var(--mantine-spacing-xl)' },
                }}
            >
                <form onSubmit={workoutForm.onSubmit(handleSaveWorkout)}>
                    <Stack gap="md">
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
                                        {(ex.sets || ex.reps || ex.duration) && (
                                            <Text size="xs" c="dimmed" mt={4}>
                                                {ex.sets && `${ex.sets} ${t('program.sets')}`}
                                                {ex.reps && ` × ${ex.reps} ${t('program.reps')}`}
                                                {ex.duration && ` × ${ex.duration} мин`}
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
                                        {(ex.sets || ex.reps || ex.duration || ex.weight) && (
                                            <Text size="xs" c="dimmed" mt={4}>
                                                {ex.sets && `${ex.sets} ${t('program.sets')}`}
                                                {ex.reps && ` × ${ex.reps} ${t('program.reps')}`}
                                                {ex.duration && ` × ${ex.duration} мин`}
                                                {ex.weight && ` · ${ex.weight} кг`}
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
                                        {(ex.sets || ex.reps || ex.duration) && (
                                            <Text size="xs" c="dimmed" mt={4}>
                                                {ex.sets && `${ex.sets} ${t('program.sets')}`}
                                                {ex.reps && ` × ${ex.reps} ${t('program.reps')}`}
                                                {ex.duration && ` × ${ex.duration} мин`}
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

                        <Group justify="flex-end" mt="md">
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
                    body: { maxHeight: '85vh', overflowY: 'auto', paddingBottom: 'var(--mantine-spacing-xl)' },
                }}
            >
                <form onSubmit={exerciseForm.onSubmit(handleSaveExercise)}>
                    <Stack gap="lg">
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
                                exerciseForm.setFieldValue('visibility', value as 'all' | 'client')
                                if (value === 'all') {
                                    exerciseForm.setFieldValue('clientId', undefined)
                                }
                            }}
                        >
                            <Stack gap="xs">
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

                        <Group justify="flex-end" mt="md">
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
        </Stack>
    )
}

