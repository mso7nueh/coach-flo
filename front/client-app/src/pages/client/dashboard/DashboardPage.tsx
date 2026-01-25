import {
    ActionIcon,
    Avatar,
    Badge,
    Button,
    Card,
    Divider,
    Drawer,
    FileButton,
    Group,
    Image,
    Loader,
    Modal,
    NumberInput,
    Overlay,
    Select,
    SimpleGrid,
    Stack,
    Text,
    Textarea,
    TextInput,
    Title,
    Tooltip,
    Box,
} from '@mantine/core'
import { DateInput } from '@mantine/dates'
import { DragDropContext, Draggable, Droppable, type DropResult } from '@hello-pangea/dnd'
import { useTranslation } from 'react-i18next'
import {
    IconAlertTriangle,
    IconArrowDown,
    IconArrowUp,
    IconCalendarTime,
    IconCamera,
    IconChevronLeft,
    IconChevronRight,
    IconDotsVertical,
    IconGripVertical,
    IconPhoto,
    IconPlus,
    IconTrash,
    IconEdit,
    IconUpload,
    IconX,
    IconZoomIn,
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
    fetchDashboardStats,
    fetchTrainerNotes,
    createNoteApi,
    updateNoteApi,
} from '@/app/store/slices/dashboardSlice'
import { fetchWorkouts } from '@/app/store/slices/calendarSlice'
import { fetchBodyMetrics, fetchBodyMetricEntries, addBodyMetricEntryApi, type BodyMetricDescriptor } from '@/app/store/slices/metricsSlice'
import { useMemo, useState, useEffect } from 'react'
import { useDisclosure } from '@mantine/hooks'
import dayjs from 'dayjs'
import { updateWorkoutAttendance, updateWorkoutApi } from '@/app/store/slices/calendarSlice'
import type { TrainerNote } from '@/app/store/slices/dashboardSlice'
import { notifications } from '@mantine/notifications'
import { uploadProgressPhoto, deleteProgressPhoto, type ProgressPhoto } from '@/shared/api/client'

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
    const { tiles, availableTiles, period, trainerNotes, configurationOpened, metricGoals, stats } = useAppSelector(
        (state) => state.dashboard,
    )
    const { bodyMetrics, bodyMetricEntries } = useAppSelector((state) => state.metrics)
    const user = useAppSelector((state) => state.user)
    const workouts = useAppSelector((state) => state.calendar.workouts)
    const role = user.role
    const [noteModalOpened, { open: openNoteModal, close: closeNoteModal }] = useDisclosure(false)
    const [noteDraft, setNoteDraft] = useState<TrainerNote | null>(null)
    const [goalModalOpened, { open: openGoalModal, close: closeGoalModal }] = useDisclosure(false)
    const [goalMetricId, setGoalMetricId] = useState<string | null>(null)
    const [goalValue, setGoalValue] = useState<number>(0)

    // Progress photos state
    const [photoGalleryOpened, { open: openPhotoGallery, close: closePhotoGallery }] = useDisclosure(false)
    const [uploadModalOpened, { open: openUploadModal, close: closeUploadModal }] = useDisclosure(false)
    const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number>(0)
    const [photoFile, setPhotoFile] = useState<File | null>(null)
    const [photoNotes, setPhotoNotes] = useState('')
    const [photoDate, setPhotoDate] = useState(dayjs().format('YYYY-MM-DD'))
    const [isUploading, setIsUploading] = useState(false)
    const [localPhotos, setLocalPhotos] = useState<Array<{ id: string; date: string; url: string; notes?: string }>>([])

    // Quick Log State
    const [quickLogOpened, { open: openQuickLog, close: closeQuickLog }] = useDisclosure(false)
    const [quickLogMetric, setQuickLogMetric] = useState<BodyMetricDescriptor | null>(null)
    const [quickLogValue, setQuickLogValue] = useState<number | ''>('')
    const [quickLogDate, setQuickLogDate] = useState<Date | null>(new Date())
    const [isQuickLogSubmitting, setIsQuickLogSubmitting] = useState(false)

    const handleOpenQuickLog = (metricId: string) => {
        // Find metric by analyzing tiles or bodyMetrics
        // We know tile IDs map to metric labels (weight, sleep etc)
        // But we need the actual metric ID from the DB
        // Let's use the memos we already have
        let metric: BodyMetricDescriptor | undefined
        if (metricId === 'weight') metric = weightMetric
        else if (metricId === 'sleep') metric = sleepMetric
        else if (metricId === 'heartRate') metric = heartRateMetric
        else if (metricId === 'steps') metric = stepsMetric

        if (metric) {
            setQuickLogMetric(metric as BodyMetricDescriptor) // Force type because Memo returns array element
            setQuickLogValue('')
            setQuickLogDate(new Date())
            openQuickLog()
        }
    }

    const handleQuickLogSubmit = async () => {
        if (!quickLogMetric || quickLogValue === '' || !quickLogDate) return

        setIsQuickLogSubmitting(true)
        try {
            await dispatch(addBodyMetricEntryApi({
                metricId: quickLogMetric.id,
                value: Number(quickLogValue),
                recordedAt: dayjs(quickLogDate).toISOString(),
            })).unwrap()

            notifications.show({
                title: t('common.success'),
                message: t('dashboard.quickLog.success'),
                color: 'green',
            })
            closeQuickLog()
            // Data refresh is handled by the thunk or auto-refetch if needed, 
            // but addBodyMetricEntryApi already updates the store
        } catch (error: any) {
            notifications.show({
                title: t('common.error'),
                message: error?.message || t('dashboard.quickLog.error'),
                color: 'red',
            })
        } finally {
            setIsQuickLogSubmitting(false)
        }
    }


    useEffect(() => {
        dispatch(fetchDashboardStats(period))
        dispatch(fetchTrainerNotes())
        // Загружаем тренировки за последние 30 дней для дашборда
        const endDate = dayjs().toISOString()
        const startDate = dayjs().subtract(30, 'days').toISOString()
        dispatch(fetchWorkouts({ start_date: startDate, end_date: endDate }))
        // Загружаем метрики тела для графиков
        dispatch(fetchBodyMetrics())
        const metricsStartDate = dayjs().subtract(parseInt(period.replace('d', '')), 'days').toISOString()
        dispatch(fetchBodyMetricEntries({ start_date: metricsStartDate, end_date: endDate }))
    }, [dispatch, period])

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

    const handleSaveNote = async () => {
        if (noteDraft) {
            try {
                if (noteDraft.id && noteDraft.id !== crypto.randomUUID()) {
                    // Обновляем существующую заметку
                    await dispatch(updateNoteApi({
                        note_id: noteDraft.id,
                        title: noteDraft.title,
                        content: noteDraft.content,
                    })).unwrap()
                } else {
                    // Создаем новую заметку (для тренеров нужен client_id, для клиентов он не нужен)
                    await dispatch(createNoteApi({
                        title: noteDraft.title,
                        content: noteDraft.content,
                    })).unwrap()
                }
                closeNoteModal()
                setNoteDraft(null)
                // Перезагружаем заметки после сохранения
                dispatch(fetchTrainerNotes())
            } catch (error: any) {
                notifications.show({
                    title: t('common.error'),
                    message: error?.message || t('dashboard.error.saveNote'),
                    color: 'red',
                })
            }
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

    // Используем часовой пояс из профиля пользователя, если он есть, иначе определяем из браузера
    // @ts-ignore - timezone может быть в API User, но не в UserState
    const timezone = user.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone

    // Используем данные цели из API, если они есть, иначе используем переводы как fallback
    const goalInfo = useMemo(
        () => {
            if (stats?.goal) {
                return {
                    headline: stats.goal.headline,
                    description: stats.goal.description,
                    milestone: stats.goal.milestone,
                    daysLeft: stats.goal.days_left,
                    progress: stats.goal.progress || 0,
                }
            }
            // Fallback на переводы, если данных нет в API
            return {
                headline: t('dashboard.goal.generalGoal'),
                description: t('dashboard.goal.description'),
                milestone: '',
                daysLeft: 0,
                progress: 0,
            }
        },
        [stats?.goal, t],
    )

    // Получаем метрики для отображения
    const weightMetric = useMemo(() => bodyMetrics.find(m => m.label.toLowerCase().includes('вес') || m.label.toLowerCase().includes('weight')), [bodyMetrics])
    const sleepMetric = useMemo(() => bodyMetrics.find(m => m.label.toLowerCase().includes('сон') || m.label.toLowerCase().includes('sleep')), [bodyMetrics])
    const heartRateMetric = useMemo(() => bodyMetrics.find(m => m.label.toLowerCase().includes('пульс') || m.label.toLowerCase().includes('heart')), [bodyMetrics])
    const stepsMetric = useMemo(() => bodyMetrics.find(m => m.label.toLowerCase().includes('шаг') || m.label.toLowerCase().includes('step')), [bodyMetrics])

    // Получаем последние значения метрик
    const getLatestMetricValue = (metricId: string | undefined) => {
        if (!metricId) return null
        const entries = bodyMetricEntries
            .filter(e => e.metricId === metricId)
            .sort((a, b) => dayjs(b.recordedAt).diff(dayjs(a.recordedAt)))
        return entries[0] || null
    }

    const getTodayMetricValue = (metricId: string | undefined) => {
        if (!metricId) return null
        const today = dayjs().startOf('day')
        const entry = bodyMetricEntries
            .find(e => e.metricId === metricId && dayjs(e.recordedAt).isSame(today, 'day'))
        return entry || null
    }

    const getMetricChange = (metricId: string | undefined, periodDays: number) => {
        if (!metricId) return null
        const entries = bodyMetricEntries
            .filter(e => e.metricId === metricId)
            .sort((a, b) => dayjs(b.recordedAt).diff(dayjs(a.recordedAt)))
        if (entries.length < 2) return null
        const latest = entries[0]
        const periodStart = dayjs().subtract(periodDays, 'days')
        const periodEntry = entries.find(e => dayjs(e.recordedAt).isBefore(periodStart) || dayjs(e.recordedAt).isSame(periodStart, 'day'))
        if (!periodEntry) return null
        const change = latest.value - periodEntry.value
        const changePercent = periodEntry.value > 0 ? ((change / periodEntry.value) * 100) : 0
        return { change, changePercent, isPositive: change >= 0 }
    }

    const weightValue = getLatestMetricValue(weightMetric?.id)
    const sleepValue = getLatestMetricValue(sleepMetric?.id)
    const heartRateValue = getLatestMetricValue(heartRateMetric?.id)
    const stepsValue = getLatestMetricValue(stepsMetric?.id)

    const sleepToday = getTodayMetricValue(sleepMetric?.id)
    const heartRateToday = getTodayMetricValue(heartRateMetric?.id)
    const stepsToday = getTodayMetricValue(stepsMetric?.id)

    const periodDays = parseInt(period.replace('d', ''))
    const weightChange = getMetricChange(weightMetric?.id, periodDays)
    const sleepChange = getMetricChange(sleepMetric?.id, periodDays)
    const heartRateChange = getMetricChange(heartRateMetric?.id, periodDays)
    const stepsChange = getMetricChange(stepsMetric?.id, periodDays)

    // Формируем данные для графиков из реальных метрик
    const primaryChartData = useMemo(() => {
        const formatChartData = (metricId: string | undefined) => {
            if (!metricId) return []
            const entries = bodyMetricEntries
                .filter(e => e.metricId === metricId)
                .sort((a, b) => dayjs(a.recordedAt).diff(dayjs(b.recordedAt)))
                .slice(-12) // Последние 12 записей
            return entries.map(entry => ({
                label: dayjs(entry.recordedAt).format('DD MMM'),
                value: entry.value,
            }))
        }

        return {
            weight: formatChartData(weightMetric?.id).length > 0
                ? formatChartData(weightMetric?.id)
                : buildChartSeries(74.4, 0.7),
            sleep: formatChartData(sleepMetric?.id).length > 0
                ? formatChartData(sleepMetric?.id)
                : buildChartSeries(6.8, 0.4),
            heartRate: formatChartData(heartRateMetric?.id).length > 0
                ? formatChartData(heartRateMetric?.id)
                : buildChartSeries(66, 3),
            steps: formatChartData(stepsMetric?.id).length > 0
                ? formatChartData(stepsMetric?.id)
                : buildChartSeries(7500, 500),
        }
    }, [bodyMetrics, bodyMetricEntries, weightMetric, sleepMetric, heartRateMetric, stepsMetric])

    // Используем ограничения из onboarding данных пользователя
    // Если данных нет, не показываем моковые данные
    const clientOnboarding = user.onboardingMetrics
    const limitationItems = useMemo(() => {
        const items: { id: string; title: string; date?: string }[] = []

        if (clientOnboarding?.restrictions && clientOnboarding.restrictions.length > 0) {
            clientOnboarding.restrictions.forEach((text, index) => {
                items.push({ id: `lim-${index}`, title: text })
            })
        }
        // Убрали моковые данные - если ограничений нет, массив будет пустым

        return items
    }, [clientOnboarding?.restrictions])

    // Используем данные фото прогресса из API и локальное состояние
    const progressPhotos = useMemo(
        () => {
            const apiPhotos = stats?.progress_photos?.map((photo, index) => ({
                id: photo.id,
                label: dayjs(photo.date).format('MM/YY'),
                date: photo.date,
                accent: index % 2 === 0 ? '#7c3aed' : '#f97316',
                url: photo.url,
                notes: '',
            })) || []

            const local = localPhotos.map((photo, index) => ({
                id: photo.id,
                label: dayjs(photo.date).format('MM/YY'),
                date: photo.date,
                accent: (apiPhotos.length + index) % 2 === 0 ? '#7c3aed' : '#f97316',
                url: photo.url,
                notes: photo.notes || '',
            }))

            return [...apiPhotos, ...local].sort((a, b) =>
                dayjs(b.date).diff(dayjs(a.date))
            )
        },
        [stats?.progress_photos, localPhotos],
    )

    // Обработчик загрузки фото
    const handlePhotoUpload = async () => {
        if (!photoFile) return

        setIsUploading(true)
        try {
            const uploaded = await uploadProgressPhoto(photoFile, photoDate, photoNotes)
            setLocalPhotos(prev => [...prev, {
                id: uploaded.id,
                date: uploaded.date,
                url: uploaded.url,
                notes: uploaded.notes,
            }])
            notifications.show({
                title: t('common.success'),
                message: t('dashboard.photos.uploadSuccess'),
                color: 'green',
            })
            setPhotoFile(null)
            setPhotoNotes('')
            setPhotoDate(dayjs().format('YYYY-MM-DD'))
            closeUploadModal()
        } catch (error: any) {
            notifications.show({
                title: t('common.error'),
                message: error?.message || t('dashboard.photos.uploadError'),
                color: 'red',
            })
        } finally {
            setIsUploading(false)
        }
    }

    // Обработчик удаления фото
    const handleDeletePhoto = async (photoId: string) => {
        try {
            await deleteProgressPhoto(photoId)
            setLocalPhotos(prev => prev.filter(p => p.id !== photoId))
            notifications.show({
                title: t('common.success'),
                message: t('dashboard.photos.deleteSuccess'),
                color: 'green',
            })
            if (selectedPhotoIndex >= progressPhotos.length - 1) {
                setSelectedPhotoIndex(Math.max(0, progressPhotos.length - 2))
            }
        } catch (error: any) {
            notifications.show({
                title: t('common.error'),
                message: error?.message || t('dashboard.photos.deleteError'),
                color: 'red',
            })
        }
    }

    // Навигация по фото
    const handlePrevPhoto = () => {
        setSelectedPhotoIndex(prev => prev > 0 ? prev - 1 : progressPhotos.length - 1)
    }

    const handleNextPhoto = () => {
        setSelectedPhotoIndex(prev => prev < progressPhotos.length - 1 ? prev + 1 : 0)
    }


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

    const totalWorkouts = stats?.total_workouts ?? workouts.length
    const completedWorkouts = stats?.completed_workouts ?? workouts.filter((w) => w.attendance === 'completed').length
    const attendanceRate = stats?.attendance_rate ?? (totalWorkouts > 0 ? Math.round((completedWorkouts / totalWorkouts) * 100) : 0)
    const todayWorkouts = stats?.today_workouts ?? workouts.filter((w) => dayjs(w.start).isSame(dayjs(), 'day')).length

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
                        </Group>
                        <Badge size="xs" variant="light" color="gray">
                            {t('dashboard.stats.periodLabel', {
                                period: t(`dashboard.periods.${period}`).toLowerCase(),
                            })}
                        </Badge>
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
                        <Badge size="xs" variant="light" color="gray">
                            {t('dashboard.stats.periodLabel', {
                                period: t(`dashboard.periods.${period}`).toLowerCase(),
                            })}
                        </Badge>
                    </Stack>
                </Card>

                <Card withBorder padding="md">
                    <Stack gap="md">
                        <Stack gap="xs">
                            <Text size="xs" c="dimmed" fw={600} tt="uppercase">
                                {t('dashboard.stats.todayWorkouts')}
                            </Text>
                            <Group gap="md" align="flex-end">
                                <Title order={2} c="gray.9">
                                    {todayWorkouts > 0
                                        ? `${todayWorkouts} ${todayWorkouts === 1
                                            ? t('dashboard.stats.workout_one')
                                            : todayWorkouts <= 4
                                                ? t('dashboard.stats.workout_few')
                                                : t('dashboard.stats.workout_many')
                                        }`
                                        : t('dashboard.stats.noWorkoutsToday')}
                                </Title>
                            </Group>
                            <Badge size="xs" variant="light" color="blue">
                                {t('dashboard.stats.currentDayLabel')}
                            </Badge>
                        </Stack>
                        <Divider />
                        <Stack gap="xs">
                            <Text size="xs" c="dimmed" fw={600} tt="uppercase">
                                {t('dashboard.stats.nextWorkout')}
                            </Text>
                            {stats?.next_workout ? (
                                <>
                                    <Text fw={600} size="lg" c="gray.9">
                                        {dayjs(stats.next_workout.start).format('D MMM, HH:mm')}
                                    </Text>
                                    <Text size="sm" c="dimmed">
                                        {stats.next_workout.title}
                                    </Text>
                                </>
                            ) : upcoming.length > 0 ? (
                                <>
                                    <Text fw={600} size="lg" c="gray.9">
                                        {dayjs(upcoming[0].start).format('D MMM, HH:mm')}
                                    </Text>
                                    <Text size="sm" c="dimmed">
                                        {upcoming[0].title}
                                    </Text>
                                </>
                            ) : (
                                <Text size="sm" c="dimmed">
                                    {t('dashboard.stats.noWorkouts')}
                                </Text>
                            )}
                        </Stack>
                    </Stack>
                </Card>
            </SimpleGrid>

            <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md">
                {tiles.map((tile) => {
                    const isTrend = tile.secondaryValue?.includes('↑') || tile.secondaryValue?.includes('↓')
                    const trendUp = tile.secondaryValue?.includes('↑')
                    const showToday = tile.showTodayValue && tile.todayValue

                    return (
                        <Card key={tile.id} withBorder padding="md">
                            <Stack gap="xs">
                                <Group justify="space-between" align="flex-start">
                                    <Stack gap={0}>
                                        <Text size="xs" c="dimmed" fw={600}>
                                            {t(tile.labelKey)}
                                        </Text>
                                        {tile.id === 'steps' && (
                                            <Text size="xs" c="dimmed" style={{ fontSize: '10px' }}>
                                                {t('dashboard.tiles.stepsDescription')}
                                            </Text>
                                        )}
                                    </Stack>
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
                                    <ActionIcon
                                        size="xs"
                                        variant="subtle"
                                        color="gray"
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            handleOpenQuickLog(tile.id)
                                        }}
                                    >
                                        <IconPlus size={14} />
                                    </ActionIcon>
                                </Group>
                                <Stack gap={4}>
                                    {showToday ? (
                                        <>
                                            <Stack gap={2}>
                                                <Text size="xs" c="dimmed">
                                                    {t('dashboard.tiles.todayValue')}
                                                </Text>
                                                <Title order={3} c="gray.9">
                                                    {tile.todayValue}
                                                </Title>
                                            </Stack>
                                            <Divider />
                                            <Stack gap={2}>
                                                <Text size="xs" c="dimmed">
                                                    {t('dashboard.tiles.currentValue')}
                                                </Text>
                                                <Group gap="xs" align="flex-end">
                                                    <Text fw={600} size="lg" c="gray.7">
                                                        {tile.value}
                                                    </Text>
                                                    {tile.secondaryValue && (
                                                        <Text size="xs" c="dimmed">
                                                            {t('dashboard.tiles.changeLabel')}
                                                        </Text>
                                                    )}
                                                </Group>
                                            </Stack>
                                        </>
                                    ) : (
                                        <>
                                            <Title order={3} c="gray.9">
                                                {tile.value}
                                            </Title>
                                            {tile.secondaryValue && (
                                                <Text size="xs" c="dimmed">
                                                    {t('dashboard.tiles.changeLabel')}: {tile.secondaryValue.replace('↑', '').replace('↓', '')}
                                                </Text>
                                            )}
                                        </>
                                    )}
                                </Stack>
                            </Stack>
                        </Card>
                    )
                })}
            </SimpleGrid>

            <SimpleGrid cols={{ base: 1, lg: 3 }} spacing="md">
                {goalInfo.milestone && goalInfo.daysLeft > 0 && (
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
                )}

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
                                            <Text fw={700} size="lg">{weightValue ? weightValue.value.toFixed(1) : '—'}</Text>
                                            <Text size="sm" c="dimmed">{weightMetric?.unit || t('dashboard.bodyOverview.weightUnit')}</Text>
                                            {weightChange && (
                                                <Badge size="xs" color={weightChange.isPositive ? 'green' : 'red'} variant="light">
                                                    {weightChange.isPositive ? '↑' : '↓'} {Math.abs(weightChange.changePercent).toFixed(1)}%
                                                </Badge>
                                            )}
                                        </Group>
                                        <Text size="xs" c="dimmed">
                                            {t('dashboard.bodyOverview.currentValue')}
                                        </Text>
                                        {weightChange && (
                                            <Text size="xs" c="dimmed">
                                                {t('dashboard.bodyOverview.changeLabel')}: {weightChange.isPositive ? '↑' : '↓'} {Math.abs(weightChange.changePercent).toFixed(1)}%
                                            </Text>
                                        )}
                                    </Stack>
                                    <ActionIcon size="xs" variant="subtle" onClick={() => handleOpenQuickLog('weight')}>
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
                                            <Text fw={700} size="lg">
                                                {sleepValue ? `${Math.floor(sleepValue.value)} h ${Math.round((sleepValue.value % 1) * 60)} m` : '—'}
                                            </Text>
                                            {sleepChange && (
                                                <Badge size="xs" color={sleepChange.isPositive ? 'green' : 'red'} variant="light">
                                                    {sleepChange.isPositive ? '+' : ''}{sleepChange.change.toFixed(1)}h
                                                </Badge>
                                            )}
                                        </Group>
                                        <Group gap="xs">
                                            {sleepToday && (
                                                <>
                                                    <Text size="xs" c="dimmed">
                                                        {t('dashboard.bodyOverview.todayValue')}: {Math.floor(sleepToday.value)} h {Math.round((sleepToday.value % 1) * 60)} m
                                                    </Text>
                                                    <Text size="xs" c="dimmed">•</Text>
                                                </>
                                            )}
                                            <Text size="xs" c="dimmed">
                                                {t('dashboard.bodyOverview.currentValue')}: {sleepValue ? `${Math.floor(sleepValue.value)} h ${Math.round((sleepValue.value % 1) * 60)} m` : '—'}
                                            </Text>
                                        </Group>
                                        {sleepChange && (
                                            <Text size="xs" c="dimmed">
                                                {t('dashboard.bodyOverview.changeLabel')}: {sleepChange.isPositive ? '+' : ''}{sleepChange.change.toFixed(1)} ч
                                            </Text>
                                        )}
                                    </Stack>
                                    <ActionIcon size="xs" variant="subtle" onClick={() => handleOpenQuickLog('sleep')}>
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
                                            <Text fw={700} size="lg">{heartRateValue ? Math.round(heartRateValue.value) : '—'}</Text>
                                            <Text size="sm" c="dimmed">{heartRateMetric?.unit || t('dashboard.bodyOverview.heartRateUnit')}</Text>
                                            {heartRateChange && (
                                                <Badge size="xs" color={heartRateChange.isPositive ? 'red' : 'green'} variant="light">
                                                    {heartRateChange.isPositive ? '↑' : '↓'} {Math.abs(heartRateChange.changePercent).toFixed(1)}%
                                                </Badge>
                                            )}
                                        </Group>
                                        <Group gap="xs">
                                            {heartRateToday && (
                                                <>
                                                    <Text size="xs" c="dimmed">
                                                        {t('dashboard.bodyOverview.todayValue')}: {Math.round(heartRateToday.value)} {heartRateMetric?.unit || t('dashboard.bodyOverview.heartRateUnit')}
                                                    </Text>
                                                    <Text size="xs" c="dimmed">•</Text>
                                                </>
                                            )}
                                            <Text size="xs" c="dimmed">
                                                {t('dashboard.bodyOverview.currentValue')}: {heartRateValue ? Math.round(heartRateValue.value) : '—'} {heartRateMetric?.unit || t('dashboard.bodyOverview.heartRateUnit')}
                                            </Text>
                                        </Group>
                                        {heartRateChange && (
                                            <Text size="xs" c="dimmed">
                                                {t('dashboard.bodyOverview.changeLabel')}: {heartRateChange.isPositive ? '↑' : '↓'} {Math.abs(heartRateChange.changePercent).toFixed(1)}%
                                            </Text>
                                        )}
                                    </Stack>
                                    <ActionIcon size="xs" variant="subtle" onClick={() => handleOpenQuickLog('heartRate')}>
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
                                            <Text fw={700} size="lg">{stepsValue ? Math.round(stepsValue.value).toLocaleString('ru-RU') : '—'}</Text>
                                            {stepsChange && (
                                                <Badge size="xs" color={stepsChange.isPositive ? 'green' : 'red'} variant="light">
                                                    {stepsChange.isPositive ? '+' : ''}{Math.abs(stepsChange.changePercent).toFixed(1)}%
                                                </Badge>
                                            )}
                                        </Group>
                                        <Group gap="xs">
                                            {stepsToday && (
                                                <>
                                                    <Text size="xs" c="dimmed">
                                                        {t('dashboard.bodyOverview.todayValue')}: {Math.round(stepsToday.value).toLocaleString('ru-RU')}
                                                    </Text>
                                                    <Text size="xs" c="dimmed">•</Text>
                                                </>
                                            )}
                                            <Text size="xs" c="dimmed">
                                                {t('dashboard.bodyOverview.currentValue')}: {stepsValue ? Math.round(stepsValue.value).toLocaleString('ru-RU') : '—'}
                                            </Text>
                                        </Group>
                                        {stepsChange && (
                                            <Text size="xs" c="dimmed">
                                                {t('dashboard.bodyOverview.changeLabel')}: {stepsChange.isPositive ? '+' : ''}{Math.abs(stepsChange.changePercent).toFixed(1)}%
                                            </Text>
                                        )}
                                    </Stack>
                                    <ActionIcon size="xs" variant="subtle" onClick={() => handleOpenQuickLog('steps')}>
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
                        <Group justify="space-between" align="center">
                            <Text size="xs" c="dimmed" fw={600} tt="uppercase">
                                {t('dashboard.photos.title')}
                            </Text>
                            <Tooltip label={t('dashboard.photos.addPhoto')}>
                                <ActionIcon
                                    variant="light"
                                    color="violet"
                                    size="sm"
                                    onClick={openUploadModal}
                                >
                                    <IconPlus size={14} />
                                </ActionIcon>
                            </Tooltip>
                        </Group>
                        {progressPhotos.length === 0 ? (
                            <Box
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: '24px',
                                    border: '2px dashed var(--mantine-color-gray-3)',
                                    borderRadius: 'var(--mantine-radius-md)',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                }}
                                onClick={openUploadModal}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.borderColor = 'var(--mantine-color-violet-5)'
                                    e.currentTarget.style.backgroundColor = 'var(--mantine-color-violet-0)'
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.borderColor = 'var(--mantine-color-gray-3)'
                                    e.currentTarget.style.backgroundColor = 'transparent'
                                }}
                            >
                                <IconCamera size={32} color="var(--mantine-color-gray-5)" style={{ marginBottom: 8 }} />
                                <Text size="sm" c="dimmed" ta="center">
                                    {t('dashboard.photos.noPhotos')}
                                </Text>
                                <Text size="xs" c="dimmed" ta="center" mt={4}>
                                    {t('dashboard.photos.clickToUpload')}
                                </Text>
                            </Box>
                        ) : (
                            <SimpleGrid cols={2} spacing="xs">
                                {progressPhotos.slice(0, 4).map((photo, index) => (
                                    <Box
                                        key={photo.id}
                                        style={{
                                            position: 'relative',
                                            aspectRatio: '1',
                                            borderRadius: 'var(--mantine-radius-md)',
                                            overflow: 'hidden',
                                            cursor: 'pointer',
                                        }}
                                        onClick={() => {
                                            setSelectedPhotoIndex(index)
                                            openPhotoGallery()
                                        }}
                                    >
                                        <Image
                                            src={photo.url}
                                            alt={photo.label}
                                            h="100%"
                                            w="100%"
                                            fit="cover"
                                            fallbackSrc={`data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect fill="%23${photo.accent.replace('#', '')}" width="100" height="100"/><text x="50%" y="50%" fill="white" font-size="12" text-anchor="middle" dy=".3em">${photo.label}</text></svg>`}
                                        />
                                        <Box
                                            style={{
                                                position: 'absolute',
                                                bottom: 0,
                                                left: 0,
                                                right: 0,
                                                background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
                                                padding: '8px',
                                            }}
                                        >
                                            <Text size="xs" c="white" fw={600}>
                                                {photo.label}
                                            </Text>
                                        </Box>
                                        <Box
                                            style={{
                                                position: 'absolute',
                                                top: 8,
                                                right: 8,
                                                opacity: 0,
                                                transition: 'opacity 0.2s',
                                            }}
                                            className="photo-zoom-icon"
                                        >
                                            <IconZoomIn size={20} color="white" />
                                        </Box>
                                    </Box>
                                ))}
                                {progressPhotos.length > 4 && (
                                    <Box
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            background: 'var(--mantine-color-gray-1)',
                                            borderRadius: 'var(--mantine-radius-md)',
                                            cursor: 'pointer',
                                            aspectRatio: '1',
                                        }}
                                        onClick={() => {
                                            setSelectedPhotoIndex(0)
                                            openPhotoGallery()
                                        }}
                                    >
                                        <Text size="sm" c="dimmed" fw={600}>
                                            +{progressPhotos.length - 4} {t('dashboard.photos.more')}
                                        </Text>
                                    </Box>
                                )}
                            </SimpleGrid>
                        )}
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
                                                onClick={async () => {
                                                    dispatch(updateWorkoutAttendance({ workoutId: workout.id, attendance: 'completed' }))
                                                    try {
                                                        await dispatch(updateWorkoutApi({
                                                            workoutId: workout.id,
                                                            updates: { attendance: 'completed' }
                                                        })).unwrap()
                                                    } catch (error) {
                                                        // Откатываем локальное изменение при ошибке
                                                        dispatch(updateWorkoutAttendance({ workoutId: workout.id, attendance: workout.attendance }))
                                                    }
                                                }}
                                            >
                                                {t('calendar.attendance.markPresent')}
                                            </Button>
                                            <Button
                                                size="xs"
                                                variant={workout.attendance === 'missed' ? 'filled' : 'light'}
                                                color="red"
                                                onClick={async () => {
                                                    dispatch(updateWorkoutAttendance({ workoutId: workout.id, attendance: 'missed' }))
                                                    try {
                                                        await dispatch(updateWorkoutApi({
                                                            workoutId: workout.id,
                                                            updates: { attendance: 'missed' }
                                                        })).unwrap()
                                                    } catch (error) {
                                                        // Откатываем локальное изменение при ошибке
                                                        dispatch(updateWorkoutAttendance({ workoutId: workout.id, attendance: workout.attendance }))
                                                    }
                                                }}
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

            {/* Photo Gallery Modal */}
            <Modal
                opened={photoGalleryOpened}
                onClose={closePhotoGallery}
                size="xl"
                padding={0}
                withCloseButton={false}
                styles={{
                    content: {
                        backgroundColor: 'transparent',
                        boxShadow: 'none',
                    },
                    body: {
                        padding: 0,
                    },
                }}
            >
                <Box style={{ position: 'relative' }}>
                    {/* Close button */}
                    <ActionIcon
                        variant="filled"
                        color="dark"
                        size="lg"
                        radius="xl"
                        style={{ position: 'absolute', top: 16, right: 16, zIndex: 10 }}
                        onClick={closePhotoGallery}
                    >
                        <IconX size={20} />
                    </ActionIcon>

                    {/* Navigation buttons */}
                    {progressPhotos.length > 1 && (
                        <>
                            <ActionIcon
                                variant="filled"
                                color="dark"
                                size="xl"
                                radius="xl"
                                style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', zIndex: 10 }}
                                onClick={handlePrevPhoto}
                            >
                                <IconChevronLeft size={24} />
                            </ActionIcon>
                            <ActionIcon
                                variant="filled"
                                color="dark"
                                size="xl"
                                radius="xl"
                                style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', zIndex: 10 }}
                                onClick={handleNextPhoto}
                            >
                                <IconChevronRight size={24} />
                            </ActionIcon>
                        </>
                    )}

                    {/* Photo display */}
                    {progressPhotos.length > 0 && progressPhotos[selectedPhotoIndex] && (
                        <Box>
                            <Image
                                src={progressPhotos[selectedPhotoIndex].url}
                                alt={progressPhotos[selectedPhotoIndex].label}
                                fit="contain"
                                h="70vh"
                                w="100%"
                                radius="md"
                                fallbackSrc={`data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><rect fill="%23${progressPhotos[selectedPhotoIndex].accent.replace('#', '')}" width="400" height="400"/><text x="50%" y="50%" fill="white" font-size="24" text-anchor="middle" dy=".3em">${progressPhotos[selectedPhotoIndex].label}</text></svg>`}
                            />
                            <Card mt="md" padding="md" radius="md">
                                <Group justify="space-between" align="center">
                                    <Stack gap={4}>
                                        <Text size="lg" fw={600}>
                                            {dayjs(progressPhotos[selectedPhotoIndex].date).format('D MMMM YYYY')}
                                        </Text>
                                        {progressPhotos[selectedPhotoIndex].notes && (
                                            <Text size="sm" c="dimmed">
                                                {progressPhotos[selectedPhotoIndex].notes}
                                            </Text>
                                        )}
                                    </Stack>
                                    <Group gap="xs">
                                        <Text size="sm" c="dimmed">
                                            {selectedPhotoIndex + 1} / {progressPhotos.length}
                                        </Text>
                                        <ActionIcon
                                            variant="light"
                                            color="red"
                                            onClick={() => handleDeletePhoto(progressPhotos[selectedPhotoIndex].id)}
                                        >
                                            <IconTrash size={16} />
                                        </ActionIcon>
                                    </Group>
                                </Group>
                            </Card>
                        </Box>
                    )}
                </Box>
            </Modal>

            {/* Upload Photo Modal */}
            <Modal
                opened={uploadModalOpened}
                onClose={closeUploadModal}
                title={t('dashboard.photos.uploadTitle')}
                centered
            >
                <Stack gap="md">
                    <Box
                        style={{
                            border: '2px dashed var(--mantine-color-gray-3)',
                            borderRadius: 'var(--mantine-radius-md)',
                            padding: '24px',
                            textAlign: 'center',
                            cursor: 'pointer',
                            backgroundColor: photoFile ? 'var(--mantine-color-violet-0)' : 'transparent',
                            transition: 'all 0.2s ease',
                        }}
                    >
                        {photoFile ? (
                            <Stack align="center" gap="xs">
                                <IconPhoto size={32} color="var(--mantine-color-violet-6)" />
                                <Text size="sm" fw={500}>{photoFile.name}</Text>
                                <Text size="xs" c="dimmed">
                                    {(photoFile.size / 1024 / 1024).toFixed(2)} MB
                                </Text>
                                <Button
                                    variant="subtle"
                                    color="red"
                                    size="xs"
                                    onClick={() => setPhotoFile(null)}
                                >
                                    {t('common.delete')}
                                </Button>
                            </Stack>
                        ) : (
                            <FileButton
                                onChange={setPhotoFile}
                                accept="image/png,image/jpeg,image/webp,image/heic"
                            >
                                {(props) => (
                                    <Stack align="center" gap="xs" {...props}>
                                        <IconUpload size={32} color="var(--mantine-color-gray-5)" />
                                        <Text size="sm" c="dimmed">
                                            {t('dashboard.photos.selectFile')}
                                        </Text>
                                        <Text size="xs" c="dimmed">
                                            PNG, JPG, WEBP, HEIC
                                        </Text>
                                    </Stack>
                                )}
                            </FileButton>
                        )}
                    </Box>

                    <TextInput
                        label={t('dashboard.photos.date')}
                        type="date"
                        value={photoDate}
                        onChange={(e) => setPhotoDate(e.currentTarget.value)}
                    />

                    <Textarea
                        label={t('dashboard.photos.notes')}
                        placeholder={t('dashboard.photos.notesPlaceholder')}
                        value={photoNotes}
                        onChange={(e) => setPhotoNotes(e.currentTarget.value)}
                        minRows={2}
                    />

                    <Group justify="flex-end">
                        <Button variant="default" onClick={closeUploadModal}>
                            {t('common.cancel')}
                        </Button>
                        <Button
                            onClick={handlePhotoUpload}
                            loading={isUploading}
                            disabled={!photoFile}
                            leftSection={<IconUpload size={16} />}
                        >
                            {t('dashboard.photos.upload')}
                        </Button>
                    </Group>
                </Stack>
            </Modal>

            {/* Quick Log Modal */}
            <Modal
                opened={quickLogOpened}
                onClose={closeQuickLog}
                title={t('dashboard.quickLog.title')}
                size="sm"
            >
                <Stack gap="md">
                    <Text size="sm" c="dimmed">
                        {t('dashboard.quickLog.valueLabel')} - {quickLogMetric?.label} ({quickLogMetric?.unit})
                    </Text>
                    <NumberInput
                        label={t('dashboard.quickLog.valueLabel')}
                        placeholder="0"
                        value={quickLogValue}
                        onChange={(value) => setQuickLogValue(typeof value === 'number' ? value : '')}
                        min={0}
                        suffix={` ${quickLogMetric?.unit || ''}`}
                    />
                    <DateInput
                        label={t('dashboard.quickLog.dateLabel')}
                        value={quickLogDate}
                        onChange={setQuickLogDate}
                        clearable={false}
                        maxDate={new Date()}
                    />
                    <Group justify="flex-end">
                        <Button variant="default" onClick={closeQuickLog}>
                            {t('common.cancel')}
                        </Button>
                        <Button
                            onClick={handleQuickLogSubmit}
                            loading={isQuickLogSubmitting}
                            disabled={quickLogValue === '' || !quickLogDate}
                        >
                            {t('dashboard.quickLog.submit')}
                        </Button>
                    </Group>
                </Stack>
            </Modal>
        </Stack >
    )
}

