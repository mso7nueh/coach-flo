import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Group,
  Menu,
  Modal,
  NumberInput,
  ScrollArea,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core'
import { DateInput, TimeInput } from '@mantine/dates'
import { DragDropContext, Draggable, Droppable, type DropResult } from '@hello-pangea/dnd'
import { useDisclosure } from '@mantine/hooks'
import {
  IconCalendar,
  IconCopy,
  IconDeviceFloppy,
  IconDotsVertical,
  IconEdit,
  IconPlus,
  IconTrash,
  IconFlame,
  IconClock,
  IconRepeat,
  IconBarbell,
  IconStretching,
  IconTemplate,
  IconBooks,
} from '@tabler/icons-react'
import dayjs from 'dayjs'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppDispatch } from '@/shared/hooks/useAppDispatch'
import { useAppSelector } from '@/shared/hooks/useAppSelector'
import {
  addProgramDay,
  addProgram,
  addExercise,
  deleteProgramDay,
  duplicateProgramDay,
  removeExercise,
  reorderDays,
  renameProgramDay,
  selectProgram,
  selectProgramDay,
  updateExercise,
  type ProgramExercise,
  type ProgramBlockInput,
} from '@/app/store/slices/programSlice'
import { scheduleWorkout } from '@/app/store/slices/calendarSlice'
import type { WorkoutTemplate, Exercise, WorkoutExercise } from '@/app/store/slices/librarySlice'

interface AssignForm {
  dayId: string
  date: Date
  startTime: string
  endTime: string
}

const createAssignForm = (dayId: string): AssignForm => ({
  dayId,
  date: new Date(),
  startTime: '18:00',
  endTime: '19:00',
})

