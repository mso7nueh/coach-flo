import {
    ActionIcon,
    Avatar,
    Badge,
    Button,
    Card,
    Divider,
    Drawer,
    Group,
    Modal,
    NumberInput,
    Select,
    SimpleGrid,
    Stack,
    Text,
    TextInput,
    Title,
} from '@mantine/core'
import { DragDropContext, Draggable, Droppable, type DropResult } from '@hello-pangea/dnd'
import { useTranslation } from 'react-i18next'
import {
    IconAlertTriangle,
    IconArrowDown,
    IconArrowUp,
    IconCalendarTime,
    IconDotsVertical,
    IconGripVertical,
    IconPlus,
    IconTrash,
    IconEdit,
} from '@tabler/icons-react'
import { ResponsiveContainer, LineChart, Line, AreaChart, Area, ReferenceLine } from 'recharts'
import { useAppSelector } from '@/shared/hooks/useAppSelector'
import { useAppDispatch } from '@/shared/hooks/useAppDispatch'
import {
    closeConfiguration,
    openConfiguration,
    reorderTiles,
    removeTrainerNote,
    setDashboardPeriod,
    setMetricGoal,
    toggleTile,
    updateTrainerNote,
} from '@/app/store/slices/dashboardSlice'
import { useMemo, useState } from 'react'
import { useDisclosure } from '@mantine/hooks'
import dayjs from 'dayjs'
import { updateWorkoutAttendance } from '@/app/store/slices/calendarSlice'
import type { TrainerNote } from '@/app/store/slices/dashboardSlice'

const periods: { label: string; value: '7d' | '14d' | '30d' }[] = [
    { label: '7', value: '7d' },
    { label: '14', value: '14d' },
    { label: '30', value: '30d' },
]

const formatDate = (value: string) => dayjs(value).format('DD MMM, HH:mm')
const buildChartSeries = (base: number, amplitude: number) => {
    const now = dayjs()
    return Array.from({ length: 12 }).map((_, index) => ({
        label: now
            .subtract(11 - index, 'day')
            .format('DD MMM'),
        value: Number((base + Math.sin(index / 2) * amplitude).toFixed(2)),
    }))
}

