import { useState, useEffect } from 'react'
import {
    Stack, Title, Group, Card, Text, Badge, Loader, Center,
    Grid, Table, Select, Progress
} from '@mantine/core'
import { IconUsers, IconCalendar, IconCurrencyRubel, IconChartBar, IconTrendingUp } from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'
import { apiClient } from '@/shared/api/client'

interface TrainerMetrics {
    trainer_id: string
    trainer_name: string
    occupancy_rate: number
    planned_workouts: number
    conducted_workouts: number
    cancellation_rate: number
    active_clients: number
    new_clients: number
    lost_clients: number
    revenue: number
    avg_check: number
}

interface ClubMetrics {
    period_days: number
    total_trainers: number
    total_clients: number
    total_revenue: number
    avg_occupancy_rate: number
    total_workouts: number
    conducted_workouts: number
    trainer_metrics: TrainerMetrics[]
}

const PERIOD_OPTIONS = [
    { value: '7', label: '7 дней' },
    { value: '14', label: '14 дней' },
    { value: '30', label: '30 дней' },
    { value: '90', label: '3 месяца' },
]

export const ClubMetricsPage = () => {
    const [metrics, setMetrics] = useState<ClubMetrics | null>(null)
    const [loading, setLoading] = useState(true)
    const [period, setPeriod] = useState('30')

    const loadMetrics = async (days: number) => {
        setLoading(true)
        try {
            const data = await apiClient.getClubMetrics(days)
            setMetrics(data)
        } catch (e: any) {
            notifications.show({ title: 'Ошибка', message: e?.message, color: 'red' })
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { loadMetrics(Number(period)) }, [period])

    if (loading) return <Center h={200}><Loader /></Center>
    if (!metrics) return <Text c="dimmed">Нет данных</Text>

    const summaryStats = [
        {
            label: 'Тренеров',
            value: metrics.total_trainers,
            icon: <IconUsers size={20} />,
            color: 'violet',
        },
        {
            label: 'Клиентов',
            value: metrics.total_clients,
            icon: <IconUsers size={20} />,
            color: 'blue',
        },
        {
            label: '% занятости',
            value: `${metrics.avg_occupancy_rate}%`,
            icon: <IconChartBar size={20} />,
            color: metrics.avg_occupancy_rate >= 70 ? 'green' : 'orange',
        },
        {
            label: 'Выручка',
            value: `${metrics.total_revenue.toLocaleString('ru')} ₽`,
            icon: <IconCurrencyRubel size={20} />,
            color: 'teal',
        },
        {
            label: 'Тренировок',
            value: metrics.total_workouts,
            icon: <IconCalendar size={20} />,
            color: 'indigo',
        },
        {
            label: 'Проведено',
            value: metrics.conducted_workouts,
            icon: <IconTrendingUp size={20} />,
            color: 'green',
        },
    ]

    return (
        <Stack gap="lg">
            <Group justify="space-between">
                <Title order={2}>Метрики клуба</Title>
                <Select
                    value={period}
                    onChange={v => v && setPeriod(v)}
                    data={PERIOD_OPTIONS}
                    style={{ width: 140 }}
                />
            </Group>

            {/* Summary cards */}
            <Grid>
                {summaryStats.map(stat => (
                    <Grid.Col key={stat.label} span={{ base: 12, xs: 6, sm: 4, md: 2 }}>
                        <Card withBorder padding="md">
                            <Stack gap={4}>
                                <Text c={stat.color}>{stat.icon}</Text>
                                <Text size="xl" fw={700}>{stat.value}</Text>
                                <Text size="xs" c="dimmed">{stat.label}</Text>
                            </Stack>
                        </Card>
                    </Grid.Col>
                ))}
            </Grid>

            {/* Per-trainer metrics table */}
            <Card withBorder padding="md">
                <Stack gap="md">
                    <Text fw={600}>Метрики по тренерам</Text>
                    {metrics.trainer_metrics.length === 0 ? (
                        <Text c="dimmed" ta="center" py="md">
                            Нет тренеров в клубе
                        </Text>
                    ) : (
                        <Table>
                            <Table.Thead>
                                <Table.Tr>
                                    <Table.Th>Тренер</Table.Th>
                                    <Table.Th>% занятости</Table.Th>
                                    <Table.Th>Тренировки</Table.Th>
                                    <Table.Th>Отмены</Table.Th>
                                    <Table.Th>Клиенты</Table.Th>
                                    <Table.Th>Выручка</Table.Th>
                                    <Table.Th>Средний чек</Table.Th>
                                </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                                {metrics.trainer_metrics.map(tm => (
                                    <Table.Tr key={tm.trainer_id}>
                                        <Table.Td>
                                            <Text fw={500}>{tm.trainer_name}</Text>
                                        </Table.Td>
                                        <Table.Td>
                                            <Stack gap={4}>
                                                <Text size="sm">{tm.occupancy_rate}%</Text>
                                                <Progress
                                                    value={tm.occupancy_rate}
                                                    size="xs"
                                                    color={tm.occupancy_rate >= 70 ? 'green' : tm.occupancy_rate >= 50 ? 'yellow' : 'red'}
                                                />
                                            </Stack>
                                        </Table.Td>
                                        <Table.Td>
                                            <Group gap={4}>
                                                <Text size="sm">{tm.conducted_workouts}</Text>
                                                <Text size="xs" c="dimmed">/ {tm.planned_workouts}</Text>
                                            </Group>
                                        </Table.Td>
                                        <Table.Td>
                                            <Badge
                                                color={tm.cancellation_rate < 10 ? 'green' : tm.cancellation_rate < 25 ? 'yellow' : 'red'}
                                                size="sm"
                                            >
                                                {tm.cancellation_rate}%
                                            </Badge>
                                        </Table.Td>
                                        <Table.Td>
                                            <Group gap={4}>
                                                <Text size="sm">{tm.active_clients}</Text>
                                                {tm.new_clients > 0 && (
                                                    <Badge size="xs" color="green">+{tm.new_clients}</Badge>
                                                )}
                                            </Group>
                                        </Table.Td>
                                        <Table.Td>
                                            <Text size="sm" fw={500}>
                                                {tm.revenue.toLocaleString('ru')} ₽
                                            </Text>
                                        </Table.Td>
                                        <Table.Td>
                                            <Text size="sm">
                                                {tm.avg_check > 0 ? `${tm.avg_check.toLocaleString('ru')} ₽` : '—'}
                                            </Text>
                                        </Table.Td>
                                    </Table.Tr>
                                ))}
                            </Table.Tbody>
                        </Table>
                    )}
                </Stack>
            </Card>
        </Stack>
    )
}
