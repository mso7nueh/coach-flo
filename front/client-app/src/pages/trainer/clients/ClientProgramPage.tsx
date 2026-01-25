import {
    Badge,
    Card,
    Group,
    ScrollArea,
    SimpleGrid,
    Stack,
    Tabs,
    Text,
    Title,
    Breadcrumbs,
    Anchor,
    Button,
    Modal,
    Select,
} from '@mantine/core'
import { useTranslation } from 'react-i18next'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAppSelector } from '@/shared/hooks/useAppSelector'
import { useAppDispatch } from '@/shared/hooks/useAppDispatch'
import { useEffect, useState, useMemo } from 'react'
import { IconArrowLeft, IconPlus } from '@tabler/icons-react'
import { fetchPrograms, fetchProgramDays, selectProgram, selectProgramDay, createProgram, createProgramDay, deleteProgram } from '@/app/store/slices/programSlice'
import { setClients } from '@/app/store/slices/clientsSlice'
import { apiClient } from '@/shared/api/client'
import { useDisclosure } from '@mantine/hooks'
import { notifications } from '@mantine/notifications'
import type { ProgramBlockInput } from '@/app/store/slices/programSlice'

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

    // Загружаем клиентов при монтировании, если клиент не найден
    useEffect(() => {
        const client = clients.find((c) => c.id === clientId)
        if (!client && !isLoadingClients && clientId) {
            setIsLoadingClients(true)
            const loadClients = async () => {
                try {
                    const clientsData = await apiClient.getClients()
                    const mappedClients = clientsData.map((client: any) => ({
                        id: client.id,
                        fullName: client.full_name,
                        email: client.email,
                        phone: client.phone,
                        avatar: client.avatar,
                        format: (client.client_format || 'both') as 'online' | 'offline' | 'both',
                        workoutsPackage: client.workouts_package,
                        packageExpiryDate: client.package_expiry_date,
                        isActive: client.is_active ?? true,
                        attendanceRate: 0,
                        totalWorkouts: 0,
                        completedWorkouts: 0,
                        joinedDate: client.created_at || new Date().toISOString(),
                    }))
                    dispatch(setClients(mappedClients))
                } catch (error) {
                    console.error('Error loading clients:', error)
                } finally {
                    setIsLoadingClients(false)
                }
            }
            loadClients()
        }
    }, [dispatch, clientId, clients, isLoadingClients])

    // Загружаем программы клиента при открытии страницы
    useEffect(() => {
        if (clientId) {
            // Загружаем программы клиента через API с параметром user_id
            dispatch(fetchPrograms(clientId)).then((result) => {
                if (fetchPrograms.fulfilled.match(result) && result.payload.length > 0) {
                    dispatch(selectProgram(result.payload[0].id))
                    dispatch(fetchProgramDays(result.payload[0].id))
                }
            })
        }
    }, [dispatch, clientId])

    // Загружаем дни программы при выборе программы
    useEffect(() => {
        if (selectedProgramId) {
            dispatch(fetchProgramDays(selectedProgramId))
        }
    }, [dispatch, selectedProgramId])

    // Загружаем программы тренера при открытии модального окна
    useEffect(() => {
        if (selectProgramModalOpened) {
            const loadTrainerPrograms = async () => {
                try {
                    // Загружаем программы тренера (без user_id, чтобы получить свои программы)
                    const programs = await apiClient.getPrograms()
                    setTrainerPrograms(programs.filter((p: any) => p.owner === 'trainer'))
                } catch (error) {
                    console.error('Error loading trainer programs:', error)
                }
            }
            loadTrainerPrograms()
        }
    }, [selectProgramModalOpened])

    // Фильтруем программы тренера, чтобы в списке не было дубликатов по названию
    const uniqueTrainerPrograms = useMemo(() => {
        const seen = new Set()
        return trainerPrograms.filter((p) => {
            if (seen.has(p.title)) return false
            seen.add(p.title)
            return true
        })
    }, [trainerPrograms])

    const handleAssignProgram = async () => {
        if (!selectedTrainerProgramId || !clientId) return

        setIsCopying(true)
        try {
            // Получаем программу тренера и её дни
            const trainerProgram = trainerPrograms.find((p) => p.id === selectedTrainerProgramId)
            if (!trainerProgram) {
                throw new Error('Программа не найдена')
            }

            const trainerProgramDays = await apiClient.getProgramDays(selectedTrainerProgramId)

            // Удаляем все текущие программы клиента (Replacement logic)
            if (clientPrograms.length > 0) {
                for (const p of clientPrograms) {
                    await dispatch(deleteProgram(p.id)).unwrap()
                }
            }

            // Создаем новую программу для клиента
            const newProgram = await dispatch(
                createProgram({
                    title: trainerProgram.title,
                    description: trainerProgram.description,
                    owner: 'client',
                    userId: clientId
                })
            ).unwrap()

            // Копируем все дни программы
            for (const day of trainerProgramDays) {
                const blocks: ProgramBlockInput[] = (day.blocks || []).map((block: any) => ({
                    type: block.type,
                    title: block.title,
                    exercises: (block.exercises || []).map((ex: any) => ({
                        title: ex.title,
                        sets: ex.sets || 1, // sets обязательное поле, по умолчанию 1
                        reps: ex.reps || undefined,
                        // duration, rest, weight должны быть строками или undefined для бэкенда
                        duration: ex.duration ? String(ex.duration) : undefined,
                        rest: ex.rest ? String(ex.rest) : undefined,
                        weight: ex.weight ? String(ex.weight) : undefined,
                    })),
                }))

                const createdDay = await dispatch(
                    createProgramDay({
                        name: day.name,
                        programId: newProgram.id,
                        blocks,
                        sourceTemplateId: day.source_template_id || undefined,
                    })
                ).unwrap()

                // При создании первого дня сразу выбираем его для отображения
                if (day === trainerProgramDays[0]) {
                    dispatch(selectProgramDay(createdDay.day.id))
                }
            }

            // Перезагружаем программы клиента и выбираем новую
            await dispatch(fetchPrograms(clientId))
            dispatch(selectProgram(newProgram.id))
            await dispatch(fetchProgramDays(newProgram.id))

            notifications.show({
                title: t('common.success'),
                message: t('trainer.clients.programAssigned'),
                color: 'green',
            })

            closeSelectProgramModal()
            setSelectedTrainerProgramId(null)
        } catch (error: any) {
            notifications.show({
                title: t('common.error'),
                message: error?.message || t('trainer.clients.error.assignProgram'),
                color: 'red',
            })
        } finally {
            setIsCopying(false)
        }
    }

    const client = clients.find((c) => c.id === clientId)

    // Пока загружаем, показываем заглушку или ничего
    if (!client) {
        if (isLoadingClients) return null // или можно показать Loader

        return (
            <Stack gap="md">
                <Button leftSection={<IconArrowLeft size={16} />} variant="subtle" onClick={() => navigate('/trainer/clients')}>
                    {t('common.back')}
                </Button>
                <Text>{t('trainer.clients.clientNotFound')}</Text>
            </Stack>
        )
    }

    const selectedDay = days.find((d) => d.id === selectedDayId) || days[0]

    return (
        <Stack gap="lg">
            {!embedded && (
                <>
                    <Breadcrumbs>
                        <Anchor component={Link} to="/trainer/clients">
                            {t('trainer.clients.title')}
                        </Anchor>
                        <Anchor component={Link} to={`/trainer/clients/${clientId}`}>
                            {client.fullName}
                        </Anchor>
                        <Text>{t('common.program')}</Text>
                    </Breadcrumbs>

                    <Group justify="space-between">
                        <Title order={2}>
                            {t('common.program')} - {client.fullName}
                        </Title>
                        <Button leftSection={<IconPlus size={16} />} onClick={openSelectProgramModal}>
                            {t('trainer.clients.selectProgram')}
                        </Button>
                    </Group>
                </>
            )}

            {embedded && (
                <Group justify="flex-end">
                    <Button leftSection={<IconPlus size={16} />} onClick={openSelectProgramModal}>
                        {t('trainer.clients.selectProgram')}
                    </Button>
                </Group>
            )}

            <Card withBorder padding="md">
                <Stack gap="md">
                    {days.length === 0 ? (
                        <Text c="dimmed" ta="center" py="xl">
                            {t('program.noDays')}
                        </Text>
                    ) : (
                        <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="md">
                            <Card withBorder padding="md">
                                <Stack gap="md">
                                    <Title order={4}>{t('program.days')}</Title>
                                    <ScrollArea h={400}>
                                        <Stack gap="xs">
                                            {days.map((day) => (
                                                <Card
                                                    key={day.id}
                                                    withBorder
                                                    padding="sm"
                                                    style={{
                                                        cursor: 'pointer',
                                                        backgroundColor: selectedDay?.id === day.id ? 'var(--mantine-color-violet-0)' : undefined,
                                                    }}
                                                    onClick={() => dispatch(selectProgramDay(day.id))}
                                                >
                                                    <Text fw={selectedDay?.id === day.id ? 600 : 500}>{day.name}</Text>
                                                    <Text size="xs" c="dimmed">
                                                        {day.blocks.reduce((sum, block) => sum + block.exercises.length, 0)} {t('program.exercises')}
                                                    </Text>
                                                </Card>
                                            ))}
                                        </Stack>
                                    </ScrollArea>
                                </Stack>
                            </Card>

                            {selectedDay && (
                                <Card withBorder padding="md">
                                    <Stack gap="md">
                                        <Title order={4}>{selectedDay.name}</Title>
                                        <Tabs defaultValue="warmup">
                                            <Tabs.List>
                                                <Tabs.Tab value="warmup">{t('program.sections.warmup')}</Tabs.Tab>
                                                <Tabs.Tab value="main">{t('program.sections.main')}</Tabs.Tab>
                                                <Tabs.Tab value="cooldown">{t('program.sections.cooldown')}</Tabs.Tab>
                                            </Tabs.List>

                                            <Tabs.Panel value="warmup" pt="md">
                                                <Stack gap="xs">
                                                    {selectedDay.blocks.find((b) => b.type === 'warmup')?.exercises.length === 0 ? (
                                                        <Text size="sm" c="dimmed">
                                                            {t('program.noExercises')}
                                                        </Text>
                                                    ) : (
                                                        selectedDay.blocks
                                                            .find((b) => b.type === 'warmup')
                                                            ?.exercises.map((exercise) => (
                                                                <Card key={exercise.id} withBorder padding="sm">
                                                                    <Group justify="space-between">
                                                                        <Stack gap={2}>
                                                                            <Text fw={500}>{exercise.title}</Text>
                                                                            {exercise.duration && (
                                                                                <Text size="xs" c="dimmed">
                                                                                    {exercise.duration}
                                                                                </Text>
                                                                            )}
                                                                        </Stack>
                                                                    </Group>
                                                                </Card>
                                                            )) || []
                                                    )}
                                                </Stack>
                                            </Tabs.Panel>

                                            <Tabs.Panel value="main" pt="md">
                                                <Stack gap="xs">
                                                    {selectedDay.blocks.find((b) => b.type === 'main')?.exercises.length === 0 ? (
                                                        <Text size="sm" c="dimmed">
                                                            {t('program.noExercises')}
                                                        </Text>
                                                    ) : (
                                                        selectedDay.blocks
                                                            .find((b) => b.type === 'main')
                                                            ?.exercises.map((exercise) => (
                                                                <Card key={exercise.id} withBorder padding="sm">
                                                                    <Group justify="space-between">
                                                                        <Stack gap={2}>
                                                                            <Text fw={500}>{exercise.title}</Text>
                                                                            <Group gap="xs">
                                                                                {exercise.sets && (
                                                                                    <Badge size="sm" variant="light">
                                                                                        {exercise.sets} {t('program.sets')}
                                                                                    </Badge>
                                                                                )}
                                                                                {exercise.reps && (
                                                                                    <Badge size="sm" variant="light">
                                                                                        {exercise.reps} {t('program.reps')}
                                                                                    </Badge>
                                                                                )}
                                                                                {exercise.weight && (
                                                                                    <Badge size="sm" variant="light">
                                                                                        {exercise.weight}
                                                                                    </Badge>
                                                                                )}
                                                                                {exercise.rest && (
                                                                                    <Text size="xs" c="dimmed">
                                                                                        {exercise.rest}
                                                                                    </Text>
                                                                                )}
                                                                            </Group>
                                                                        </Stack>
                                                                    </Group>
                                                                </Card>
                                                            )) || []
                                                    )}
                                                </Stack>
                                            </Tabs.Panel>

                                            <Tabs.Panel value="cooldown" pt="md">
                                                <Stack gap="xs">
                                                    {selectedDay.blocks.find((b) => b.type === 'cooldown')?.exercises.length === 0 ? (
                                                        <Text size="sm" c="dimmed">
                                                            {t('program.noExercises')}
                                                        </Text>
                                                    ) : (
                                                        selectedDay.blocks
                                                            .find((b) => b.type === 'cooldown')
                                                            ?.exercises.map((exercise) => (
                                                                <Card key={exercise.id} withBorder padding="sm">
                                                                    <Group justify="space-between">
                                                                        <Stack gap={2}>
                                                                            <Text fw={500}>{exercise.title}</Text>
                                                                            {exercise.duration && (
                                                                                <Text size="xs" c="dimmed">
                                                                                    {exercise.duration}
                                                                                </Text>
                                                                            )}
                                                                        </Stack>
                                                                    </Group>
                                                                </Card>
                                                            )) || []
                                                    )}
                                                </Stack>
                                            </Tabs.Panel>
                                        </Tabs>
                                    </Stack>
                                </Card>
                            )}
                        </SimpleGrid>
                    )}
                </Stack>
            </Card>

            {/* Modal для выбора программы тренера */}
            <Modal opened={selectProgramModalOpened} onClose={closeSelectProgramModal} title={t('trainer.clients.selectProgram')}>
                <Stack gap="md">
                    <Select
                        label={t('trainer.clients.selectProgramLabel')}
                        placeholder={t('trainer.clients.selectProgramPlaceholder')}
                        data={uniqueTrainerPrograms.map((p) => ({ value: p.id, label: p.title }))}
                        value={selectedTrainerProgramId}
                        onChange={(value) => setSelectedTrainerProgramId(value)}
                        searchable
                    />
                    <Group justify="flex-end">
                        <Button variant="default" onClick={closeSelectProgramModal}>
                            {t('common.cancel')}
                        </Button>
                        <Button
                            onClick={handleAssignProgram}
                            disabled={!selectedTrainerProgramId || isCopying}
                            loading={isCopying}
                        >
                            {t('trainer.clients.assignProgram')}
                        </Button>
                    </Group>
                </Stack>
            </Modal>
        </Stack>
    )
}

export const ClientProgramPage = () => {
    return <ClientProgramContent />
}

