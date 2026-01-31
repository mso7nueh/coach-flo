import {
    ActionIcon,
    Badge,
    Button,
    Card,
    Group,
    Menu,
    Modal,
    NumberInput,
    ScrollArea,
    Stack,
    Text,
    TextInput,
    Title,
    Box,
    Divider,
    Breadcrumbs,
    Anchor,
    Tabs,
    SimpleGrid,
    Select,
    Loader,
    Tooltip
} from '@mantine/core'
import { DateInput, TimeInput } from '@mantine/dates'
import { notifications } from '@mantine/notifications'
import { useTranslation } from 'react-i18next'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAppSelector } from '@/shared/hooks/useAppSelector'
import { useAppDispatch } from '@/shared/hooks/useAppDispatch'
import { useEffect, useState, useMemo } from 'react'
import {
    IconArrowLeft,
    IconBooks,
    IconCalendar,
    IconBarbell,
    IconEdit,
    IconPlus,
    IconDotsVertical,
    IconTrash,
    IconCopy,
    IconStretching,
    IconClock,
    IconVideo,
    IconInfoCircle,
    IconRepeat,
    IconTemplate,
    IconDeviceFloppy,
} from '@tabler/icons-react'
import dayjs from 'dayjs'
import {
    fetchPrograms,
    fetchProgramDays,
    selectProgram,
    selectProgramDay,
    createProgram,
    createProgramDay,
    updateProgramDay,
    deleteProgram,
    deleteProgramDayApi,
    copyProgram,
    addExerciseToProgramDayApi,
    updateExerciseInProgramDayApi,
    removeExerciseFromProgramDayApi,
    clearState,
    type ProgramExercise,
    type ProgramBlockInput,
} from '@/app/store/slices/programSlice'
import { createWorkout } from '@/app/store/slices/calendarSlice'
import {
    fetchExercises,
    fetchWorkoutTemplates,
    createWorkoutTemplateFromDayApi,
    fetchExerciseTemplates,
} from '@/app/store/slices/librarySlice'
import { setClients } from '@/app/store/slices/clientsSlice'
import { apiClient } from '@/shared/api/client'
import { useDisclosure } from '@mantine/hooks'

interface AssignForm {
    dayId: string
    date: Date
    startTime: string
    endTime: string
}

const createAssignForm = (dayId: string): AssignForm => ({
    dayId,
    date: new Date(),
    startTime: '18:00',
    endTime: '19:00',
})

// Exercise Editor Modal Component
const ExerciseEditorModal = ({
    opened,
    onClose,
    onSave,
    initialExercise,
    t
}: {
    opened: boolean,
    onClose: () => void,
    onSave: (ex: Omit<ProgramExercise, 'id'>) => void,
    initialExercise: ProgramExercise | null,
    t: any
}) => {
    const [title, setTitle] = useState('')
    const [sets, setSets] = useState<number | string>(3)
    const [reps, setReps] = useState<number | string>('')
    const [weight, setWeight] = useState('')
    const [duration, setDuration] = useState('')
    const [rest, setRest] = useState('')
    const [description, setDescription] = useState('')

    useEffect(() => {
        if (initialExercise) {
            setTitle(initialExercise.title)
            setSets(initialExercise.sets)
            setReps(initialExercise.reps ?? '')
            setWeight(initialExercise.weight ?? '')
            setDuration(initialExercise.duration ?? '')
            setRest(initialExercise.rest ?? '')
            setDescription(initialExercise.description ?? '')
        } else {
            setTitle('')
            setSets(3)
            setReps('')
            setWeight('')
            setDuration('')
            setRest('')
            setDescription('')
        }
    }, [initialExercise, opened])

    return (
        <Modal opened={opened} onClose={onClose} title={initialExercise ? t('common.edit') : t('trainer.clients.program.addExercise')}>
            <Stack gap="md">
                <TextInput
                    label={t('common.title')}
                    placeholder={t('common.titlePlaceholder')}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                />
                <SimpleGrid cols={2}>
                    <NumberInput label={t('common.sets')} value={sets} onChange={setSets} min={0} />
                    <TextInput label={t('common.reps')} value={reps} onChange={(e) => setReps(e.target.value)} />
                </SimpleGrid>
                <SimpleGrid cols={2}>
                    <TextInput label={t('common.weight')} value={weight} onChange={(e) => setWeight(e.target.value)} />
                    <TextInput label={t('common.duration')} value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="например, 10 мин" />
                </SimpleGrid>
                <TextInput label={t('common.rest')} value={rest} onChange={(e) => setRest(e.target.value)} />
                <TextInput label={t('common.description')} value={description} onChange={(e) => setDescription(e.target.value)} />
                <Group justify="flex-end">
                    <Button variant="default" onClick={onClose}>{t('common.cancel')}</Button>
                    <Button onClick={() => onSave({
                        title,
                        sets: Number(sets),
                        reps: reps ? Number(reps) : undefined,
                        weight,
                        duration,
                        rest,
                        description
                    })} disabled={!title}>
                        {t('common.save')}
                    </Button>
                </Group>
            </Stack>
        </Modal>
    )
}

