import {
    ActionIcon,
    Badge,
    Button,
    Card,
    Group,
    Modal,
    MultiSelect,
    ScrollArea,
    Select,
    SegmentedControl,
    Stack,
    Text,
    TextInput,
    Title,
} from '@mantine/core'
import { DateInput, TimeInput } from '@mantine/dates'
import dayjs from 'dayjs'
import { useTranslation } from 'react-i18next'
import {
    IconCalendar,
    IconCalendarEvent,
    IconChevronLeft,
    IconChevronRight,
    IconMapPin,
    IconPlus,
    IconTrash,
    IconUsers,
} from '@tabler/icons-react'
import { useAppDispatch } from '@/shared/hooks/useAppDispatch'
import { useAppSelector } from '@/shared/hooks/useAppSelector'
import {
    addWorkout,
    updateWorkout,
    removeWorkout,
    setView,
    goToToday,
    goToPreviousWeek,
    goToNextWeek,
    goToPreviousDay,
    goToNextDay,
    setSelectedClients,
    moveWorkout,
    type TrainerCalendarView,
    type TrainerWorkout,
} from '@/app/store/slices/trainerCalendarSlice'
import { useMemo, useState, type DragEvent } from 'react'
import { useDisclosure } from '@mantine/hooks'
import { useSearchParams } from 'react-router-dom'
import type { RecurrenceFrequency, DayOfWeek } from '@/app/store/slices/calendarSlice'

interface WorkoutFormState {
    id?: string
    clientId: string
    title: string
    date: Date | null
    startTime: string
    endTime: string
    location?: string
    format: 'online' | 'offline'
    templateId?: string
    isRecurring: boolean
    recurrenceFrequency: RecurrenceFrequency
    recurrenceInterval: number
    recurrenceDaysOfWeek: DayOfWeek[]
    recurrenceEndDate: Date | null
    recurrenceOccurrences: number | null
}

const buildFormState = (clientId?: string): WorkoutFormState => ({
    clientId: clientId || '',
    title: '',
    date: new Date(),
    startTime: '18:00',
    endTime: '19:00',
    location: '',
    format: 'offline',
    isRecurring: false,
    recurrenceFrequency: 'weekly',
    recurrenceInterval: 1,
    recurrenceDaysOfWeek: [],
    recurrenceEndDate: null,
    recurrenceOccurrences: null,
})

const hours = Array.from({ length: 24 }, (_, i) => i)

