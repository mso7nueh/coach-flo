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
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core'
import { DateInput, TimeInput } from '@mantine/dates'
import { DragDropContext, Draggable, Droppable, type DropResult } from '@hello-pangea/dnd'
import { useDisclosure } from '@mantine/hooks'
import { IconCalendar, IconCopy, IconDeviceFloppy, IconDotsVertical, IconEdit, IconPlus, IconTrash } from '@tabler/icons-react'
import dayjs from 'dayjs'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppDispatch } from '@/shared/hooks/useAppDispatch'
import { useAppSelector } from '@/shared/hooks/useAppSelector'
import {
  addProgramDay,
  addExercise,
  deleteProgramDay,
  duplicateProgramDay,
  removeExercise,
  reorderDays,
  renameProgramDay,
  selectProgramDay,
  updateExercise,
  type ProgramExercise,
} from '@/app/store/slices/programSlice'
import { scheduleWorkout } from '@/app/store/slices/calendarSlice'

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
  const { days, selectedDayId } = useAppSelector((state) => state.program)
  const role = useAppSelector((state) => state.user.role)
  const selectedDay = useMemo(() => days.find((item) => item.id === selectedDayId) ?? null, [days, selectedDayId])
  const [renameModalOpened, { open: openRename, close: closeRename }] = useDisclosure(false)
  const [assignModalOpened, { open: openAssign, close: closeAssign }] = useDisclosure(false)
  const [exerciseModalOpened, { open: openExerciseModal, close: closeExerciseModal }] = useDisclosure(false)
  const [templateModalOpened, { open: openTemplateModal, close: closeTemplateModal }] = useDisclosure(false)
  const [renameDraft, setRenameDraft] = useState('')
  const [assignForm, setAssignForm] = useState<AssignForm | null>(null)
  const [editingExercise, setEditingExercise] = useState<{
    exercise: ProgramExercise | null
    blockId: string
  } | null>(null)
  const [exerciseForm, setExerciseForm] = useState<Omit<ProgramExercise, 'id'>>({
    title: '',
    sets: 3,
    reps: undefined,
    duration: undefined,
    rest: undefined,
    weight: undefined,
  })
  const [templateName, setTemplateName] = useState('')

  const handleDayClick = (dayId: string) => {
    dispatch(selectProgramDay(dayId))
  }

  const handleAddDay = () => {
    dispatch(addProgramDay({ name: `${t('program.newDay')} ${days.length + 1}` }))
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
        }),
      )
      closeAssign()
    }
  }

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) {
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
    if (selectedDay) {
      dispatch(removeExercise({ dayId: selectedDay.id, blockId, exerciseId }))
    }
  }

  const handleSaveExercise = () => {
    if (selectedDay && editingExercise && exerciseForm.title.trim()) {
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
    if (selectedDay) {
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
      <Card w={280} withBorder>
        <Group justify="space-between" mb="md">
          <Title order={4}>{t('program.title')}</Title>
          {role === 'trainer' ? (
            <ActionIcon variant="light" onClick={handleAddDay}>
              <IconPlus size={16} />
            </ActionIcon>
          ) : null}
        </Group>
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="program-days">
            {(provided) => (
              <Stack gap="xs" ref={provided.innerRef} {...provided.droppableProps}>
                {days.map((day, index) => (
                  <Draggable draggableId={day.id} index={index} key={day.id} isDragDisabled={role !== 'trainer'}>
                    {(dragProvided) => (
                      <Card
                        withBorder
                        padding="sm"
                        radius="md"
                        ref={dragProvided.innerRef}
                        {...dragProvided.draggableProps}
                        {...dragProvided.dragHandleProps}
                        onClick={() => handleDayClick(day.id)}
                        bg={day.id === selectedDayId ? 'violet.1' : undefined}
                      >
                        <Group justify="space-between">
                          <Text fw={600}>{day.name}</Text>
                          {role === 'trainer' ? (
                            <Menu position="right-start">
                              <Menu.Target>
                                <ActionIcon variant="subtle">
                                  <IconDotsVertical size={16} />
                                </ActionIcon>
                              </Menu.Target>
                              <Menu.Dropdown>
                                <Menu.Item
                                  leftSection={<IconEdit size={16} />}
                                  onClick={() => {
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
                                  onClick={() => dispatch(duplicateProgramDay(day.id))}
                                >
                                  {t('common.duplicate')}
                                </Menu.Item>
                                <Menu.Item
                                  leftSection={<IconTrash size={16} />}
                                  color="red"
                                  onClick={() => dispatch(deleteProgramDay(day.id))}
                                >
                                  {t('common.delete')}
                                </Menu.Item>
                              </Menu.Dropdown>
                            </Menu>
                          ) : null}
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
      </Card>
      <ScrollArea w="100%" h={620}>
        {selectedDay ? (
          <Stack gap="xl">
            <Group justify="space-between">
              <Title order={2}>{selectedDay.name}</Title>
              {role === 'trainer' ? (
                <Group gap="xs">
                  <Button variant="light" leftSection={<IconCalendar size={16} />} onClick={() => {
                    setAssignForm(createAssignForm(selectedDay.id))
                    openAssign()
                  }}>
                    {t('program.assignToCalendar')}
                  </Button>
                  <Button variant="light" leftSection={<IconCopy size={16} />} onClick={handleCopyDay}>
                    {t('program.copyDay')}
                  </Button>
                  <Button variant="light" leftSection={<IconDeviceFloppy size={16} />} onClick={openTemplateModal}>
                    {t('program.saveAsTemplate')}
                  </Button>
                </Group>
              ) : null}
            </Group>
            <SimpleGrid cols={{ base: 1, md: 3 }}>
              {selectedDay.blocks.map((block) => (
                <Card key={block.id} withBorder>
                  <Stack gap="md">
                    <Group justify="space-between">
                      <Text fw={600}>{t(`program.sections.${block.type}`)}</Text>
                      <Badge variant="light">{block.exercises.length}</Badge>
                    </Group>
                    <Stack gap="sm">
                      {block.exercises.map((exercise) => (
                        <Card key={exercise.id} padding="sm" withBorder>
                          <Group justify="space-between" align="flex-start">
                            <Stack gap={2} style={{ flex: 1 }}>
                              <Text fw={600}>{exercise.title}</Text>
                              <Text size="sm" c="dimmed">
                                {exercise.sets} {t('program.sets')} × {exercise.reps ?? exercise.duration ?? '-'}
                                {exercise.rest ? ` · ${t('program.rest')}: ${exercise.rest}` : ''}
                                {exercise.weight ? ` · ${t('program.weight')}: ${exercise.weight}` : ''}
                              </Text>
                            </Stack>
                            {role === 'trainer' && (
                              <Group gap="xs">
                                <ActionIcon variant="subtle" size="sm" onClick={() => handleEditExercise(exercise, block.id)}>
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
                        <Text c="dimmed">{t('program.emptyState')}</Text>
                      ) : null}
                    </Stack>
                    {role === 'trainer' ? (
                      <Button variant="light" leftSection={<IconPlus size={16} />} onClick={() => handleAddExercise(block.id)}>
                        {t('common.add')}
                      </Button>
                    ) : null}
                  </Stack>
                </Card>
              ))}
            </SimpleGrid>
          </Stack>
        ) : (
          <Card withBorder>
            <Stack gap="sm" align="center">
              <Title order={3}>{t('program.emptyState')}</Title>
              {role === 'trainer' ? (
                <Button leftSection={<IconPlus size={16} />} onClick={handleAddDay}>
                  {t('program.addDay')}
                </Button>
              ) : null}
            </Stack>
          </Card>
        )}
      </ScrollArea>

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
            <TextInput
              label={t('program.rest')}
              placeholder={t('program.restPlaceholder')}
              value={exerciseForm.rest || ''}
              onChange={(event) => setExerciseForm((state) => ({ ...state, rest: event.currentTarget.value || undefined }))}
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

