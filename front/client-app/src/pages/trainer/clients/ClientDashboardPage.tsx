import {
    Avatar,
    Badge,
    Button,
    Card,
    Group,
    Stack,
    Text,
    Title,
    Breadcrumbs,
    Anchor,
} from '@mantine/core'
import { useTranslation } from 'react-i18next'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAppSelector } from '@/shared/hooks/useAppSelector'
import { useAppDispatch } from '@/shared/hooks/useAppDispatch'
import { IconArrowLeft, IconCalendar, IconChartBar, IconBarbell, IconEdit, IconAlertTriangle, IconTarget } from '@tabler/icons-react'
import { SimpleGrid } from '@mantine/core'
import dayjs from 'dayjs'
import { updateClient, setClients } from '@/app/store/slices/clientsSlice'
import { fetchPayments } from '@/app/store/slices/financesSlice'
import { fetchWorkouts } from '@/app/store/slices/calendarSlice'
import { fetchTrainerNotes } from '@/app/store/slices/dashboardSlice'
import { fetchBodyMetrics, fetchExerciseMetrics } from '@/app/store/slices/metricsSlice'
import { useEffect, useState, useMemo } from 'react'
import { apiClient } from '@/shared/api/client'

const GOALS_MAP: Record<string, string> = {
    weight_loss: 'Похудение',
    muscle_gain: 'Набор мышечной массы',
    endurance: 'Выносливость',
    strength: 'Сила',
    flexibility: 'Гибкость',
    general_fitness: 'Общее здоровье',
}

const getGoalLabel = (goalKey: string): string => {
    return GOALS_MAP[goalKey] || goalKey
}