export const ClientProgramContent = ({ embedded = false }: { embedded?: boolean }) => {
    const { t } = useTranslation()
    const { clientId } = useParams<{ clientId: string }>()
    const navigate = useNavigate()
    const dispatch = useAppDispatch()
    const { clients } = useAppSelector((state) => state.clients)
    const { days, selectedProgramId, selectedDayId, programs: clientPrograms } = useAppSelector((state) => state.program)
    const { workouts: workoutTemplates } = useAppSelector((state) => state.library)
    const [isLoadingClients, setIsLoadingClients] = useState(false)
    const [selectProgramModalOpened, { open: openSelectProgramModal, close: closeSelectProgramModal }] = useDisclosure(false)
    const [templatePickerOpened, { open: openTemplatePicker, close: closeTemplatePicker }] = useDisclosure(false)
    const [trainerPrograms, setTrainerPrograms] = useState<any[]>([])
    const [selectedTrainerProgramId, setSelectedTrainerProgramId] = useState<string | null>(null)
    const [isCopying, setIsCopying] = useState(false)
    const [exerciseLibraryOpened, { open: openExerciseLibrary, close: closeExerciseLibrary }] = useDisclosure(false)
    const [activeBlockId, setActiveBlockId] = useState<string | null>(null)

    // UI state for editing
    const [renameModalOpened, { open: openRename, close: closeRename }] = useDisclosure(false)
    const [assignModalOpened, { open: openAssign, close: closeAssign }] = useDisclosure(false)
    const [exerciseModalOpened, { open: openExerciseModal, close: closeExerciseModal }] = useDisclosure(false)
    const [renameDraft, setRenameDraft] = useState('')
    const [assignForm, setAssignForm] = useState<AssignForm | null>(null)
    const [editingExercise, setEditingExercise] = useState<{ exercise: ProgramExercise | null, blockId: string } | null>(null)

    const client = clients.find((c) => c.id === clientId)

    useEffect(() => {
        if (!client && !isLoadingClients && clientId) {
            setIsLoadingClients(true)
            apiClient.getClients().then(data => {
                const mapped = data.map((c: any) => ({
                    id: c.id,
                    fullName: c.full_name,
                    email: c.email,
                    phone: c.phone,
                    avatar: c.avatar,
                    format: c.client_format || 'both',
                    isActive: c.is_active ?? true,
                    workoutsPackage: c.workouts_package,
                    joinedDate: c.created_at || new Date().toISOString(),
                    attendanceRate: 0,
                    totalWorkouts: 0,
                    completedWorkouts: 0,
                }))
                dispatch(setClients(mapped))
            }).finally(() => setIsLoadingClients(false))
        }
    }, [clientId, client, dispatch])

    useEffect(() => {
        if (clientId) {
            dispatch(clearState())
            dispatch(fetchPrograms(clientId)).then((result) => {
                if (fetchPrograms.fulfilled.match(result) && result.payload.length > 0) {
                    const firstProgramId = result.payload[0].id
                    dispatch(selectProgram(firstProgramId))
                }
            })
            dispatch(fetchExercises())
            dispatch(fetchWorkoutTemplates())
        }
    }, [dispatch, clientId])

    useEffect(() => {
        if (selectedProgramId) {
            dispatch(fetchProgramDays(selectedProgramId))
        }
    }, [dispatch, selectedProgramId])

    useEffect(() => {
        if (selectProgramModalOpened) {
            apiClient.getPrograms().then(data => {
                setTrainerPrograms(data.filter((p: any) => p.owner === 'trainer'))
            })
        }
    }, [selectProgramModalOpened])

    const handleAssignProgram = async () => {
        if (!selectedTrainerProgramId || !clientId) return
        setIsCopying(true)
        try {
            if (clientPrograms.length > 0) {
                for (const p of clientPrograms) {
                    await dispatch(deleteProgram(p.id)).unwrap()
                }
            }
            const newProgram = await dispatch(copyProgram({ programId: selectedTrainerProgramId, targetUserId: clientId })).unwrap()
            dispatch(selectProgram(newProgram.id))
            notifications.show({ title: t('common.success'), message: t('trainer.clients.programAssigned'), color: 'green' })
            closeSelectProgramModal()
        } catch (e: any) {
            notifications.show({ title: t('common.error'), message: e.message || t('common.error'), color: 'red' })
        } finally {
            setIsCopying(false)
        }
    }

    const handleAddDay = async () => {
        let programId = selectedProgramId
        if (!programId && clientId) {
            try {
                const newProgram = await dispatch(createProgram({
                    title: `${t('common.program')} - ${client?.fullName || clientId}`,
                    owner: 'trainer',
                    userId: clientId
                })).unwrap()
                programId = newProgram.id
            } catch (e: any) {
                notifications.show({ title: t('common.error'), message: e.message || t('common.error'), color: 'red' })
                return
            }
        }
        if (!programId) return
        dispatch(createProgramDay({ programId, name: `${t('common.day')} ${days.length + 1}` }))
    }

    const handleCopyDay = (dayId: string) => {
        const day = days.find(d => d.id === dayId)
        if (!day || !selectedProgramId) return
        dispatch(createProgramDay({
            programId: selectedProgramId,
            name: `${day.name} (${t('common.copy')})`,
            notes: day.notes,
            blocks: day.blocks.map(b => ({
                type: b.type,
                title: b.title,
                exercises: b.exercises.map(ex => ({
                    title: ex.title,
                    sets: ex.sets,
                    reps: ex.reps,
                    weight: ex.weight ? String(ex.weight) : undefined,
                    duration: ex.duration,
                    rest: ex.rest,
                    description: ex.description,
                }))
            }))
        }))
    }

    const handleRenameDay = () => {
        if (!selectedProgramId || !selectedDayId || !renameDraft.trim()) return
        dispatch(updateProgramDay({ programId: selectedProgramId, dayId: selectedDayId, data: { name: renameDraft } }))
        closeRename()
    }

    const handleDeleteDay = (dayId: string) => {
        if (!selectedProgramId) return
        if (window.confirm(t('common.confirmDelete'))) {
            dispatch(deleteProgramDayApi({ programId: selectedProgramId, dayId }))
        }
    }

    const handleAddDayFromTemplate = async (template: any) => {
        let programId = selectedProgramId
        if (!programId && clientId) {
            try {
                const programTitle = template.name || `${t('common.program')} - ${client?.fullName || clientId}`
                const newProgram = await dispatch(createProgram({
                    title: programTitle,
                    owner: 'trainer',
                    userId: clientId
                })).unwrap()
                programId = newProgram.id
            } catch (e: any) {
                notifications.show({ title: t('common.error'), message: e.message || t('common.error'), color: 'red' })
                return
            }
        }
        if (!programId) return

        try {
            await dispatch(createProgramDay({
                programId,
                name: template.name,
                sourceTemplateId: template.id,
                blocks: [
                    {
                        type: 'warmup',
                        title: t('program.sections.warmup'),
                        exercises: template.warmup.map((ex: any) => ({
                            title: ex.exercise?.name || t('program.newExercise'),
                            sets: ex.sets,
                            reps: ex.reps,
                            weight: ex.weight ? String(ex.weight) : undefined,
                            duration: ex.duration ? `${ex.duration} ${t('program.minutesShort')}` : undefined,
                            rest: ex.rest ? `${ex.rest} ${t('program.minutesShort')}` : undefined,
                        }))
                    },
                    {
                        type: 'main',
                        title: t('program.sections.main'),
                        exercises: template.main.map((ex: any) => ({
                            title: ex.exercise?.name || t('program.newExercise'),
                            sets: ex.sets,
                            reps: ex.reps,
                            weight: ex.weight ? String(ex.weight) : undefined,
                            duration: ex.duration ? `${ex.duration} ${t('program.minutesShort')}` : undefined,
                            rest: ex.rest ? `${ex.rest} ${t('program.minutesShort')}` : undefined,
                        }))
                    },
                    {
                        type: 'cooldown',
                        title: t('program.sections.cooldown'),
                        exercises: template.cooldown.map((ex: any) => ({
                            title: ex.exercise?.name || t('program.newExercise'),
                            sets: ex.sets,
                            reps: ex.reps,
                            weight: ex.weight ? String(ex.weight) : undefined,
                            duration: ex.duration ? `${ex.duration} ${t('program.minutesShort')}` : undefined,
                            rest: ex.rest ? `${ex.rest} ${t('program.minutesShort')}` : undefined,
                        }))
                    }
                ]
            })).unwrap()
            const successMessage = template.name
                ? t('program.dayCreatedFromTemplateWithName', { name: template.name })
                : t('program.dayCreatedFromTemplate')
            notifications.show({ title: t('common.success'), message: successMessage, color: 'green' })
            closeTemplatePicker()
        } catch (e: any) {
            notifications.show({ title: t('common.error'), message: e.message || t('common.error'), color: 'red' })
        }
    }

    const handleSaveDayAsTemplate = async (dayId: string) => {
        try {
            await dispatch(createWorkoutTemplateFromDayApi(dayId)).unwrap()
            notifications.show({ title: t('common.success'), message: t('program.dayCreatedFromTemplate'), color: 'green' })
        } catch (e: any) {
            notifications.show({ title: t('common.error'), message: e.message || t('common.error'), color: 'red' })
        }
    }

    const handleSaveProgramAsTemplate = async () => {
        if (!selectedProgramId) return
        try {
            await dispatch(copyProgram({ programId: selectedProgramId })).unwrap()
            notifications.show({ title: t('common.success'), message: t('program.programCreated'), color: 'green' })
        } catch (e: any) {
            notifications.show({ title: t('common.error'), message: e.message || t('common.error'), color: 'red' })
        }
    }

    const handleAssignToCalendar = (values: AssignForm) => {
        if (!clientId) return
        const day = days.find(d => d.id === values.dayId)
        if (!day) return

        const start = dayjs(values.date).hour(parseInt(values.startTime.split(':')[0])).minute(parseInt(values.startTime.split(':')[1])).toISOString()
        const end = dayjs(values.date).hour(parseInt(values.endTime.split(':')[0])).minute(parseInt(values.endTime.split(':')[1])).toISOString()

        dispatch(createWorkout({
            userId: clientId,
            title: day.name,
            start,
            end,
            programDayId: day.id
        })).then(() => {
            notifications.show({ title: t('common.success'), message: t('trainer.clients.program.assignedToCalendar'), color: 'green' })
            closeAssign()
        })
    }

    const handleSaveExercise = (exercise: Omit<ProgramExercise, 'id'>) => {
        if (!selectedProgramId || !selectedDayId || !editingExercise) return
        if (editingExercise.exercise) {
            dispatch(updateExerciseInProgramDayApi({
                programId: selectedProgramId,
                dayId: selectedDayId,
                blockId: editingExercise.blockId,
                exerciseId: editingExercise.exercise.id,
                exercise: { ...editingExercise.exercise, ...exercise } as ProgramExercise
            }))
        } else {
            dispatch(addExerciseToProgramDayApi({
                programId: selectedProgramId,
                dayId: selectedDayId,
                blockId: editingExercise.blockId,
                exercise
            }))
        }
        closeExerciseModal()
    }

    const handleEditExercise = (blockId: string, exercise: ProgramExercise) => {
        setEditingExercise({ exercise, blockId })
        openExerciseModal()
    }

    const handleDeleteExercise = (blockId: string, exerciseId: string) => {
        if (!selectedProgramId || !selectedDayId) return
        if (window.confirm(t('common.confirmDelete'))) {
            dispatch(removeExerciseFromProgramDayApi({ programId: selectedProgramId, dayId: selectedDayId, blockId, exerciseId }))
        }
    }

    const { exercises } = useAppSelector((state) => state.library)

    const filteredExercises = useMemo(() => {
        return exercises.filter((ex) => {
            if (ex.visibility === 'all') return true
            if (ex.visibility === 'trainer') return true // Trainer can see their own
            if (ex.visibility === 'client' && ex.clientId === clientId) return true
            return false
        })
    }, [exercises, clientId])

    const handleAddExerciseFromLibrary = (exercise: any) => {
        if (!selectedProgramId || !selectedDayId || !activeBlockId) return
        dispatch(addExerciseToProgramDayApi({
            programId: selectedProgramId,
            dayId: selectedDayId,
            blockId: activeBlockId,
            exercise: {
                title: exercise.name,
                sets: 3,
                reps: undefined,
                weight: undefined,
                duration: undefined,
                rest: undefined,
                description: exercise.description,
                exerciseId: exercise.id
            }
        }))
        closeExerciseLibrary()
    }

    if (isLoadingClients && !client) return <Group justify="center" py="xl"><Loader /></Group>
    if (!client) return (
        <Stack gap="md" align="center" py="xl">
            <Text>{t('trainer.clients.clientNotFound')}</Text>
            <Button variant="subtle" onClick={() => navigate('/trainer/clients')}>{t('common.back')}</Button>
        </Stack>
    )

    const programDays = useMemo(() => {
        return days.filter(d => d.programId === selectedProgramId)
    }, [days, selectedProgramId])

    const selectedProgram = useMemo(() =>
        clientPrograms.find(p => p.id === selectedProgramId),
        [clientPrograms, selectedProgramId]
    )

    const selectedDay = programDays.find(d => d.id === selectedDayId)

    return (
        <Stack gap="lg">
            {!embedded && (
                <>
                    <Breadcrumbs>
                        <Anchor component={Link} to="/trainer/clients">{t('trainer.clients.title')}</Anchor>
                        <Anchor component={Link} to={`/trainer/clients/${clientId}`}>{client.fullName}</Anchor>
                        <Text>{t('common.program')}</Text>
                    </Breadcrumbs>
                    <Group justify="space-between">
                        <Stack gap={2}>
                            <Title order={2}>
                                {selectedProgram ? selectedProgram.title : `${t('common.program')} - ${client.fullName}`}
                            </Title>
                            {selectedProgram && (
                                <Text size="sm" c="dimmed">{t('common.program')} — {client.fullName}</Text>
                            )}
                        </Stack>
                        <Group>
                            <Button leftSection={<IconDeviceFloppy size={16} />} variant="light" onClick={handleSaveProgramAsTemplate}>{t('program.saveAsTemplate')}</Button>
                            <Button leftSection={<IconPlus size={16} />} onClick={openSelectProgramModal}>{t('trainer.clients.selectProgram')}</Button>
                        </Group>
                    </Group>
                </>
            )}

            <Group justify="space-between" align="center">
                <ScrollArea scrollbars="x" style={{ flex: 1 }}>
                    <Group gap="xs" wrap="nowrap">
                        {programDays.map((day) => (
                            <Group key={day.id} gap={4}>
                                <Button
                                    variant={selectedDayId === day.id ? 'filled' : 'light'}
                                    color="violet"
                                    onClick={() => dispatch(selectProgramDay(day.id))}
                                    size="sm"
                                    radius="xl"
                                >
                                    {day.name}
                                </Button>
                                <Menu shadow="md" width={200}>
                                    <Menu.Target>
                                        <ActionIcon variant="subtle" color="gray" radius="xl" size="sm">
                                            <IconDotsVertical size={16} />
                                        </ActionIcon>
                                    </Menu.Target>
                                    <Menu.Dropdown>
                                        <Menu.Item leftSection={<IconEdit size={14} />} onClick={() => { setRenameDraft(day.name); openRename(); }}>{t('common.rename')}</Menu.Item>
                                        <Menu.Item leftSection={<IconCopy size={14} />} onClick={() => handleCopyDay(day.id)}>{t('common.copy')}</Menu.Item>
                                        <Menu.Item leftSection={<IconDeviceFloppy size={14} />} onClick={() => handleSaveDayAsTemplate(day.id)}>{t('program.saveAsTemplate')}</Menu.Item>
                                        <Menu.Item leftSection={<IconCalendar size={14} />} onClick={() => { setAssignForm(createAssignForm(day.id)); openAssign(); }}>{t('trainer.clients.program.assignToCalendar')}</Menu.Item>
                                        <Menu.Divider />
                                        <Menu.Item color="red" leftSection={<IconTrash size={14} />} onClick={() => handleDeleteDay(day.id)}>{t('common.delete')}</Menu.Item>
                                    </Menu.Dropdown>
                                </Menu>
                            </Group>
                        ))}
                        <Button variant="dashed" color="violet" leftSection={<IconPlus size={16} />} size="sm" radius="xl" onClick={handleAddDay}>
                            {t('trainer.clients.program.addDay')}
                        </Button>
                        <Button variant="dashed" color="blue" leftSection={<IconTemplate size={16} />} size="sm" radius="xl" onClick={() => { dispatch(fetchWorkoutTemplates()); openTemplatePicker(); }}>
                            {t('program.addTrainingFromTemplate')}
                        </Button>
                        <Button variant="dashed" color="green" leftSection={<IconBooks size={16} />} size="sm" radius="xl" onClick={openSelectProgramModal}>
                            {t('program.addProgramFromTemplate')}
                        </Button>
                    </Group>
                </ScrollArea>
            </Group>

            {selectedDay ? (
                <Stack gap="md">
                    <Group justify="space-between" align="center">
                        <Text fw={600} size="xl">{selectedDay.name}</Text>
                        <Button variant="light" leftSection={<IconCalendar size={16} />} onClick={() => { setAssignForm(createAssignForm(selectedDay.id)); openAssign(); }}>
                            {t('trainer.clients.program.assignToCalendar')}
                        </Button>
                    </Group>

                    <SimpleGrid cols={{ base: 1, md: 3 }} spacing="md">
                        {selectedDay.blocks.map((block) => (
                            <Card key={block.id} withBorder padding="md" radius="md">
                                <Stack gap="md">
                                    <Group justify="space-between" align="center">
                                        <Group gap="xs">
                                            {block.type === 'warmup' && <IconStretching size={20} />}
                                            {block.type === 'main' && <IconBarbell size={20} />}
                                            {block.type === 'cooldown' && <IconClock size={20} />}
                                            <Title order={4}>{block.title}</Title>
                                        </Group>
                                        <Group gap={4}>
                                            <Tooltip label={t('program.addFromLibrary')}>
                                                <ActionIcon variant="light" color="green" onClick={() => { setActiveBlockId(block.id); openExerciseLibrary(); }}>
                                                    <IconBooks size={16} />
                                                </ActionIcon>
                                            </Tooltip>
                                            <ActionIcon variant="light" color="violet" onClick={() => { setEditingExercise({ exercise: null, blockId: block.id }); openExerciseModal(); }}>
                                                <IconPlus size={16} />
                                            </ActionIcon>
                                        </Group>
                                    </Group>
                                    <Divider />
                                    {block.exercises.length === 0 ? (
                                        <Text c="dimmed" size="sm" ta="center" py="lg">{t('trainer.clients.program.noExercisesInBlock')}</Text>
                                    ) : (
                                        <Stack gap="xs">
                                            {block.exercises.map((exercise) => (
                                                <Card key={exercise.id} withBorder padding="sm" radius="md" style={{ cursor: 'pointer' }} onClick={() => handleEditExercise(block.id, exercise)}>
                                                    <Group justify="space-between" wrap="nowrap">
                                                        <Stack gap={4}>
                                                            <Text fw={600} size="sm">{exercise.title}</Text>
                                                            <Group gap={4}>
                                                                <Badge size="xs" color="violet" variant="light">{exercise.sets} {t('common.sets')}</Badge>
                                                                {exercise.reps && <Badge size="xs" color="blue" variant="light">{exercise.reps}</Badge>}
                                                                {exercise.weight && <Badge size="xs" color="green" variant="light">{exercise.weight}</Badge>}
                                                            </Group>
                                                        </Stack>
                                                        <ActionIcon variant="subtle" color="red" size="sm" onClick={(e) => { e.stopPropagation(); handleDeleteExercise(block.id, exercise.id); }}>
                                                            <IconTrash size={14} />
                                                        </ActionIcon>
                                                    </Group>
                                                </Card>
                                            ))}
                                        </Stack>
                                    )}
                                </Stack>
                            </Card>
                        ))}
                    </SimpleGrid>
                </Stack>
            ) : (
                <Card withBorder padding="xl" radius="md">
                    <Text ta="center" c="dimmed">{t('program.noDaysSelected')}</Text>
                </Card>
            )}

            {/* Modals */}
            <Modal opened={selectProgramModalOpened} onClose={closeSelectProgramModal} title={t('trainer.clients.selectProgram')}>
                <Stack gap="md">
                    <Select
                        label={t('trainer.clients.selectProgramLabel')}
                        data={trainerPrograms.map(p => ({ value: p.id, label: p.title }))}
                        value={selectedTrainerProgramId}
                        onChange={setSelectedTrainerProgramId}
                        searchable
                    />
                    <Group justify="flex-end">
                        <Button variant="default" onClick={closeSelectProgramModal}>{t('common.cancel')}</Button>
                        <Button onClick={handleAssignProgram} loading={isCopying}>{t('trainer.clients.assignProgram')}</Button>
                    </Group>
                </Stack>
            </Modal>

            <Modal opened={renameModalOpened} onClose={closeRename} title={t('common.rename')}>
                <Stack gap="md">
                    <TextInput value={renameDraft} onChange={(e) => setRenameDraft(e.target.value)} />
                    <Group justify="flex-end">
                        <Button variant="default" onClick={closeRename}>{t('common.cancel')}</Button>
                        <Button onClick={handleRenameDay}>{t('common.save')}</Button>
                    </Group>
                </Stack>
            </Modal>

            <Modal opened={assignModalOpened} onClose={closeAssign} title={t('trainer.clients.program.assignToCalendar')}>
                {assignForm && (
                    <Stack gap="md">
                        <DateInput label={t('common.date')} value={assignForm.date} onChange={(val) => setAssignForm({ ...assignForm, date: val || new Date() })} />
                        <Group grow>
                            <TimeInput label={t('common.startTime')} value={assignForm.startTime} onChange={(e) => setAssignForm({ ...assignForm, startTime: e.target.value })} />
                            <TimeInput label={t('common.endTime')} value={assignForm.endTime} onChange={(e) => setAssignForm({ ...assignForm, endTime: e.target.value })} />
                        </Group>
                        <Group justify="flex-end">
                            <Button variant="default" onClick={closeAssign}>{t('common.cancel')}</Button>
                            <Button onClick={() => handleAssignToCalendar(assignForm)}>{t('common.assign')}</Button>
                        </Group>
                    </Stack>
                )}
            </Modal>

            <ExerciseEditorModal
                opened={exerciseModalOpened}
                onClose={closeExerciseModal}
                onSave={handleSaveExercise}
                initialExercise={editingExercise?.exercise || null}
                t={t}
            />

            <Modal opened={templatePickerOpened} onClose={closeTemplatePicker} title={t('program.templateLibraryTitle')} size="lg">
                <Stack gap="md">
                    {workoutTemplates.length === 0 ? (
                        <Text ta="center" c="dimmed" py="xl">{t('program.templatesEmpty')}</Text>
                    ) : (
                        <SimpleGrid cols={{ base: 1, sm: 2 }}>
                            {workoutTemplates.map((template) => (
                                <Card key={template.id} withBorder padding="md" radius="md" style={{ cursor: 'pointer' }} onClick={() => handleAddDayFromTemplate(template)}>
                                    <Group justify="space-between">
                                        <Stack gap={4}>
                                            <Text fw={600}>{template.name}</Text>
                                            <Text size="xs" c="dimmed">{template.description}</Text>
                                            <Group gap={4}>
                                                <Badge size="xs" variant="light">{template.level}</Badge>
                                                <Badge size="xs" variant="light" color="violet">{template.goal}</Badge>
                                            </Group>
                                        </Stack>
                                        <ActionIcon variant="light" color="blue">
                                            <IconPlus size={16} />
                                        </ActionIcon>
                                    </Group>
                                </Card>
                            ))}
                        </SimpleGrid>
                    )}
                </Stack>
            </Modal>


            <Modal opened={exerciseLibraryOpened} onClose={closeExerciseLibrary} title={t('program.exerciseLibraryTitle')} size="lg">
                <ScrollArea h={400}>
                    <Stack gap="sm">
                        {filteredExercises.length === 0 ? (
                            <Text ta="center" c="dimmed" py="xl">{t('program.exerciseLibraryEmpty')}</Text>
                        ) : (
                            <SimpleGrid cols={{ base: 1, sm: 2 }}>
                                {filteredExercises.map((exercise) => (
                                    <Card
                                        key={exercise.id}
                                        withBorder
                                        padding="md"
                                        radius="md"
                                        style={{ cursor: 'pointer' }}
                                        onClick={() => handleAddExerciseFromLibrary(exercise)}
                                    >
                                        <Stack gap={4}>
                                            <Text fw={600}>{exercise.name}</Text>
                                            <Text size="xs" c="dimmed" lineClamp={2}>{exercise.description}</Text>
                                            <Badge size="xs" variant="light">{t(`trainer.library.muscle${exercise.muscleGroup.charAt(0).toUpperCase() + exercise.muscleGroup.slice(1)}`)}</Badge>
                                        </Stack>
                                    </Card>
                                ))}
                            </SimpleGrid>
                        )}
                    </Stack>
                </ScrollArea>
            </Modal>
        </Stack>
    )
}

export const ClientProgramPage = () => {
    return <ClientProgramContent />
}
