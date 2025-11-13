import {
    ActionIcon,
    Badge,
    Button,
    Card,
    Checkbox,
    Divider,
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
import { useTranslation } from 'react-i18next'
import { IconCheck, IconClock, IconCopy, IconChevronLeft, IconChevronRight, IconPlus, IconTrash } from '@tabler/icons-react'
import { useAppDispatch } from '@/shared/hooks/useAppDispatch'
import { useAppSelector } from '@/shared/hooks/useAppSelector'
import {
    removeWorkout,
    scheduleWorkout,
    goToToday,
    goToPreviousWeek,
    goToNextWeek,
    updateWorkout,
    type RecurrenceFrequency,
    type DayOfWeek,
} from '@/app/store/slices/calendarSlice'
import { useMemo, useState } from 'react'
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
}

const buildFormState = (date: string): WorkoutFormState => ({
    title: '',
    date: dayjs(date).toDate(),
    startTime: '18:00',
    endTime: '19:00',
    location: '',
    isRecurring: false,
    recurrenceFrequency: 'weekly',
    recurrenceInterval: 1,
    recurrenceDaysOfWeek: [],
    recurrenceEndDate: null,
    recurrenceOccurrences: null,
})

export const CalendarPage = () => {
    const { t } = useTranslation()
    const dispatch = useAppDispatch()
    const { workouts, selectedDate, currentStartDate } = useAppSelector((state) => state.calendar)
    const role = useAppSelector((state) => state.user.role)
    const programDays = useAppSelector((state) => state.program.days)
    const [modalOpened, { open, close }] = useDisclosure(false)
    const [formState, setFormState] = useState<WorkoutFormState>(buildFormState(selectedDate))

    const startDate = dayjs(currentStartDate).startOf('week')

    const calendarDays = useMemo(() => {
        const days: dayjs.Dayjs[] = []
        let current = startDate.startOf('week')
        const end = startDate.endOf('week')

        while (current.isBefore(end) || current.isSame(end, 'day')) {
            days.push(current)
            current = current.add(1, 'day')
        }

        return days
    }, [startDate])

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


    const openCreateModal = (date?: Date) => {
        const targetDate = date ? dayjs(date) : dayjs(selectedDate)
        setFormState(buildFormState(targetDate.toISOString()))
        open()
    }

    const openEditModal = (id: string) => {
        const target = workouts.find((item) => item.id === id)
        if (!target) {
            return
        }
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
        })
        open()
    }

    const handleSubmit = () => {
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
            attendance: 'scheduled' as const,
            programDayId: formState.programDayId,
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

        if (formState.id) {
            dispatch(
                updateWorkout({
                    id: formState.id,
                    ...workoutData,
                }),
            )
        } else {
            dispatch(scheduleWorkout(workoutData))
        }
        close()
        setFormState(buildFormState(selectedDate))
    }

    const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']

    const isToday = (date: dayjs.Dayjs) => date.isSame(dayjs(), 'day')
    const isPast = (date: dayjs.Dayjs) => date.isBefore(dayjs(), 'day')

    const getDayWorkouts = (date: dayjs.Dayjs) => {
        const key = date.startOf('day').toISOString()
        return workoutsPerDay[key] ?? []
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
                            {startDate.format('MMM D')} - {startDate.endOf('week').format('MMM D')}
                        </Button>
                        <ActionIcon variant="light" onClick={() => dispatch(goToNextWeek())}>
                            <IconChevronRight size={18} />
                        </ActionIcon>
                    </Group>
                </Group>
                {role === 'trainer' && (
                    <Button leftSection={<IconPlus size={16} />} onClick={() => openCreateModal()}>
                        {t('common.add')}
                    </Button>
                )}
            </Group>

            <ScrollArea h={`calc(100vh - ${200}px)`}>
                <div style={{ display: 'flex', flexDirection: 'column', minHeight: '600px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid var(--mantine-color-gray-3)' }}>
                        {calendarDays.map((day, index) => {
                            const dayOfWeek = day.day()
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
                                        {dayNames[dayOfWeek]}
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

                            return (
                                <div
                                    key={day.toISOString()}
                                    style={{
                                        borderRight: index % 7 !== 6 ? '1px solid var(--mantine-color-gray-3)' : 'none',
                                        borderLeft: isFirstDay ? '1px solid var(--mantine-color-gray-3)' : 'none',
                                        borderBottom: '1px solid var(--mantine-color-gray-3)',
                                        padding: '8px 4px',
                                        minHeight: '120px',
                                        backgroundColor: isCurrentDay ? 'var(--mantine-color-violet-0)' : 'white',
                                        position: 'relative',
                                        cursor: role === 'trainer' ? 'pointer' : 'default',
                                    }}
                                    onClick={(e) => {
                                        if (role === 'trainer' && e.target === e.currentTarget) {
                                            openCreateModal(day.toDate())
                                        }
                                    }}
                                >
                                    <Group justify="space-between" mb="xs" gap="xs">
                                        <Text
                                            size="sm"
                                            fw={isCurrentDay ? 700 : isPast(day) ? 400 : 600}
                                            c={isCurrentDay ? 'violet.7' : isPast(day) ? 'dimmed' : 'gray.9'}
                                            style={{
                                                width: '28px',
                                                height: '28px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                borderRadius: '50%',
                                                backgroundColor: isCurrentDay ? 'var(--mantine-color-violet-6)' : 'transparent',
                                                color: isCurrentDay ? 'white' : undefined,
                                            }}
                                        >
                                            {day.date()}
                                        </Text>
                                        {role === 'trainer' && (
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
                                        )}
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
                                                                            const newWorkout = { ...workout }
                                                                            newWorkout.id = nanoid()
                                                                            dispatch(scheduleWorkout(newWorkout))
                                                                        }}
                                                                    >
                                                                        <IconCopy size={12} />
                                                                    </ActionIcon>
                                                                    <ActionIcon
                                                                        size="xs"
                                                                        variant="subtle"
                                                                        color="red"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation()
                                                                            dispatch(removeWorkout(workout.id))
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

            <Modal opened={modalOpened} onClose={close} title={formState.id ? t('calendar.editWorkout') : t('calendar.createWorkout')} size="lg">
                <Stack gap="md">
                    <TextInput
                        label={t('calendar.workoutTitle')}
                        placeholder={t('calendar.workoutTitlePlaceholder')}
                        value={formState.title}
                        onChange={(event) => setFormState((state) => ({ ...state, title: event.currentTarget.value }))}
                        required
                    />
                    <DateInput
                        label={t('calendar.date')}
                        value={formState.date}
                        onChange={(value) => setFormState((state) => ({ ...state, date: value }))}
                        required
                    />
                    <Group gap="md" grow>
                        <TimeInput
                            label={t('calendar.startTime')}
                            value={formState.startTime}
                            onChange={(event) => setFormState((state) => ({ ...state, startTime: event.currentTarget.value }))}
                            required
                        />
                        <TimeInput
                            label={t('calendar.endTime')}
                            value={formState.endTime}
                            onChange={(event) => setFormState((state) => ({ ...state, endTime: event.currentTarget.value }))}
                            required
                        />
                    </Group>
                    <TextInput
                        label={t('calendar.location')}
                        placeholder={t('calendar.locationPlaceholder')}
                        value={formState.location}
                        onChange={(event) => setFormState((state) => ({ ...state, location: event.currentTarget.value }))}
                    />
                    <Select
                        label={t('program.assignToCalendar')}
                        placeholder={t('program.assignToCalendar')}
                        data={programDays.map((day) => ({ label: day.name, value: day.id }))}
                        value={formState.programDayId}
                        onChange={(value) => setFormState((state) => ({ ...state, programDayId: value ?? undefined }))}
                        clearable
                    />
                    {role === 'trainer' && (
                        <>
                            <Divider />
                            <Checkbox
                                label={t('calendar.recurring')}
                                checked={formState.isRecurring}
                                onChange={(event) => setFormState((state) => ({ ...state, isRecurring: event.currentTarget.checked }))}
                            />
                            {formState.isRecurring && (
                                <Stack gap="md" pl="xl">
                                    <Select
                                        label={t('calendar.recurrenceFrequency')}
                                        value={formState.recurrenceFrequency}
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
                                                    <Checkbox
                                                        key={day.value}
                                                        label={day.label}
                                                        checked={formState.recurrenceDaysOfWeek.includes(day.value as DayOfWeek)}
                                                        onChange={(event) => {
                                                            const days = formState.recurrenceDaysOfWeek
                                                            if (event.currentTarget.checked) {
                                                                setFormState((state) => ({
                                                                    ...state,
                                                                    recurrenceDaysOfWeek: [...days, day.value as DayOfWeek],
                                                                }))
                                                            } else {
                                                                setFormState((state) => ({
                                                                    ...state,
                                                                    recurrenceDaysOfWeek: days.filter((d) => d !== day.value),
                                                                }))
                                                            }
                                                        }}
                                                    />
                                                ))}
                                            </Group>
                                        </Stack>
                                    )}
                                    <Group grow>
                                        <DateInput
                                            label={t('calendar.recurrenceEndDate')}
                                            value={formState.recurrenceEndDate}
                                            onChange={(value) => setFormState((state) => ({ ...state, recurrenceEndDate: value }))}
                                            placeholder={t('calendar.recurrenceEndDatePlaceholder')}
                                        />
                                        <NumberInput
                                            label={t('calendar.recurrenceOccurrences')}
                                            value={formState.recurrenceOccurrences || undefined}
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
                        </>
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