export const DashboardPage = () => {
    const { t } = useTranslation()
    const dispatch = useAppDispatch()
    const { tiles, availableTiles, period, trainerNotes, configurationOpened, metricGoals } = useAppSelector(
        (state) => state.dashboard,
    )
    const user = useAppSelector((state) => state.user)
    const workouts = useAppSelector((state) => state.calendar.workouts)
    const role = user.role
    const [noteModalOpened, { open: openNoteModal, close: closeNoteModal }] = useDisclosure(false)
    const [noteDraft, setNoteDraft] = useState<TrainerNote | null>(null)
    const [goalModalOpened, { open: openGoalModal, close: closeGoalModal }] = useDisclosure(false)
    const [goalMetricId, setGoalMetricId] = useState<string | null>(null)
    const [goalValue, setGoalValue] = useState<number>(0)

    const upcoming = useMemo(
        () =>
            workouts
                .filter((item) => dayjs(item.start).isAfter(dayjs()))
                .sort((a, b) => dayjs(a.start).diff(dayjs(b.start)))
                .slice(0, 3),
        [workouts],
    )

    const recent = useMemo(
        () =>
            workouts
                .filter((item) => dayjs(item.start).isBefore(dayjs()))
                .sort((a, b) => dayjs(b.start).diff(dayjs(a.start)))
                .slice(0, 3),
        [workouts],
    )

    const handleDragEnd = (result: DropResult) => {
        if (!result.destination) {
            return
        }
        dispatch(reorderTiles({ from: result.source.index, to: result.destination.index }))
    }

    const handleSaveNote = () => {
        if (noteDraft) {
            dispatch(updateTrainerNote({ ...noteDraft, updatedAt: new Date().toISOString() }))
            closeNoteModal()
            setNoteDraft(null)
        }
    }

    const handleOpenGoalModal = (metricId: string) => {
        setGoalMetricId(metricId)
        setGoalValue(metricGoals[metricId] ?? 0)
        openGoalModal()
    }

    const handleSaveGoal = () => {
        if (goalMetricId) {
            dispatch(setMetricGoal({ metricId: goalMetricId, value: goalValue }))
            closeGoalModal()
            setGoalMetricId(null)
            setGoalValue(0)
        }
    }

    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone

    const goalInfo = useMemo(
        () => ({
            headline: t('dashboard.goal.generalGoal'),
            description: t('dashboard.goal.description'),
            milestone: 'City2Surf 10km Challenge',
            daysLeft: 35,
            progress: 65,
        }),
        [t],
    )

    const primaryChartData = useMemo(
        () => ({
            weight: buildChartSeries(74.4, 0.7),
            sleep: buildChartSeries(6.8, 0.4),
            heartRate: buildChartSeries(66, 3),
            steps: buildChartSeries(7500, 500),
        }),
        [],
    )

    const limitationItems = useMemo(
        () => [
            { id: 'lim-1', title: t('dashboard.limitations.items.leg'), date: 'Oct 29' },
            { id: 'lim-2', title: t('dashboard.limitations.items.physio'), date: 'Jul 12' },
        ],
        [t],
    )

    const progressPhotos = useMemo(
        () => [
            { id: 'photo-1', label: '10/22', accent: '#7c3aed' },
            { id: 'photo-2', label: '06/22', accent: '#f97316' },
        ],
        [],
    )

    const notesPreview = trainerNotes.slice(0, 3)

    const updatesFeed = useMemo(() => {
        const workoutUpdates = recent.map((workout) => ({
            id: workout.id,
            title: workout.title,
            subtitle: t('dashboard.updates.workoutLogged', { date: dayjs(workout.start).format('DD MMM, HH:mm') }),
        }))
        const noteUpdates = trainerNotes.map((note) => ({
            id: note.id,
            title: note.title,
            subtitle: dayjs(note.updatedAt).format('DD MMM, HH:mm'),
        }))
        return [...workoutUpdates, ...noteUpdates].slice(0, 5)
    }, [recent, trainerNotes, t])

    const totalWorkouts = workouts.length
    const completedWorkouts = workouts.filter((w) => w.attendance === 'completed').length
    const attendanceRate = totalWorkouts > 0 ? Math.round((completedWorkouts / totalWorkouts) * 100) : 0
    const todayWorkouts = workouts.filter((w) => dayjs(w.start).isSame(dayjs(), 'day')).length

    return (
        <Stack gap="lg">
            <Group justify="space-between" mb="md">
                <Title order={2}>{t('dashboard.greeting', { name: user.fullName })}</Title>
                <Group gap="xs">
                    {periods.map((item) => (
                        <Button
                            key={item.value}
                            size="xs"
                            variant={item.value === period ? 'filled' : 'light'}
                            onClick={() => dispatch(setDashboardPeriod(item.value))}
                        >
                            {t(`dashboard.periods.${item.value}`)}
                        </Button>
                    ))}
                </Group>
            </Group>

            <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
                <Card withBorder padding="md">
                    <Stack gap="xs">
                        <Text size="xs" c="dimmed" fw={600} tt="uppercase">
                            {t('dashboard.stats.totalWorkouts')}
                        </Text>
                        <Group gap="md" align="flex-end">
                            <Title order={2} c="gray.9">
                                {totalWorkouts}
                            </Title>
                            <Text size="xs" c="dimmed">
                                {t('dashboard.stats.forPeriod', { period: t(`dashboard.periods.${period}`).toLowerCase() })}
                            </Text>
                        </Group>
                    </Stack>
                </Card>

                <Card withBorder padding="md">
                    <Stack gap="xs">
                        <Text size="xs" c="dimmed" fw={600} tt="uppercase">
                            {t('dashboard.stats.attendance')}
                        </Text>
                        <Group gap="md" align="flex-end">
                            <Title order={2} c="gray.9">
                                {completedWorkouts}/{totalWorkouts}
                            </Title>
                            <Badge color={attendanceRate >= 80 ? 'green' : attendanceRate >= 60 ? 'yellow' : 'red'} variant="light">
                                {attendanceRate}%
                            </Badge>
                        </Group>
                    </Stack>
                </Card>

                <Card withBorder padding="md">
                    <Stack gap="xs">
                        <Text size="xs" c="dimmed" fw={600} tt="uppercase">
                            {t('dashboard.stats.today')}
                        </Text>
                        <Group gap="md" align="flex-end">
                            <Title order={2} c="gray.9">
                                {todayWorkouts > 0
                                    ? `${todayWorkouts} ${todayWorkouts === 1 ? t('dashboard.stats.workout_one') : todayWorkouts <= 4 ? t('dashboard.stats.workout_few') : t('dashboard.stats.workout_many')}`
                                    : t('dashboard.stats.noWorkouts')}
                            </Title>
                        </Group>
                    </Stack>
                </Card>
            </SimpleGrid>

            <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md">
                {tiles.map((tile) => {
                    const isTrend = tile.secondaryValue?.includes('↑') || tile.secondaryValue?.includes('↓')
                    const trendUp = tile.secondaryValue?.includes('↑')

                    return (
                        <Card key={tile.id} withBorder padding="md">
                            <Stack gap="xs">
                                <Group justify="space-between" align="flex-start">
                                    <Text size="xs" c="dimmed" fw={600}>
                                        {t(tile.labelKey)}
                                    </Text>
                                    {isTrend && (
                                        <Group gap={2}>
                                            {trendUp ? (
                                                <IconArrowUp size={14} color="var(--mantine-color-green-6)" />
                                            ) : (
                                                <IconArrowDown size={14} color="var(--mantine-color-red-6)" />
                                            )}
                                            {tile.secondaryValue && (
                                                <Text size="xs" c={trendUp ? 'green.7' : 'red.7'} fw={600}>
                                                    {tile.secondaryValue.replace('↑', '').replace('↓', '')}
                                                </Text>
                                            )}
                                        </Group>
                                    )}
                                </Group>
                                <Title order={3} c="gray.9">
                                    {tile.value}
                                </Title>
                            </Stack>
                        </Card>
                    )
                })}
            </SimpleGrid>

            <SimpleGrid cols={{ base: 1, lg: 3 }} spacing="md">
                <Card withBorder padding="md">
                    <Stack gap="md">
                        <Text size="xs" c="dimmed" fw={600} tt="uppercase">
                            {t('dashboard.goal.cardTitle')}
                        </Text>
                        <Stack gap="xs">
                            <Text fw={600} size="sm">{goalInfo.headline}</Text>
                            <Text size="xs" c="dimmed">{goalInfo.description}</Text>
                        </Stack>
                        <Group justify="space-between" align="center" mt="xs">
                            <Group gap="xs">
                                <IconCalendarTime size={16} />
                                <Text size="xs" fw={500}>{goalInfo.milestone}</Text>
                            </Group>
                            <Badge variant="light" size="lg">
                                {goalInfo.daysLeft} {t('dashboard.goal.daysLeft', { count: goalInfo.daysLeft })}
                            </Badge>
                        </Group>
                    </Stack>
                </Card>

                <Card withBorder padding="md">
                    <Stack gap="md">
                        <Text size="xs" c="dimmed" fw={600} tt="uppercase">
                            {t('dashboard.profileCard.role')}
                        </Text>
                        <Group gap="xs">
                            <Avatar size="sm" radius="xl" color="violet">
                                {user.fullName
                                    .split(' ')
                                    .map((part) => part[0])
                                    .join('')
                                    .slice(0, 2)}
                            </Avatar>
                            <Stack gap={0}>
                                <Text fw={600} size="sm">{user.fullName}</Text>
                                <Text size="xs" c="dimmed">{user.email}</Text>
                            </Stack>
                        </Group>
                        <Divider />
                        <Stack gap="xs">
                            <Text size="xs" c="dimmed">{t('dashboard.profileCard.timezone')}</Text>
                            <Text size="sm" fw={500}>{timezone}</Text>
                            {user.trainer && (
                                <>
                                    <Text size="xs" c="dimmed" mt="xs">{t('dashboard.profileCard.trainer')}</Text>
                                    <Text size="sm" fw={500}>{user.trainer.fullName}</Text>
                                </>
                            )}
                        </Stack>
                    </Stack>
                </Card>

                <Card withBorder padding="md">
                    <Stack gap="md">
                        <Text size="xs" c="dimmed" fw={600} tt="uppercase">
                            {t('dashboard.updates.title')}
                        </Text>
                        <Stack gap="xs">
                            {updatesFeed.length === 0 ? (
                                <Text size="sm" c="dimmed">{t('dashboard.updates.empty')}</Text>
                            ) : (
                                updatesFeed.slice(0, 5).map((update) => (
                                    <Group key={update.id} gap="xs" align="flex-start">
                                        <Text size="xs" c="dimmed" style={{ minWidth: '60px' }}>
                                            {update.subtitle.split(' • ')[1] || update.subtitle}
                                        </Text>
                                        <Text size="xs" fw={500} style={{ flex: 1 }}>
                                            {update.title}
                                        </Text>
                                    </Group>
                                ))
                            )}
                        </Stack>
                    </Stack>
                </Card>
            </SimpleGrid>

            <Card withBorder padding="md">
                <Stack gap="md">
                    <Group justify="space-between" align="center">
                        <Text size="xs" c="dimmed" fw={600} tt="uppercase">
                            {t('dashboard.bodyOverview.title')}
                        </Text>
                        <Group gap="xs">
                            <Select
                                size="xs"
                                value="30d"
                                data={[
                                    { value: '7d', label: t('dashboard.periods.7d') },
                                    { value: '14d', label: t('dashboard.periods.14d') },
                                    { value: '30d', label: t('dashboard.periods.30d') },
                                ]}
                                style={{ width: '120px' }}
                            />
                            <Button size="xs" variant="light" leftSection={<IconEdit size={14} />} onClick={() => dispatch(openConfiguration())}>
                                {t('dashboard.configureMetrics')}
                            </Button>
                        </Group>
                    </Group>
                    <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="md">
                        <Card withBorder padding="md">
                            <Stack gap="xs">
                                <Group justify="space-between" align="flex-start">
                                    <Stack gap={2}>
                                        <Text size="xs" c="dimmed">{t('dashboard.bodyOverview.weight')}</Text>
                                        <Group gap="xs" align="flex-end">
                                            <Text fw={700} size="lg">74.4</Text>
                                            <Text size="sm" c="dimmed">{t('dashboard.bodyOverview.weightUnit')}</Text>
                                            <Badge size="xs" color="red" variant="light">↓ 0.8%</Badge>
                                        </Group>
                                    </Stack>
                                    <ActionIcon size="xs" variant="subtle" onClick={() => handleOpenGoalModal('weight')}>
                                        <IconEdit size={14} />
                                    </ActionIcon>
                                </Group>
                                <ResponsiveContainer width="100%" height={100}>
                                    <LineChart data={primaryChartData.weight} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                                        <Line type="monotone" dataKey="value" stroke="#7c3aed" strokeWidth={2} dot={false} />
                                        {metricGoals.weight && (
                                            <ReferenceLine
                                                y={metricGoals.weight}
                                                stroke="#7c3aed"
                                                strokeWidth={1.5}
                                                strokeDasharray="4 4"
                                                strokeOpacity={0.5}
                                            />
                                        )}
                                    </LineChart>
                                </ResponsiveContainer>
                            </Stack>
                        </Card>
                        <Card withBorder padding="md">
                            <Stack gap="xs">
                                <Group justify="space-between" align="flex-start">
                                    <Stack gap={2}>
                                        <Text size="xs" c="dimmed">{t('dashboard.bodyOverview.sleep')}</Text>
                                        <Group gap="xs" align="flex-end">
                                            <Text fw={700} size="lg">6 h 46 m</Text>
                                            <Badge size="xs" color="green" variant="light">+0.3h</Badge>
                                        </Group>
                                    </Stack>
                                    <ActionIcon size="xs" variant="subtle" onClick={() => handleOpenGoalModal('sleep')}>
                                        <IconEdit size={14} />
                                    </ActionIcon>
                                </Group>
                                <ResponsiveContainer width="100%" height={100}>
                                    <AreaChart data={primaryChartData.sleep} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                                        <Area type="monotone" dataKey="value" stroke="#06b6d4" strokeWidth={2} fill="#06b6d4" fillOpacity={0.2} />
                                        {metricGoals.sleep && (
                                            <ReferenceLine
                                                y={metricGoals.sleep}
                                                stroke="#7c3aed"
                                                strokeWidth={1.5}
                                                strokeDasharray="4 4"
                                                strokeOpacity={0.5}
                                            />
                                        )}
                                    </AreaChart>
                                </ResponsiveContainer>
                            </Stack>
                        </Card>
                        <Card withBorder padding="md">
                            <Stack gap="xs">
                                <Group justify="space-between" align="flex-start">
                                    <Stack gap={2}>
                                        <Text size="xs" c="dimmed">{t('dashboard.bodyOverview.heartRate')}</Text>
                                        <Group gap="xs" align="flex-end">
                                            <Text fw={700} size="lg">66</Text>
                                            <Text size="sm" c="dimmed">{t('dashboard.bodyOverview.heartRateUnit')}</Text>
                                            <Badge size="xs" color="green" variant="light">↓ 5.7%</Badge>
                                        </Group>
                                    </Stack>
                                    <ActionIcon size="xs" variant="subtle" onClick={() => handleOpenGoalModal('heartRate')}>
                                        <IconEdit size={14} />
                                    </ActionIcon>
                                </Group>
                                <ResponsiveContainer width="100%" height={100}>
                                    <LineChart data={primaryChartData.heartRate} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                                        <Line type="monotone" dataKey="value" stroke="#ef4444" strokeWidth={2} dot={false} />
                                        {metricGoals.heartRate && (
                                            <ReferenceLine
                                                y={metricGoals.heartRate}
                                                stroke="#7c3aed"
                                                strokeWidth={1.5}
                                                strokeDasharray="4 4"
                                                strokeOpacity={0.5}
                                            />
                                        )}
                                    </LineChart>
                                </ResponsiveContainer>
                            </Stack>
                        </Card>
                        <Card withBorder padding="md">
                            <Stack gap="xs">
                                <Group justify="space-between" align="flex-start">
                                    <Stack gap={2}>
                                        <Text size="xs" c="dimmed">{t('dashboard.bodyOverview.steps')}</Text>
                                        <Group gap="xs" align="flex-end">
                                            <Text fw={700} size="lg">7 503</Text>
                                            <Badge size="xs" color="green" variant="light">+4.2%</Badge>
                                        </Group>
                                    </Stack>
                                    <ActionIcon size="xs" variant="subtle" onClick={() => handleOpenGoalModal('steps')}>
                                        <IconEdit size={14} />
                                    </ActionIcon>
                                </Group>
                                <ResponsiveContainer width="100%" height={100}>
                                    <AreaChart data={primaryChartData.steps} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                                        <Area type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} fill="#3b82f6" fillOpacity={0.2} />
                                        {metricGoals.steps && (
                                            <ReferenceLine
                                                y={metricGoals.steps}
                                                stroke="#7c3aed"
                                                strokeWidth={1.5}
                                                strokeDasharray="4 4"
                                                strokeOpacity={0.5}
                                            />
                                        )}
                                    </AreaChart>
                                </ResponsiveContainer>
                            </Stack>
                        </Card>
                    </SimpleGrid>
                </Stack>
            </Card>

            <SimpleGrid cols={{ base: 1, lg: 3 }} spacing="md">
                <Card withBorder padding="md">
                    <Stack gap="md">
                        <Group justify="space-between" align="center">
                            <Text size="xs" c="dimmed" fw={600} tt="uppercase">
                                {t('dashboard.notesTitle')}
                            </Text>
                            {role === 'trainer' && (
                                <ActionIcon size="xs" variant="subtle" onClick={() => openNoteModal()}>
                                    <IconPlus size={14} />
                                </ActionIcon>
                            )}
                        </Group>
                        <Stack gap="xs">
                            {notesPreview.length === 0 ? (
                                <Text size="sm" c="dimmed">{t('dashboard.emptyNotes')}</Text>
                            ) : (
                                notesPreview.map((note) => (
                                    <Group key={note.id} justify="space-between" align="flex-start" gap="xs">
                                        <Stack gap={2} style={{ flex: 1 }}>
                                            <Text size="sm" fw={500}>{note.title}</Text>
                                            <Text size="xs" c="dimmed" lineClamp={2}>{note.content}</Text>
                                            <Text size="xs" c="dimmed">{dayjs(note.updatedAt).format('DD MMM, HH:mm')}</Text>
                                        </Stack>
                                        {role === 'trainer' && (
                                            <ActionIcon size="xs" variant="subtle" color="red" onClick={() => dispatch(removeTrainerNote(note.id))}>
                                                <IconTrash size={14} />
                                            </ActionIcon>
                                        )}
                                    </Group>
                                ))
                            )}
                        </Stack>
                    </Stack>
                </Card>

                <Card withBorder padding="md">
                    <Stack gap="md">
                        <Text size="xs" c="dimmed" fw={600} tt="uppercase">
                            {t('dashboard.limitations.title')}
                        </Text>
                        <Stack gap="xs">
                            {limitationItems.length === 0 ? (
                                <Text size="sm" c="dimmed">{t('dashboard.noLimitations')}</Text>
                            ) : (
                                limitationItems.map((item) => (
                                    <Group key={item.id} gap="xs" align="flex-start">
                                        <IconAlertTriangle size={14} color="var(--mantine-color-red-6)" />
                                        <Stack gap={0} style={{ flex: 1 }}>
                                            <Text size="sm" fw={500}>{item.title}</Text>
                                            <Text size="xs" c="dimmed">{item.date}</Text>
                                        </Stack>
                                    </Group>
                                ))
                            )}
                        </Stack>
                    </Stack>
                </Card>

                <Card withBorder padding="md">
                    <Stack gap="md">
                        <Text size="xs" c="dimmed" fw={600} tt="uppercase">
                            {t('dashboard.photos.title')}
                        </Text>
                        <SimpleGrid cols={2} spacing="xs">
                            {progressPhotos.length === 0 ? (
                                <Text size="sm" c="dimmed" style={{ gridColumn: '1 / -1' }}>{t('dashboard.noPhotos')}</Text>
                            ) : (
                                progressPhotos.map((photo) => (
                                    <Card
                                        key={photo.id}
                                        withBorder
                                        padding="md"
                                        style={{
                                            background: `linear-gradient(135deg, ${photo.accent} 0%, rgba(15, 23, 42, 0.9) 100%)`,
                                            color: 'white',
                                            minHeight: '80px',
                                        }}
                                    >
                                        <Stack align="center" gap={2} justify="center" style={{ height: '100%' }}>
                                            <Text fw={700} size="sm">{photo.label}</Text>
                                            <Text size="xs" c="white" style={{ opacity: 0.8 }}>{t('dashboard.photos.compare')}</Text>
                                        </Stack>
                                    </Card>
                                ))
                            )}
                        </SimpleGrid>
                    </Stack>
                </Card>
            </SimpleGrid>

            <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
                <Card withBorder padding="md">
                    <Stack gap="md">
                        <Group justify="space-between" align="center">
                            <Text size="xs" c="dimmed" fw={600} tt="uppercase">
                                {t('dashboard.upcomingSessions')}
                            </Text>
                            <Badge size="sm" variant="light">{upcoming.length}</Badge>
                        </Group>
                        <Stack gap="xs">
                            {upcoming.length === 0 ? (
                                <Text size="sm" c="dimmed">{t('calendar.upcoming')}</Text>
                            ) : (
                                upcoming.map((workout) => (
                                    <Group key={workout.id} justify="space-between" align="flex-start" gap="xs">
                                        <Stack gap={2} style={{ flex: 1 }}>
                                            <Text size="sm" fw={500}>{workout.title}</Text>
                                            <Text size="xs" c="dimmed">{formatDate(workout.start)}</Text>
                                        </Stack>
                                        <Badge size="xs" variant="dot">{t(`calendar.status.${workout.attendance}`)}</Badge>
                                    </Group>
                                ))
                            )}
                        </Stack>
                    </Stack>
                </Card>
                <Card withBorder padding="md">
                    <Stack gap="md">
                        <Group justify="space-between" align="center">
                            <Text size="xs" c="dimmed" fw={600} tt="uppercase">
                                {t('calendar.pastSessions')}
                            </Text>
                            <Badge size="sm" variant="light">{recent.length}</Badge>
                        </Group>
                        <Stack gap="xs">
                            {recent.length === 0 ? (
                                <Text size="sm" c="dimmed">{t('calendar.pastSessions')}</Text>
                            ) : (
                                recent.map((workout) => (
                                    <Group key={workout.id} justify="space-between" align="center" gap="xs">
                                        <Stack gap={2} style={{ flex: 1 }}>
                                            <Text size="sm" fw={500}>{workout.title}</Text>
                                            <Text size="xs" c="dimmed">{formatDate(workout.start)}</Text>
                                        </Stack>
                                        <Group gap="xs">
                                            <Button
                                                size="xs"
                                                variant={workout.attendance === 'completed' ? 'filled' : 'light'}
                                                onClick={() =>
                                                    dispatch(updateWorkoutAttendance({ workoutId: workout.id, attendance: 'completed' }))
                                                }
                                            >
                                                {t('calendar.attendance.markPresent')}
                                            </Button>
                                            <Button
                                                size="xs"
                                                variant={workout.attendance === 'missed' ? 'filled' : 'light'}
                                                color="red"
                                                onClick={() =>
                                                    dispatch(updateWorkoutAttendance({ workoutId: workout.id, attendance: 'missed' }))
                                                }
                                            >
                                                {t('calendar.attendance.markMissed')}
                                            </Button>
                                        </Group>
                                    </Group>
                                ))
                            )}
                        </Stack>
                    </Stack>
                </Card>
            </SimpleGrid>

            <Drawer
                opened={configurationOpened}
                onClose={() => dispatch(closeConfiguration())}
                title={t('dashboard.configureMetrics')}
                size="md"
            >
                <Stack gap="md">
                    <Text size="sm" c="dimmed">
                        {t('common.period')}
                    </Text>
                    <Group gap="xs">
                        {periods.map((item) => (
                            <Button
                                key={item.value}
                                size="xs"
                                variant={item.value === period ? 'filled' : 'light'}
                                onClick={() => dispatch(setDashboardPeriod(item.value))}
                            >
                                {t(`dashboard.periods.${item.value}`)}
                            </Button>
                        ))}
                    </Group>
                    <Divider />
                    <DragDropContext onDragEnd={handleDragEnd}>
                        <Droppable droppableId="tiles">
                            {(provided) => (
                                <Stack gap="xs" ref={provided.innerRef} {...provided.droppableProps}>
                                    {tiles.map((tile, index) => (
                                        <Draggable draggableId={tile.id} index={index} key={tile.id}>
                                            {(dragProvided) => (
                                                <Card
                                                    withBorder
                                                    padding="sm"
                                                    ref={dragProvided.innerRef}
                                                    {...dragProvided.draggableProps}
                                                    {...dragProvided.dragHandleProps}
                                                >
                                                    <Group justify="space-between">
                                                        <Group gap="sm">
                                                            <IconGripVertical size={16} />
                                                            <Text fw={600}>{t(tile.labelKey)}</Text>
                                                        </Group>
                                                        <Badge>{t(`dashboard.periods.${tile.period}`)}</Badge>
                                                    </Group>
                                                </Card>
                                            )}
                                        </Draggable>
                                    ))}
                                    {provided.placeholder}
                                </Stack>
                            )}
                        </Droppable>
                    </DragDropContext>
                    <Divider />
                    <Stack gap="xs">
                        {availableTiles.map((tile) => {
                            const active = tiles.some((item) => item.id === tile.id)
                            return (
                                <Button
                                    key={tile.id}
                                    variant={active ? 'light' : 'outline'}
                                    rightSection={active ? <IconDotsVertical size={16} /> : <IconPlus size={16} />}
                                    onClick={() => dispatch(toggleTile(tile.id))}
                                >
                                    {t(tile.labelKey)}
                                </Button>
                            )
                        })}
                    </Stack>
                </Stack>
            </Drawer>

            <Modal opened={noteModalOpened} onClose={closeNoteModal} title={t('dashboard.notesTitle')} size="md">
                <Stack gap="md">
                    <TextInput
                        label={t('common.edit')}
                        value={noteDraft?.title ?? ''}
                        onChange={(event) =>
                            setNoteDraft((current) => ({ ...(current ?? { id: crypto.randomUUID(), content: '', updatedAt: '' }), title: event.currentTarget.value }))
                        }
                    />
                    <TextInput
                        label={t('common.trainerNotes')}
                        value={noteDraft?.content ?? ''}
                        onChange={(event) =>
                            setNoteDraft((current) => ({
                                ...(current ?? { id: crypto.randomUUID(), title: '', updatedAt: '' }),
                                content: event.currentTarget.value,
                            }))
                        }
                    />
                    <Group justify="flex-end">
                        <Button variant="default" onClick={closeNoteModal}>
                            {t('common.cancel')}
                        </Button>
                        <Button onClick={handleSaveNote}>{t('common.save')}</Button>
                    </Group>
                </Stack>
            </Modal>

            <Modal opened={goalModalOpened} onClose={closeGoalModal} title={t('dashboard.bodyOverview.setGoal')} size="md">
                <Stack gap="md">
                    <Text size="sm" c="dimmed">
                        {goalMetricId === 'weight' && t('dashboard.bodyOverview.weight')}
                        {goalMetricId === 'sleep' && t('dashboard.bodyOverview.sleep')}
                        {goalMetricId === 'heartRate' && t('dashboard.bodyOverview.heartRate')}
                        {goalMetricId === 'steps' && t('dashboard.bodyOverview.steps')}
                    </Text>
                    <NumberInput
                        label={t('dashboard.bodyOverview.goal')}
                        placeholder={t('dashboard.bodyOverview.goalPlaceholder')}
                        value={goalValue}
                        onChange={(value) => setGoalValue(typeof value === 'number' ? value : 0)}
                        suffix={
                            goalMetricId === 'weight'
                                ? t('dashboard.bodyOverview.weightUnit')
                                : goalMetricId === 'sleep'
                                    ? t('dashboard.bodyOverview.sleepUnit')
                                    : goalMetricId === 'heartRate'
                                        ? t('dashboard.bodyOverview.heartRateUnit')
                                        : goalMetricId === 'steps'
                                            ? t('dashboard.bodyOverview.stepsUnit')
                                            : ''
                        }
                        min={0}
                        step={goalMetricId === 'weight' ? 0.1 : goalMetricId === 'sleep' ? 0.5 : goalMetricId === 'heartRate' ? 1 : goalMetricId === 'steps' ? 100 : 1}
                        decimalScale={goalMetricId === 'weight' || goalMetricId === 'sleep' ? 1 : 0}
                    />
                    <Group justify="flex-end">
                        <Button variant="default" onClick={closeGoalModal}>
                            {t('common.cancel')}
                        </Button>
                        <Button onClick={handleSaveGoal}>{t('common.save')}</Button>
                    </Group>
                </Stack>
            </Modal>
        </Stack>
    )
}

