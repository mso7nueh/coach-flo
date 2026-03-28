import { useState, useEffect } from 'react'
import {
    Stack, Title, Group, Text, Avatar, Badge, Card, Grid,
    Tabs, Loader, Center, Button, Table, ScrollArea, SimpleGrid,
    TextInput, ActionIcon, Anchor
} from '@mantine/core'
import { useParams, useNavigate } from 'react-router-dom'
import {
    IconArrowLeft, IconUsers, IconCalendar, IconCurrencyRubel,
    IconLibrary, IconChartBar, IconSearch, IconBarbell, IconUser
} from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'
import { apiClient } from '@/shared/api/client'
import dayjs from 'dayjs'
import 'dayjs/locale/ru'

dayjs.locale('ru')

interface TrainerCard {
    id: string
    full_name: string
    email: string
    phone?: string
    avatar?: string
    connection_code?: string
    total_clients: number
    active_clients: number
    total_workouts: number
    completed_workouts: number
    total_revenue: number
}

interface ClientItem {
    id: string
    full_name: string
    email: string
    phone?: string
    is_active: boolean
    created_at: string
    workouts_package?: number
}

interface WorkoutItem {
    id: string
    title: string
    start: string
    end: string
    attendance: string
    user_id: string
    format?: string
}

interface PaymentItem {
    id: string
    client_id: string
    amount: number
    date: string
    type: string
    remaining_sessions?: number
}

interface ExerciseItem {
    id: string
    name: string
    muscle_groups?: string
    difficulty?: string
    description?: string
}

