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
} from '@mantine/core'
import { useTranslation } from 'react-i18next'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAppSelector } from '@/shared/hooks/useAppSelector'
import { useAppDispatch } from '@/shared/hooks/useAppDispatch'
import { useEffect, useState } from 'react'
import { IconArrowLeft } from '@tabler/icons-react'
import { fetchPrograms, fetchProgramDays, selectProgram } from '@/app/store/slices/programSlice'
import { setClients } from '@/app/store/slices/clientsSlice'
import { apiClient } from '@/shared/api/client'

export const ClientProgramPage = () => {
    const { t } = useTranslation()
    const { clientId } = useParams<{ clientId: string }>()
    const navigate = useNavigate()
    const dispatch = useAppDispatch()
    const { clients } = useAppSelector((state) => state.clients)
    const { days, selectedProgramId, selectedDayId } = useAppSelector((state) => state.program)
    const [isLoadingClients, setIsLoadingClients] = useState(false)
    
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

    const client = clients.find((c) => c.id === clientId)

    // Показываем "клиент не найден" только после попытки загрузки
    if (!client && !isLoadingClients) {
        return (
            <Stack gap="md">
                <Button leftSection={<IconArrowLeft size={16} />} variant="subtle" onClick={() => navigate('/trainer/clients')}>
                    {t('common.back')}
                </Button>
                <Text>{t('trainer.clients.clientNotFound')}</Text>
            </Stack>
        )
    }

    // Пока загружаем, показываем заглушку или ничего
    if (!client && isLoadingClients) {
        return null // или можно показать Loader
    }

    const selectedDay = days.find((d) => d.id === selectedDayId) || days[0]

    return (
        <Stack gap="lg">
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
            </Group>

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
        </Stack>
    )
}

