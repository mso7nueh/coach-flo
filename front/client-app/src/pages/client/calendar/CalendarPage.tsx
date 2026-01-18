import {
    ActionIcon,
    Alert,
    Badge,
    Button,
    Card,
    Checkbox,
    Group,
    NumberInput,
    ScrollArea,
    Select,
    Stack,
    Text,
    TextInput,
} from '@mantine/core'
import { DateInput, TimeInput } from '@mantine/dates'
import dayjs from 'dayjs'
import isoWeek from 'dayjs/plugin/isoWeek'
import 'dayjs/locale/ru'

dayjs.extend(isoWeek)
dayjs.locale('ru')
import { useTranslation } from 'react-i18next'
import { notifications } from '@mantine/notifications'
import {
    IconCalendar,
    IconCalendarEvent,
    IconCheck,
    IconClock,
    IconCopy,
    IconChevronLeft,
    IconChevronRight,
    IconListDetails,
    IconMapPin,
    IconNumbers,
    IconPlus,
    IconRepeat,
    IconSparkles,
    IconTrash,
    IconTypography,
} from '@tabler/icons-react'
import { useAppDispatch } from '@/shared/hooks/useAppDispatch'
import { useAppSelector } from '@/shared/hooks/useAppSelector'
import {
    removeWorkout,
    createWorkout,
    goToToday,
    goToPreviousWeek,
    goToNextWeek,
    updateWorkout,
    updateWorkoutApi,
    deleteWorkoutApi,
    fetchWorkouts,
    type RecurrenceFrequency,
    type DayOfWeek,
    moveWorkout,
    type ClientWorkout,
} from '@/app/store/slices/calendarSlice'
import { useMemo, useState, useEffect, type DragEvent } from 'react'
import { useDisclosure } from '@mantine/hooks'
import { Modal } from '@mantine/core'
import { nanoid } from '@reduxjs/toolkit'

interface WorkoutFormState {
    id?: string
    title: string
    date: Date | null
    startTime: string
    endTime: string
    location?: string
    programDayId?: string
    isRecurring: boolean
    recurrenceFrequency: RecurrenceFrequency
    recurrenceInterval: number
    recurrenceDaysOfWeek: DayOfWeek[]
    recurrenceEndDate: Date | null
    recurrenceOccurrences: number | null
    trainerId?: string
    withTrainer: boolean
    format: 'online' | 'offline'
}

const buildFormState = (date: string, options?: { trainerId?: string; withTrainer?: boolean }): WorkoutFormState => ({
    title: '',
    date: dayjs(date).toDate(),
    startTime: '18:00',
    endTime: '19:00',
    location: '',
    programDayId: undefined, // Явно указываем, что при создании новой тренировки programDayId не задан
    isRecurring: false,
    recurrenceFrequency: 'weekly',
    recurrenceInterval: 1,
    recurrenceDaysOfWeek: [],
    recurrenceEndDate: null,
    recurrenceOccurrences: null,
    trainerId: options?.trainerId,
    withTrainer: options?.withTrainer ?? false,
    format: options?.withTrainer ? 'offline' : 'online',
})