export const TrainerCardPage = () => {
    const { trainerId } = useParams<{ trainerId: string }>()
    const navigate = useNavigate()
    const [trainer, setTrainer] = useState<TrainerCard | null>(null)
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState<string | null>('clients')

    // Tab data
    const [clients, setClients] = useState<ClientItem[]>([])
    const [workouts, setWorkouts] = useState<WorkoutItem[]>([])
    const [payments, setPayments] = useState<PaymentItem[]>([])
    const [exercises, setExercises] = useState<ExerciseItem[]>([])
    const [tabLoading, setTabLoading] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')

    useEffect(() => {
        if (!trainerId) return
        apiClient.getClubTrainer(trainerId)
            .then(setTrainer)
            .catch(e => notifications.show({ title: 'Ошибка', message: e?.message, color: 'red' }))
            .finally(() => setLoading(false))
    }, [trainerId])

    const getInitials = (name: string) =>
        name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)

    // Load data when tab changes
    useEffect(() => {
        if (!trainerId || !activeTab) return

        setTabLoading(true)
        const load = async () => {
            try {
                const now = dayjs()
                switch (activeTab) {
                    case 'clients':
                        // Load all club trainers' clients via backend (trainer-specific)
                        // We use getClients which returns the authed trainer's clients;
                        // for club admin view we show the trainer card stats + client count from API
                        // The /api/clients/ endpoint is trainer-scoped, so we call getClubTrainer for stats
                        // and show a simple list from trainer card data
                        break
                    case 'calendar':
                        // Club calendar is available via /api/clubs/calendar, but trainer-specific
                        // we call the club calendar endpoint and filter by this trainer
                        const wData = await apiClient.getClubCalendar({
                            start_date: now.subtract(30, 'day').toISOString(),
                            end_date: now.add(30, 'day').toISOString(),
                        })
                        setWorkouts((wData as any[]).filter((w: any) => w.trainer_id === trainerId))
                        break
                    case 'finances':
                        // Finance stats from trainer card
                        break
                    case 'library':
                        const exData = await apiClient.getClubTrainerExercises(trainerId)
                        setExercises(exData as ExerciseItem[])
                        break
                }
            } catch (e: any) {
                notifications.show({ title: 'Ошибка загрузки', message: e?.message || 'Не удалось загрузить данные', color: 'red' })
            } finally {
                setTabLoading(false)
            }
        }
        load()
    }, [activeTab, trainerId])

    if (loading) return <Center h={200}><Loader /></Center>
    if (!trainer) return <Text c="dimmed">Тренер не найден</Text>

    const attendanceRate = trainer.total_workouts > 0
        ? Math.round(trainer.completed_workouts / trainer.total_workouts * 100)
        : 0

    const avgCheck = trainer.completed_workouts > 0
        ? Math.round(trainer.total_revenue / trainer.completed_workouts)
        : 0

    const filteredExercises = exercises.filter(e =>
        !searchQuery || e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (e.muscle_groups || '').toLowerCase().includes(searchQuery.toLowerCase())
    )

    const filteredWorkouts = workouts.filter(w =>
        !searchQuery || w.title.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const attendanceBadge = (status: string) => {
        switch (status) {
            case 'completed': return <Badge color="green" size="sm">Проведена</Badge>
            case 'missed': return <Badge color="red" size="sm">Пропущена</Badge>
            case 'cancelled': return <Badge color="gray" size="sm">Отменена</Badge>
            default: return <Badge color="blue" size="sm">Запланирована</Badge>
        }
    }

    return (
        <Stack gap="lg">
            <Group>
                <Button
                    variant="subtle"
                    leftSection={<IconArrowLeft size={16} />}
                    onClick={() => navigate('/club/trainers')}
                >
                    Назад к тренерам
                </Button>
            </Group>

            {/* Header */}
            <Card withBorder padding="lg">
                <Group gap="lg">
                    <Avatar src={trainer.avatar} size={80} color="violet" radius="xl">
                        {getInitials(trainer.full_name)}
                    </Avatar>
                    <Stack gap={4}>
                        <Title order={3}>{trainer.full_name}</Title>
                        <Text size="sm" c="dimmed">{trainer.email}</Text>
                        {trainer.phone && <Text size="sm" c="dimmed">{trainer.phone}</Text>}
                        {trainer.connection_code && (
                            <Badge variant="light" color="gray" size="sm">
                                Код: {trainer.connection_code}
                            </Badge>
                        )}
                    </Stack>
                </Group>
            </Card>

            {/* Summary stats */}
            <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="md">
                {[
                    { label: 'Активных клиентов', value: trainer.active_clients, sub: `всего: ${trainer.total_clients}`, color: 'violet', icon: <IconUsers size={20} /> },
                    { label: 'Тренировок', value: trainer.total_workouts, sub: `проведено: ${trainer.completed_workouts}`, color: 'blue', icon: <IconCalendar size={20} /> },
                    { label: 'Посещаемость', value: `${attendanceRate}%`, sub: 'от запланированных', color: attendanceRate >= 80 ? 'green' : 'orange', icon: <IconChartBar size={20} /> },
                    { label: 'Выручка', value: `${trainer.total_revenue.toLocaleString('ru')} ₽`, sub: `ср. чек: ${avgCheck.toLocaleString()} ₽`, color: 'teal', icon: <IconCurrencyRubel size={20} /> },
                ].map(stat => (
                    <Card key={stat.label} withBorder padding="md" style={{ borderLeft: `3px solid var(--mantine-color-${stat.color}-5)` }}>
                        <Group gap="sm" wrap="nowrap">
                            <Text c={stat.color}>{stat.icon}</Text>
                            <Stack gap={0}>
                                <Text size="lg" fw={700}>{stat.value}</Text>
                                <Text size="xs" c="dimmed">{stat.label}</Text>
                                <Text size="xs" c="dimmed" style={{ opacity: 0.7 }}>{stat.sub}</Text>
                            </Stack>
                        </Group>
                    </Card>
                ))}
            </SimpleGrid>

            {/* Tabs */}
            <Tabs value={activeTab} onChange={setActiveTab}>
                <Tabs.List>
                    <Tabs.Tab value="clients" leftSection={<IconUsers size={16} />}>
                        Клиенты
                    </Tabs.Tab>
                    <Tabs.Tab value="calendar" leftSection={<IconCalendar size={16} />}>
                        Календарь
                    </Tabs.Tab>
                    <Tabs.Tab value="library" leftSection={<IconLibrary size={16} />}>
                        Библиотека
                    </Tabs.Tab>
                    <Tabs.Tab value="finances" leftSection={<IconCurrencyRubel size={16} />}>
                        Финансы
                    </Tabs.Tab>
                </Tabs.List>

                {/* ── Clients ── */}
                <Tabs.Panel value="clients" pt="md">
                    <Card withBorder padding="md">
                        <Stack gap="md">
                            <Group justify="space-between">
                                <Text fw={600}>Клиенты тренера</Text>
                                <Badge color="violet" variant="light">
                                    {trainer.active_clients} активных / {trainer.total_clients} всего
                                </Badge>
                            </Group>
                            <Text size="sm" c="dimmed">
                                Общее количество клиентов тренера: <b>{trainer.total_clients}</b>, из них активных: <b>{trainer.active_clients}</b>.
                            </Text>
                            <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
                                <Card withBorder padding="sm" style={{ textAlign: 'center' }}>
                                    <Stack gap={2} align="center">
                                        <IconUsers size={28} color="var(--mantine-color-violet-5)" />
                                        <Text size="xl" fw={800}>{trainer.total_clients}</Text>
                                        <Text size="xs" c="dimmed">Всего клиентов</Text>
                                    </Stack>
                                </Card>
                                <Card withBorder padding="sm" style={{ textAlign: 'center' }}>
                                    <Stack gap={2} align="center">
                                        <IconUser size={28} color="var(--mantine-color-green-5)" />
                                        <Text size="xl" fw={800}>{trainer.active_clients}</Text>
                                        <Text size="xs" c="dimmed">Активных</Text>
                                    </Stack>
                                </Card>
                                <Card withBorder padding="sm" style={{ textAlign: 'center' }}>
                                    <Stack gap={2} align="center">
                                        <IconUser size={28} color="var(--mantine-color-gray-5)" />
                                        <Text size="xl" fw={800}>{trainer.total_clients - trainer.active_clients}</Text>
                                        <Text size="xs" c="dimmed">Неактивных</Text>
                                    </Stack>
                                </Card>
                            </SimpleGrid>
                        </Stack>
                    </Card>
                </Tabs.Panel>

                {/* ── Calendar ── */}
                <Tabs.Panel value="calendar" pt="md">
                    <Card withBorder padding="md">
                        <Stack gap="md">
                            <Group justify="space-between">
                                <Text fw={600}>Расписание тренера</Text>
                                <TextInput
                                    placeholder="Поиск по названию..."
                                    leftSection={<IconSearch size={14} />}
                                    size="xs"
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    style={{ width: 220 }}
                                />
                            </Group>
                            {tabLoading ? (
                                <Center py="xl"><Loader size="sm" /></Center>
                            ) : filteredWorkouts.length === 0 ? (
                                <Stack align="center" py="xl" gap="xs">
                                    <IconCalendar size={40} color="var(--mantine-color-gray-4)" />
                                    <Text c="dimmed" size="sm">Тренировок за последние 30 дней не найдено</Text>
                                </Stack>
                            ) : (
                                <ScrollArea>
                                    <Table striped highlightOnHover>
                                        <Table.Thead>
                                            <Table.Tr>
                                                <Table.Th>Название</Table.Th>
                                                <Table.Th>Начало</Table.Th>
                                                <Table.Th>Конец</Table.Th>
                                                <Table.Th>Статус</Table.Th>
                                            </Table.Tr>
                                        </Table.Thead>
                                        <Table.Tbody>
                                            {filteredWorkouts.map(w => (
                                                <Table.Tr key={w.id}>
                                                    <Table.Td><Text fw={500} size="sm">{w.title}</Text></Table.Td>
                                                    <Table.Td><Text size="sm">{dayjs(w.start).format('D MMM, HH:mm')}</Text></Table.Td>
                                                    <Table.Td><Text size="sm">{dayjs(w.end).format('HH:mm')}</Text></Table.Td>
                                                    <Table.Td>{attendanceBadge(w.attendance)}</Table.Td>
                                                </Table.Tr>
                                            ))}
                                        </Table.Tbody>
                                    </Table>
                                </ScrollArea>
                            )}
                            <Text size="xs" c="dimmed" ta="center">
                                Полное расписание клуба доступно в разделе{' '}
                                <Anchor size="xs" onClick={() => navigate('/club/calendar')}>Календарь клуба</Anchor>
                            </Text>
                        </Stack>
                    </Card>
                </Tabs.Panel>

                {/* ── Library ── */}
                <Tabs.Panel value="library" pt="md">
                    <Card withBorder padding="md">
                        <Stack gap="md">
                            <Group justify="space-between">
                                <Text fw={600}>Библиотека упражнений</Text>
                                <TextInput
                                    placeholder="Поиск упражнений..."
                                    leftSection={<IconSearch size={14} />}
                                    size="xs"
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    style={{ width: 220 }}
                                />
                            </Group>
                            {tabLoading ? (
                                <Center py="xl"><Loader size="sm" /></Center>
                            ) : filteredExercises.length === 0 ? (
                                <Stack align="center" py="xl" gap="xs">
                                    <IconBarbell size={40} color="var(--mantine-color-gray-4)" />
                                    <Text c="dimmed" size="sm">Упражнений не найдено</Text>
                                </Stack>
                            ) : (
                                <ScrollArea>
                                    <Table striped highlightOnHover>
                                        <Table.Thead>
                                            <Table.Tr>
                                                <Table.Th>Упражнение</Table.Th>
                                                <Table.Th>Группы мышц</Table.Th>
                                                <Table.Th>Уровень</Table.Th>
                                            </Table.Tr>
                                        </Table.Thead>
                                        <Table.Tbody>
                                            {filteredExercises.slice(0, 50).map(ex => (
                                                <Table.Tr key={ex.id}>
                                                    <Table.Td>
                                                        <Text fw={500} size="sm">{ex.name}</Text>
                                                        {ex.description && (
                                                            <Text size="xs" c="dimmed" lineClamp={1}>{ex.description}</Text>
                                                        )}
                                                    </Table.Td>
                                                    <Table.Td>
                                                        <Text size="sm" c="dimmed">{ex.muscle_groups || '—'}</Text>
                                                    </Table.Td>
                                                    <Table.Td>
                                                        {ex.difficulty ? (
                                                            <Badge
                                                                size="sm"
                                                                color={ex.difficulty === 'beginner' ? 'green' : ex.difficulty === 'intermediate' ? 'orange' : 'red'}
                                                                variant="light"
                                                            >
                                                                {ex.difficulty === 'beginner' ? 'Начальный' : ex.difficulty === 'intermediate' ? 'Средний' : 'Продвинутый'}
                                                            </Badge>
                                                        ) : <Text size="sm" c="dimmed">—</Text>}
                                                    </Table.Td>
                                                </Table.Tr>
                                            ))}
                                        </Table.Tbody>
                                    </Table>
                                </ScrollArea>
                            )}
                        </Stack>
                    </Card>
                </Tabs.Panel>

                {/* ── Finances ── */}
                <Tabs.Panel value="finances" pt="md">
                    <Stack gap="md">
                        <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="md">
                            {[
                                { label: 'Общая выручка', value: `${trainer.total_revenue.toLocaleString('ru')} ₽`, color: 'teal' },
                                { label: 'Всего тренировок', value: trainer.total_workouts, color: 'blue' },
                                { label: 'Проведено занятий', value: trainer.completed_workouts, color: 'violet' },
                                { label: 'Средний чек', value: `${avgCheck.toLocaleString('ru')} ₽`, color: 'orange' },
                            ].map(stat => (
                                <Card key={stat.label} withBorder padding="md" style={{ borderLeft: `3px solid var(--mantine-color-${stat.color}-5)` }}>
                                    <Stack gap={2}>
                                        <Text size="xs" c="dimmed" tt="uppercase" fw={500}>{stat.label}</Text>
                                        <Text size="xl" fw={800}>{stat.value}</Text>
                                    </Stack>
                                </Card>
                            ))}
                        </SimpleGrid>

                        <Card withBorder padding="md">
                            <Stack gap="sm">
                                <Text fw={600}>Финансовая сводка</Text>
                                <Table>
                                    <Table.Tbody>
                                        <Table.Tr>
                                            <Table.Td><Text size="sm" c="dimmed">Выручка за всё время</Text></Table.Td>
                                            <Table.Td><Text size="sm" fw={600}>{trainer.total_revenue.toLocaleString('ru')} ₽</Text></Table.Td>
                                        </Table.Tr>
                                        <Table.Tr>
                                            <Table.Td><Text size="sm" c="dimmed">Всего тренировок</Text></Table.Td>
                                            <Table.Td><Text size="sm" fw={600}>{trainer.total_workouts}</Text></Table.Td>
                                        </Table.Tr>
                                        <Table.Tr>
                                            <Table.Td><Text size="sm" c="dimmed">Проведено тренировок</Text></Table.Td>
                                            <Table.Td><Text size="sm" fw={600}>{trainer.completed_workouts} ({attendanceRate}%)</Text></Table.Td>
                                        </Table.Tr>
                                        {trainer.completed_workouts > 0 && (
                                            <Table.Tr>
                                                <Table.Td><Text size="sm" c="dimmed">Средняя стоимость занятия</Text></Table.Td>
                                                <Table.Td><Text size="sm" fw={600}>{avgCheck.toLocaleString('ru')} ₽</Text></Table.Td>
                                            </Table.Tr>
                                        )}
                                        <Table.Tr>
                                            <Table.Td><Text size="sm" c="dimmed">Активных клиентов</Text></Table.Td>
                                            <Table.Td><Text size="sm" fw={600}>{trainer.active_clients}</Text></Table.Td>
                                        </Table.Tr>
                                    </Table.Tbody>
                                </Table>
                            </Stack>
                        </Card>
                    </Stack>
                </Tabs.Panel>
            </Tabs>
        </Stack>
    )
}