export const ProgramPage = () => {
  const { t } = useTranslation()
  const dispatch = useAppDispatch()
  const { programs, days, selectedProgramId, selectedDayId } = useAppSelector((state) => state.program)
  const role = useAppSelector((state) => state.user.role)
  const isTrainer = role === 'trainer'
  const userId = useAppSelector((state) => state.user.id)
  const { workouts: libraryWorkouts, exercises: libraryExercises } = useAppSelector((state) => state.library)
  const trainerInfo = useAppSelector((state) => state.user.trainer)
  const selectedDay = useMemo(() => days.find((item) => item.id === selectedDayId) ?? null, [days, selectedDayId])
  const [renameModalOpened, { open: openRename, close: closeRename }] = useDisclosure(false)
  const [assignModalOpened, { open: openAssign, close: closeAssign }] = useDisclosure(false)
  const [exerciseModalOpened, { open: openExerciseModal, close: closeExerciseModal }] = useDisclosure(false)
  const [templateModalOpened, { open: openTemplateModal, close: closeTemplateModal }] = useDisclosure(false)
  const [templatePickerOpened, { open: openTemplatePicker, close: closeTemplatePicker }] = useDisclosure(false)
  const [exerciseLibraryOpened, { open: openExerciseLibrary, close: closeExerciseLibrary }] = useDisclosure(false)
  const [renameDraft, setRenameDraft] = useState('')
  const [assignForm, setAssignForm] = useState<AssignForm | null>(null)
  const [editingExercise, setEditingExercise] = useState<{
    exercise: ProgramExercise | null
    blockId: string
  } | null>(null)
  const [exerciseLibraryTargetBlock, setExerciseLibraryTargetBlock] = useState<string | null>(null)
  const [exerciseForm, setExerciseForm] = useState<Omit<ProgramExercise, 'id'>>({
    title: '',
    sets: 3,
    reps: undefined,
    duration: undefined,
    rest: undefined,
    weight: undefined,
  })
  const [templateName, setTemplateName] = useState('')
  const programTrainings = useMemo(() => {
    if (!selectedProgramId) {
      return []
    }
    return days
      .filter((day) => day.programId === selectedProgramId)
      .sort((a, b) => a.order - b.order)
  }, [days, selectedProgramId])
  const accessibleExercises = useMemo(() => {
    return libraryExercises.filter((exercise) => {
      if (exercise.visibility === 'all') {
        return true
      }
      if (exercise.visibility === 'trainer') {
        return role === 'trainer'
      }
      if (exercise.visibility === 'client') {
        return exercise.clientId === userId
      }
      return false
    })
  }, [libraryExercises, role, userId])
  const exercisesMap = useMemo(
    () =>
      accessibleExercises.reduce<Record<string, Exercise>>((acc, exercise) => {
        acc[exercise.id] = exercise
        return acc
      }, {}),
    [accessibleExercises],
  )
  const accessibleTemplates = useMemo(() => {
    if (role === 'trainer') {
      return libraryWorkouts
    }
    return libraryWorkouts.filter((workout) => !workout.clientId || workout.clientId === userId)
  }, [libraryWorkouts, role, userId])
  const canEditSelectedDay = Boolean(selectedDay && (role === 'trainer' || selectedDay.owner === 'client'))
  const canManageDay = (dayOwner: 'trainer' | 'client') => role === 'trainer' || dayOwner === 'client'

  const handleDayClick = (dayId: string) => {
    dispatch(selectProgramDay(dayId))
  }

  const resolveProgramId = () => selectedProgramId ?? programs[0]?.id ?? null

  const handleAddProgram = () => {
    const owner = isTrainer ? 'trainer' : 'client'
    const ownerProgramsCount = programs.filter((program) => program.owner === owner).length + 1
    const defaultTitle =
      owner === 'trainer' ? `${t('program.newProgramTrainer')} ${ownerProgramsCount}` : t('program.newProgramClient', { count: ownerProgramsCount })
    dispatch(addProgram({ title: defaultTitle, owner }))
  }

  const handleAddDay = () => {
    let targetProgramId = resolveProgramId()
    if (!targetProgramId) {
      handleAddProgram()
      targetProgramId = resolveProgramId()
      if (!targetProgramId) {
        return
      }
    }
    const trainingsCount = days.filter((day) => day.programId === targetProgramId).length + 1
    const defaultName = t('program.trainingName', { count: trainingsCount })
    dispatch(
      addProgramDay({
        name: defaultName,
        programId: targetProgramId,
      }),
    )
  }

  const handleAddDayFromTemplate = (template: WorkoutTemplate) => {
    let targetProgramId = resolveProgramId()
    if (!targetProgramId) {
      handleAddProgram()
      targetProgramId = resolveProgramId()
      if (!targetProgramId) {
        return
      }
    }
    const toProgramExercise = (item: WorkoutExercise): Omit<ProgramExercise, 'id'> => {
      const linkedExercise = item.exerciseId ? exercisesMap[item.exerciseId] : undefined
      return {
        title: linkedExercise?.name ?? item.exercise?.name ?? t('program.newExercise'),
        sets: item.sets ?? 1,
        reps: item.reps ?? undefined,
        duration: item.duration ? `${item.duration} ${t('program.minutesShort')}` : undefined,
        rest: item.rest ? `${item.rest} ${t('program.secondsShort')}` : undefined,
        weight: item.weight ? `${item.weight}` : undefined,
      }
    }
    const blocks: ProgramBlockInput[] = [
      {
        type: 'warmup',
        title: t('program.sections.warmup'),
        exercises: template.warmup.map(toProgramExercise),
      },
      {
        type: 'main',
        title: t('program.sections.main'),
        exercises: template.main.map(toProgramExercise),
      },
      {
        type: 'cooldown',
        title: t('program.sections.cooldown'),
        exercises: template.cooldown.map(toProgramExercise),
      },
    ]
    dispatch(
      addProgramDay({
        name: template.name,
        programId: targetProgramId,
        blocks,
        sourceTemplateId: template.id,
      }),
    )
    closeTemplatePicker()
  }

  const handleOpenExerciseLibrary = (blockId: string) => {
    if (!selectedDay) {
      return
    }
    if (!(role === 'trainer' || selectedDay.owner === 'client')) {
      return
    }
    setExerciseLibraryTargetBlock(blockId)
    openExerciseLibrary()
  }

  const handleSelectExerciseFromLibrary = (exercise: Exercise) => {
    if (!selectedDay || !exerciseLibraryTargetBlock) {
      return
    }
    dispatch(
      addExercise({
        dayId: selectedDay.id,
        blockId: exerciseLibraryTargetBlock,
        exercise: {
          title: exercise.name,
          sets: 3,
          reps: 10,
          duration: undefined,
          rest: undefined,
          weight: undefined,
        },
      }),
    )
    setExerciseLibraryTargetBlock(null)
    closeExerciseLibrary()
  }

  const handleCloseExerciseLibrary = () => {
    setExerciseLibraryTargetBlock(null)
    closeExerciseLibrary()
  }

  const handleRename = () => {
    if (selectedDay) {
      dispatch(renameProgramDay({ id: selectedDay.id, name: renameDraft }))
      closeRename()
    }
  }

  const handleAssign = () => {
    if (assignForm && selectedDay) {
      const start = dayjs(assignForm.date)
        .hour(Number(assignForm.startTime.split(':')[0]))
        .minute(Number(assignForm.startTime.split(':')[1]))
      const end = dayjs(assignForm.date)
        .hour(Number(assignForm.endTime.split(':')[0]))
        .minute(Number(assignForm.endTime.split(':')[1]))
      dispatch(
        scheduleWorkout({
          title: selectedDay.name,
          start: start.toISOString(),
          end: end.toISOString(),
          attendance: 'scheduled',
          programDayId: selectedDay.id,
          location: t('calendar.defaultLocation'),
          withTrainer: Boolean(trainerInfo),
          trainerId: trainerInfo?.id,
          format: trainerInfo ? 'offline' : 'online',
        }),
      )
      closeAssign()
    }
  }

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) {
      return
    }
    const sourceDay = programTrainings[result.source.index]
    const destinationDay = programTrainings[result.destination.index]
    if (!sourceDay || !destinationDay) {
      return
    }
    dispatch(reorderDays({ from: result.source.index, to: result.destination.index }))
  }

  const handleEditExercise = (exercise: ProgramExercise, blockId: string) => {
    setEditingExercise({ exercise, blockId })
    setExerciseForm({
      title: exercise.title,
      sets: exercise.sets,
      reps: exercise.reps,
      duration: exercise.duration,
      rest: exercise.rest,
      weight: exercise.weight,
    })
    openExerciseModal()
  }

  const handleAddExercise = (blockId: string) => {
    if (!selectedDay) {
      return
    }
    if (!(role === 'trainer' || selectedDay.owner === 'client')) {
      return
    }
    setEditingExercise({ exercise: null, blockId })
    setExerciseForm({
      title: t('program.newExercise'),
      sets: 3,
      reps: 10,
      duration: undefined,
      rest: undefined,
      weight: undefined,
    })
    openExerciseModal()
  }

  const handleDeleteExercise = (exerciseId: string, blockId: string) => {
    if (!selectedDay) {
      return
    }
    if (!(role === 'trainer' || selectedDay.owner === 'client')) {
      return
    }
    dispatch(removeExercise({ dayId: selectedDay.id, blockId, exerciseId }))
  }

  const handleSaveExercise = () => {
    if (selectedDay && editingExercise && exerciseForm.title.trim()) {
      if (!(role === 'trainer' || selectedDay.owner === 'client')) {
        return
      }
      if (editingExercise.exercise) {
        // Обновляем существующее упражнение
        dispatch(
          updateExercise({
            dayId: selectedDay.id,
            blockId: editingExercise.blockId,
            exercise: { ...editingExercise.exercise, ...exerciseForm },
          }),
        )
      } else {
        // Добавляем новое упражнение
        dispatch(
          addExercise({
            dayId: selectedDay.id,
            blockId: editingExercise.blockId,
            exercise: exerciseForm,
          }),
        )
      }
      closeExerciseModal()
      setEditingExercise(null)
      setExerciseForm({
        title: '',
        sets: 3,
        reps: undefined,
        duration: undefined,
        rest: undefined,
        weight: undefined,
      })
    }
  }

  const handleCloseExerciseModal = () => {
    closeExerciseModal()
    setEditingExercise(null)
    setExerciseForm({
      title: '',
      sets: 3,
      reps: undefined,
      duration: undefined,
      rest: undefined,
      weight: undefined,
    })
  }

  const handleSaveAsTemplate = () => {
    if (selectedDay && templateName.trim()) {
      // В реальном приложении здесь был бы вызов API для сохранения шаблона
      console.log('Saving template:', templateName, selectedDay)
      closeTemplateModal()
      setTemplateName('')
    }
  }

  const handleCopyDay = () => {
    if (selectedDay && (role === 'trainer' || selectedDay.owner === 'client')) {
      dispatch(duplicateProgramDay(selectedDay.id))
    }
  }

  const handleRenameFromMenu = () => {
    if (selectedDay) {
      setRenameDraft(selectedDay.name)
      openRename()
    }
  }

  return (
    <Group align="flex-start" gap="xl">
      <Card withBorder >
        <Stack gap="md">
          <Group justify="space-between" align="center">
            <Title order={4}>{t('program.programsTitle')}</Title>
            <Group gap="xs">
              {role === 'client' && (
                <Button variant="light" leftSection={<IconTemplate size={16} />} onClick={openTemplatePicker}>
                  {t('program.addProgramFromTemplate')}
                </Button>
              )}
              <Button variant="light" leftSection={<IconPlus size={16} />} onClick={handleAddProgram}>
                {t('program.addProgram')}
              </Button>
            </Group>
          </Group>
          <ScrollArea type="auto" offsetScrollbars>
            <Group gap="sm" wrap="nowrap">
              {programs.map((program) => {
                const isActive = program.id === selectedProgramId
                return (
                  <Card
                    key={program.id}
                    withBorder
                    padding="md"
                    style={{
                      minWidth: 220,
                      borderColor: isActive ? 'var(--mantine-color-violet-4)' : 'var(--mantine-color-gray-3)',
                      backgroundColor: isActive ? 'var(--mantine-color-violet-0)' : 'var(--mantine-color-white)',
                      cursor: 'pointer',
                    }}
                    onClick={() => dispatch(selectProgram(program.id))}
                  >
                    <Stack gap={4}>
                      <Group justify="space-between">
                        <Text fw={600}>{program.title}</Text>
                        <Badge size="xs" color={program.owner === 'trainer' ? 'gray' : 'green'} variant="light">
                          {t(`program.owner.${program.owner}`)}
                        </Badge>
                      </Group>
                      {program.description ? (
                        <Text size="xs" c="dimmed">
                          {program.description}
                        </Text>
                      ) : null}
                    </Stack>
                  </Card>
                )
              })}
              {role === 'client' && (
                <Card
                  withBorder
                  padding="md"
                  style={{
                    minWidth: 220,
                    borderStyle: 'dashed',
                    borderColor: 'var(--mantine-color-violet-3)',
                  }}
                >
                  <Button variant="subtle" leftSection={<IconPlus size={16} />} fullWidth onClick={handleAddProgram}>
                    {t('program.addProgram')}
                  </Button>
                </Card>
              )}
            </Group>
          </ScrollArea>
          <Group justify="space-between" align="center">
            <Text fw={600}>{t('program.trainingsTitle')}</Text>
            <Group gap="xs">
              <Button variant="light" leftSection={<IconTemplate size={16} />} onClick={openTemplatePicker}>
                {t('program.addTrainingFromTemplate')}
              </Button>
              <Button variant="light" leftSection={<IconPlus size={16} />} onClick={handleAddDay}>
                {t('program.addTraining')}
              </Button>
            </Group>
          </Group>
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="program-days">
              {(provided) => (
                <Stack gap="xs" ref={provided.innerRef} {...provided.droppableProps}>
                  {programTrainings.map((day, index) => {
                    const canEditThisDay = canManageDay(day.owner)
                    return (
                      <Draggable
                        draggableId={day.id}
                        index={index}
                        key={day.id}
                        isDragDisabled={!canEditThisDay}
                      >
                        {(dragProvided) => (
                          <Card
                            withBorder
                            padding="md"
                            radius="md"
                            ref={dragProvided.innerRef}
                            {...dragProvided.draggableProps}
                            {...dragProvided.dragHandleProps}
                            onClick={() => handleDayClick(day.id)}
                            style={{
                              backgroundColor: day.id === selectedDayId ? 'var(--mantine-color-violet-1)' : 'var(--mantine-color-white)',
                              borderColor: day.id === selectedDayId ? 'var(--mantine-color-violet-4)' : 'var(--mantine-color-gray-3)',
                              borderWidth: day.id === selectedDayId ? 2 : 1,
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                            }}
                            onMouseEnter={(e) => {
                              if (day.id !== selectedDayId) {
                                e.currentTarget.style.backgroundColor = 'var(--mantine-color-gray-0)'
                                e.currentTarget.style.borderColor = 'var(--mantine-color-violet-3)'
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (day.id !== selectedDayId) {
                                e.currentTarget.style.backgroundColor = 'var(--mantine-color-white)'
                                e.currentTarget.style.borderColor = 'var(--mantine-color-gray-3)'
                              }
                            }}
                          >
                            <Group justify="space-between" align="flex-start">
                              <Stack gap={4} style={{ flex: 1 }}>
                                <Group gap="xs">
                                  <Badge
                                    variant="light"
                                    color="violet"
                                    size="sm"
                                    style={{ minWidth: '28px', justifyContent: 'center' }}
                                  >
                                    {(day.order ?? index) + 1}
                                  </Badge>
                                  <Text fw={600} size="sm" c={day.id === selectedDayId ? 'violet.7' : 'gray.8'}>
                                    {day.name}
                                  </Text>
                                </Group>
                                <Group gap="xs" ml={36}>
                                  <Badge size="xs" color={day.owner === 'trainer' ? 'gray' : 'green'} variant="light">
                                    {t(`program.owner.${day.owner}`)}
                                  </Badge>
                                  <Text size="xs" c="dimmed">
                                    {day.blocks.reduce((sum, block) => sum + block.exercises.length, 0)}{' '}
                                    {t('program.exercises')}
                                  </Text>
                                </Group>
                              </Stack>
                              <Menu position="right-start">
                                <Menu.Target>
                                  <ActionIcon variant="subtle" color="gray">
                                    <IconDotsVertical size={16} />
                                  </ActionIcon>
                                </Menu.Target>
                                <Menu.Dropdown>
                                  <Menu.Item
                                    leftSection={<IconEdit size={16} />}
                                    disabled={!canEditThisDay}
                                    onClick={() => {
                                      if (!canEditThisDay) {
                                        return
                                      }
                                      if (day.id === selectedDayId) {
                                        handleRenameFromMenu()
                                      } else {
                                        dispatch(selectProgramDay(day.id))
                                        setTimeout(() => {
                                          setRenameDraft(day.name)
                                          openRename()
                                        }, 100)
                                      }
                                    }}
                                  >
                                    {t('common.edit')}
                                  </Menu.Item>
                                  <Menu.Item
                                    leftSection={<IconCalendar size={16} />}
                                    onClick={() => {
                                      setAssignForm(createAssignForm(day.id))
                                      openAssign()
                                    }}
                                  >
                                    {t('program.assignToCalendar')}
                                  </Menu.Item>
                                  <Menu.Item
                                    leftSection={<IconCopy size={16} />}
                                    disabled={!canEditThisDay}
                                    onClick={() => {
                                      if (!canEditThisDay) {
                                        return
                                      }
                                      dispatch(duplicateProgramDay(day.id))
                                    }}
                                  >
                                    {t('common.duplicate')}
                                  </Menu.Item>
                                  <Menu.Item
                                    leftSection={<IconTrash size={16} />}
                                    color="red"
                                    disabled={!canEditThisDay}
                                    onClick={() => {
                                      if (!canEditThisDay) {
                                        return
                                      }
                                      dispatch(deleteProgramDay(day.id))
                                    }}
                                  >
                                    {t('common.delete')}
                                  </Menu.Item>
                                </Menu.Dropdown>
                              </Menu>
                            </Group>
                          </Card>
                        )}
                      </Draggable>
                    )
                  })}
                  {provided.placeholder}
                </Stack>
              )}
            </Droppable>
          </DragDropContext>
        </Stack>
      </Card>
      <ScrollArea w="100%" h={620}>
        {selectedDay ? (
          <Stack gap="xl">
            <Group justify="space-between">
              <Title order={2}>{selectedDay.name}</Title>
              <Group gap="xs">
                <Button
                  variant="light"
                  leftSection={<IconCalendar size={16} />}
                  onClick={() => {
                    setAssignForm(createAssignForm(selectedDay.id))
                    openAssign()
                  }}
                >
                  {t('program.assignToCalendar')}
                </Button>
                {canEditSelectedDay && (
                  <Button variant="light" leftSection={<IconCopy size={16} />} onClick={handleCopyDay}>
                    {t('program.copyDay')}
                  </Button>
                )}
                {isTrainer && (
                  <Button variant="light" leftSection={<IconDeviceFloppy size={16} />} onClick={openTemplateModal}>
                    {t('program.saveAsTemplate')}
                  </Button>
                )}
              </Group>
            </Group>
            <ScrollArea type="auto" offsetScrollbars>
              <Group gap="lg" wrap="nowrap">
                {selectedDay.blocks.map((block) => {
                const getBlockConfig = () => {
                  switch (block.type) {
                    case 'warmup':
                      return {
                        icon: <IconStretching size={24} />,
                        color: 'blue',
                        gradient: { from: 'blue.1', to: 'blue.0' },
                        borderColor: 'blue.3',
                      }
                    case 'main':
                      return {
                        icon: <IconFlame size={24} />,
                        color: 'violet',
                        gradient: { from: 'violet.1', to: 'violet.0' },
                        borderColor: 'violet.3',
                      }
                    case 'cooldown':
                      return {
                        icon: <IconStretching size={24} />,
                        color: 'green',
                        gradient: { from: 'green.1', to: 'green.0' },
                        borderColor: 'green.3',
                      }
                    default:
                      return {
                        icon: <IconBarbell size={24} />,
                        color: 'gray',
                        gradient: { from: 'gray.1', to: 'gray.0' },
                        borderColor: 'gray.3',
                      }
                  }
                }
                const config = getBlockConfig()
                
                return (
                  <Card 
                    key={block.id} 
                    withBorder 
                    padding="lg"
                    style={{
                      borderColor: `var(--mantine-color-${config.borderColor})`,
                      backgroundColor: `var(--mantine-color-${config.gradient.to})`,
                      minWidth: 320,
                      flexShrink: 0,
                    }}
                  >
                    <Stack gap="md">
                      <Group justify="space-between" mb="xs">
                        <Group gap="sm">
                          <div style={{ 
                            padding: '8px', 
                            borderRadius: '8px', 
                            backgroundColor: `var(--mantine-color-${config.color}-1)`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}>
                            {config.icon}
                          </div>
                          <Text fw={700} size="lg" c={`${config.color}.7`}>
                            {t(`program.sections.${block.type}`)}
                          </Text>
                        </Group>
                        <Badge 
                          variant="light" 
                          color={config.color}
                          size="lg"
                          style={{ fontWeight: 600 }}
                        >
                          {block.exercises.length}
                        </Badge>
                      </Group>
                      <Stack gap="sm">
                        {block.exercises.map((exercise, index) => (
                          <Card 
                            key={exercise.id} 
                            padding="md" 
                            withBorder
                            style={{
                              backgroundColor: 'var(--mantine-color-white)',
                              borderColor: `var(--mantine-color-${config.color}-2)`,
                              transition: 'all 0.2s',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.transform = 'translateY(-2px)'
                              e.currentTarget.style.boxShadow = 'var(--mantine-shadow-sm)'
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.transform = 'translateY(0)'
                              e.currentTarget.style.boxShadow = 'none'
                            }}
                          >
                            <Group justify="space-between" align="flex-start">
                              <Stack gap="xs" style={{ flex: 1 }}>
                                <Group gap="xs">
                                  <Badge 
                                    variant="light" 
                                    color={config.color}
                                    size="sm"
                                    style={{ minWidth: '24px', justifyContent: 'center' }}
                                  >
                                    {index + 1}
                                  </Badge>
                                  <Text fw={600} size="sm">{exercise.title}</Text>
                                </Group>
                                <Group gap="md" wrap="wrap">
                                  {exercise.sets && (
                                    <Group gap={4}>
                                      <IconRepeat size={14} color="var(--mantine-color-gray-6)" />
                                      <Text size="xs" c="dimmed">
                                        {exercise.sets} {t('program.sets')}
                                      </Text>
                                    </Group>
                                  )}
                                  {exercise.reps && (
                                    <Group gap={4}>
                                      <IconBarbell size={14} color="var(--mantine-color-gray-6)" />
                                      <Text size="xs" c="dimmed">
                                        {exercise.reps} {t('program.reps')}
                                      </Text>
                                    </Group>
                                  )}
                                  {exercise.duration && (
                                    <Group gap={4}>
                                      <IconClock size={14} color="var(--mantine-color-gray-6)" />
                                      <Text size="xs" c="dimmed">
                                        {exercise.duration}
                                      </Text>
                                    </Group>
                                  )}
                                  {exercise.rest && (
                                    <Group gap={4}>
                                      <IconClock size={14} color="var(--mantine-color-gray-6)" />
                                      <Text size="xs" c="dimmed">
                                        {t('program.rest')}: {exercise.rest}
                                      </Text>
                                    </Group>
                                  )}
                                  {exercise.weight && (
                                    <Badge variant="light" color={config.color} size="sm">
                                      {exercise.weight}
                                    </Badge>
                                  )}
                                </Group>
                              </Stack>
                              {canEditSelectedDay && (
                                <Group gap="xs">
                                  <ActionIcon 
                                    variant="subtle" 
                                    size="sm" 
                                    color={config.color}
                                    onClick={() => handleEditExercise(exercise, block.id)}
                                  >
                                    <IconEdit size={14} />
                                  </ActionIcon>
                                  <ActionIcon
                                    variant="subtle"
                                    size="sm"
                                    color="red"
                                    onClick={() => handleDeleteExercise(exercise.id, block.id)}
                                  >
                                    <IconTrash size={14} />
                                  </ActionIcon>
                                </Group>
                              )}
                            </Group>
                          </Card>
                        ))}
                        {block.exercises.length === 0 ? (
                          <Card 
                            padding="xl" 
                            style={{ 
                              backgroundColor: 'var(--mantine-color-gray-0)',
                              borderStyle: 'dashed',
                              borderColor: `var(--mantine-color-${config.color}-3)`,
                            }}
                          >
                            <Stack align="center" gap="xs">
                              <Text c="dimmed" size="sm" ta="center">
                                {t('program.noExercises')}
                              </Text>
                            </Stack>
                          </Card>
                        ) : null}
                      </Stack>
                      {canEditSelectedDay ? (
                        <Group mt="sm" gap="xs">
                          <Button 
                            variant="light" 
                            color={config.color}
                            leftSection={<IconPlus size={16} />} 
                            onClick={() => handleAddExercise(block.id)}
                            fullWidth
                          >
                            {t('program.addExercise')}
                          </Button>
                          <Button 
                            variant="outline" 
                            color={config.color}
                            leftSection={<IconBooks size={16} />} 
                            onClick={() => handleOpenExerciseLibrary(block.id)}
                            fullWidth
                          >
                            {t('program.addFromLibrary')}
                          </Button>
                        </Group>
                      ) : null}
                    </Stack>
                  </Card>
                )
              })}
              </Group>
            </ScrollArea>
          </Stack>
        ) : (
          <Card withBorder>
            <Stack gap="sm" align="center">
              <Title order={3}>{t('program.emptyState')}</Title>
              <Button
                leftSection={<IconPlus size={16} />}
                onClick={() => handleAddDay()}
              >
                {t('program.addDay')}
              </Button>
            </Stack>
          </Card>
        )}
      </ScrollArea>

      <Modal opened={templatePickerOpened} onClose={closeTemplatePicker} title={t('program.templateLibraryTitle')} size="lg">
        <ScrollArea h={360}>
          <Stack gap="sm">
            {accessibleTemplates.length ? (
              accessibleTemplates.map((template) => (
                <Card key={template.id} withBorder padding="md">
                  <Group justify="space-between" align="flex-start">
                    <Stack gap={2} style={{ flex: 1 }}>
                      <Text fw={600}>{template.name}</Text>
                      {template.description ? (
                        <Text size="xs" c="dimmed">
                          {template.description}
                        </Text>
                      ) : null}
                      <Text size="xs" c="dimmed">
                        {t('program.templateDuration', { value: template.duration })}
                      </Text>
                    </Stack>
                    <Button size="compact-sm" leftSection={<IconPlus size={14} />} onClick={() => handleAddDayFromTemplate(template)}>
                      {t('program.addTemplateButton')}
                    </Button>
                  </Group>
                </Card>
              ))
            ) : (
              <Text c="dimmed">{t('program.templatesEmpty')}</Text>
            )}
          </Stack>
        </ScrollArea>
      </Modal>

      <Modal opened={exerciseLibraryOpened} onClose={handleCloseExerciseLibrary} title={t('program.exerciseLibraryTitle')} size="lg">
        <ScrollArea h={360}>
          <Stack gap="sm">
            {accessibleExercises.length ? (
              accessibleExercises.map((exercise) => (
                <Card key={exercise.id} withBorder padding="md">
                  <Group justify="space-between" align="center">
                    <Stack gap={2} style={{ flex: 1 }}>
                      <Text fw={600}>{exercise.name}</Text>
                      {exercise.description ? (
                        <Text size="xs" c="dimmed">
                          {exercise.description}
                        </Text>
                      ) : null}
                    </Stack>
                    <Button
                      size="compact-sm"
                      leftSection={<IconPlus size={14} />}
                      onClick={() => handleSelectExerciseFromLibrary(exercise)}
                    >
                      {t('common.add')}
                    </Button>
                  </Group>
                </Card>
              ))
            ) : (
              <Text c="dimmed">{t('program.exerciseLibraryEmpty')}</Text>
            )}
          </Stack>
        </ScrollArea>
      </Modal>

      <Modal opened={renameModalOpened} onClose={closeRename} title={t('common.edit')}>
        <Stack gap="md">
          <TextInput value={renameDraft} onChange={(event) => setRenameDraft(event.currentTarget.value)} />
          <Group justify="flex-end">
            <Button variant="default" onClick={closeRename}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleRename}>{t('common.save')}</Button>
          </Group>
        </Stack>
      </Modal>

      <Modal opened={assignModalOpened} onClose={closeAssign} title={t('program.assignToCalendar')} size="lg">
        {assignForm ? (
          <Stack gap="md">
            <DateInput
              label={t('calendar.title')}
              value={assignForm.date}
              onChange={(value) => value && setAssignForm((state) => ({ ...state!, date: value }))}
            />
            <Group gap="md">
              <TimeInput
                label={t('calendar.status.scheduled')}
                value={assignForm.startTime}
                onChange={(event) =>
                  setAssignForm((state) => ({ ...state!, startTime: event.currentTarget.value }))
                }
              />
              <TimeInput
                label={t('calendar.status.completed')}
                value={assignForm.endTime}
                onChange={(event) =>
                  setAssignForm((state) => ({ ...state!, endTime: event.currentTarget.value }))
                }
              />
            </Group>
            <Group justify="flex-end">
              <Button variant="default" onClick={closeAssign}>
                {t('common.cancel')}
              </Button>
              <Button onClick={handleAssign}>{t('common.assign')}</Button>
            </Group>
          </Stack>
        ) : null}
      </Modal>

      <Modal
        opened={exerciseModalOpened}
        onClose={handleCloseExerciseModal}
        title={editingExercise?.exercise ? t('program.editExercise') : t('program.addExercise')}
        size="lg"
      >
        <Stack gap="md">
          <TextInput
            label={t('program.exerciseName')}
            placeholder={t('program.exerciseNamePlaceholder')}
            value={exerciseForm.title}
            onChange={(event) => setExerciseForm((state) => ({ ...state, title: event.currentTarget.value }))}
            required
          />
          <Group grow>
            <NumberInput
              label={t('program.sets')}
              value={exerciseForm.sets}
              onChange={(value) => setExerciseForm((state) => ({ ...state, sets: Number(value) || 0 }))}
              min={1}
              required
            />
            <NumberInput
              label={t('program.reps')}
              value={exerciseForm.reps || undefined}
              onChange={(value) => setExerciseForm((state) => ({ ...state, reps: value ? Number(value) : undefined, duration: undefined }))}
              min={1}
              placeholder={t('program.repsPlaceholder')}
            />
          </Group>
          <Group grow>
            <TextInput
              label={t('program.duration')}
              placeholder={t('program.durationPlaceholder')}
              value={exerciseForm.duration || ''}
              onChange={(event) => {
                const value = event.currentTarget.value
                setExerciseForm((state) => ({
                  ...state,
                  duration: value || undefined,
                  reps: value ? undefined : state.reps,
                }))
              }}
            />
            <NumberInput
              label={t('program.rest')}
              placeholder={t('program.restPlaceholder')}
              value={exerciseForm.rest ? Number(exerciseForm.rest) : undefined}
              onChange={(value) => setExerciseForm((state) => ({ ...state, rest: value ? String(value) : undefined }))}
              min={0}
              rightSection={<Text size="xs">сек</Text>}
            />
          </Group>
          <TextInput
            label={t('program.weight')}
            placeholder={t('program.weightPlaceholder')}
            value={exerciseForm.weight || ''}
            onChange={(event) => setExerciseForm((state) => ({ ...state, weight: event.currentTarget.value || undefined }))}
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={handleCloseExerciseModal}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleSaveExercise} disabled={!exerciseForm.title.trim()}>
              {editingExercise?.exercise ? t('common.save') : t('common.add')}
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal opened={templateModalOpened} onClose={closeTemplateModal} title={t('program.saveAsTemplate')} size="md">
        <Stack gap="md">
          <TextInput
            label={t('program.templateName')}
            placeholder={t('program.templateNamePlaceholder')}
            value={templateName}
            onChange={(event) => setTemplateName(event.currentTarget.value)}
            required
          />
          <Text size="sm" c="dimmed">
            {t('program.templateDescription')}
          </Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={closeTemplateModal}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleSaveAsTemplate} disabled={!templateName.trim()}>
              {t('common.save')}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Group>
  )
}

