import { useState, useEffect } from 'react'
import {
    Stack, Title, Group, Card, Text, Badge, Loader, Center,
} from '@mantine/core'
import { IconUser } from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'
import { apiClient } from '@/shared/api/client'
import dayjs from 'dayjs'
import 'dayjs/locale/ru'

dayjs.locale('ru')

interface ClubWorkout {
    id: string
    title: string
    start: string
    end: string
    trainer_id: string | null
    user_id: string
    attendance: string
    location?: string | null
}

interface ClubTrainer {
    id: string
    full_name: string
}

export const ClubCalendarPage = () => {
    const [workouts, setWorkouts] = useState<ClubWorkout[]>([])
    const [trainers, setTrainers] = useState<ClubTrainer[]>([])
    const [loading, setLoading] = useState(true)
    const [weekOffset, setWeekOffset] = useState(0)

    const startOfWeek = dayjs().startOf('week').add(weekOffset, 'week')
    const endOfWeek = startOfWeek.add(6, 'day').endOf('day')

    // Load trainers once for name resolution
    useEffect(() => {
        apiClient.getClubTrainers()
            .then(data => setTrainers(data.map((t: any) => ({ id: t.id, full_name: t.full_name }))))
            .catch(() => {})
    }, [])

    useEffect(() => {
        setLoading(true)
        apiClient.getClubCalendar({
            start_date: startOfWeek.toISOString(),
            end_date: endOfWeek.toISOString(),
        })
            .then(setWorkouts)
            .catch(e => notifications.show({ title: 'Ошибка', message: e?.message, color: 'red' }))
            .finally(() => setLoading(false))
    }, [weekOffset])

    const getTrainerName = (trainerId: string | null): string | null => {
        if (!trainerId) return null
        const t = trainers.find(tr => tr.id === trainerId)
        return t ? t.full_name : null
    }

    const days = Array.from({ length: 7 }, (_, i) => startOfWeek.add(i, 'day'))

    const getStatusColor = (attendance: string) => {
        if (attendance === 'completed') return 'green'
        if (attendance === 'missed') return 'red'
        return 'violet'
    }

    return (
        <Stack gap="lg">
            <Group justify="space-between">
                <Title order={2}>Календарь клуба</Title>
                <Group gap="xs">
                    <Text
                        size="sm"
                        style={{ cursor: 'pointer', textDecoration: 'underline' }}
                        onClick={() => setWeekOffset(w => w - 1)}
                    >← Пред. неделя</Text>
                    <Badge variant="light" color="violet" size="lg">
                        {startOfWeek.format('D MMM')} – {endOfWeek.format('D MMM YYYY')}
                    </Badge>
                    <Text
                        size="sm"
                        style={{ cursor: 'pointer', textDecoration: 'underline' }}
                        onClick={() => setWeekOffset(w => w + 1)}
                    >След. неделя →</Text>
                </Group>
            </Group>

            {loading ? (
                <Center h={200}><Loader /></Center>
            ) : (
                <Group align="flex-start" gap="xs" style={{ overflowX: 'auto' }}>
                    {days.map(day => {
                        const dayWorkouts = workouts.filter(w =>
                            dayjs(w.start).isSame(day, 'day')
                        )
                        return (
                            <Card
                                key={day.toString()}
                                withBorder
                                padding="sm"
                                style={{ minWidth: 160, flex: 1 }}
                            >
                                <Stack gap="xs">
                                    <Text fw={600} size="sm" ta="center">
                                        {day.format('dd, D MMM')}
                                    </Text>
                                    {dayWorkouts.length === 0 ? (
                                        <Text size="xs" c="dimmed" ta="center">Нет занятий</Text>
                                    ) : dayWorkouts.map(w => (
                                        <Card key={w.id} withBorder padding={6} radius="sm">
                                            <Text size="xs" fw={600} lineClamp={1}>{w.title}</Text>
                                            <Text size="xs" c="dimmed">
                                                {dayjs(w.start).format('HH:mm')} – {dayjs(w.end).format('HH:mm')}
                                            </Text>
                                            {getTrainerName(w.trainer_id) && (
                                                <Group gap={4} mt={2}>
                                                    <IconUser size={10} color="var(--mantine-color-gray-5)" />
                                                    <Text size="xs" c="dimmed" lineClamp={1}>
                                                        {getTrainerName(w.trainer_id)}
                                                    </Text>
                                                </Group>
                                            )}
                                            <Badge size="xs" color={getStatusColor(w.attendance)} mt={4}>
                                                {w.attendance === 'completed' ? 'Завершено' :
                                                    w.attendance === 'missed' ? 'Пропущено' : 'Запланировано'}
                                            </Badge>
                                        </Card>
                                    ))}
                                </Stack>
                            </Card>
                        )
                    })}
                </Group>
            )}

            {!loading && workouts.length === 0 && (
                <Text c="dimmed" ta="center">
                    На этой неделе тренировок нет
                </Text>
            )}
        </Stack>
    )
}
