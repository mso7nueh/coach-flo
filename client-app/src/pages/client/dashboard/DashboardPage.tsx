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
    Progress,
    RingProgress,
    SimpleGrid,
    Stack,
    Text,
    TextInput,
    ThemeIcon,
    Title,
} from '@mantine/core'
import { DragDropContext, Draggable, Droppable, type DropResult } from '@hello-pangea/dnd'
import { useTranslation } from 'react-i18next'
import {
    IconAdjustments,
    IconAlertTriangle,
    IconArrowDown,
    IconArrowRight,
    IconArrowUp,
    IconBell,
    IconCalendar,
    IconCalendarTime,
    IconDotsVertical,
    IconGripVertical,
    IconPlus,
    IconTarget,
    IconTrendingUp,
    IconTrash,
    IconUser,
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
    const nextWorkout = upcoming[0]
    const todayWorkouts = workouts.filter((w) => dayjs(w.start).isSame(dayjs(), 'day')).length

    return (
        <Stack gap="xl">
            <Group justify="space-between">
                <Stack gap={0}>
                    <Text c="dimmed">{t('dashboard.greeting', { name: user.fullName })}</Text>
                    <Title order={2}>{t('dashboard.metricsTitle')}</Title>
                </Stack>
                <Group gap="sm">
                    <Group gap={4}>
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
                    <Button leftSection={<IconAdjustments size={16} />} variant="light" onClick={() => dispatch(openConfiguration())}>
                        {t('dashboard.configureMetrics')}
                    </Button>
                </Group>
            </Group>

            <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="lg">
                <Card
                    withBorder
                    padding="xl"
                    style={{
                        position: 'relative',
                        background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%)',
                        borderColor: 'var(--mantine-color-violet-2)',
                    }}
                >
                    <Group justify="space-between" mb="md">
                        <Text size="sm" c="dimmed" fw={600} tt="uppercase" style={{ letterSpacing: '0.5px' }}>
                            {t('dashboard.stats.totalWorkouts')}
                        </Text>
                        <Avatar size="lg" color="violet" variant="light" radius="md">
                            <IconCalendar size={22} />
                        </Avatar>
                    </Group>
                    <Title order={1} mb={8} c="violet.7" style={{ fontSize: '2.5rem' }}>
                        {totalWorkouts}
                    </Title>
                    <Text size="sm" c="dimmed" fw={500}>
                        {t('dashboard.stats.forPeriod', { period: t(`dashboard.periods.${period}`).toLowerCase() })}
                    </Text>
                </Card>

                <Card
                    withBorder
                    padding="xl"
                    style={{
                        background: `linear-gradient(135deg, rgba(${attendanceRate >= 80 ? '34, 197, 94' : attendanceRate >= 60 ? '234, 179, 8' : '239, 68, 68'}, 0.05) 0%, rgba(${attendanceRate >= 80 ? '22, 163, 74' : attendanceRate >= 60 ? '202, 138, 4' : '220, 38, 38'}, 0.05) 100%)`,
                        borderColor: attendanceRate >= 80 ? 'var(--mantine-color-green-2)' : attendanceRate >= 60 ? 'var(--mantine-color-yellow-2)' : 'var(--mantine-color-red-2)',
                    }}
                >
                    <Group justify="space-between" mb="md">
                        <Text size="sm" c="dimmed" fw={600} tt="uppercase" style={{ letterSpacing: '0.5px' }}>
                            {t('dashboard.stats.attendance')}
                        </Text>
                        <RingProgress
                            size={56}
                            thickness={6}
                            sections={[{ value: attendanceRate, color: attendanceRate >= 80 ? 'green' : attendanceRate >= 60 ? 'yellow' : 'red' }]}
                            label={
                                <Text size="sm" ta="center" fw={800} c={attendanceRate >= 80 ? 'green.7' : attendanceRate >= 60 ? 'yellow.7' : 'red.7'}>
                                    {attendanceRate}%
                                </Text>
                            }
                        />
                    </Group>
                    <Title order={2} mb={8} c={attendanceRate >= 80 ? 'green.7' : attendanceRate >= 60 ? 'yellow.7' : 'red.7'}>
                        {completedWorkouts}/{totalWorkouts}
                    </Title>
                    <Progress
                        value={attendanceRate}
                        color={attendanceRate >= 80 ? 'green' : attendanceRate >= 60 ? 'yellow' : 'red'}
                        size="lg"
                        radius="xl"
                        style={{ height: '10px' }}
                    />
                </Card>

                <Card
                    withBorder
                    padding="xl"
                    style={{
                        background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.05) 0%, rgba(124, 58, 237, 0.05) 100%)',
                        borderColor: 'var(--mantine-color-violet-2)',
                    }}
                >
                    <Group justify="space-between" mb="md">
                        <Text size="sm" c="dimmed" fw={600} tt="uppercase" style={{ letterSpacing: '0.5px' }}>
                            {t('dashboard.stats.today')}
                        </Text>
                        <Badge variant="filled" color="violet" size="xl" radius="md" style={{ fontSize: '14px', padding: '8px 12px' }}>
                            {todayWorkouts}
                        </Badge>
                    </Group>
                    <Title order={2} mb={8} c="violet.7">
                        {todayWorkouts > 0
                            ? `${todayWorkouts} ${todayWorkouts === 1 ? t('dashboard.stats.workout_one') : todayWorkouts <= 4 ? t('dashboard.stats.workout_few') : t('dashboard.stats.workout_many')}`
                            : t('dashboard.stats.noWorkouts')}
                    </Title>
                    <Text size="sm" c="dimmed" fw={500}>
                        {dayjs().format('DD MMMM YYYY')}
                    </Text>
                </Card>

                {nextWorkout && (
                    <Card
                        withBorder
                        padding="xl"
                        style={{
                            background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.05) 0%, rgba(147, 51, 234, 0.05) 100%)',
                            borderColor: 'var(--mantine-color-violet-2)',
                        }}
                    >
                        <Group justify="space-between" mb="md">
                            <Text size="sm" c="dimmed" fw={600} tt="uppercase" style={{ letterSpacing: '0.5px' }}>
                                {t('dashboard.stats.next')}
                            </Text>
                            <Avatar size="lg" color="violet" variant="light" radius="md">
                                <IconCalendar size={22} />
                            </Avatar>
                        </Group>
                        <Title order={3} mb={8} lineClamp={1} c="violet.7">
                            {nextWorkout.title}
                        </Title>
                        <Text size="sm" c="dimmed" fw={500}>
                            {formatDate(nextWorkout.start)}
                        </Text>
                    </Card>
                )}
            </SimpleGrid>

            <SimpleGrid cols={{ base: 1, sm: 2, lg: 3, xl: 4 }}>
                {tiles.map((tile) => {
                    const isPercentage = tile.value?.toString().includes('%')
                    const isTrend = tile.secondaryValue?.includes('↑') || tile.secondaryValue?.includes('↓')
                    const trendUp = tile.secondaryValue?.includes('↑')
                    const numericValue = parseFloat(tile.value?.toString().replace(/[^\d.-]/g, '') || '0')

                    return (
                        <Card
                            key={tile.id}
                            withBorder
                            h="100%"
                            padding="lg"
                            style={{
                                position: 'relative',
                                overflow: 'hidden',
                                background: 'white',
                                transition: 'all 0.3s ease',
                            }}
                        >
                            <Group justify="space-between" mb="md">
                                <Group gap="sm">
                                    <Avatar size="md" color="violet" variant="light" radius="md">
                                        <IconTrendingUp size={18} />
                                    </Avatar>
                                    <Stack gap={2}>
                                        <Text fw={700} size="sm" c="gray.7">
                                            {t(tile.labelKey)}
                                        </Text>
                                        <Badge variant="light" size="xs" color="gray">
                                            {t(`dashboard.periods.${tile.period}`)}
                                        </Badge>
                                    </Stack>
                                </Group>
                            </Group>
                            <Stack gap="sm">
                                <Group gap="xs" align="flex-end" wrap="nowrap">
                                    <Title order={2} style={{ lineHeight: 1.2, fontSize: '2rem' }} c="gray.9">
                                        {tile.value}
                                    </Title>
                                    {isTrend && (
                                        <Group gap={4} style={{ marginBottom: '4px' }}>
                                            {trendUp ? (
                                                <IconArrowUp size={20} color="var(--mantine-color-green-6)" strokeWidth={2.5} />
                                            ) : (
                                                <IconArrowDown size={20} color="var(--mantine-color-red-6)" strokeWidth={2.5} />
                                            )}
                                            {tile.secondaryValue && (
                                                <Text size="sm" c={trendUp ? 'green.7' : 'red.7'} fw={700}>
                                                    {tile.secondaryValue.replace('↑', '').replace('↓', '')}
                                                </Text>
                                            )}
                                        </Group>
                                    )}
                                    {!isTrend && tile.secondaryValue && (
                                        <Text size="sm" c="dimmed" fw={500}>
                                            {tile.secondaryValue}
                                        </Text>
                                    )}
                                </Group>
                                {isPercentage && (
                                    <Progress
                                        value={numericValue}
                                        color="violet"
                                        size="lg"
                                        radius="xl"
                                        mt="md"
                                        style={{ height: '10px' }}
                                    />
                                )}
                            </Stack>
                        </Card>
                    )
                })}
            </SimpleGrid>

            <SimpleGrid cols={{ base: 1, lg: 3 }} spacing="lg">
                <Card withBorder padding="xl">
                    <Stack gap="md">
                        <Group justify="space-between" align="flex-start">
                            <Stack gap={4} style={{ flex: 1 }}>
                                <Text size="sm" c="dimmed" fw={600}>
                                    {t('dashboard.goal.cardTitle')}
                                </Text>
                                <Title order={4}>{goalInfo.headline}</Title>
                                <Text size="sm" c="dimmed">
                                    {goalInfo.description}
                                </Text>
                            </Stack>
                            <RingProgress
                                size={80}
                                thickness={8}
                                sections={[{ value: goalInfo.progress, color: 'violet' }]}
                                label={
                                    <Text size="sm" ta="center" fw={700}>
                                        {goalInfo.progress}%
                                    </Text>
                                }
                            />
                        </Group>
                        <Card withBorder radius="lg" padding="md">
                            <Group justify="space-between" align="center">
                                <Stack gap={2}>
                                    <Text size="xs" c="dimmed">
                                        {t('dashboard.goal.nextEvent')}
                                    </Text>
                                    <Group gap="xs">
                                        <ThemeIcon variant="light" color="violet" size="md" radius="lg">
                                            <IconCalendarTime size={16} />
                                        </ThemeIcon>
                                        <Text fw={600}>{goalInfo.milestone}</Text>
                                    </Group>
                                </Stack>
                                <Stack gap={0} align="flex-end">
                                    <Text fw={700} size="lg">
                                        {goalInfo.daysLeft}
                                    </Text>
                                    <Text size="xs" c="dimmed">
                                        {t('dashboard.goal.daysLeft', { count: goalInfo.daysLeft })}
                                    </Text>
                                </Stack>
                            </Group>
                        </Card>
                    </Stack>
                </Card>

                <Card withBorder padding="xl">
                    <Stack gap="md">
                        <Group gap="sm">
                            <Avatar size="lg" radius="xl" color="violet">
                                {user.fullName
                                    .split(' ')
                                    .map((part) => part[0])
                                    .join('')
                                    .slice(0, 2)}
                            </Avatar>
                            <Stack gap={2}>
                                <Title order={5}>{user.fullName}</Title>
                                <Text size="sm" c="dimmed">
                                    {user.email}
                                </Text>
                            </Stack>
                        </Group>
                        <Divider />
                        <Stack gap="sm">
                            <Group gap="sm">
                                <ThemeIcon variant="light" color="violet" radius="md">
                                    <IconUser size={16} />
                                </ThemeIcon>
                                <Stack gap={0}>
                                    <Text size="xs" c="dimmed">
                                        {t('dashboard.profileCard.role')}
                                    </Text>
                                    <Text fw={600}>{role === 'trainer' ? t('common.roleTrainer') : t('common.roleClient')}</Text>
                                </Stack>
                            </Group>
                            <Group gap="sm">
                                <ThemeIcon variant="light" color="indigo" radius="md">
                                    <IconCalendar size={16} />
                                </ThemeIcon>
                                <Stack gap={0}>
                                    <Text size="xs" c="dimmed">
                                        {t('dashboard.profileCard.timezone')}
                                    </Text>
                                    <Text fw={600}>{timezone}</Text>
                                </Stack>
                            </Group>
                            {user.trainer && (
                                <Group gap="sm">
                                    <ThemeIcon variant="light" color="teal" radius="md">
                                        <IconUser size={16} />
                                    </ThemeIcon>
                                    <Stack gap={0}>
                                        <Text size="xs" c="dimmed">
                                            {t('dashboard.profileCard.trainer')}
                                        </Text>
                                        <Text fw={600}>{user.trainer.fullName}</Text>
                                    </Stack>
                                </Group>
                            )}
                        </Stack>
                    </Stack>
                </Card>

                <Card withBorder padding="xl">
                    <Group justify="space-between" mb="md">
                        <Stack gap={0}>
                            <Text size="sm" c="dimmed" fw={600}>
                                {t('dashboard.updates.title')}
                            </Text>
                            <Title order={4}>{t('dashboard.updates.subtitle')}</Title>
                        </Stack>
                    </Group>
                    <Stack gap="sm">
                        {updatesFeed.length === 0 ? (
                            <Text c="dimmed">{t('dashboard.updates.empty')}</Text>
                        ) : (
                            updatesFeed.map((update) => (
                                <Card key={update.id} withBorder radius="md" padding="md">
                                    <Group align="flex-start" gap="sm">
                                        <ThemeIcon variant="light" color="violet" radius="md">
                                            <IconBell size={16} />
                                        </ThemeIcon>
                                        <Stack gap={2} style={{ flex: 1 }}>
                                            <Text fw={600}>{update.title}</Text>
                                            <Text size="xs" c="dimmed">
                                                {update.subtitle}
                                            </Text>
                                        </Stack>
                                        <ActionIcon variant="subtle" color="gray">
                                            <IconArrowRight size={16} />
                                        </ActionIcon>
                                    </Group>
                                </Card>
                            ))
                        )}
                    </Stack>
                </Card>
            </SimpleGrid>

            <Card withBorder padding="xl">
                <Stack gap="lg">
                    <Group justify="space-between" align="flex-start">
                        <Stack gap={0}>
                            <Text size="sm" c="dimmed" fw={600}>
                                {t('dashboard.bodyOverview.title')}
                            </Text>
                            <Title order={4}>{t('dashboard.bodyOverview.subtitle')}</Title>
                        </Stack>
                        <Badge variant="light">{t('dashboard.periods.30d')}</Badge>
                    </Group>
                    <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="lg">
                        <Card radius="lg" padding="lg" withBorder style={{ backgroundColor: 'var(--mantine-color-violet-0)' }}>
                            <Stack gap="sm">
                                <Group justify="space-between" align="center">
                                    <Stack gap={0}>
                                        <Group gap="xs">
                                            <Text size="sm" c="dimmed">
                                                {t('dashboard.bodyOverview.weight')}
                                            </Text>
                                            {metricGoals.weight && (
                                                <Badge variant="dot" size="xs" color="gray">
                                                    {t('dashboard.bodyOverview.goal')}: {metricGoals.weight.toFixed(1)} {t('dashboard.bodyOverview.weightUnit')}
                                                </Badge>
                                            )}
                                        </Group>
                                        <Group gap="xs">
                                            <Text fw={700} size="xl">
                                                74.4 kg
                                            </Text>
                                            <Badge color="red" variant="light">
                                                -0.8%
                                            </Badge>
                                        </Group>
                                    </Stack>
                                    <Group gap="xs">
                                        <ActionIcon
                                            variant="subtle"
                                            color="gray"
                                            size="sm"
                                            onClick={() => handleOpenGoalModal('weight')}
                                        >
                                            <IconEdit size={16} />
                                        </ActionIcon>
                                        <ThemeIcon radius="xl" variant="light" color="violet">
                                            <IconTrendingUp size={18} />
                                        </ThemeIcon>
                                    </Group>
                                </Group>
                                <ResponsiveContainer width="100%" height={120}>
                                    <LineChart data={primaryChartData.weight}>
                                        <Line type="monotone" dataKey="value" stroke="#7c3aed" strokeWidth={3} dot={false} />
                                        {metricGoals.weight && (
                                            <ReferenceLine
                                                y={metricGoals.weight}
                                                stroke="#cbd5e1"
                                                strokeWidth={1}
                                                strokeDasharray="5 5"
                                                strokeOpacity={0.4}
                                            />
                                        )}
                                    </LineChart>
                                </ResponsiveContainer>
                            </Stack>
                        </Card>
                        <Card radius="lg" padding="lg" withBorder style={{ backgroundColor: 'var(--mantine-color-teal-0)' }}>
                            <Stack gap="sm">
                                <Group justify="space-between" align="center">
                                    <Stack gap={0}>
                                        <Group gap="xs">
                                            <Text size="sm" c="dimmed">
                                                {t('dashboard.bodyOverview.sleep')}
                                            </Text>
                                            {metricGoals.sleep && (
                                                <Badge variant="dot" size="xs" color="gray">
                                                    {t('dashboard.bodyOverview.goal')}: {metricGoals.sleep.toFixed(1)} {t('dashboard.bodyOverview.sleepUnit')}
                                                </Badge>
                                            )}
                                        </Group>
                                        <Group gap="xs">
                                            <Text fw={700} size="xl">
                                                6 h 46 m
                                            </Text>
                                            <Badge color="green" variant="light">
                                                +0.3h
                                            </Badge>
                                        </Group>
                                    </Stack>
                                    <Group gap="xs">
                                        <ActionIcon
                                            variant="subtle"
                                            color="gray"
                                            size="sm"
                                            onClick={() => handleOpenGoalModal('sleep')}
                                        >
                                            <IconEdit size={16} />
                                        </ActionIcon>
                                        <ThemeIcon radius="xl" variant="light" color="teal">
                                            <IconTarget size={18} />
                                        </ThemeIcon>
                                    </Group>
                                </Group>
                                <ResponsiveContainer width="100%" height={120}>
                                    <AreaChart data={primaryChartData.sleep}>
                                        <defs>
                                            <linearGradient id="sleepGradient" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                                                <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <Area type="monotone" dataKey="value" stroke="#06b6d4" strokeWidth={2} fill="url(#sleepGradient)" />
                                        {metricGoals.sleep && (
                                            <ReferenceLine
                                                y={metricGoals.sleep}
                                                stroke="#cbd5e1"
                                                strokeWidth={1}
                                                strokeDasharray="5 5"
                                                strokeOpacity={0.4}
                                            />
                                        )}
                                    </AreaChart>
                                </ResponsiveContainer>
                            </Stack>
                        </Card>
                    </SimpleGrid>
                    <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="lg">
                        <Card radius="lg" padding="lg" withBorder style={{ backgroundColor: 'var(--mantine-color-red-0)' }}>
                            <Stack gap="sm">
                                <Group justify="space-between" align="center">
                                    <Stack gap={0}>
                                        <Group gap="xs">
                                            <Text size="sm" c="dimmed">
                                                {t('dashboard.bodyOverview.heartRate')}
                                            </Text>
                                            {metricGoals.heartRate && (
                                                <Badge variant="dot" size="xs" color="gray">
                                                    {t('dashboard.bodyOverview.goal')}: {metricGoals.heartRate.toFixed(0)} {t('dashboard.bodyOverview.heartRateUnit')}
                                                </Badge>
                                            )}
                                        </Group>
                                        <Group gap="xs">
                                            <Text fw={700} size="xl">
                                                66 bpm
                                            </Text>
                                            <Badge color="green" variant="light">
                                                -5.7%
                                            </Badge>
                                        </Group>
                                    </Stack>
                                    <Group gap="xs">
                                        <ActionIcon
                                            variant="subtle"
                                            color="gray"
                                            size="sm"
                                            onClick={() => handleOpenGoalModal('heartRate')}
                                        >
                                            <IconEdit size={16} />
                                        </ActionIcon>
                                        <ThemeIcon radius="xl" variant="light" color="red">
                                            <IconTrendingUp size={18} />
                                        </ThemeIcon>
                                    </Group>
                                </Group>
                                <ResponsiveContainer width="100%" height={120}>
                                    <LineChart data={primaryChartData.heartRate}>
                                        <Line type="monotone" dataKey="value" stroke="#ef4444" strokeWidth={3} dot={false} />
                                        {metricGoals.heartRate && (
                                            <ReferenceLine
                                                y={metricGoals.heartRate}
                                                stroke="#cbd5e1"
                                                strokeWidth={1}
                                                strokeDasharray="5 5"
                                                strokeOpacity={0.4}
                                            />
                                        )}
                                    </LineChart>
                                </ResponsiveContainer>
                            </Stack>
                        </Card>
                        <Card radius="lg" padding="lg" withBorder style={{ backgroundColor: 'var(--mantine-color-blue-0)' }}>
                            <Stack gap="sm">
                                <Group justify="space-between" align="center">
                                    <Stack gap={0}>
                                        <Group gap="xs">
                                            <Text size="sm" c="dimmed">
                                                {t('dashboard.bodyOverview.steps')}
                                            </Text>
                                            {metricGoals.steps && (
                                                <Badge variant="dot" size="xs" color="gray">
                                                    {t('dashboard.bodyOverview.goal')}: {metricGoals.steps.toFixed(0)} {t('dashboard.bodyOverview.stepsUnit')}
                                                </Badge>
                                            )}
                                        </Group>
                                        <Group gap="xs">
                                            <Text fw={700} size="xl">
                                                7 503
                                            </Text>
                                            <Badge color="green" variant="light">
                                                +4.2%
                                            </Badge>
                                        </Group>
                                    </Stack>
                                    <Group gap="xs">
                                        <ActionIcon
                                            variant="subtle"
                                            color="gray"
                                            size="sm"
                                            onClick={() => handleOpenGoalModal('steps')}
                                        >
                                            <IconEdit size={16} />
                                        </ActionIcon>
                                        <ThemeIcon radius="xl" variant="light" color="blue">
                                            <IconTrendingUp size={18} />
                                        </ThemeIcon>
                                    </Group>
                                </Group>
                                <ResponsiveContainer width="100%" height={120}>
                                    <AreaChart data={primaryChartData.steps}>
                                        <defs>
                                            <linearGradient id="stepsGradient" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <Area type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} fill="url(#stepsGradient)" />
                                        {metricGoals.steps && (
                                            <ReferenceLine
                                                y={metricGoals.steps}
                                                stroke="#cbd5e1"
                                                strokeWidth={1}
                                                strokeDasharray="5 5"
                                                strokeOpacity={0.4}
                                            />
                                        )}
                                    </AreaChart>
                                </ResponsiveContainer>
                            </Stack>
                        </Card>
                    </SimpleGrid>
                </Stack>
            </Card>

            <SimpleGrid cols={{ base: 1, lg: 3 }} spacing="lg">
                <Card withBorder padding="xl">
                    <Group justify="space-between" mb="md">
                        <Stack gap={0}>
                            <Text size="sm" c="dimmed">
                                {t('dashboard.notesTitle')}
                            </Text>
                            <Title order={4}>{t('common.trainerNotes')}</Title>
                        </Stack>
                        {role === 'trainer' && (
                            <Button size="xs" variant="light" leftSection={<IconPlus size={14} />} onClick={() => openNoteModal()}>
                                {t('common.add')}
                            </Button>
                        )}
                    </Group>
                    <Stack gap="sm">
                        {notesPreview.length === 0 ? (
                            <Text c="dimmed">{t('dashboard.emptyNotes')}</Text>
                        ) : (
                            notesPreview.map((note) => (
                                <Card key={note.id} withBorder padding="md" radius="md">
                                    <Stack gap={4}>
                                        <Group justify="space-between" align="flex-start">
                                            <Stack gap={2} style={{ flex: 1 }}>
                                                <Text fw={600}>{note.title}</Text>
                                                <Text size="sm" c="dimmed">
                                                    {note.content}
                                                </Text>
                                                <Text size="xs" c="dimmed">
                                                    {dayjs(note.updatedAt).format('DD MMM, HH:mm')}
                                                </Text>
                                            </Stack>
                                            {role === 'trainer' && (
                                                <Group gap="xs">
                                                    <ActionIcon variant="subtle" onClick={() => { setNoteDraft(note); openNoteModal() }}>
                                                        <IconDotsVertical size={16} />
                                                    </ActionIcon>
                                                    <ActionIcon
                                                        variant="subtle"
                                                        color="red"
                                                        onClick={() => dispatch(removeTrainerNote(note.id))}
                                                    >
                                                        <IconTrash size={16} />
                                                    </ActionIcon>
                                                </Group>
                                            )}
                                        </Group>
                                    </Stack>
                                </Card>
                            ))
                        )}
                    </Stack>
                </Card>

                <Card withBorder padding="xl">
                    <Stack gap="md">
                        <Group justify="space-between">
                            <Text fw={600}>{t('dashboard.limitations.title')}</Text>
                        </Group>
                        <Stack gap="sm">
                            {limitationItems.map((item) => (
                                <Group key={item.id} align="flex-start" gap="sm">
                                    <ThemeIcon variant="light" color="red" radius="md">
                                        <IconAlertTriangle size={16} />
                                    </ThemeIcon>
                                    <Stack gap={2} style={{ flex: 1 }}>
                                        <Text fw={600}>{item.title}</Text>
                                        <Text size="xs" c="dimmed">
                                            {item.date}
                                        </Text>
                                    </Stack>
                                </Group>
                            ))}
                        </Stack>
                    </Stack>
                </Card>

                <Card withBorder padding="xl">
                    <Group justify="space-between" mb="md">
                        <Stack gap={0}>
                            <Text size="sm" c="dimmed">
                                {t('dashboard.photos.title')}
                            </Text>
                            <Title order={4}>{t('dashboard.photos.subtitle')}</Title>
                        </Stack>
                    </Group>
                    <SimpleGrid cols={2} spacing="md">
                        {progressPhotos.map((photo) => (
                            <Card
                                key={photo.id}
                                radius="lg"
                                padding="lg"
                                withBorder={false}
                                style={{
                                    background: `linear-gradient(135deg, ${photo.accent} 0%, rgba(15, 23, 42, 0.9) 100%)`,
                                    color: 'white',
                                    minHeight: '120px',
                                }}
                            >
                                <Stack align="center" gap="xs" justify="center" style={{ height: '100%' }}>
                                    <Text fw={700} size="lg">
                                        {photo.label}
                                    </Text>
                                    <Text size="xs" c="white" style={{ opacity: 0.8 }}>
                                        {t('dashboard.photos.compare')}
                                    </Text>
                                </Stack>
                            </Card>
                        ))}
                    </SimpleGrid>
                </Card>
            </SimpleGrid>

            <SimpleGrid cols={{ base: 1, md: 2 }}>
                <Card withBorder>
                    <Group justify="space-between" mb="md">
                        <Title order={4}>{t('dashboard.upcomingSessions')}</Title>
                        <Badge variant="light">{upcoming.length}</Badge>
                    </Group>
                    <Stack gap="sm">
                        {upcoming.map((workout) => (
                            <Card key={workout.id} withBorder radius="md" padding="md">
                                <Group justify="space-between" align="flex-start">
                                    <Stack gap={4}>
                                        <Text fw={600}>{workout.title}</Text>
                                        <Text size="sm" c="dimmed">
                                            {formatDate(workout.start)}
                                        </Text>
                                    </Stack>
                                    <Badge variant="dot">{t(`calendar.status.${workout.attendance}`)}</Badge>
                                </Group>
                            </Card>
                        ))}
                        {upcoming.length === 0 ? <Text c="dimmed">{t('calendar.upcoming')}</Text> : null}
                    </Stack>
                </Card>
                <Card withBorder>
                    <Group justify="space-between" mb="md">
                        <Title order={4}>{t('calendar.pastSessions')}</Title>
                        <Badge variant="light">{recent.length}</Badge>
                    </Group>
                    <Stack gap="sm">
                        {recent.map((workout) => (
                            <Card key={workout.id} withBorder radius="md" padding="md">
                                <Group justify="space-between" align="center">
                                    <Stack gap={4}>
                                        <Text fw={600}>{workout.title}</Text>
                                        <Text size="sm" c="dimmed">
                                            {formatDate(workout.start)}
                                        </Text>
                                    </Stack>
                                    <Group gap="xs">
                                        <Button
                                            size="xs"
                                            variant={workout.attendance === 'completed' ? 'filled' : 'outline'}
                                            onClick={() =>
                                                dispatch(updateWorkoutAttendance({ workoutId: workout.id, attendance: 'completed' }))
                                            }
                                        >
                                            {t('calendar.attendance.markPresent')}
                                        </Button>
                                        <Button
                                            size="xs"
                                            variant={workout.attendance === 'missed' ? 'filled' : 'outline'}
                                            color="red"
                                            onClick={() =>
                                                dispatch(updateWorkoutAttendance({ workoutId: workout.id, attendance: 'missed' }))
                                            }
                                        >
                                            {t('calendar.attendance.markMissed')}
                                        </Button>
                                    </Group>
                                </Group>
                            </Card>
                        ))}
                        {recent.length === 0 ? <Text c="dimmed">{t('calendar.pastSessions')}</Text> : null}
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