export const TrainerCalendarPage = () => {
    const { t } = useTranslation()
    const dispatch = useAppDispatch()
    const [searchParams] = useSearchParams()
    const clientIdFromUrl = searchParams.get('clientId')

    const { workouts, view, currentDate, selectedClientIds } = useAppSelector((state) => state.trainerCalendar)
    const { clients } = useAppSelector((state) => state.clients)
    const { workouts: libraryWorkouts } = useAppSelector((state) => state.library)

    const [modalOpened, { open, close }] = useDisclosure(false)
    const [formState, setFormState] = useState<WorkoutFormState>(() => buildFormState(clientIdFromUrl || undefined))
    const [activeDragWorkout, setActiveDragWorkout] = useState<TrainerWorkout | null>(null)
    const [dragOverDay, setDragOverDay] = useState<string | null>(null)

    const filteredWorkouts = useMemo(() => {
        if (selectedClientIds.length === 0) return workouts
        return workouts.filter((w) => selectedClientIds.includes(w.clientId))
    }, [workouts, selectedClientIds])

    const startDate = dayjs(currentDate).startOf(view === 'week' ? 'week' : 'day')

    const calendarDays = useMemo(() => {
        if (view === 'day') {
            return [startDate]
        }
        const days: dayjs.Dayjs[] = []
        let current = startDate.startOf('week')
        const end = startDate.endOf('week')
        while (current.isBefore(end) || current.isSame(end, 'day')) {
            days.push(current)
            current = current.add(1, 'day')
        }
        return days
    }, [startDate, view])

    const workoutsByDay = useMemo(() => {
        const map = new Map<string, typeof filteredWorkouts>()
        calendarDays.forEach((day) => {
            const dayKey = day.format('YYYY-MM-DD')
            const dayWorkouts = filteredWorkouts.filter((w) => dayjs(w.start).isSame(day, 'day'))
            map.set(dayKey, dayWorkouts)
        })
        return map
    }, [filteredWorkouts, calendarDays])

    const handleCreateWorkout = (day: dayjs.Dayjs, hour?: number) => {
        const defaultTime = hour !== undefined ? `${hour.toString().padStart(2, '0')}:00` : '18:00'
        const defaultEndTime = hour !== undefined ? `${(hour + 1).toString().padStart(2, '0')}:00` : '19:00'
        setFormState({
            ...buildFormState(clientIdFromUrl || undefined),
            date: day.toDate(),
            startTime: defaultTime,
            endTime: defaultEndTime,
        })
        open()
    }

    const handleSaveWorkout = () => {
        if (!formState.clientId || !formState.title || !formState.date) return

        const startDateTime = dayjs(formState.date)
            .hour(parseInt(formState.startTime.split(':')[0]))
            .minute(parseInt(formState.startTime.split(':')[1]))
            .second(0)

        const endDateTime = dayjs(formState.date)
            .hour(parseInt(formState.endTime.split(':')[0]))
            .minute(parseInt(formState.endTime.split(':')[1]))
            .second(0)

        const workoutData = {
            clientId: formState.clientId,
            title: formState.title,
            start: startDateTime.toISOString(),
            end: endDateTime.toISOString(),
            location: formState.location,
            format: formState.format,
            attendance: 'scheduled' as const,
        }

        if (formState.id) {
            dispatch(updateWorkout({ id: formState.id, updates: workoutData }))
        } else {
            dispatch(addWorkout(workoutData))
        }

        close()
        setFormState(buildFormState())
    }

    const handleDeleteWorkout = (id: string) => {
        if (confirm(t('common.delete') + '?')) {
            dispatch(removeWorkout(id))
        }
    }

    const getWorkoutColor = (attendance: string) => {
        switch (attendance) {
            case 'completed':
                return 'blue'
            case 'missed':
                return 'red'
            default:
                return 'green'
        }
    }

    const getClientName = (clientId: string) => {
        return clients.find((c) => c.id === clientId)?.fullName || clientId
    }

    const handleDragStart = (event: DragEvent<HTMLDivElement>, workout: TrainerWorkout) => {
        event.dataTransfer.setData('text/plain', workout.id)
        event.dataTransfer.effectAllowed = 'move'
        setActiveDragWorkout(workout)
    }

    const handleDragEnd = () => {
        setActiveDragWorkout(null)
        setDragOverDay(null)
    }

    const handleDayDragOver = (event: DragEvent<HTMLDivElement>, day: dayjs.Dayjs) => {
        event.preventDefault()
        event.dataTransfer.dropEffect = 'move'
        setDragOverDay(day.format('YYYY-MM-DD'))
    }

    const handleDayDragLeave = () => {
        setDragOverDay(null)
    }

    const handleDropOnDay = (event: DragEvent<HTMLDivElement>, day: dayjs.Dayjs) => {
        event.preventDefault()
        const droppedWorkoutId = event.dataTransfer.getData('text/plain') || activeDragWorkout?.id
        if (!droppedWorkoutId) {
            return
        }
        const workout = filteredWorkouts.find((item) => item.id === droppedWorkoutId)
        if (!workout) {
            return
        }
        const targetDateISO = day.startOf('day').toISOString()
        const sourceStart = dayjs(workout.start)
        const duration = dayjs(workout.end).diff(sourceStart, 'minute')
        const updatedStart = day.clone().hour(sourceStart.hour()).minute(sourceStart.minute()).second(0)
        const updatedEnd = updatedStart.add(duration, 'minute')

        dispatch(moveWorkout({ id: droppedWorkoutId, targetDate: targetDateISO }))
        handleDragEnd()
        
        setFormState({
            ...buildFormState(workout.clientId),
            id: workout.id,
            clientId: workout.clientId,
            title: workout.title,
            date: updatedStart.toDate(),
            startTime: updatedStart.format('HH:mm'),
            endTime: updatedEnd.format('HH:mm'),
            location: workout.location,
            format: workout.format,
        })
        open()
    }


    return (
        <Stack gap="lg">
            <Group justify="space-between">
                <Title order={2}>{t('trainer.calendar.title')}</Title>
                <Button leftSection={<IconPlus size={16} />} onClick={() => handleCreateWorkout(startDate)}>
                    {t('trainer.calendar.createWorkout')}
                </Button>
            </Group>

            <Card withBorder padding="md">
                <Stack gap="md">
                    <Group justify="space-between">
                        <Group gap="md">
                            <SegmentedControl
                                value={view}
                                onChange={(value) => dispatch(setView(value as TrainerCalendarView))}
                                data={[
                                    { label: t('trainer.calendar.week'), value: 'week' },
                                    { label: t('trainer.calendar.day'), value: 'day' },
                                ]}
                            />
                            <Group gap="xs">
                                <ActionIcon variant="subtle" onClick={() => dispatch(view === 'week' ? goToPreviousWeek() : goToPreviousDay())}>
                                    <IconChevronLeft size={16} />
                                </ActionIcon>
                                <Button variant="subtle" size="xs" onClick={() => dispatch(goToToday())}>
                                    {t('trainer.calendar.today')}
                                </Button>
                                <ActionIcon variant="subtle" onClick={() => dispatch(view === 'week' ? goToNextWeek() : goToNextDay())}>
                                    <IconChevronRight size={16} />
                                </ActionIcon>
                            </Group>
                            <Text fw={500}>
                                {view === 'week'
                                    ? `${startDate.format('D MMM')} - ${startDate.endOf('week').format('D MMM YYYY')}`
                                    : startDate.format('D MMM YYYY')}
                            </Text>
                        </Group>
                        <MultiSelect
                            placeholder={t('trainer.calendar.filterClients')}
                            data={clients.map((c) => ({ value: c.id, label: c.fullName }))}
                            value={selectedClientIds}
                            onChange={(value) => dispatch(setSelectedClients(value))}
                            clearable
                            leftSection={<IconUsers size={16} />}
                            style={{ width: 300 }}
                        />
                    </Group>

                    <ScrollArea h={600}>
                        <div style={{ display: 'grid', gridTemplateColumns: view === 'week' ? '120px repeat(7, 1fr)' : '120px 1fr', gap: '1px', backgroundColor: 'var(--mantine-color-gray-3)' }}>
                            <div style={{ backgroundColor: 'white', padding: '8px', position: 'sticky', left: 0, zIndex: 10 }}></div>
                            {calendarDays.map((day) => {
                                const dayKey = day.format('YYYY-MM-DD')
                                const isDragOver = dragOverDay === dayKey
                                const isToday = day.isSame(dayjs(), 'day')
                                return (
                                    <div
                                        key={dayKey}
                                        onDragOver={(e) => handleDayDragOver(e, day)}
                                        onDragLeave={handleDayDragLeave}
                                        onDrop={(e) => handleDropOnDay(e, day)}
                                        style={{
                                            backgroundColor: isDragOver ? 'var(--mantine-color-violet-0)' : 'white',
                                            padding: '8px',
                                            textAlign: 'center',
                                            fontWeight: isToday ? 700 : 500,
                                            color: isToday ? 'var(--mantine-color-violet-6)' : undefined,
                                            border: isDragOver ? '2px dashed var(--mantine-color-violet-6)' : 'none',
                                            transition: 'background-color 0.2s',
                                        }}
                                    >
                                        <Text size="xs" c="dimmed">
                                            {day.format('ddd')}
                                        </Text>
                                        <Text size="lg" c={isToday ? 'violet' : undefined}>{day.format('D')}</Text>
                                    </div>
                                )
                            })}

                            {hours.map((hour) => (
                                <>
                                    <div
                                        key={`hour-${hour}`}
                                        style={{
                                            backgroundColor: 'white',
                                            padding: '4px 8px',
                                            fontSize: '12px',
                                            color: 'var(--mantine-color-gray-6)',
                                            position: 'sticky',
                                            left: 0,
                                            zIndex: 10,
                                        }}
                                    >
                                        {hour.toString().padStart(2, '0')}:00
                                    </div>
                                    {calendarDays.map((day) => {
                                        const dayKey = day.format('YYYY-MM-DD')
                                        const hourStart = day.hour(hour).minute(0).second(0)
                                        const hourEnd = day.hour(hour).minute(59).second(59)
                                        const hourWorkouts = workoutsByDay.get(dayKey)?.filter((w) => {
                                            const workoutStart = dayjs(w.start)
                                            return workoutStart.isAfter(hourStart.subtract(1, 'minute')) && workoutStart.isBefore(hourEnd.add(1, 'minute'))
                                        })

                                        const isDragOver = dragOverDay === dayKey
                                        return (
                                            <div
                                                key={`${dayKey}-${hour}`}
                                                onDragOver={(e) => handleDayDragOver(e, day)}
                                                onDragLeave={handleDayDragLeave}
                                                onDrop={(e) => handleDropOnDay(e, day)}
                                                style={{
                                                    minHeight: '60px',
                                                    borderTop: '1px solid var(--mantine-color-gray-2)',
                                                    position: 'relative',
                                                    cursor: 'pointer',
                                                    backgroundColor: isDragOver ? 'var(--mantine-color-violet-0)' : 'transparent',
                                                    transition: 'background-color 0.2s',
                                                }}
                                                onClick={() => handleCreateWorkout(day, hour)}
                                            >
                                                {hourWorkouts?.map((workout) => {
                                                    const workoutStart = dayjs(workout.start)
                                                    const workoutEnd = dayjs(workout.end)
                                                    const startMinutes = workoutStart.hour() * 60 + workoutStart.minute()
                                                    const endMinutes = workoutEnd.hour() * 60 + workoutEnd.minute()
                                                    const duration = endMinutes - startMinutes
                                                    const topOffset = startMinutes % 60

                                                    return (
                                                        <Card
                                                            key={workout.id}
                                                            p="xs"
                                                            draggable
                                                            onDragStart={(e) => handleDragStart(e, workout)}
                                                            onDragEnd={handleDragEnd}
                                                            style={{
                                                                position: 'absolute',
                                                                top: `${topOffset}px`,
                                                                left: '2px',
                                                                right: '2px',
                                                                height: `${(duration / 60) * 60 - 2}px`,
                                                                backgroundColor: `var(--mantine-color-${getWorkoutColor(workout.attendance)}-0)`,
                                                                border: `2px solid var(--mantine-color-${getWorkoutColor(workout.attendance)}-6)`,
                                                                cursor: 'move',
                                                                zIndex: activeDragWorkout?.id === workout.id ? 10 : 5,
                                                                opacity: activeDragWorkout?.id === workout.id ? 0.5 : 1,
                                                                transition: 'opacity 0.2s',
                                                            }}
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                setFormState({
                                                                    ...buildFormState(workout.clientId),
                                                                    id: workout.id,
                                                                    clientId: workout.clientId,
                                                                    title: workout.title,
                                                                    date: dayjs(workout.start).toDate(),
                                                                    startTime: dayjs(workout.start).format('HH:mm'),
                                                                    endTime: dayjs(workout.end).format('HH:mm'),
                                                                    location: workout.location,
                                                                    format: workout.format,
                                                                })
                                                                open()
                                                            }}
                                                        >
                                                            <Stack gap={2}>
                                                                <Group justify="space-between" gap="xs">
                                                                    <Text size="xs" fw={600} lineClamp={1}>
                                                                        {workout.title}
                                                                    </Text>
                                                                    <ActionIcon
                                                                        size="xs"
                                                                        variant="subtle"
                                                                        color="red"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation()
                                                                            handleDeleteWorkout(workout.id)
                                                                        }}
                                                                    >
                                                                        <IconTrash size={12} />
                                                                    </ActionIcon>
                                                                </Group>
                                                                <Group gap={4}>
                                                                    <Badge size="xs" variant="light" color={getWorkoutColor(workout.attendance)}>
                                                                        {getClientName(workout.clientId)}
                                                                    </Badge>
                                                                    {workout.location && (
                                                                        <Text size="xs" c="dimmed" lineClamp={1}>
                                                                            {workout.location}
                                                                        </Text>
                                                                    )}
                                                                </Group>
                                                            </Stack>
                                                        </Card>
                                                    )
                                                })}
                                            </div>
                                        )
                                    })}
                                </>
                            ))}
                        </div>
                    </ScrollArea>
                </Stack>
            </Card>

            <Modal opened={modalOpened} onClose={close} title={t('trainer.calendar.createWorkout')} size="lg">
                <Stack gap="md">
                    <Select
                        label={t('trainer.calendar.client')}
                        placeholder={t('trainer.calendar.selectClient')}
                        data={clients.map((c) => ({ value: c.id, label: c.fullName }))}
                        required
                        value={formState.clientId}
                        onChange={(value) => setFormState({ ...formState, clientId: value || '' })}
                    />
                    <TextInput
                        label={t('trainer.calendar.workoutTitle')}
                        placeholder={t('trainer.calendar.workoutTitlePlaceholder')}
                        required
                        value={formState.title}
                        onChange={(e) => setFormState({ ...formState, title: e.target.value })}
                    />
                    <Group grow>
                        <DateInput
                            label={t('trainer.calendar.date')}
                            required
                            value={formState.date}
                            onChange={(value) => setFormState({ ...formState, date: value })}
                            leftSection={<IconCalendar size={16} />}
                        />
                        <TimeInput
                            label={t('trainer.calendar.startTime')}
                            required
                            value={formState.startTime}
                            onChange={(e) => setFormState({ ...formState, startTime: e.target.value })}
                            leftSection={<IconCalendarEvent size={16} />}
                        />
                        <TimeInput
                            label={t('trainer.calendar.endTime')}
                            required
                            value={formState.endTime}
                            onChange={(e) => setFormState({ ...formState, endTime: e.target.value })}
                            leftSection={<IconCalendarEvent size={16} />}
                        />
                    </Group>
                    <Select
                        label={t('trainer.calendar.format')}
                        data={[
                            { value: 'online', label: t('trainer.clients.formatOnline') },
                            { value: 'offline', label: t('trainer.clients.formatOffline') },
                        ]}
                        value={formState.format}
                        onChange={(value) => setFormState({ ...formState, format: (value as 'online' | 'offline') || 'offline' })}
                    />
                    <TextInput
                        label={t('trainer.calendar.location')}
                        placeholder={t('trainer.calendar.locationPlaceholder')}
                        value={formState.location}
                        onChange={(e) => setFormState({ ...formState, location: e.target.value })}
                        leftSection={<IconMapPin size={16} />}
                    />
                    <Select
                        label={t('trainer.calendar.template')}
                        placeholder={t('trainer.calendar.noTemplate')}
                        data={libraryWorkouts.map((w) => ({ value: w.id, label: w.name }))}
                        clearable
                        value={formState.templateId}
                        onChange={(value) => {
                            const template = libraryWorkouts.find((w) => w.id === value)
                            if (template) {
                                setFormState({ ...formState, templateId: value || undefined, title: template.name })
                            } else {
                                setFormState({ ...formState, templateId: value || undefined })
                            }
                        }}
                    />
                    <Group justify="flex-end" mt="md">
                        <Button variant="subtle" onClick={close}>
                            {t('common.cancel')}
                        </Button>
                        <Button onClick={handleSaveWorkout} disabled={!formState.clientId || !formState.title || !formState.date}>
                            {formState.id ? t('common.save') : t('common.add')}
                        </Button>
                    </Group>
                </Stack>
            </Modal>
        </Stack>
    )
}

