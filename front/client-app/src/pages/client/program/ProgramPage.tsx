import {
  ActionIcon,
  Alert,
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
  Divider,
  SimpleGrid,
  Anchor,
  Image,
} from '@mantine/core'
import { DateInput, TimeInput } from '@mantine/dates'
import { DragDropContext, Draggable, Droppable, type DropResult, type DroppableProvided, type DraggableProvided } from '@hello-pangea/dnd'
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
  IconVideo,
  IconInfoCircle,
  IconExternalLink,
  IconNote,
  IconBolt,
  IconPlayerPlay,
} from '@tabler/icons-react'
import dayjs from 'dayjs'
import { useMemo, useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppDispatch } from '@/shared/hooks/useAppDispatch'
import { useAppSelector } from '@/shared/hooks/useAppSelector'
import {
  createProgram,
  deleteProgram,
  createProgramDay,
  fetchPrograms,
  fetchProgramDays,
  updateProgramDay,
  deleteProgramDayApi,
  addExerciseToProgramDayApi,
  updateExerciseInProgramDayApi,
  removeExerciseFromProgramDayApi,
  selectProgram,
  selectProgramDay,
  reorderDays,
  type ProgramExercise,
  type ProgramBlockInput,
} from '@/app/store/slices/programSlice'
import { createWorkout } from '@/app/store/slices/calendarSlice'
import { fetchExercises, fetchWorkoutTemplates } from '@/app/store/slices/librarySlice'
import type { WorkoutTemplate, Exercise, WorkoutExercise } from '@/app/store/slices/librarySlice'
import { notifications } from '@mantine/notifications'

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
    description: undefined,
    videoUrl: undefined,
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

  const [viewingExercise, setViewingExercise] = useState<Exercise | null>(null)
  const [viewingProgramExercise, setViewingProgramExercise] = useState<ProgramExercise | null>(null)
  const [viewExerciseModalOpened, { open: openViewExerciseModal, close: closeViewExerciseModal }] = useDisclosure(false)
  const selectedProgram = useMemo(() => programs.find(p => p.id === selectedProgramId) || null, [programs, selectedProgramId])
  const canEditSelectedProgram = Boolean(selectedProgram && (role === 'trainer' || selectedProgram.owner === 'client'))
  const canEditSelectedDay = Boolean(selectedDay && (role === 'trainer' || (selectedDay.owner === 'client' && canEditSelectedProgram)))
  const canManageDay = (dayOwner: 'trainer' | 'client') => role === 'trainer' || (dayOwner === 'client' && canEditSelectedProgram)

  // Загружаем программы и библиотеку при открытии страницы
  useEffect(() => {
    dispatch(fetchPrograms())
    dispatch(fetchExercises())
    dispatch(fetchWorkoutTemplates())
  }, [dispatch])

  // Загружаем дни программы при выборе программы
  useEffect(() => {
    if (selectedProgramId) {
      dispatch(fetchProgramDays(selectedProgramId))
    }
  }, [dispatch, selectedProgramId])

  const handleDayClick = (dayId: string) => {
    dispatch(selectProgramDay(dayId))
  }

  const resolveProgramId = () => selectedProgramId ?? programs[0]?.id ?? null

  const handleAddProgram = async () => {
    const owner = isTrainer ? 'trainer' : 'client'
    const ownerProgramsCount = programs.filter((program) => program.owner === owner).length + 1
    const defaultTitle =
      owner === 'trainer'
        ? `${t('program.coachProgram')} ${ownerProgramsCount}`
        : `${t('program.myProgram')} ${ownerProgramsCount}`
    try {
      await dispatch(createProgram({ title: defaultTitle, owner })).unwrap()
      // Перезагружаем список программ после создания
      await dispatch(fetchPrograms())
      notifications.show({
        title: t('common.success'),
        message: t('program.programCreated'),
        color: 'green',
      })
    } catch (error: any) {
      notifications.show({
        title: t('common.error'),
        message: error || t('program.error.createProgram'),
        color: 'red',
      })
    }
  }

  const handleDeleteProgram = async (programId: string) => {
    const program = programs.find((p) => p.id === programId)
    if (role === 'client' && program?.owner !== 'client') {
      notifications.show({
        title: t('common.error'),
        message: t('program.error.deleteRestricted'),
        color: 'red',
      })
      return
    }

    if (confirm(t('common.delete') + '?')) {
      try {
        await dispatch(deleteProgram(programId)).unwrap()
        // Перезагружаем список программ после удаления
        await dispatch(fetchPrograms())
        if (selectedProgramId === programId) {
          dispatch(selectProgram(null))
        }
        notifications.show({
          title: t('common.success'),
          message: t('program.programDeleted'),
          color: 'green',
        })
      } catch (error: any) {
        notifications.show({
          title: t('common.error'),
          message: error || t('program.error.deleteProgram'),
          color: 'red',
        })
      }
    }
  }

  const handleAddDay = async () => {
    let targetProgramId = resolveProgramId()
    if (!targetProgramId) {
      await handleAddProgram()
      targetProgramId = resolveProgramId()
      if (!targetProgramId) {
        return
      }
    }
    const trainingsCount = days.filter((day) => day.programId === targetProgramId).length + 1
    const defaultName = t('program.trainingName', { count: trainingsCount })
    try {
      await dispatch(
        createProgramDay({
          name: defaultName,
          programId: targetProgramId,
        })
      ).unwrap()
      // Перезагружаем дни программы после создания
      await dispatch(fetchProgramDays(targetProgramId))
      notifications.show({
        title: t('common.success'),
        message: t('program.dayCreated'),
        color: 'green',
      })
    } catch (error: any) {
      notifications.show({
        title: t('common.error'),
        message: error || t('program.error.createDay'),
        color: 'red',
      })
    }
  }

  const handleAddDayFromTemplate = async (template: WorkoutTemplate) => {
    let targetProgramId = resolveProgramId()
    if (!targetProgramId) {
      await handleAddProgram()
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
        rest: item.rest ? `${item.rest} ${t('program.minutesShort')}` : undefined,
        weight: item.weight ? `${item.weight}` : undefined,
        description: linkedExercise?.description || item.exercise?.description || undefined,
        videoUrl: linkedExercise?.videoUrl || item.exercise?.videoUrl || undefined,
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
    try {
      await dispatch(
        createProgramDay({
          name: template.name,
          programId: targetProgramId,
          blocks,
          sourceTemplateId: template.id,
        })
      ).unwrap()
      closeTemplatePicker()
    } catch (error: any) {
      notifications.show({
        title: t('common.error'),
        message: error || t('program.error.createDay'),
        color: 'red',
      })
    }
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

  const handleSelectExerciseFromLibrary = async (exercise: Exercise) => {
    if (!selectedDay || !exerciseLibraryTargetBlock) {
      return
    }
    try {
      await dispatch(
        addExerciseToProgramDayApi({
          programId: selectedDay.programId,
          dayId: selectedDay.id,
          blockId: exerciseLibraryTargetBlock,
          exercise: {
            title: exercise.name,
            sets: 3,
            reps: 10,
            duration: undefined,
            rest: undefined,
            weight: undefined,
            description: exercise.description,
            videoUrl: exercise.videoUrl,
          },
        })
      ).unwrap()
      // Перезагружаем дни программы после добавления упражнения
      await dispatch(fetchProgramDays(selectedDay.programId))
      setExerciseLibraryTargetBlock(null)
      closeExerciseLibrary()
      notifications.show({
        title: t('common.success'),
        message: t('program.exerciseAdded'),
        color: 'green',
      })
    } catch (error: any) {
      notifications.show({
        title: t('common.error'),
        message: error || t('program.error.addExercise'),
        color: 'red',
      })
    }
  }

  const handleCloseExerciseLibrary = () => {
    setExerciseLibraryTargetBlock(null)
    closeExerciseLibrary()
  }

  const handleRename = async () => {
    if (selectedDay && renameDraft.trim()) {
      try {
        await dispatch(
          updateProgramDay({
            programId: selectedDay.programId,
            dayId: selectedDay.id,
            data: { name: renameDraft },
          })
        ).unwrap()
        // Перезагружаем дни программы после переименования
        await dispatch(fetchProgramDays(selectedDay.programId))
        closeRename()
        notifications.show({
          title: t('common.success'),
          message: t('program.dayRenamed'),
          color: 'green',
        })
      } catch (error: any) {
        notifications.show({
          title: t('common.error'),
          message: error || t('program.error.renameDay'),
          color: 'red',
        })
      }
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
        createWorkout({
          title: selectedDay.name,
          start: start.toISOString(),
          end: end.toISOString(),
          programDayId: selectedDay.id,
          location: t('calendar.defaultLocation'),
          trainerId: trainerInfo?.id,
          format: trainerInfo ? 'offline' : 'online',
        }),
      )
      closeAssign()
    }
  }

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination || !selectedProgramId) {
      return
    }
    const sourceDay = programTrainings[result.source.index]
    const destinationDay = programTrainings[result.destination.index]
    if (!sourceDay || !destinationDay) {
      return
    }
    // Обновляем порядок локально для быстрого отклика
    dispatch(reorderDays({ from: result.source.index, to: result.destination.index }))

    // Обновляем порядок через API для каждого дня программы
    const reorderedDays = [...programTrainings]
    const [moved] = reorderedDays.splice(result.source.index, 1)
    reorderedDays.splice(result.destination.index, 0, moved)

    // Обновляем порядок каждого дня через API
    try {
      await Promise.all(
        reorderedDays.map((day, index) =>
          dispatch(
            updateProgramDay({
              programId: selectedProgramId,
              dayId: day.id,
              data: { order: index },
            })
          ).unwrap()
        )
      )
      // Перезагружаем дни программы после изменения порядка
      await dispatch(fetchProgramDays(selectedProgramId))
    } catch (error: any) {
      // В случае ошибки перезагружаем дни программы
      dispatch(fetchProgramDays(selectedProgramId))
      notifications.show({
        title: t('common.error'),
        message: error || t('program.error.reorderDays'),
        color: 'red',
      })
    }
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
      description: exercise.description,
      videoUrl: exercise.videoUrl,
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

  const handleDeleteExercise = async (exerciseId: string, blockId: string) => {
    if (!selectedDay) {
      return
    }
    if (!(role === 'trainer' || selectedDay.owner === 'client')) {
      return
    }
    try {
      await dispatch(
        removeExerciseFromProgramDayApi({
          programId: selectedDay.programId,
          dayId: selectedDay.id,
          blockId,
          exerciseId,
        })
      ).unwrap()
      // Перезагружаем дни программы после удаления упражнения
      await dispatch(fetchProgramDays(selectedDay.programId))
      notifications.show({
        title: t('common.success'),
        message: t('program.exerciseDeleted'),
        color: 'green',
      })
    } catch (error: any) {
      notifications.show({
        title: t('common.error'),
        message: error || t('program.error.deleteExercise'),
        color: 'red',
      })
    }
  }

  const handleSaveExercise = async () => {
    if (selectedDay && editingExercise && exerciseForm.title.trim()) {
      if (!(role === 'trainer' || selectedDay.owner === 'client')) {
        return
      }
      try {
        if (editingExercise.exercise) {
          // Обновляем существующее упражнение
          await dispatch(
            updateExerciseInProgramDayApi({
              programId: selectedDay.programId,
              dayId: selectedDay.id,
              blockId: editingExercise.blockId,
              exerciseId: editingExercise.exercise.id,
              exercise: { ...editingExercise.exercise, ...exerciseForm },
            })
          ).unwrap()
          // Перезагружаем дни программы после обновления упражнения
          await dispatch(fetchProgramDays(selectedDay.programId))
          notifications.show({
            title: t('common.success'),
            message: t('program.exerciseUpdated'),
            color: 'green',
          })
        } else {
          // Добавляем новое упражнение
          await dispatch(
            addExerciseToProgramDayApi({
              programId: selectedDay.programId,
              dayId: selectedDay.id,
              blockId: editingExercise.blockId,
              exercise: exerciseForm,
            })
          ).unwrap()
          // Перезагружаем дни программы после добавления упражнения
          await dispatch(fetchProgramDays(selectedDay.programId))
          notifications.show({
            title: t('common.success'),
            message: t('program.exerciseAdded'),
            color: 'green',
          })
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
          description: undefined,
          videoUrl: undefined,
        })
      } catch (error: any) {
        notifications.show({
          title: t('common.error'),
          message: error || t('program.error.saveExercise'),
          color: 'red',
        })
      }
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
      description: undefined,
      videoUrl: undefined,
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

  const handleCopyDay = async () => {
    if (selectedDay && (role === 'trainer' || selectedDay.owner === 'client')) {
      try {
        // Создаем новый день с теми же блоками и упражнениями
        const blocks: ProgramBlockInput[] = selectedDay.blocks.map(block => ({
          type: block.type,
          title: block.title,
          exercises: block.exercises.map(ex => ({
            title: ex.title,
            sets: ex.sets,
            reps: ex.reps,
            duration: ex.duration,
            rest: ex.rest,
            weight: ex.weight,
            description: ex.description,
            videoUrl: ex.videoUrl,
          })),
        }))
        await dispatch(
          createProgramDay({
            name: `${selectedDay.name} (копия)`,
            programId: selectedDay.programId,
            blocks,
            sourceTemplateId: selectedDay.sourceTemplateId,
          })
        ).unwrap()
        // Перезагружаем дни программы после копирования
        await dispatch(fetchProgramDays(selectedDay.programId))
        notifications.show({
          title: t('common.success'),
          message: t('program.dayDuplicated'),
          color: 'green',
        })
      } catch (error: any) {
        notifications.show({
          title: t('common.error'),
          message: error || t('program.error.duplicateDay'),
          color: 'red',
        })
      }
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
              {(role === 'trainer' || !programs.some(p => p.owner === 'client')) && (
                <Button variant="light" leftSection={<IconPlus size={16} />} onClick={handleAddProgram}>
                  {t('program.addProgram')}
                </Button>
              )}
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
                        <Group gap={4}>
                          <Badge size="xs" color={program.owner === 'trainer' ? 'gray' : 'green'} variant="light">
                            {t(`program.owner.${program.owner}`)}
                          </Badge>
                          {(role === 'trainer' || program.owner === 'client') && (
                            <ActionIcon
                              size="sm"
                              color="red"
                              variant="subtle"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDeleteProgram(program.id)
                              }}
                            >
                              <IconTrash size={14} />
                            </ActionIcon>
                          )}
                        </Group>
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
              {canEditSelectedProgram && (
                <>
                  <Button variant="light" leftSection={<IconTemplate size={16} />} onClick={openTemplatePicker}>
                    {t('program.addTrainingFromTemplate')}
                  </Button>
                  <Button variant="light" leftSection={<IconPlus size={16} />} onClick={handleAddDay}>
                    {t('program.addTraining')}
                  </Button>
                </>
              )}
            </Group>
          </Group>
          {/* Read-only banner for trainer-assigned programs */}
          {role === 'client' && selectedProgram && selectedProgram.owner === 'trainer' && (
            <Alert variant="light" color="blue" title={t('program.trainerAssigned')} icon={<IconInfoCircle size={20} />}>
              {t('program.trainerAssignedDescription')}
            </Alert>
          )}
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="program-days">
              {(provided: DroppableProvided) => (
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
                        {(dragProvided: DraggableProvided) => (
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
                                    onClick={async () => {
                                      if (!canEditThisDay) {
                                        return
                                      }
                                      try {
                                        const blocks: ProgramBlockInput[] = day.blocks.map(block => ({
                                          type: block.type,
                                          title: block.title,
                                          exercises: block.exercises.map(ex => ({
                                            title: ex.title,
                                            sets: ex.sets,
                                            reps: ex.reps,
                                            duration: ex.duration,
                                            rest: ex.rest,
                                            weight: ex.weight,
                                          })),
                                        }))
                                        await dispatch(
                                          createProgramDay({
                                            name: `${day.name} (копия)`,
                                            programId: day.programId,
                                            blocks,
                                            sourceTemplateId: day.sourceTemplateId,
                                          })
                                        ).unwrap()
                                        // Перезагружаем дни программы после копирования
                                        await dispatch(fetchProgramDays(day.programId))
                                        notifications.show({
                                          title: t('common.success'),
                                          message: t('program.dayDuplicated'),
                                          color: 'green',
                                        })
                                      } catch (error: any) {
                                        notifications.show({
                                          title: t('common.error'),
                                          message: error || t('program.error.duplicateDay'),
                                          color: 'red',
                                        })
                                      }
                                    }}
                                  >
                                    {t('common.duplicate')}
                                  </Menu.Item>
                                  <Menu.Item
                                    leftSection={<IconTrash size={16} />}
                                    color="red"
                                    disabled={!canEditThisDay}
                                    onClick={async () => {
                                      if (!canEditThisDay) {
                                        return
                                      }
                                      if (confirm(t('common.delete') + '?')) {
                                        try {
                                          await dispatch(
                                            deleteProgramDayApi({
                                              programId: day.programId,
                                              dayId: day.id,
                                            })
                                          ).unwrap()
                                          // Перезагружаем дни программы после удаления
                                          await dispatch(fetchProgramDays(day.programId))
                                          notifications.show({
                                            title: t('common.success'),
                                            message: t('program.dayDeleted'),
                                            color: 'green',
                                          })
                                        } catch (error: any) {
                                          notifications.show({
                                            title: t('common.error'),
                                            message: error || t('program.error.deleteDay'),
                                            color: 'red',
                                          })
                                        }
                                      }
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
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                              }}
                              onClick={() => {
                                // Try to find full exercise details in library
                                const fullExercise = exercise.exerciseId
                                  ? libraryExercises.find(e => e.id === exercise.exerciseId)
                                  : libraryExercises.find(e => e.name === exercise.title)

                                setViewingProgramExercise(exercise)
                                if (fullExercise) {
                                  setViewingExercise(fullExercise)
                                } else {
                                  // Create fallback exercise from program exercise data
                                  const fallbackExercise: Exercise = {
                                    id: exercise.id || '',
                                    name: exercise.title,
                                    muscle_groups: 'full_body',
                                    equipment: [],
                                    description: exercise.description,
                                    videoUrl: exercise.videoUrl,
                                    visibility: 'all',
                                  }
                                  setViewingExercise(fallbackExercise)
                                }
                                openViewExerciseModal()
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
                                          {exercise.rest}
                                        </Text>
                                      </Group>
                                    )}
                                    {exercise.weight && (
                                      <Badge variant="light" color={config.color} size="sm">
                                        {exercise.weight}
                                      </Badge>
                                    )}
                                  </Group>
                                  {exercise.description && (
                                    <Group gap={4} align="flex-start">
                                      <IconInfoCircle size={14} color="var(--mantine-color-gray-6)" style={{ marginTop: 2 }} />
                                      <Text size="xs" c="dimmed" style={{ flex: 1 }}>
                                        {exercise.description}
                                      </Text>
                                    </Group>
                                  )}
                                  {exercise.videoUrl && (
                                    <Button
                                      variant="subtle"
                                      size="compact-xs"
                                      leftSection={<IconVideo size={14} />}
                                      component="a"
                                      href={exercise.videoUrl}
                                      target="_blank"
                                      color={config.color}
                                      style={{ width: 'fit-content' }}
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      {t('program.viewVideo')}
                                    </Button>
                                  )}
                                </Stack>
                                {canEditSelectedDay && (
                                  <Group gap="xs">
                                    <ActionIcon
                                      variant="subtle"
                                      size="sm"
                                      color={config.color}
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleEditExercise(exercise, block.id)
                                      }}
                                    >
                                      <IconEdit size={14} />
                                    </ActionIcon>
                                    <ActionIcon
                                      variant="subtle"
                                      size="sm"
                                      color="red"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleDeleteExercise(exercise.id, block.id)
                                      }}
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
              onChange={(value) => value && setAssignForm((state) => ({ ...state!, date: typeof value === 'string' ? new Date(value) : value }))}
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
              onChange={(value) => setExerciseForm((state) => ({ ...state, reps: value ? Number(value) : undefined }))}
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
                if (event && event.currentTarget) {
                  const value = event.currentTarget.value
                  setExerciseForm((state) => ({
                    ...state,
                    duration: value || undefined,
                  }))
                }
              }}
            />
            <NumberInput
              label={`${t('program.rest')} (${t('program.minutesShort')})`}
              placeholder={t('program.restPlaceholder')}
              value={exerciseForm.rest ? Number(exerciseForm.rest.replace(/\s*(сек|мин|sec|min)\s*/g, '')) || undefined : undefined}
              onChange={(value) => setExerciseForm((state) => ({ ...state, rest: value ? `${value} ${t('program.minutesShort')}` : undefined }))}
              min={0}
              rightSection={<Text size="xs">{t('program.minutesShort')}</Text>}
            />
          </Group>
          <TextInput
            label={t('program.weight')}
            placeholder={t('program.weightPlaceholder')}
            value={exerciseForm.weight || ''}
            onChange={(event) => {
              if (event && event.currentTarget) {
                const value = event.currentTarget.value
                setExerciseForm((state) => ({ ...state, weight: value || undefined }))
              }
            }}
          />
          <TextInput
            label={t('program.exerciseDescription')}
            placeholder={t('program.exerciseDescriptionPlaceholder')}
            value={exerciseForm.description || ''}
            onChange={(event) => setExerciseForm((state) => ({ ...state, description: event.currentTarget.value || undefined }))}
          />
          <TextInput
            label={t('program.videoUrl')}
            placeholder={t('program.videoUrlPlaceholder')}
            value={exerciseForm.videoUrl || ''}
            onChange={(event) => setExerciseForm((state) => ({ ...state, videoUrl: event.currentTarget.value || undefined }))}
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={handleCloseExerciseModal}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleSaveExercise} disabled={!exerciseForm.title.trim()}>
              {editingExercise?.exercise ? t('common.save') : t('common.add')}
            </Button>
          </Group>
          {role === 'trainer' && !editingExercise?.exercise && (
            <Stack gap="xs" mt="md">
              <Text size="sm" fw={500}>{t('program.orAddFromTemplate')}</Text>
              <Button
                variant="outline"
                leftSection={<IconTemplate size={16} />}
                onClick={() => {
                  closeExerciseModal()
                  openExerciseLibrary()
                }}
              >
                {t('program.browseExerciseTemplates')}
              </Button>
            </Stack>
          )}
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

      <Modal opened={viewExerciseModalOpened} onClose={closeViewExerciseModal} title={t('trainer.library.viewExercise')} size="lg" radius="md">
        {viewingExercise && (
          <Stack gap="xl">
            <Stack gap="xs">
              <Title order={2} style={{ color: 'var(--mantine-color-violet-7)' }}>
                {viewingExercise.name}
              </Title>
              <Group gap="xs">
                <Badge color="violet" variant="light" size="lg" radius="sm">
                  {t(`trainer.library.muscle${viewingExercise.muscle_groups ? viewingExercise.muscle_groups.charAt(0).toUpperCase() + viewingExercise.muscle_groups.slice(1) : 'FullBody'}`)}
                </Badge>
                {viewingExercise.equipment && (Array.isArray(viewingExercise.equipment) ? viewingExercise.equipment : [viewingExercise.equipment]).map((eq: string) => (
                  <Badge key={eq} color="gray" variant="outline" size="lg" radius="sm">
                    {t(`trainer.library.equipment.${eq}`)}
                  </Badge>
                ))}
              </Group>
            </Stack>

            {viewingExercise.imageUrl && (
              <Card withBorder padding={0} radius="md" style={{ overflow: 'hidden' }}>
                <Image
                  src={viewingExercise.imageUrl}
                  alt={viewingExercise.name}
                  height={300}
                  fallbackSrc="https://placehold.co/600x400?text=No+Image"
                />
              </Card>
            )}

            {viewingProgramExercise && (
              <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
                <Card withBorder padding="md" radius="md" style={{ textAlign: 'center', backgroundColor: 'var(--mantine-color-violet-0)', borderColor: 'var(--mantine-color-violet-2)' }}>
                  <IconRepeat size={24} color="var(--mantine-color-violet-6)" style={{ margin: '0 auto 8px' }} />
                  <Text size="xs" c="dimmed" fw={700} tt="uppercase" style={{ letterSpacing: '0.5px' }}>{t('common.sets')}</Text>
                  <Text fw={800} size="xl" c="violet.9">{viewingProgramExercise.sets}</Text>
                </Card>
                {viewingProgramExercise.reps && (
                  <Card withBorder padding="md" radius="md" style={{ textAlign: 'center', backgroundColor: 'var(--mantine-color-blue-0)', borderColor: 'var(--mantine-color-blue-2)' }}>
                    <IconBarbell size={24} color="var(--mantine-color-blue-6)" style={{ margin: '0 auto 8px' }} />
                    <Text size="xs" c="dimmed" fw={700} tt="uppercase" style={{ letterSpacing: '0.5px' }}>{t('common.reps')}</Text>
                    <Text fw={800} size="xl" c="blue.9">{viewingProgramExercise.reps}</Text>
                  </Card>
                )}
                {viewingProgramExercise.rest && (
                  <Card withBorder padding="md" radius="md" style={{ textAlign: 'center', backgroundColor: 'var(--mantine-color-green-0)', borderColor: 'var(--mantine-color-green-2)' }}>
                    <IconClock size={24} color="var(--mantine-color-green-6)" style={{ margin: '0 auto 8px' }} />
                    <Text size="xs" c="dimmed" fw={700} tt="uppercase" style={{ letterSpacing: '0.5px' }}>{t('common.rest')}</Text>
                    <Text fw={800} size="xl" c="green.9">{viewingProgramExercise.rest}</Text>
                  </Card>
                )}
                {viewingProgramExercise.duration && (
                  <Card withBorder padding="md" radius="md" style={{ textAlign: 'center', backgroundColor: 'var(--mantine-color-orange-0)', borderColor: 'var(--mantine-color-orange-2)' }}>
                    <IconClock size={24} color="var(--mantine-color-orange-6)" style={{ margin: '0 auto 8px' }} />
                    <Text size="xs" c="dimmed" fw={700} tt="uppercase" style={{ letterSpacing: '0.5px' }}>{t('program.duration')}</Text>
                    <Text fw={800} size="xl" c="orange.9">{viewingProgramExercise.duration}</Text>
                  </Card>
                )}
                {viewingProgramExercise.weight && (
                  <Card withBorder padding="md" radius="md" style={{ textAlign: 'center', backgroundColor: 'var(--mantine-color-pink-0)', borderColor: 'var(--mantine-color-pink-2)' }}>
                    <IconBarbell size={24} color="var(--mantine-color-pink-6)" style={{ margin: '0 auto 8px' }} />
                    <Text size="xs" c="dimmed" fw={700} tt="uppercase" style={{ letterSpacing: '0.5px' }}>{t('program.weight')}</Text>
                    <Text fw={800} size="xl" c="pink.9">{viewingProgramExercise.weight}</Text>
                  </Card>
                )}
              </SimpleGrid>
            )}

            <Divider />

            <Stack gap="lg">
              {viewingProgramExercise && viewingProgramExercise.description && (
                <Group align="flex-start" wrap="nowrap" gap="md">
                  <div style={{ padding: '8px', borderRadius: '8px', backgroundColor: 'var(--mantine-color-violet-0)' }}>
                    <IconNote size={24} color="var(--mantine-color-violet-6)" />
                  </div>
                  <Stack gap={4}>
                    <Text fw={700} size="sm" tt="uppercase" c="dimmed" style={{ letterSpacing: '0.5px' }}>{t('program.exerciseDescription')}</Text>
                    <Text size="md" style={{ lineHeight: 1.6, fontWeight: 500 }}>{viewingProgramExercise.description}</Text>
                  </Stack>
                </Group>
              )}

              {viewingExercise.description && (
                <Group align="flex-start" wrap="nowrap" gap="md">
                  <div style={{ padding: '8px', borderRadius: '8px', backgroundColor: 'var(--mantine-color-blue-0)' }}>
                    <IconInfoCircle size={24} color="var(--mantine-color-blue-6)" />
                  </div>
                  <Stack gap={4}>
                    <Text fw={700} size="sm" tt="uppercase" c="dimmed" style={{ letterSpacing: '0.5px' }}>{t('trainer.library.exerciseForm.description')}</Text>
                    <Text size="md" style={{ lineHeight: 1.6 }}>{viewingExercise.description}</Text>
                  </Stack>
                </Group>
              )}

              {viewingExercise.startingPosition && (
                <Group align="flex-start" wrap="nowrap" gap="md">
                  <div style={{ padding: '8px', borderRadius: '8px', backgroundColor: 'var(--mantine-color-teal-0)' }}>
                    <IconStretching size={24} color="var(--mantine-color-teal-6)" />
                  </div>
                  <Stack gap={4}>
                    <Text fw={700} size="sm" tt="uppercase" c="dimmed" style={{ letterSpacing: '0.5px' }}>{t('trainer.library.exerciseForm.startingPosition')}</Text>
                    <Text size="md" style={{ lineHeight: 1.6 }}>{viewingExercise.startingPosition}</Text>
                  </Stack>
                </Group>
              )}

              {viewingExercise.executionInstructions && (
                <Group align="flex-start" wrap="nowrap" gap="md">
                  <div style={{ padding: '8px', borderRadius: '8px', backgroundColor: 'var(--mantine-color-orange-0)' }}>
                    <IconBolt size={24} color="var(--mantine-color-orange-6)" />
                  </div>
                  <Stack gap={4}>
                    <Text fw={700} size="sm" tt="uppercase" c="dimmed" style={{ letterSpacing: '0.5px' }}>{t('trainer.library.exerciseForm.executionInstructions')}</Text>
                    <Text size="md" style={{ lineHeight: 1.6 }}>{viewingExercise.executionInstructions}</Text>
                  </Stack>
                </Group>
              )}

              {viewingExercise.notes && (
                <Group align="flex-start" wrap="nowrap" gap="md">
                  <div style={{ padding: '8px', borderRadius: '8px', backgroundColor: 'var(--mantine-color-yellow-0)' }}>
                    <IconNote size={24} color="var(--mantine-color-yellow-6)" />
                  </div>
                  <Stack gap={4}>
                    <Text fw={700} size="sm" tt="uppercase" c="dimmed" style={{ letterSpacing: '0.5px' }}>{t('trainer.library.exerciseForm.notes')}</Text>
                    <Text size="md" style={{ lineHeight: 1.6 }}>{viewingExercise.notes}</Text>
                  </Stack>
                </Group>
              )}

              {viewingExercise.videoUrl && (
                <Stack gap="md">
                  <Group justify="space-between">
                    <Group gap="md">
                      <div style={{ padding: '8px', borderRadius: '8px', backgroundColor: 'var(--mantine-color-red-0)' }}>
                        <IconVideo size={24} color="var(--mantine-color-red-6)" />
                      </div>
                      <Text fw={700} size="sm" tt="uppercase" c="dimmed" style={{ letterSpacing: '0.5px' }}>{t('trainer.library.exerciseForm.video')}</Text>
                    </Group>
                    <Anchor href={viewingExercise.videoUrl} target="_blank" size="sm" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <IconExternalLink size={14} />
                      {t('trainer.library.exerciseForm.openInNewTab')}
                    </Anchor>
                  </Group>

                  {/* YouTube Embed placeholder or actual embed if possible */}
                  {viewingExercise.videoUrl.includes('youtube.com') || viewingExercise.videoUrl.includes('youtu.be') ? (
                    <div style={{
                      position: 'relative',
                      paddingBottom: '56.25%',
                      height: 0,
                      overflow: 'hidden',
                      borderRadius: '12px',
                      backgroundColor: 'var(--mantine-color-gray-1)'
                    }}>
                      <iframe
                        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 0 }}
                        src={`https://www.youtube.com/embed/${viewingExercise.videoUrl.split('v=')[1]?.split('&')[0] || viewingExercise.videoUrl.split('/').pop()}`}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  ) : (
                    <Button
                      variant="light"
                      color="red"
                      leftSection={<IconPlayerPlay size={16} />}
                      component="a"
                      href={viewingExercise.videoUrl}
                      target="_blank"
                    >
                      {t('trainer.library.exerciseForm.openVideo')}
                    </Button>
                  )}
                </Stack>
              )}
            </Stack>

            <Group justify="flex-end" mt="xl">
              <Button variant="filled" color="violet" size="md" radius="md" onClick={closeViewExerciseModal}>
                {t('common.close')}
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>
    </Group>
  )
}

