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
import { IconArrowLeft, IconCalendar, IconChartBar, IconBarbell, IconEdit } from '@tabler/icons-react'
import { SimpleGrid } from '@mantine/core'
import dayjs from 'dayjs'

export const ClientDashboardPage = () => {
    const { t } = useTranslation()
    const { clientId } = useParams<{ clientId: string }>()
    const navigate = useNavigate()
    const { clients } = useAppSelector((state) => state.clients)
    const { workouts } = useAppSelector((state) => state.calendar)
    const { trainerNotes } = useAppSelector((state) => state.dashboard)
    const { bodyMetrics, exerciseMetrics } = useAppSelector((state) => state.metrics)

    const client = clients.find((c) => c.id === clientId)

    if (!client) {
        return (
            <Stack gap="md">
                <Button leftSection={<IconArrowLeft size={16} />} variant="subtle" onClick={() => navigate('/trainer/clients')}>
                    {t('common.back')}
                </Button>
                <Text>{t('trainer.clients.clientNotFound')}</Text>
            </Stack>
        )
    }

    const clientWorkouts = workouts
    const upcomingWorkouts = clientWorkouts
        .filter((w) => dayjs(w.start).isAfter(dayjs()))
        .sort((a, b) => dayjs(a.start).diff(dayjs(b.start)))
        .slice(0, 3)

    const recentWorkouts = clientWorkouts
        .filter((w) => dayjs(w.start).isBefore(dayjs()))
        .sort((a, b) => dayjs(b.start).diff(dayjs(a.start)))
        .slice(0, 3)

    const clientNotes = trainerNotes

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
                                        {Object.keys(bodyMetrics).length}
                                    </Text>
                                </Stack>
                            </Card>
                            <Card withBorder padding="xs">
                                <Stack gap={2}>
                                    <Text size="xs" c="dimmed">
                                        {t('metricsPage.exerciseMetrics')}
                                    </Text>
                                    <Text fw={600} size="lg">
                                        {Object.keys(exerciseMetrics).length}
                                    </Text>
                                </Stack>
                            </Card>
                        </SimpleGrid>
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

