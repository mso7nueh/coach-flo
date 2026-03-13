import { useState, useEffect } from 'react'
import {
    Stack, Title, Group, Text, Avatar, Badge, Card, Grid,
    Tabs, Loader, Center, Button
} from '@mantine/core'
import { useParams, useNavigate } from 'react-router-dom'
import { IconArrowLeft, IconUsers, IconCalendar, IconCurrencyRubel, IconLibrary, IconChartBar } from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'
import { apiClient } from '@/shared/api/client'

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

export const TrainerCardPage = () => {
    const { trainerId } = useParams<{ trainerId: string }>()
    const navigate = useNavigate()
    const [trainer, setTrainer] = useState<TrainerCard | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!trainerId) return
        apiClient.getClubTrainer(trainerId)
            .then(setTrainer)
            .catch(e => notifications.show({ title: 'Ошибка', message: e?.message, color: 'red' }))
            .finally(() => setLoading(false))
    }, [trainerId])

    const getInitials = (name: string) =>
        name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)

    if (loading) return <Center h={200}><Loader /></Center>
    if (!trainer) return <Text c="dimmed">Тренер не найден</Text>

    const attendanceRate = trainer.total_workouts > 0
        ? Math.round(trainer.completed_workouts / trainer.total_workouts * 100)
        : 0

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
            <Grid>
                {[
                    { label: 'Активных клиентов', value: trainer.active_clients, color: 'violet', icon: <IconUsers size={20} /> },
                    { label: 'Всего тренировок', value: trainer.total_workouts, color: 'blue', icon: <IconCalendar size={20} /> },
                    { label: 'Посещаемость', value: `${attendanceRate}%`, color: attendanceRate >= 80 ? 'green' : 'orange', icon: <IconChartBar size={20} /> },
                    { label: 'Выручка', value: `${trainer.total_revenue.toLocaleString('ru')} ₽`, color: 'teal', icon: <IconCurrencyRubel size={20} /> },
                ].map(stat => (
                    <Grid.Col key={stat.label} span={{ base: 12, xs: 6, sm: 3 }}>
                        <Card withBorder padding="md">
                            <Group gap="sm">
                                <Text c={stat.color}>{stat.icon}</Text>
                                <Stack gap={0}>
                                    <Text size="xl" fw={700}>{stat.value}</Text>
                                    <Text size="xs" c="dimmed">{stat.label}</Text>
                                </Stack>
                            </Group>
                        </Card>
                    </Grid.Col>
                ))}
            </Grid>

            {/* Tabs: view trainer's data */}
            <Tabs defaultValue="clients">
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

                <Tabs.Panel value="clients" pt="md">
                    <Card withBorder padding="md">
                        <Text c="dimmed" ta="center" py="xl">
                            У тренера {trainer.total_clients} клиентов, из них {trainer.active_clients} активных.
                            <br />
                            Детальный просмотр клиентов тренера будет реализован в следующей версии.
                        </Text>
                    </Card>
                </Tabs.Panel>

                <Tabs.Panel value="calendar" pt="md">
                    <Card withBorder padding="md">
                        <Text c="dimmed" ta="center" py="xl">
                            Für Kalenderansicht eines einzelnen Trainers — folgt in der nächsten Version.
                            <br />
                            Используйте раздел «Календарь клуба» для сводного расписания.
                        </Text>
                    </Card>
                </Tabs.Panel>

                <Tabs.Panel value="library" pt="md">
                    <Card withBorder padding="md">
                        <Text c="dimmed" ta="center" py="xl">
                            Просмотр библиотеки тренера будет реализован в следующей версии.
                        </Text>
                    </Card>
                </Tabs.Panel>

                <Tabs.Panel value="finances" pt="md">
                    <Card withBorder padding="md">
                        <Stack gap="sm" py="md">
                            <Text fw={600}>Финансовая сводка</Text>
                            <Group justify="space-between">
                                <Text size="sm" c="dimmed">Всего выручка</Text>
                                <Text size="sm" fw={500}>{trainer.total_revenue.toLocaleString('ru')} ₽</Text>
                            </Group>
                            <Group justify="space-between">
                                <Text size="sm" c="dimmed">Проведено тренировок</Text>
                                <Text size="sm" fw={500}>{trainer.completed_workouts}</Text>
                            </Group>
                            {trainer.completed_workouts > 0 && (
                                <Group justify="space-between">
                                    <Text size="sm" c="dimmed">Средняя стоимость занятия</Text>
                                    <Text size="sm" fw={500}>
                                        {Math.round(trainer.total_revenue / trainer.completed_workouts).toLocaleString('ru')} ₽
                                    </Text>
                                </Group>
                            )}
                        </Stack>
                    </Card>
                </Tabs.Panel>
            </Tabs>
        </Stack>
    )
}