export const ClientDashboardPage = () => {
    const { t } = useTranslation()
    const { clientId } = useParams<{ clientId: string }>()
    const navigate = useNavigate()
    const dispatch = useAppDispatch()
    const { clients } = useAppSelector((state) => state.clients)
    const { workouts } = useAppSelector((state) => state.calendar)
    const { trainerNotes } = useAppSelector((state) => state.dashboard)
    const { bodyMetrics, exerciseMetrics } = useAppSelector((state) => state.metrics)
    const { payments } = useAppSelector((state) => state.finances)
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

    // Загружаем платежи, тренировки, заметки, метрики и онбординг при монтировании компонента
    useEffect(() => {
        if (!clientId) return

        dispatch(fetchPayments())
        // Загружаем тренировки за последние 90 дней для отображения
        const endDate = dayjs().toISOString()
        const startDate = dayjs().subtract(90, 'days').toISOString()
        dispatch(fetchWorkouts({ start_date: startDate, end_date: endDate, client_id: clientId }))

        // Загружаем заметки конкретного клиента
        const loadClientNotes = async () => {
            try {
                const notesData = await apiClient.getTrainerClientNotes(clientId)
                const mappedNotes = notesData.map((note: any) => ({
                    id: note.id,
                    title: note.title,
                    content: note.content || '',
                    updatedAt: note.created_at,
                    clientId: note.client_id,
                }))
                dispatch({
                    type: 'dashboard/fetchNotes/fulfilled',
                    payload: mappedNotes
                } as any)
            } catch (error) {
                console.error('Error loading client notes:', error)
            }
        }
        loadClientNotes()

        // Загружаем метрики для клиента - используем API напрямую для загрузки метрик конкретного клиента
        const loadClientMetrics = async () => {
            try {
                await apiClient.getClientMetrics(clientId)
            } catch (error) {
                console.error('Error loading client metrics:', error)
            }
        }
        loadClientMetrics()

        // Загружаем онбординг клиента для получения целей и ограничений
        const loadClientData = async () => {
            try {
                const [onboardingData, clientStats] = await Promise.all([
                    apiClient.getClientOnboarding(clientId).catch(() => null),
                    apiClient.getClientStats(clientId).catch(() => null)
                ])

                // Обновляем данные клиента - используем getState чтобы избежать зависимости от clients
                const updates: any = {}

                if (onboardingData) {
                    updates.goals = onboardingData.goals || []
                    updates.restrictions = onboardingData.restrictions || []
                    updates.weight = onboardingData.weight
                    updates.height = onboardingData.height
                    updates.age = onboardingData.age
                    updates.activityLevel = onboardingData.activity_level as 'low' | 'medium' | 'high' | undefined
                }

                if (clientStats) {
                    updates.totalWorkouts = clientStats.total_workouts || 0
                    updates.completedWorkouts = clientStats.completed_workouts || 0
                    updates.attendanceRate = clientStats.attendance_rate || 0
                    updates.lastWorkout = clientStats.last_workout
                    updates.nextWorkout = clientStats.next_workout
                }

                if (Object.keys(updates).length > 0) {
                    dispatch(updateClient({ id: clientId, updates }))
                }
            } catch (error) {
                console.error('Error loading client data:', error)
            }
        }

        loadClientData()
    }, [dispatch, clientId])

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

    const clientWorkouts = workouts.filter((w) => w.userId === clientId || w.trainerId === clientId)
    const upcomingWorkouts = clientWorkouts
        .filter((w) => dayjs(w.start).isAfter(dayjs()))
        .sort((a, b) => dayjs(a.start).diff(dayjs(b.start)))
        .slice(0, 3)

    const recentWorkouts = clientWorkouts
        .filter((w) => dayjs(w.start).isBefore(dayjs()))
        .sort((a, b) => dayjs(b.start).diff(dayjs(a.start)))
        .slice(0, 3)

    const clientNotes = trainerNotes.filter((note) => note.clientId === clientId)
    const clientPayments = (payments || []).filter((payment) => payment.clientId === client.id).sort((a, b) => dayjs(b.date).diff(dayjs(a.date)))
    const determineActivePayment = () => {
        const now = dayjs()
        return (
            clientPayments.find((payment) => {
                if (payment.type === 'package') {
                    return (payment.remainingSessions ?? 0) > 0
                }
                if (payment.type === 'subscription') {
                    return !payment.nextPaymentDate || dayjs(payment.nextPaymentDate).isAfter(now)
                }
                return payment.type === 'single' && dayjs(payment.date).isSame(now, 'day')
            }) ?? clientPayments[0]
        )
    }
    const activePayment = determineActivePayment()
    const paymentStatus = activePayment ? 'paid' : 'unpaid'
    const remainingSessions =
        activePayment?.type === 'package'
            ? activePayment.remainingSessions ?? 0
            : activePayment?.type === 'single'
                ? 1
                : undefined
    const totalSessions =
        activePayment?.type === 'package'
            ? activePayment.packageSize ?? undefined
            : activePayment?.type === 'single'
                ? 1
                : undefined

    const handleDisableClient = () => {
        dispatch(updateClient({ id: client.id, updates: { isActive: false } }))
    }

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map((n) => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2)
    }

    return (
        <Stack gap="lg">
            <Breadcrumbs>
                <Anchor component={Link} to="/trainer/clients">
                    {t('trainer.clients.title')}
                </Anchor>
                <Text>{client.fullName}</Text>
            </Breadcrumbs>

            <Group justify="space-between" align="flex-start">
                <Group gap="md">
                    <Avatar src={client.avatar} size={60} color="violet">
                        {getInitials(client.fullName)}
                    </Avatar>
                    <Stack gap={4}>
                        <Title order={2}>{client.fullName}</Title>
                        {client.email && (
                            <Text size="sm" c="dimmed">
                                {client.email}
                            </Text>
                        )}
                        {client.phone && (
                            <Text size="sm" c="dimmed">
                                {client.phone}
                            </Text>
                        )}
                    </Stack>
                </Group>
                <Group gap="xs">
                    <Badge variant="light" color={client.attendanceRate >= 80 ? 'green' : client.attendanceRate >= 60 ? 'yellow' : 'red'}>
                        {t('trainer.clients.attendance')}: {client.attendanceRate}%
                    </Badge>
                    <Badge variant="light">{client.format === 'online' ? t('trainer.clients.formatOnline') : client.format === 'offline' ? t('trainer.clients.formatOffline') : t('trainer.clients.formatBoth')}</Badge>
                </Group>
            </Group>

            <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md">
                <Card withBorder padding="md">
                    <Stack gap="xs">
                        <Text size="xs" c="dimmed" fw={600} tt="uppercase">
                            {t('dashboard.stats.totalWorkouts')}
                        </Text>
                        <Text fw={700} size="xl">
                            {client.totalWorkouts}
                        </Text>
                    </Stack>
                </Card>
                <Card withBorder padding="md">
                    <Stack gap="xs">
                        <Text size="xs" c="dimmed" fw={600} tt="uppercase">
                            {t('dashboard.stats.attendance')}
                        </Text>
                        <Text fw={700} size="xl">
                            {client.attendanceRate}%
                        </Text>
                    </Stack>
                </Card>
                <Card withBorder padding="md">
                    <Stack gap="xs">
                        <Text size="xs" c="dimmed" fw={600} tt="uppercase">
                            {t('trainer.clients.lastWorkout')}
                        </Text>
                        <Text fw={500} size="sm">
                            {client.lastWorkout ? dayjs(client.lastWorkout).format('D MMM YYYY') : t('trainer.clients.noWorkouts')}
                        </Text>
                    </Stack>
                </Card>
                <Card withBorder padding="md">
                    <Stack gap="xs">
                        <Text size="xs" c="dimmed" fw={600} tt="uppercase">
                            {t('trainer.clients.nextWorkout')}
                        </Text>
                        <Text fw={500} size="sm">
                            {client.nextWorkout ? dayjs(client.nextWorkout).format('D MMM YYYY') : t('trainer.clients.noWorkouts')}
                        </Text>
                    </Stack>
                </Card>
            </SimpleGrid>

            <Card withBorder padding="md">
                <Stack gap="md">
                    <Group justify="space-between" align="center">
                        <Stack gap={2}>
                            <Text size="xs" c="dimmed" fw={600} tt="uppercase">
                                {t('trainer.clients.finance.title')}
                            </Text>
                            <Text fw={600}>
                                {t('trainer.clients.finance.statusLabel')}{' '}
                                <Text span inherit c={paymentStatus === 'paid' ? 'green.7' : 'red.6'}>
                                    {t(`trainer.clients.finance.status.${paymentStatus}`)}
                                </Text>
                            </Text>
                        </Stack>
                        <Badge color={paymentStatus === 'paid' ? 'green' : 'red'} variant="filled">
                            {t(`trainer.clients.finance.status.${paymentStatus}`)}
                        </Badge>
                    </Group>
                    <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="sm">
                        <Card withBorder padding="sm">
                            <Stack gap={2}>
                                <Text size="xs" c="dimmed">
                                    {t('trainer.clients.finance.sessionsPlannedLabel')}
                                </Text>
                                <Text fw={600}>{upcomingWorkouts.length}</Text>
                            </Stack>
                        </Card>
                        <Card withBorder padding="sm">
                            <Stack gap={2}>
                                <Text size="xs" c="dimmed">
                                    {t('trainer.clients.finance.remainingSessions')}
                                </Text>
                                <Text fw={600}>{remainingSessions ?? '—'}</Text>
                            </Stack>
                        </Card>
                        <Card withBorder padding="sm">
                            <Stack gap={2}>
                                <Text size="xs" c="dimmed">
                                    {t('trainer.clients.finance.totalSessionsShort')}
                                </Text>
                                <Text fw={600}>{totalSessions ?? '—'}</Text>
                            </Stack>
                        </Card>
                        <Card withBorder padding="sm">
                            <Stack gap={2}>
                                <Text size="xs" c="dimmed">
                                    {t('trainer.clients.finance.lastPayment')}
                                </Text>
                                <Text fw={600}>
                                    {clientPayments[0] ? dayjs(clientPayments[0].date).format('D MMM YYYY') : '—'}
                                </Text>
                            </Stack>
                        </Card>
                    </SimpleGrid>
                    {clientPayments.length === 0 ? (
                        <Text size="sm" c="dimmed">
                            {t('trainer.clients.finance.noPayments')}
                        </Text>
                    ) : (
                        <Stack gap="xs">
                            <Text size="sm">
                                {t('trainer.clients.finance.lastPayment')}: {dayjs(clientPayments[0].date).format('D MMM YYYY')} ·{' '}
                                {clientPayments[0].amount.toLocaleString()} ₽
                            </Text>
                            {activePayment?.nextPaymentDate && (
                                <Text size="sm" c="dimmed">
                                    {t('trainer.clients.finance.nextPayment', { date: dayjs(activePayment.nextPaymentDate).format('D MMM YYYY') })}
                                </Text>
                            )}
                            {remainingSessions !== undefined && (
                                <Text size="sm">
                                    {t('trainer.clients.finance.remainingSessions')}: {totalSessions !== undefined ? `${remainingSessions}/${totalSessions}` : remainingSessions}
                                </Text>
                            )}
                            {activePayment?.type === 'package' && activePayment.packageSize && (
                                <Text size="sm" c="dimmed">
                                    {t('trainer.clients.finance.packageSize', { value: activePayment.packageSize })}
                                </Text>
                            )}
                        </Stack>
                    )}
                    <Group justify="flex-end" gap="sm">
                        {paymentStatus === 'unpaid' && client.isActive && (
                            <Button color="red" variant="outline" onClick={handleDisableClient}>
                                {t('trainer.clients.finance.disableClient')}
                            </Button>
                        )}
                        {!client.isActive && (
                            <Badge color="red" variant="outline">
                                {t('trainer.clients.finance.inactive')}
                            </Badge>
                        )}
                    </Group>
                </Stack>
            </Card>

            <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="md">
                <Card withBorder padding="md">
                    <Stack gap="md">
                        <Group justify="space-between">
                            <Title order={4}>{t('dashboard.upcomingSessions')}</Title>
                            <Button
                                variant="subtle"
                                size="xs"
                                leftSection={<IconCalendar size={14} />}
                                onClick={() => navigate(`/trainer/calendar?clientId=${clientId}`)}
                            >
                                {t('common.view')}
                            </Button>
                        </Group>
                        {upcomingWorkouts.length === 0 ? (
                            <Text size="sm" c="dimmed">
                                {t('dashboard.emptyNotes')}
                            </Text>
                        ) : (
                            <Stack gap="xs">
                                {upcomingWorkouts.map((workout) => (
                                    <Group key={workout.id} justify="space-between" p="xs" style={{ borderRadius: '8px', backgroundColor: 'var(--mantine-color-gray-0)' }}>
                                        <Stack gap={2}>
                                            <Text fw={500} size="sm">
                                                {workout.title}
                                            </Text>
                                            <Text size="xs" c="dimmed">
                                                {dayjs(workout.start).format('D MMM, HH:mm')}
                                            </Text>
                                        </Stack>
                                        <Badge variant="light" color="blue">
                                            {t('calendar.upcoming')}
                                        </Badge>
                                    </Group>
                                ))}
                            </Stack>
                        )}
                    </Stack>
                </Card>

                <Card withBorder padding="md">
                    <Stack gap="md">
                        <Title order={4}>{t('dashboard.pastSessions')}</Title>
                        {recentWorkouts.length === 0 ? (
                            <Text size="sm" c="dimmed">
                                {t('dashboard.emptyNotes')}
                            </Text>
                        ) : (
                            <Stack gap="xs">
                                {recentWorkouts.map((workout) => (
                                    <Group key={workout.id} justify="space-between" p="xs" style={{ borderRadius: '8px', backgroundColor: 'var(--mantine-color-gray-0)' }}>
                                        <Stack gap={2}>
                                            <Text fw={500} size="sm">
                                                {workout.title}
                                            </Text>
                                            <Text size="xs" c="dimmed">
                                                {dayjs(workout.start).format('D MMM, HH:mm')}
                                            </Text>
                                        </Stack>
                                        <Badge
                                            variant="light"
                                            color={workout.attendance === 'completed' ? 'green' : workout.attendance === 'missed' ? 'red' : 'gray'}
                                        >
                                            {workout.attendance === 'completed' ? t('calendar.status.completed') : workout.attendance === 'missed' ? t('calendar.status.missed') : t('calendar.status.scheduled')}
                                        </Badge>
                                    </Group>
                                ))}
                            </Stack>
                        )}
                    </Stack>
                </Card>
            </SimpleGrid>

            <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="md">
                <Card withBorder padding="md">
                    <Stack gap="md">
                        <Group justify="space-between">
                            <Title order={4}>{t('dashboard.notesTitle')}</Title>
                            <Button
                                variant="subtle"
                                size="xs"
                                leftSection={<IconEdit size={14} />}
                                onClick={() => navigate(`/trainer/clients/${clientId}/notes`)}
                            >
                                {t('common.edit')}
                            </Button>
                        </Group>
                        {clientNotes.length === 0 ? (
                            <Text size="sm" c="dimmed">
                                {t('dashboard.emptyNotes')}
                            </Text>
                        ) : (
                            <Stack gap="xs">
                                {clientNotes.slice(0, 5).map((note) => (
                                    <Card key={note.id} withBorder padding="xs">
                                        <Stack gap={4}>
                                            <Text size="sm" fw={500}>
                                                {note.title}
                                            </Text>
                                            <Text size="xs" c="dimmed">
                                                {dayjs(note.updatedAt).format('D MMM YYYY, HH:mm')}
                                            </Text>
                                        </Stack>
                                    </Card>
                                ))}
                            </Stack>
                        )}
                    </Stack>
                </Card>

                <Card withBorder padding="md">
                    <Stack gap="md">
                        <Group justify="space-between">
                            <Title order={4}>{t('common.metrics')}</Title>
                            <Button
                                variant="subtle"
                                size="xs"
                                leftSection={<IconChartBar size={14} />}
                                onClick={() => navigate(`/trainer/clients/${clientId}/metrics`)}
                            >
                                {t('common.view')}
                            </Button>
                        </Group>
                        <SimpleGrid cols={2} spacing="xs">
                            <Card withBorder padding="xs">
                                <Stack gap={2}>
                                    <Text size="xs" c="dimmed">
                                        {t('metricsPage.bodyMetrics')}
                                    </Text>
                                    <Text fw={600} size="lg">
                                        {Array.isArray(bodyMetrics) ? bodyMetrics.length : Object.keys(bodyMetrics).length}
                                    </Text>
                                </Stack>
                            </Card>
                            <Card withBorder padding="xs">
                                <Stack gap={2}>
                                    <Text size="xs" c="dimmed">
                                        {t('metricsPage.exerciseMetrics')}
                                    </Text>
                                    <Text fw={600} size="lg">
                                        {Array.isArray(exerciseMetrics) ? exerciseMetrics.length : Object.keys(exerciseMetrics).length}
                                    </Text>
                                </Stack>
                            </Card>
                        </SimpleGrid>
                    </Stack>
                </Card>
            </SimpleGrid>

            <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="md">
                <Card withBorder padding="md">
                    <Stack gap="md">
                        <Group gap="xs">
                            <IconTarget size={20} color="var(--mantine-color-violet-6)" />
                            <Title order={4}>{t('trainer.clients.clientGoals')}</Title>
                        </Group>
                        {!client.goals || client.goals.length === 0 ? (
                            <Text size="sm" c="dimmed">
                                {t('trainer.clients.noGoals')}
                            </Text>
                        ) : (
                            <Stack gap="xs">
                                {client.goals.map((goal, index) => (
                                    <Group key={index} gap="xs" align="flex-start">
                                        <Badge variant="light" color="violet" size="sm">
                                            {index + 1}
                                        </Badge>
                                        <Text size="sm" style={{ flex: 1 }}>
                                            {getGoalLabel(goal)}
                                        </Text>
                                    </Group>
                                ))}
                            </Stack>
                        )}
                    </Stack>
                </Card>

                <Card withBorder padding="md">
                    <Stack gap="md">
                        <Group gap="xs">
                            <IconAlertTriangle size={20} color="var(--mantine-color-red-6)" />
                            <Title order={4}>{t('trainer.clients.clientRestrictions')}</Title>
                        </Group>
                        {!client.restrictions || client.restrictions.length === 0 ? (
                            <Text size="sm" c="dimmed">
                                {t('trainer.clients.noRestrictions')}
                            </Text>
                        ) : (
                            <Stack gap="xs">
                                {client.restrictions.map((restriction, index) => (
                                    <Group key={index} gap="xs" align="flex-start">
                                        <IconAlertTriangle size={16} color="var(--mantine-color-red-6)" />
                                        <Text size="sm" style={{ flex: 1 }}>
                                            {restriction}
                                        </Text>
                                    </Group>
                                ))}
                            </Stack>
                        )}
                    </Stack>
                </Card>
            </SimpleGrid>

            <Group>
                <Button
                    leftSection={<IconCalendar size={16} />}
                    onClick={() => navigate(`/trainer/calendar?clientId=${clientId}`)}
                >
                    {t('trainer.clients.openInCalendar')}
                </Button>
                <Button
                    leftSection={<IconChartBar size={16} />}
                    variant="light"
                    onClick={() => navigate(`/trainer/clients/${clientId}/metrics`)}
                >
                    {t('common.metrics')}
                </Button>
                <Button
                    leftSection={<IconBarbell size={16} />}
                    variant="light"
                    onClick={() => navigate(`/trainer/clients/${clientId}/program`)}
                >
                    {t('common.program')}
                </Button>
            </Group>
        </Stack>
    )
}

