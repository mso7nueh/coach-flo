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
} from '@tabler/icons-react'
import dayjs from 'dayjs'
import {
    fetchPrograms,
    fetchProgramDays,
    selectProgram,
    selectProgramDay,
    createProgramDay,
    updateProgramDay,
    deleteProgram,
    deleteProgramDayApi,
    copyProgram,
    addExerciseToProgramDayApi,
    updateExerciseInProgramDayApi,
    removeExerciseFromProgramDayApi,
    type ProgramExercise,
    type ProgramBlockInput,
} from '@/app/store/slices/programSlice'
import { createWorkout } from '@/app/store/slices/calendarSlice'
import { fetchExercises, fetchWorkoutTemplates } from '@/app/store/slices/librarySlice'
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
    const [isLoadingClients, setIsLoadingClients] = useState(false)
    const [selectProgramModalOpened, { open: openSelectProgramModal, close: closeSelectProgramModal }] = useDisclosure(false)
    const [trainerPrograms, setTrainerPrograms] = useState<any[]>([])
    const [selectedTrainerProgramId, setSelectedTrainerProgramId] = useState<string | null>(null)
    const [isCopying, setIsCopying] = useState(false)

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
            dispatch(fetchPrograms(clientId)).then((result) => {
                if (fetchPrograms.fulfilled.match(result) && result.payload.length > 0) {
                    const firstProgramId = result.payload[0].id
                    dispatch(selectProgram(firstProgramId))
                    dispatch(fetchProgramDays(firstProgramId))
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

    const handleAddDay = () => {
        if (!selectedProgramId) return
        dispatch(createProgramDay({ programId: selectedProgramId, name: `${t('common.day')} ${days.length + 1}` }))
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

    if (isLoadingClients && !client) return <Group justify="center" py="xl"><Loader /></Group>
    if (!client) return (
        <Stack gap="md" align="center" py="xl">
            <Text>{t('trainer.clients.clientNotFound')}</Text>
            <Button variant="subtle" onClick={() => navigate('/trainer/clients')}>{t('common.back')}</Button>
        </Stack>
    )

    const selectedDay = days.find(d => d.id === selectedDayId)

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
                        <Title order={2}>{t('common.program')} - {client.fullName}</Title>
                        <Button leftSection={<IconPlus size={16} />} onClick={openSelectProgramModal}>{t('trainer.clients.selectProgram')}</Button>
                    </Group>
                </>
            )}

            <Group justify="space-between" align="center">
                <ScrollArea scrollbars="x" style={{ flex: 1 }}>
                    <Group gap="xs" wrap="nowrap">
                        {days.map((day) => (
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
                                        <ActionIcon variant="light" color="violet" onClick={() => { setEditingExercise({ exercise: null, blockId: block.id }); openExerciseModal(); }}>
                                            <IconPlus size={16} />
                                        </ActionIcon>
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
        </Stack>
    )
}

export const ClientProgramPage = () => {
    return <ClientProgramContent />
}
