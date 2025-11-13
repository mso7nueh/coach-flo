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
    Progress,
    RingProgress,
    SimpleGrid,
    Stack,
    Text,
    TextInput,
    Title,
} from '@mantine/core'
import { DragDropContext, Draggable, Droppable, type DropResult } from '@hello-pangea/dnd'
import { useTranslation } from 'react-i18next'
import {
    IconAdjustments,
    IconArrowDown,
    IconArrowUp,
    IconCalendar,
    IconDotsVertical,
    IconGripVertical,
    IconPlus,
    IconTrendingUp,
    IconTrash,
    IconWriting,
} from '@tabler/icons-react'
import { useAppSelector } from '@/shared/hooks/useAppSelector'
import { useAppDispatch } from '@/shared/hooks/useAppDispatch'
import {
    closeConfiguration,
    openConfiguration,
    reorderTiles,
    removeTrainerNote,
    setDashboardPeriod,
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

export const DashboardPage = () => {
    const { t } = useTranslation()
    const dispatch = useAppDispatch()
    const { tiles, availableTiles, period, trainerNotes, configurationOpened } = useAppSelector(
        (state) => state.dashboard,
    )
    const user = useAppSelector((state) => state.user)
    const workouts = useAppSelector((state) => state.calendar.workouts)
    const role = user.role
    const [noteModalOpened, { open: openNoteModal, close: closeNoteModal }] = useDisclosure(false)
    const [noteDraft, setNoteDraft] = useState<TrainerNote | null>(null)

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

            {role === 'trainer' ? (
                <Card withBorder>
                    <Group justify="space-between" mb="md">
                        <Stack gap={0}>
                            <Text c="dimmed">{t('common.trainerNotes')}</Text>
                            <Title order={4}>{t('dashboard.notesTitle')}</Title>
                        </Stack>
                        <Button leftSection={<IconWriting size={16} />} onClick={() => openNoteModal()}>
                            {t('common.add')}
                        </Button>
                    </Group>
                    <Stack gap="sm">
                        {trainerNotes.length === 0 ? <Text c="dimmed">{t('dashboard.emptyNotes')}</Text> : null}
                        {trainerNotes.map((note) => (
                            <Card key={note.id} withBorder padding="md">
                                <Group justify="space-between" align="flex-start">
                                    <Stack gap={4} flex={1}>
                                        <Text fw={600}>{note.title}</Text>
                                        <Text size="sm">{note.content}</Text>
                                        <Text size="xs" c="dimmed">
                                            {dayjs(note.updatedAt).format('DD MMM YYYY, HH:mm')}
                                        </Text>
                                    </Stack>
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
                                </Group>
                            </Card>
                        ))}
                    </Stack>
                </Card>
            ) : null}

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
        </Stack>
    )
}