export const CalendarPage = () => {
    const { t } = useTranslation()
    const dispatch = useAppDispatch()
    const { workouts, selectedDate, currentStartDate, trainerAvailability } = useAppSelector((state) => state.calendar)
    const role = useAppSelector((state) => state.user.role)
    const programDays = useAppSelector((state) => state.program.days)
    const trainerInfo = useAppSelector((state) => state.user.trainer)
    const [modalOpened, { open, close }] = useDisclosure(false)
    const [formState, setFormState] = useState<WorkoutFormState>(
        buildFormState(selectedDate, { trainerId: trainerInfo?.id, withTrainer: Boolean(trainerInfo) }),
    )
    const [highlightedDates, setHighlightedDates] = useState<string[]>([])
    const [activeDragWorkout, setActiveDragWorkout] = useState<ClientWorkout | null>(null)
    const [dragError, setDragError] = useState<string | null>(null)

    // Загружаем тренировки при открытии календаря
    useEffect(() => {
        // При загрузке страницы загружаем тренировки за больший период (месяц назад - месяц вперед), 
        // чтобы не потерять тренировки при перезагрузке
        const loadStartDate = dayjs().subtract(30, 'days')
        const loadEndDate = dayjs().add(30, 'days')
        dispatch(fetchWorkouts({
            start_date: loadStartDate.toISOString(),
            end_date: loadEndDate.toISOString(),
        }))
    }, [dispatch]) // Загружаем только при монтировании компонента

    // Дополнительно загружаем тренировки при изменении текущей недели (для пагинации)
    useEffect(() => {
        const startDate = dayjs(currentStartDate).startOf('isoWeek')
        const endDate = startDate.endOf('isoWeek').add(1, 'week')
        // Загружаем тренировки за период вокруг текущей недели (они объединятся с уже загруженными)
        dispatch(fetchWorkouts({
            start_date: startDate.subtract(1, 'week').toISOString(),
            end_date: endDate.toISOString(),
        }))
    }, [dispatch, currentStartDate]) // Загружаем при изменении недели

    // Обновляем форму при изменении trainerInfo
    useEffect(() => {
        if (!modalOpened && trainerInfo?.id) {
            setFormState((state) => ({
                ...state,
                trainerId: trainerInfo.id,
                withTrainer: Boolean(trainerInfo && trainerInfo.id),
            }))
        }
    }, [trainerInfo, modalOpened])

    const startDate = dayjs(currentStartDate).startOf('isoWeek')

    const calendarDays = useMemo(() => {
        const days: dayjs.Dayjs[] = []
        let current = startDate.startOf('isoWeek')
        const end = startDate.endOf('isoWeek')

        while (current.isBefore(end) || current.isSame(end, 'day')) {
            days.push(current)
            current = current.add(1, 'day')
        }

        return days
    }, [startDate])

    const getTrainerAvailableDates = (trainerId?: string) => {
        if (!trainerId) {
            return []
        }
        const availability = trainerAvailability[trainerId]
        if (!availability) {
            return []
        }
        return Object.keys(availability).filter((dayKey) => (availability[dayKey]?.length ?? 0) > 0)
    }

    const getTrainerSlotsForDay = (trainerId?: string, date?: Date | null) => {
        if (!trainerId || !date) {
            return []
        }
        const dayKey = dayjs(date).startOf('day').toISOString()
        return trainerAvailability[trainerId]?.[dayKey] ?? []
    }

    const workoutsPerDay = useMemo(() => {
        return workouts.reduce<Record<string, typeof workouts>>((acc, item) => {
            const key = dayjs(item.start).startOf('day').toISOString()
            if (!acc[key]) {
                acc[key] = []
            }
            acc[key].push(item)
            return acc
        }, {})
    }, [workouts])
    const availableDatesForTrainer = getTrainerAvailableDates(formState.trainerId ?? trainerInfo?.id)
    const availableSlotsForSelectedDate =
        formState.withTrainer && formState.date
            ? getTrainerSlotsForDay(formState.trainerId ?? trainerInfo?.id, formState.date)
            : []

    const isTrainerDrag = Boolean(activeDragWorkout && activeDragWorkout.withTrainer && activeDragWorkout.format === 'offline')

    const openCreateModal = (date?: Date) => {
        const targetDate = date ? dayjs(date) : dayjs(selectedDate)
        setFormState(buildFormState(targetDate.toISOString(), { trainerId: trainerInfo?.id, withTrainer: Boolean(trainerInfo) }))
        open()
    }

    const applyWorkoutToForm = (target: ClientWorkout, overrides?: Partial<WorkoutFormState>) => {
        setFormState({
            id: target.id,
            title: target.title,
            date: dayjs(target.start).startOf('day').toDate(),
            startTime: dayjs(target.start).format('HH:mm'),
            endTime: dayjs(target.end).format('HH:mm'),
            location: target.location ?? '',
            programDayId: target.programDayId,
            isRecurring: !!target.recurrence,
            recurrenceFrequency: target.recurrence?.frequency ?? 'weekly',
            recurrenceInterval: target.recurrence?.interval ?? 1,
            recurrenceDaysOfWeek: target.recurrence?.daysOfWeek ?? [],
            recurrenceEndDate: target.recurrence?.endDate ? dayjs(target.recurrence.endDate).toDate() : null,
            recurrenceOccurrences: target.recurrence?.occurrences ?? null,
            trainerId: target.trainerId,
            withTrainer: Boolean(target.withTrainer),
            format: target.format ?? 'online',
            ...overrides,
        })
    }

    const handleToggleDay = (day: DayOfWeek) => {
        setFormState((state) => {
            const active = state.recurrenceDaysOfWeek.includes(day)
            return {
                ...state,
                recurrenceDaysOfWeek: active
                    ? state.recurrenceDaysOfWeek.filter((item) => item !== day)
                    : [...state.recurrenceDaysOfWeek, day],
            }
        })
    }

    const openEditModal = (id: string) => {
        const target = workouts.find((item) => item.id === id)
        if (!target) {
            return
        }
        applyWorkoutToForm(target)
        open()
    }

    const handleSubmit = async () => {
        if (!formState.date) {
            return
        }
        const start = dayjs(formState.date)
            .hour(Number(formState.startTime.split(':')[0]))
            .minute(Number(formState.startTime.split(':')[1]))
        const end = dayjs(formState.date).hour(Number(formState.endTime.split(':')[0])).minute(Number(formState.endTime.split(':')[1]))
        const workoutData = {
            title: formState.title,
            start: start.toISOString(),
            end: end.toISOString(),
            location: formState.location,
            programDayId: formState.programDayId,
            trainerId: formState.withTrainer ? formState.trainerId ?? trainerInfo?.id : undefined,
            format: formState.format,
            recurrence: formState.isRecurring
                ? {
                    frequency: formState.recurrenceFrequency,
                    interval: formState.recurrenceInterval,
                    daysOfWeek:
                        formState.recurrenceFrequency === 'weekly' && formState.recurrenceDaysOfWeek.length > 0
                            ? formState.recurrenceDaysOfWeek
                            : undefined,
                    endDate: formState.recurrenceEndDate ? dayjs(formState.recurrenceEndDate).toISOString() : undefined,
                    occurrences: formState.recurrenceOccurrences ?? undefined,
                    seriesId: formState.id || `series-${nanoid()}`,
                }
                : undefined,
        }

        try {
            if (formState.id) {
                await dispatch(
                    updateWorkoutApi({
                        workoutId: formState.id,
                        updates: {
                            title: workoutData.title,
                            start: workoutData.start,
                            end: workoutData.end,
                            location: workoutData.location,
                            format: workoutData.format,
                            attendance: 'scheduled' as const,
                        },
                    }),
                ).unwrap()
                notifications.show({
                    title: t('common.success'),
                    message: t('calendar.workoutUpdated'),
                    color: 'green',
                })
                // Перезагружаем тренировки после обновления
                const startDate = dayjs(currentStartDate).startOf('week')
                const endDate = startDate.endOf('week').add(1, 'week')
                dispatch(fetchWorkouts({
                    start_date: startDate.subtract(1, 'week').toISOString(),
                    end_date: endDate.toISOString(),
                }))
            } else {
                await dispatch(createWorkout(workoutData)).unwrap()
                notifications.show({
                    title: t('common.success'),
                    message: t('calendar.workoutCreated'),
                    color: 'green',
                })
                // Перезагружаем тренировки после создания
                const startDate = dayjs(currentStartDate).startOf('week')
                const endDate = startDate.endOf('week').add(1, 'week')
                dispatch(fetchWorkouts({
                    start_date: startDate.subtract(1, 'week').toISOString(),
                    end_date: endDate.toISOString(),
                }))
            }
            close()
            setFormState(buildFormState(selectedDate, { trainerId: trainerInfo?.id, withTrainer: Boolean(trainerInfo) }))
        } catch (error: any) {
            notifications.show({
                title: t('common.error'),
                message: error || t('calendar.error.createWorkout'),
                color: 'red',
            })
        }
    }

    const dayNames = [
        t('calendar.monday'),
        t('calendar.tuesday'),
        t('calendar.wednesday'),
        t('calendar.thursday'),
        t('calendar.friday'),
        t('calendar.saturday'),
        t('calendar.sunday'),
    ]

    const isToday = (date: dayjs.Dayjs) => date.isSame(dayjs(), 'day')
    const isPast = (date: dayjs.Dayjs) => date.isBefore(dayjs(), 'day')

    const getDayWorkouts = (date: dayjs.Dayjs) => {
        const key = date.startOf('day').toISOString()
        return workoutsPerDay[key] ?? []
    }

    const handleDragStart = (event: DragEvent<HTMLDivElement>, workout: ClientWorkout) => {
        event.dataTransfer.setData('text/plain', workout.id)
        setActiveDragWorkout(workout)
        if (workout.withTrainer && workout.format === 'offline') {
            setHighlightedDates(getTrainerAvailableDates(workout.trainerId))
        }
    }

    const handleDragEnd = () => {
        setActiveDragWorkout(null)
        setHighlightedDates([])
        setDragError(null)
    }

    const isDayBlockedForWorkout = (workout: ClientWorkout, day: dayjs.Dayjs) => {
        if (!workout.withTrainer || workout.format !== 'offline' || !workout.trainerId) {
            return false
        }
        return getTrainerSlotsForDay(workout.trainerId, day.toDate()).length === 0
    }

    const handleDayDragOver = (event: DragEvent<HTMLDivElement>, isBlocked: boolean) => {
        if (!activeDragWorkout) {
            return
        }
        if (isBlocked) {
            event.dataTransfer.dropEffect = 'none'
            setDragError(t('calendar.trainerDayBlocked'))
            return
        }
        event.preventDefault()
        setDragError(null)
    }

    const handleDropOnDay = (event: DragEvent<HTMLDivElement>, day: dayjs.Dayjs) => {
        event.preventDefault()
        const droppedWorkoutId = event.dataTransfer.getData('text/plain') || activeDragWorkout?.id
        if (!droppedWorkoutId) {
            return
        }
        const workout = workouts.find((item) => item.id === droppedWorkoutId)
        if (!workout) {
            return
        }
        const targetDateISO = day.startOf('day').toISOString()
        if (isDayBlockedForWorkout(workout, day)) {
            setDragError(t('calendar.trainerDayBlocked'))
            return
        }
        const sourceStart = dayjs(workout.start)
        const duration = dayjs(workout.end).diff(sourceStart, 'minute')
        const updatedStart = day.clone().hour(sourceStart.hour()).minute(sourceStart.minute()).second(0)
        const updatedEnd = updatedStart.add(duration, 'minute')

        dispatch(moveWorkout({ id: droppedWorkoutId, targetDate: targetDateISO }))
        setDragError(null)
        handleDragEnd()
        applyWorkoutToForm({
            ...workout,
            start: updatedStart.toISOString(),
            end: updatedEnd.toISOString(),
        })
        open()
    }

    const handleSlotSelect = (slot: { start: string; end: string }) => {
        setFormState((state) => ({
            ...state,
            startTime: dayjs(slot.start).format('HH:mm'),
            endTime: dayjs(slot.end).format('HH:mm'),
        }))
    }

    return (
        <Stack gap="md">
            <Group justify="space-between" align="center">
                <Group gap="md">
                    <Button variant="light" size="sm" onClick={() => dispatch(goToToday())}>
                        {t('calendar.today')}
                    </Button>
                    <Group gap="xs">
                        <ActionIcon variant="light" onClick={() => dispatch(goToPreviousWeek())}>
                            <IconChevronLeft size={18} />
                        </ActionIcon>
                        <Button variant="subtle" onClick={() => dispatch(goToToday())}>
                            {startDate.format('MMM D')} - {startDate.endOf('isoWeek').format('MMM D')}
                        </Button>
                        <ActionIcon variant="light" onClick={() => dispatch(goToNextWeek())}>
                            <IconChevronRight size={18} />
                        </ActionIcon>
                    </Group>
                </Group>
                <Button leftSection={<IconPlus size={16} />} onClick={() => openCreateModal()}>
                    {t('common.add')}
                </Button>
            </Group>

            {dragError && (
                <Alert
                    color="red"
                    variant="light"
                    withCloseButton
                    onClose={() => setDragError(null)}
                    title={t('calendar.dragRestrictedTitle')}
                >
                    {dragError}
                </Alert>
            )}

            {activeDragWorkout && highlightedDates.length > 0 && (
                <Alert
                    color="violet"
                    variant="light"
                    title={t('calendar.trainerAvailabilityTitle', {
                        trainer: activeDragWorkout.trainerId && trainerInfo?.id === activeDragWorkout.trainerId
                            ? trainerInfo.fullName
                            : t('calendar.trainerFallbackName'),
                    })}
                >
                    <Group gap="xs" mt="sm" wrap="wrap">
                        {highlightedDates.map((date) => (
                            <Badge key={date} color="violet" variant="light">
                                {dayjs(date).format('DD MMM')}
                            </Badge>
                        ))}
                    </Group>
                    <Text size="xs" c="dimmed" mt="xs">
                        {t('calendar.trainerAvailabilityHint')}
                    </Text>
                </Alert>
            )}

            <ScrollArea h={`calc(100vh - ${200}px)`}>
                <div style={{ display: 'flex', flexDirection: 'column', minHeight: '600px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid var(--mantine-color-gray-3)' }}>
                        {calendarDays.map((day, index) => {
                            const dayOfWeek = day.isoWeekday() // ISO неделя: понедельник = 1, воскресенье = 7
                            const isFirstDay = index === 0
                            return (
                                <div
                                    key={day.toISOString()}
                                    style={{
                                        borderRight: index !== 6 ? '1px solid var(--mantine-color-gray-3)' : 'none',
                                        borderLeft: isFirstDay ? '1px solid var(--mantine-color-gray-3)' : 'none',
                                        padding: '8px 4px',
                                        backgroundColor: 'var(--mantine-color-gray-0)',
                                        textAlign: 'center',
                                    }}
                                >
                                    <Text size="xs" fw={600} c="dimmed" tt="uppercase">
                                        {dayNames[dayOfWeek - 1]} {/* -1 потому что массив начинается с 0 */}
                                    </Text>
                                </div>
                            )
                        })}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', flex: 1 }}>
                        {calendarDays.map((day, index) => {
                            const dayWorkouts = getDayWorkouts(day)
                            const isFirstDay = index === 0
                            const isCurrentDay = isToday(day)
                            const dayKey = day.startOf('day').toISOString()
                            const isHighlightedAsAvailable = highlightedDates.includes(dayKey)
                            const isBlockedForDrag = isTrainerDrag && !isHighlightedAsAvailable && Boolean(activeDragWorkout?.withTrainer && activeDragWorkout?.format === 'offline')
                            const dayBackgroundColor = isCurrentDay
                                ? 'var(--mantine-color-violet-0)'
                                : isBlockedForDrag
                                    ? 'var(--mantine-color-red-0)'
                                    : isHighlightedAsAvailable
                                        ? 'var(--mantine-color-violet-0)'
                                        : 'white'

                            return (
                                <div
                                    key={day.toISOString()}
                                    style={{
                                        borderRight:
                                            index % 7 !== 6
                                                ? `1px solid ${
                                                      isHighlightedAsAvailable
                                                          ? 'var(--mantine-color-violet-4)'
                                                          : 'var(--mantine-color-gray-3)'
                                                  }`
                                                : 'none',
                                        borderLeft: isFirstDay
                                            ? `1px solid ${
                                                  isHighlightedAsAvailable
                                                      ? 'var(--mantine-color-violet-4)'
                                                      : 'var(--mantine-color-gray-3)'
                                              }`
                                            : 'none',
                                        borderBottom: `1px solid ${
                                            isHighlightedAsAvailable ? 'var(--mantine-color-violet-4)' : 'var(--mantine-color-gray-3)'
                                        }`,
                                        padding: '8px 4px',
                                        minHeight: '120px',
                                        backgroundColor: dayBackgroundColor,
                                        position: 'relative',
                                        cursor: isBlockedForDrag ? 'not-allowed' : 'pointer',
                                        boxShadow: isBlockedForDrag
                                            ? 'inset 0 0 0 2px var(--mantine-color-red-4)'
                                            : isHighlightedAsAvailable
                                                ? 'inset 0 0 0 1px var(--mantine-color-violet-4)'
                                                : undefined,
                                    }}
                                    onClick={(e) => {
                                        if (e.target === e.currentTarget) {
                                            openCreateModal(day.toDate())
                                        }
                                    }}
                                    onDragOver={(event) => handleDayDragOver(event, isBlockedForDrag)}
                                    onDragEnter={(event) => handleDayDragOver(event, isBlockedForDrag)}
                                    onDragLeave={() => setDragError(null)}
                                    onDrop={(event) => handleDropOnDay(event, day)}
                                >
                                    <Group justify="space-between" mb="xs" gap="xs">
                                        <Text
                                            size="sm"
                                            fw={isCurrentDay ? 700 : isPast(day) ? 400 : 600}
                                            c={isCurrentDay ? 'white' : isBlockedForDrag ? 'red.7' : isPast(day) ? 'dimmed' : 'gray.9'}
                                            style={{
                                                width: '28px',
                                                height: '28px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                borderRadius: '50%',
                                                backgroundColor: isCurrentDay ? 'var(--mantine-color-violet-6)' : isBlockedForDrag ? 'var(--mantine-color-red-2)' : 'transparent',
                                            }}
                                        >
                                            {day.date()}
                                        </Text>
                                        <ActionIcon
                                            size="xs"
                                            variant="subtle"
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                openCreateModal(day.toDate())
                                            }}
                                        >
                                            <IconPlus size={14} />
                                        </ActionIcon>
                                    </Group>
                                    <Stack gap={4} style={{ overflowY: 'auto', maxHeight: 'calc(100% - 40px)' }}>
                                        {dayWorkouts.map((workout) => {
                                            const programDay = workout.programDayId
                                                ? programDays.find((d) => d.id === workout.programDayId)
                                                : null

                                            return (
                                                <Card
                                                    key={workout.id}
                                                    padding="xs"
                                                    withBorder
                                                    radius="sm"
                                                    style={{
                                                        backgroundColor: workout.attendance === 'completed' ? 'var(--mantine-color-green-0)' : 'white',
                                                        borderColor:
                                                            workout.attendance === 'completed'
                                                                ? 'var(--mantine-color-green-3)'
                                                                : workout.attendance === 'missed'
                                                                    ? 'var(--mantine-color-red-3)'
                                                                    : 'var(--mantine-color-gray-3)',
                                                        cursor: 'pointer',
                                                    }}
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        openEditModal(workout.id)
                                                    }}
                                                    draggable
                                                    onDragStart={(event) => handleDragStart(event, workout)}
                                                    onDragEnd={handleDragEnd}
                                                >
                                                    <Stack gap={2}>
                                                        <Group justify="space-between" gap={4}>
                                                            <Text size="xs" fw={600} lineClamp={1} style={{ flex: 1 }}>
                                                                {workout.title}
                                                            </Text>
                                                            {role === 'trainer' && (
                                                                <Group gap={2}>
                                                                    <ActionIcon
                                                                        size="xs"
                                                                        variant="subtle"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation()
                                                                            const { id, ...newWorkoutData } = workout
                                                                            dispatch(createWorkout({
                                                                                title: newWorkoutData.title,
                                                                                start: newWorkoutData.start,
                                                                                end: newWorkoutData.end,
                                                                                location: newWorkoutData.location,
                                                                                format: newWorkoutData.format,
                                                                                trainerId: newWorkoutData.trainerId,
                                                                                programDayId: newWorkoutData.programDayId,
                                                                                recurrence: newWorkoutData.recurrence,
                                                                            }))
                                                                        }}
                                                                    >
                                                                        <IconCopy size={12} />
                                                                    </ActionIcon>
                                                                    <ActionIcon
                                                                        size="xs"
                                                                        variant="subtle"
                                                                        color="red"
                                                                        onClick={async (e) => {
                                                                            e.stopPropagation()
                                                                            try {
                                                                                await dispatch(deleteWorkoutApi({ workoutId: workout.id })).unwrap()
                                                                                notifications.show({
                                                                                    title: t('common.success'),
                                                                                    message: t('calendar.workoutDeleted'),
                                                                                    color: 'green',
                                                                                })
                                                                                // Перезагружаем тренировки после удаления
                                                                                const startDate = dayjs(currentStartDate).startOf('week')
                                                                                const endDate = startDate.endOf('week').add(1, 'week')
                                                                                dispatch(fetchWorkouts({
                                                                                    start_date: startDate.subtract(1, 'week').toISOString(),
                                                                                    end_date: endDate.toISOString(),
                                                                                }))
                                                                            } catch (error: any) {
                                                                                notifications.show({
                                                                                    title: t('common.error'),
                                                                                    message: error?.message || t('calendar.error.deleteWorkout'),
                                                                                    color: 'red',
                                                                                })
                                                                            }
                                                                        }}
                                                                    >
                                                                        <IconTrash size={12} />
                                                                    </ActionIcon>
                                                                </Group>
                                                            )}
                                                        </Group>
                                                        <Group gap={4} align="center">
                                                            <IconClock size={10} />
                                                            <Text size="xs" c="dimmed" lineClamp={1}>
                                                                {dayjs(workout.start).format('HH:mm')}
                                                            </Text>
                                                        </Group>
                                                        {programDay && (
                                                            <Stack gap={2}>
                                                                {programDay.blocks.map((block) =>
                                                                    block.exercises.slice(0, 3).map((exercise) => (
                                                                        <Text key={exercise.id} size="xs" c="dimmed" lineClamp={1}>
                                                                            {exercise.title} ({exercise.sets}x
                                                                            {exercise.reps ? `, ${exercise.reps}` : exercise.duration ? `, ${exercise.duration}` : ''}
                                                                            {exercise.weight ? `, ${exercise.weight}` : ''}
                                                                            {exercise.rest ? `, ${exercise.rest}` : ''})
                                                                        </Text>
                                                                    )),
                                                                )}
                                                                {programDay.blocks.reduce((sum, b) => sum + b.exercises.length, 0) > 3 && (
                                                                    <Text size="xs" c="dimmed" fw={500}>
                                                                        ...
                                                                    </Text>
                                                                )}
                                                            </Stack>
                                                        )}
                                                        {workout.location && (
                                                            <Text size="xs" c="dimmed" lineClamp={1}>
                                                                📍 {workout.location}
                                                            </Text>
                                                        )}
                                                        <Badge
                                                            size="xs"
                                                            variant="light"
                                                            color={
                                                                workout.attendance === 'completed'
                                                                    ? 'green'
                                                                    : workout.attendance === 'missed'
                                                                        ? 'red'
                                                                        : 'blue'
                                                            }
                                                        >
                                                            {t(`calendar.status.${workout.attendance}`)}
                                                        </Badge>
                                                    </Stack>
                                                </Card>
                                            )
                                        })}
                                    </Stack>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </ScrollArea>

            <Modal
                opened={modalOpened}
                onClose={close}
                title={formState.id ? t('calendar.editWorkout') : t('calendar.createWorkout')}
                size="lg"
                scrollAreaComponent={ScrollArea.Autosize}
            >
                <Stack gap="md">
                    <Card
                        withBorder={false}
                        radius="lg"
                        padding="md"
                        style={{
                            background: formState.id
                                ? 'linear-gradient(135deg, rgba(251,146,60,0.95) 0%, rgba(239,68,68,0.95) 100%)'
                                : 'linear-gradient(135deg, rgba(129,140,248,0.95) 0%, rgba(192,132,252,0.95) 100%)',
                            color: 'white',
                            boxShadow: '0 15px 40px rgba(15, 15, 35, 0.25)',
                        }}
                    >
                        <Group justify="space-between" align="flex-start">
                            <Group gap="sm" align="flex-start">
                                <ActionIcon size="xl" radius="xl" variant="white" color="dark">
                                    <IconCalendarEvent size={22} />
                                </ActionIcon>
                                <Stack gap={2} style={{ color: 'white' }}>
                                    <Text fw={600} size="lg">
                                        {formState.id ? t('calendar.editWorkout') : t('calendar.createWorkout')}
                                    </Text>
                                    <Text size="xs" c="white" style={{ opacity: 0.85 }}>
                                        {t('calendar.workoutTitlePlaceholder')}
                                    </Text>
                                </Stack>
                            </Group>
                            <IconSparkles size={22} style={{ opacity: 0.6 }} />
                        </Group>
                    </Card>

                    <TextInput
                        label={t('calendar.workoutTitle')}
                        placeholder={t('calendar.workoutTitlePlaceholder')}
                        value={formState.title}
                        leftSection={<IconTypography size={16} />}
                        radius="lg"
                        onChange={(event) => {
                            const { value } = event.currentTarget
                            setFormState((state) => ({ ...state, title: value }))
                        }}
                        required
                    />
                    <DateInput
                        label={t('calendar.date')}
                        value={formState.date}
                        leftSection={<IconCalendar size={16} />}
                        radius="lg"
                        onChange={(value) => setFormState((state) => ({ ...state, date: value }))}
                        required
                    />
                    <Group gap="md" grow>
                        <TimeInput
                            label={t('calendar.startTime')}
                            value={formState.startTime}
                            leftSection={<IconClock size={16} />}
                            radius="lg"
                            onChange={(event) => {
                                const { value } = event.currentTarget
                                setFormState((state) => ({ ...state, startTime: value }))
                            }}
                            required
                        />
                        <TimeInput
                            label={t('calendar.endTime')}
                            value={formState.endTime}
                            leftSection={<IconClock size={16} />}
                            radius="lg"
                            onChange={(event) => {
                                const { value } = event.currentTarget
                                setFormState((state) => ({ ...state, endTime: value }))
                            }}
                            required
                        />
                    </Group>
                    <TextInput
                        label={t('calendar.location')}
                        placeholder={t('calendar.locationPlaceholder')}
                        value={formState.location}
                        leftSection={<IconMapPin size={16} />}
                        radius="lg"
                        onChange={(event) => {
                            const { value } = event.currentTarget
                            setFormState((state) => ({ ...state, location: value }))
                        }}
                    />
                    <Checkbox
                        label={t('calendar.withTrainer')}
                        description={
                            trainerInfo && trainerInfo.id
                                ? t('calendar.withTrainerDescription')
                                : t('calendar.withTrainerUnavailable')
                        }
                        checked={formState.withTrainer}
                        disabled={!trainerInfo || !trainerInfo.id}
                        onChange={(event) => {
                            const checked = event.currentTarget?.checked ?? false
                            setFormState((state) => ({
                                ...state,
                                withTrainer: checked,
                                trainerId: checked ? trainerInfo?.id : undefined,
                                format: checked ? 'offline' : state.format,
                            }))
                        }}
                    />
                    <Select
                        label={t('calendar.sessionFormat')}
                        data={[
                            { value: 'online', label: t('calendar.sessionFormatOnline') },
                            { value: 'offline', label: t('calendar.sessionFormatOffline') },
                        ]}
                        value={formState.format}
                        leftSection={<IconCalendarEvent size={16} />}
                        onChange={(value) =>
                            setFormState((state) => ({
                                ...state,
                                format: (value as 'online' | 'offline') || 'online',
                            }))
                        }
                    />
                    {formState.withTrainer && (
                        <Card radius="lg" padding="md" withBorder>
                            <Stack gap="xs">
                                <Text size="sm" fw={600}>
                                    {t('calendar.availableTrainerDates')}
                                </Text>
                                {availableDatesForTrainer.length > 0 ? (
                                    <Group gap="xs" wrap="wrap">
                                        {availableDatesForTrainer.map((date) => (
                                            <Badge key={date} color="violet" variant="light">
                                                {dayjs(date).format('DD MMM')}
                                            </Badge>
                                        ))}
                                    </Group>
                                ) : (
                                    <Text size="xs" c="dimmed">
                                        {t('calendar.noTrainerDates')}
                                    </Text>
                                )}
                                <Text size="sm" fw={600} mt="sm">
                                    {t('calendar.availableTrainerSlots')}
                                </Text>
                                {availableSlotsForSelectedDate.length > 0 ? (
                                    <Group gap="xs" wrap="wrap">
                                        {availableSlotsForSelectedDate.map((slot) => {
                                            const startLabel = dayjs(slot.start).format('HH:mm')
                                            const endLabel = dayjs(slot.end).format('HH:mm')
                                            const isActive = formState.startTime === startLabel && formState.endTime === endLabel
                                            return (
                                                <Button
                                                    key={`${slot.start}-${slot.end}`}
                                                    size="compact-sm"
                                                    variant={isActive ? 'filled' : 'light'}
                                                    color={isActive ? 'violet' : 'gray'}
                                                    onClick={() => handleSlotSelect(slot)}
                                                >
                                                    {startLabel} - {endLabel}
                                                </Button>
                                            )
                                        })}
                                    </Group>
                                ) : (
                                    <Text size="xs" c="red">
                                        {t('calendar.noSlotsForSelectedDate')}
                                    </Text>
                                )}
                                <Text size="xs" c="dimmed">
                                    {t('calendar.selectSlotHint')}
                                </Text>
                            </Stack>
                        </Card>
                    )}
                    <Select
                        label={t('program.assignToCalendar')}
                        placeholder={t('program.assignToCalendar')}
                        data={programDays.map((day) => ({ label: day.name, value: day.id }))}
                        value={formState.programDayId}
                        leftSection={<IconListDetails size={16} />}
                        radius="lg"
                        onChange={(value) => setFormState((state) => ({ ...state, programDayId: value ?? undefined }))}
                        clearable
                    />
                    {role === 'trainer' && (
                        <Card radius="lg" padding="md" withBorder style={{ backgroundColor: 'var(--mantine-color-violet-0)' }}>
                            <Stack gap="sm">
                                <Checkbox
                                    label={t('calendar.recurring')}
                                    checked={formState.isRecurring}
                                    onChange={(event) => {
                                        const checked = event.currentTarget?.checked ?? false
                                        setFormState((state) => ({ ...state, isRecurring: checked }))
                                    }}
                                />
                                {formState.isRecurring && (
                                    <Stack gap="md">
                                        <Select
                                            label={t('calendar.recurrenceFrequency')}
                                            value={formState.recurrenceFrequency}
                                            leftSection={<IconRepeat size={16} />}
                                            onChange={(value) =>
                                                setFormState((state) => ({
                                                    ...state,
                                                    recurrenceFrequency: (value as RecurrenceFrequency) || 'weekly',
                                                }))
                                            }
                                            data={[
                                                { value: 'daily', label: t('calendar.recurrenceDaily') },
                                                { value: 'weekly', label: t('calendar.recurrenceWeekly') },
                                                { value: 'monthly', label: t('calendar.recurrenceMonthly') },
                                            ]}
                                        />
                                        <NumberInput
                                            label={t('calendar.recurrenceInterval')}
                                            value={formState.recurrenceInterval}
                                            leftSection={<IconNumbers size={16} />}
                                            onChange={(value) => setFormState((state) => ({ ...state, recurrenceInterval: Number(value) || 1 }))}
                                            min={1}
                                            required
                                        />
                                        {formState.recurrenceFrequency === 'weekly' && (
                                            <Stack gap="xs">
                                                <Text size="sm" fw={500}>
                                                    {t('calendar.daysOfWeek')}
                                                </Text>
                                                <Group gap="xs">
                                                    {[
                                                        { value: 1, label: t('calendar.monday') },
                                                        { value: 2, label: t('calendar.tuesday') },
                                                        { value: 3, label: t('calendar.wednesday') },
                                                        { value: 4, label: t('calendar.thursday') },
                                                        { value: 5, label: t('calendar.friday') },
                                                        { value: 6, label: t('calendar.saturday') },
                                                        { value: 0, label: t('calendar.sunday') },
                                                    ].map((day) => (
                                                        <Button
                                                            key={day.value}
                                                            size="compact-sm"
                                                            variant={formState.recurrenceDaysOfWeek.includes(day.value as DayOfWeek) ? 'filled' : 'light'}
                                                            color="violet"
                                                            radius="xl"
                                                            onClick={() => handleToggleDay(day.value as DayOfWeek)}
                                                        >
                                                            {day.label}
                                                        </Button>
                                                    ))}
                                                </Group>
                                            </Stack>
                                        )}
                                        <Group grow>
                                            <DateInput
                                                label={t('calendar.recurrenceEndDate')}
                                                value={formState.recurrenceEndDate}
                                                leftSection={<IconCalendar size={16} />}
                                                onChange={(value) => setFormState((state) => ({ ...state, recurrenceEndDate: value }))}
                                                placeholder={t('calendar.recurrenceEndDatePlaceholder')}
                                            />
                                            <NumberInput
                                                label={t('calendar.recurrenceOccurrences')}
                                                value={formState.recurrenceOccurrences || undefined}
                                                leftSection={<IconNumbers size={16} />}
                                                onChange={(value) =>
                                                    setFormState((state) => ({
                                                        ...state,
                                                        recurrenceOccurrences: value ? Number(value) : null,
                                                    }))
                                                }
                                                min={1}
                                                placeholder={t('calendar.recurrenceOccurrencesPlaceholder')}
                                            />
                                        </Group>
                                    </Stack>
                                )}
                            </Stack>
                        </Card>
                    )}
                    <Group justify="space-between" mt="md">
                        <Button variant="default" onClick={close}>
                            {t('common.cancel')}
                        </Button>
                        <Button leftSection={<IconCheck size={16} />} onClick={handleSubmit} disabled={!formState.title.trim()}>
                            {t('common.save')}
                        </Button>
                    </Group>
                </Stack>
            </Modal>
        </Stack>
    )
}
