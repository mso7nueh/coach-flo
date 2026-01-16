import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Group,
  Modal,
  NumberInput,
  ScrollArea,
  SegmentedControl,
  Select,
  SimpleGrid,
  Stack,
  Tabs,
  Text,
  TextInput,
  Title,
  UnstyledButton,
} from '@mantine/core'
import { DateInput } from '@mantine/dates'
import { IconActivity, IconAdjustments, IconCalendarCheck, IconPlus, IconScale, IconTarget } from '@tabler/icons-react'
import { useMemo, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import dayjs from 'dayjs'
import {
    LineChart,
    Line,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    ReferenceLine,
} from 'recharts'
import { useAppSelector } from '@/shared/hooks/useAppSelector'
import { useAppDispatch } from '@/shared/hooks/useAppDispatch'
import {
  setMetricsPeriod,
  setBodyMetricGoal,
  setExerciseMetricGoal,
  fetchBodyMetrics,
  fetchBodyMetricEntries,
  fetchExerciseMetrics,
  fetchExerciseMetricEntries,
  addBodyMetricEntryApi,
  addExerciseMetricEntryApi,
  createBodyMetricApi,
  createExerciseMetricApi,
} from '@/app/store/slices/metricsSlice'
import { notifications } from '@mantine/notifications'
import { useDisclosure } from '@mantine/hooks'
import { useEffect } from 'react'

const periodSegments = [
  { label: '1w', value: '1w' },
  { label: '4w', value: '4w' },
  { label: '12w', value: '12w' },
  { label: 'All', value: 'all' },
]

interface BodyMetricForm {
  metricId: string
  value: number
  recordedAt: Date | null
}

interface ExerciseMetricForm {
  exerciseId: string
  date: Date | null
  weight: number
  repetitions: number
  sets: number
}

type ExerciseChartMode = 'weight' | 'reps' | 'volume'

export const MetricsPage = () => {
  const { t } = useTranslation()
  const dispatch = useAppDispatch()
  const {
    bodyMetrics,
    bodyMetricEntries,
    exerciseMetrics,
    exerciseMetricEntries,
    period,
    bodyMetricGoals,
    exerciseMetricGoals,
    bodyMetricStartValues,
  } = useAppSelector((state) => state.metrics)
  const [selectedMetricId, setSelectedMetricId] = useState<string | null>(bodyMetrics[0]?.id ?? null)
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(exerciseMetrics[0]?.id ?? null)
  const [bodyModalOpened, { open: openBodyModal, close: closeBodyModal }] = useDisclosure(false)
  const [exerciseModalOpened, { open: openExerciseModal, close: closeExerciseModal }] = useDisclosure(false)
  const [bulkModalOpened, { open: openBulkModal, close: closeBulkModal }] = useDisclosure(false)
  const [bodyGoalModalOpened, { open: openBodyGoalModal, close: closeBodyGoalModal }] = useDisclosure(false)
  const [exerciseGoalModalOpened, { open: openExerciseGoalModal, close: closeExerciseGoalModal }] = useDisclosure(false)
  const [createBodyMetricModalOpened, { open: openCreateBodyMetricModal, close: closeCreateBodyMetricModal }] = useDisclosure(false)
  const [createExerciseMetricModalOpened, { open: openCreateExerciseMetricModal, close: closeCreateExerciseMetricModal }] = useDisclosure(false)
  const [goalMetricId, setGoalMetricId] = useState<string | null>(null)
  const [goalValue, setGoalValue] = useState<number>(0)
  const [goalExerciseId, setGoalExerciseId] = useState<string | null>(null)
  const [goalWeight, setGoalWeight] = useState<number>(0)
  const [goalRepetitions, setGoalRepetitions] = useState<number>(0)
  const [createBodyMetricForm, setCreateBodyMetricForm] = useState({ label: '', unit: '', target: undefined as number | undefined })
  const [createExerciseMetricForm, setCreateExerciseMetricForm] = useState({ label: '', muscle_group: '' })
  const [bodyForm, setBodyForm] = useState<BodyMetricForm>({
    metricId: bodyMetrics[0]?.id ?? '',
    value: 0,
    recordedAt: new Date(),
  })
  const [exerciseForm, setExerciseForm] = useState<ExerciseMetricForm>({
    exerciseId: exerciseMetrics[0]?.id ?? '',
    date: new Date(),
    weight: 0,
    repetitions: 0,
    sets: 1,
  })
  const [bulkForm, setBulkForm] = useState<Record<string, number>>({})
  const [exerciseChartMode, setExerciseChartMode] = useState<ExerciseChartMode>('weight')
  const selectedMetricForModal = useMemo(
    () => bodyMetrics.find((metric) => metric.id === bodyForm.metricId),
    [bodyMetrics, bodyForm.metricId],
  )
  const selectedExerciseForModal = useMemo(
    () => exerciseMetrics.find((exercise) => exercise.id === exerciseForm.exerciseId),
    [exerciseMetrics, exerciseForm.exerciseId],
  )

  // Загружаем метрики при открытии страницы
  useEffect(() => {
    // Сначала загружаем списки метрик, затем записи (чтобы избежать дополнительных запросов)
    const loadMetrics = async () => {
      try {
        // Загружаем списки метрик параллельно
        await Promise.all([
          dispatch(fetchBodyMetrics()).unwrap(),
          dispatch(fetchExerciseMetrics()).unwrap(),
        ])
        
        // После загрузки метрик загружаем записи (теперь fetchBodyMetricEntries сможет использовать метрики из state)
        const endDate = dayjs().toISOString()
        const startDate = dayjs().subtract(28, 'days').toISOString()
        await Promise.all([
          dispatch(fetchBodyMetricEntries({ start_date: startDate, end_date: endDate })).unwrap(),
          dispatch(fetchExerciseMetricEntries({ start_date: startDate, end_date: endDate })).unwrap(),
        ])
      } catch (error: any) {
        console.error('Error loading metrics:', error)
        // Не показываем уведомление здесь, так как ошибки обрабатываются в thunks
      }
    }
    
    loadMetrics()
  }, [dispatch])

  // Обновляем выбранные метрики при загрузке данных
  useEffect(() => {
    if (bodyMetrics.length > 0 && !selectedMetricId) {
      setSelectedMetricId(bodyMetrics[0].id)
    }
  }, [bodyMetrics, selectedMetricId])

  useEffect(() => {
    if (exerciseMetrics.length > 0 && !selectedExerciseId) {
      setSelectedExerciseId(exerciseMetrics[0].id)
    }
  }, [exerciseMetrics, selectedExerciseId])

  const getFilteredEntries = useCallback(
    (metricId: string, entries: typeof bodyMetricEntries) => {
      const filtered = entries.filter((entry) => entry.metricId === metricId).sort((a, b) => dayjs(a.recordedAt).diff(dayjs(b.recordedAt)))
      const daysAgo = period === '1w' ? 7 : period === '4w' ? 28 : period === '12w' ? 84 : Infinity
      if (daysAgo === Infinity) {
        return filtered
      }
      const cutoff = dayjs().subtract(daysAgo, 'day')
      return filtered.filter((entry) => dayjs(entry.recordedAt).isAfter(cutoff))
    },
    [period],
  )

  const selectedMetric = useMemo(() => bodyMetrics.find((m) => m.id === selectedMetricId) ?? null, [bodyMetrics, selectedMetricId])

  const chartData = useMemo(() => {
    if (!selectedMetric) return []
    const entries = getFilteredEntries(selectedMetric.id, bodyMetricEntries)
    return entries.map((entry) => ({
      date: dayjs(entry.recordedAt).format('D MMM'),
      value: entry.value,
      fullDate: entry.recordedAt,
    }))
  }, [selectedMetric, bodyMetricEntries, getFilteredEntries])

  const bodyChartDomain = useMemo(() => {
    if (!selectedMetric || chartData.length === 0) return undefined
    const values = chartData.map((d) => d.value)
    const minValue = Math.min(...values)
    const maxValue = Math.max(...values)
    const goal = bodyMetricGoals[selectedMetric.id]
    
    if (goal !== undefined && goal !== null) {
      const allValues = [...values, goal]
      const allMin = Math.min(...allValues)
      const allMax = Math.max(...allValues)
      const range = allMax - allMin || 1
      const padding = Math.max(range * 0.15, (allMax - allMin) * 0.1)
      const center = (allMin + allMax) / 2
      const domainMin = Math.max(0, center - range / 2 - padding)
      const domainMax = center + range / 2 + padding
      return [domainMin, domainMax]
    }
    
    const range = maxValue - minValue || 1
    const padding = Math.max(range * 0.15, (maxValue - minValue) * 0.1)
    return [Math.max(0, minValue - padding), maxValue + padding]
  }, [chartData, selectedMetric, bodyMetricGoals])

  const selectedExercise = useMemo(() => exerciseMetrics.find((e) => e.id === selectedExerciseId) ?? null, [exerciseMetrics, selectedExerciseId])

  const exerciseChartModeConfig = useMemo(
    () => ({
      weight: { label: t('metricsPage.exerciseChart.modes.weight'), unit: t('metricsPage.exerciseChart.units.weight'), fractionDigits: 2 },
      reps: { label: t('metricsPage.exerciseChart.modes.reps'), unit: t('metricsPage.exerciseChart.units.reps'), fractionDigits: 0 },
      volume: { label: t('metricsPage.exerciseChart.modes.volume'), unit: t('metricsPage.exerciseChart.units.volume'), fractionDigits: 0 },
    }),
    [t],
  )
  const currentModeConfig = exerciseChartModeConfig[exerciseChartMode]

  const exerciseChartData = useMemo(() => {
    if (!selectedExercise) return []
    const filtered = exerciseMetricEntries
      .filter((entry) => entry.exerciseId === selectedExercise.id)
      .sort((a, b) => dayjs(a.date).diff(dayjs(b.date)))
    const daysAgo = period === '1w' ? 7 : period === '4w' ? 28 : period === '12w' ? 84 : Infinity
    const limited =
      daysAgo === Infinity ? filtered : filtered.filter((entry) => dayjs(entry.date).isAfter(dayjs().subtract(daysAgo, 'day')))
    return limited.map((entry) => {
      const totalReps = entry.repetitions * entry.sets
      const computedVolume = entry.weight > 0 ? entry.weight * totalReps : totalReps
      return {
        date: dayjs(entry.date).format('D MMM'),
        weight: entry.weight,
        repetitions: entry.repetitions,
        sets: entry.sets,
        totalReps,
        volume: computedVolume,
        fullDate: entry.date,
      }
    })
  }, [selectedExercise, exerciseMetricEntries, period])

  const exerciseChartDisplayData = useMemo(() => {
    return exerciseChartData.map((entry) => {
      const value =
        exerciseChartMode === 'weight'
          ? entry.weight
          : exerciseChartMode === 'reps'
            ? entry.totalReps
            : entry.volume
      return { ...entry, value }
    })
  }, [exerciseChartData, exerciseChartMode])

  const exerciseChartDomain = useMemo(() => {
    if (!selectedExercise || exerciseChartDisplayData.length === 0) return undefined
    const values = exerciseChartDisplayData.map((d) => d.value)
    const minValue = Math.min(...values)
    const maxValue = Math.max(...values)
    const range = maxValue - minValue || 1
    const padding = Math.max(range * 0.15, (maxValue - minValue) * 0.1)
    return [Math.max(0, minValue - padding), maxValue + padding]
  }, [exerciseChartDisplayData, selectedExercise])

  const latestBodyValues = useMemo(() => {
    return bodyMetrics.map((metric) => {
      const entries = bodyMetricEntries
        .filter((entry) => entry.metricId === metric.id)
        .sort((a, b) => dayjs(a.recordedAt).diff(dayjs(b.recordedAt)))
      const sortedByDate = [...entries].sort((a, b) => dayjs(a.recordedAt).diff(dayjs(b.recordedAt)))
      const startValue = sortedByDate[0]
      const latestEntries = [...entries].sort((a, b) => dayjs(b.recordedAt).diff(dayjs(a.recordedAt)))
      
      return {
        metric,
        latest: latestEntries[0],
        start: startValue ? { value: startValue.value, recordedAt: startValue.recordedAt } : bodyMetricStartValues[metric.id] ? { value: bodyMetricStartValues[metric.id], recordedAt: '' } : null,
        history: latestEntries.slice(0, 6),
      }
    })
  }, [bodyMetrics, bodyMetricEntries, bodyMetricStartValues])

  const exerciseSummaries = useMemo(() => {
    return exerciseMetrics.map((exercise) => {
      const entries = exerciseMetricEntries
        .filter((entry) => entry.exerciseId === exercise.id)
        .sort((a, b) => dayjs(b.date).diff(dayjs(a.date)))
      const latest = entries[0]
      const previous = entries[1]
      return {
        exercise,
        latest,
        previous,
        change: latest && previous ? latest.weight - previous.weight : 0,
      }
    })
  }, [exerciseMetrics, exerciseMetricEntries])


  const handleAddBodyMetric = async () => {
    if (bodyForm.metricId && bodyForm.recordedAt && bodyForm.value > 0) {
      const metric = bodyMetrics.find((m) => m.id === bodyForm.metricId)
      if (metric) {
        try {
          await dispatch(
            addBodyMetricEntryApi({
              metricId: bodyForm.metricId,
              value: bodyForm.value,
              recordedAt: bodyForm.recordedAt.toISOString(),
            }),
          ).unwrap()
          closeBodyModal()
          setBodyForm({
            metricId: bodyMetrics[0]?.id ?? '',
            value: 0,
            recordedAt: new Date(),
          })
          notifications.show({
            title: t('common.success'),
            message: t('metricsPage.valueAdded'),
            color: 'green',
          })
        } catch (error: any) {
          notifications.show({
            title: t('common.error'),
            message: error || t('metricsPage.error.addValue'),
            color: 'red',
          })
        }
      }
    }
  }

  const handleAddExerciseMetric = async () => {
    if (exerciseForm.exerciseId && exerciseForm.date && exerciseForm.weight > 0 && exerciseForm.repetitions > 0) {
      try {
        await dispatch(
          addExerciseMetricEntryApi({
            exerciseId: exerciseForm.exerciseId,
            date: exerciseForm.date.toISOString(),
            weight: exerciseForm.weight,
            repetitions: exerciseForm.repetitions,
            sets: exerciseForm.sets,
          }),
        ).unwrap()
        closeExerciseModal()
        setExerciseForm({
          exerciseId: exerciseMetrics[0]?.id ?? '',
          date: new Date(),
          weight: 0,
          repetitions: 0,
          sets: 1,
        })
        notifications.show({
          title: t('common.success'),
          message: t('metricsPage.valueAdded'),
          color: 'green',
        })
      } catch (error: any) {
        notifications.show({
          title: t('common.error'),
          message: error || t('metricsPage.error.addValue'),
          color: 'red',
        })
      }
    }
  }

  const handleBulkAdd = async () => {
    const today = new Date()
    const promises = Object.entries(bulkForm)
      .filter(([_, value]) => value > 0)
      .map(([metricId, value]) => {
        const metric = bodyMetrics.find((m) => m.id === metricId)
        if (metric) {
          return dispatch(
            addBodyMetricEntryApi({
              metricId,
              value,
              recordedAt: today.toISOString(),
            }),
          ).unwrap()
        }
        return Promise.resolve()
      })
    
    try {
      await Promise.all(promises)
      setBulkForm({})
      closeBulkModal()
      notifications.show({
        title: t('common.success'),
        message: t('metricsPage.valuesAdded'),
        color: 'green',
      })
    } catch (error: any) {
      notifications.show({
        title: t('common.error'),
        message: error || t('metricsPage.error.addValue'),
        color: 'red',
      })
    }
  }

  const handleOpenBodyGoalModal = (metricId: string) => {
    setGoalMetricId(metricId)
    setGoalValue(bodyMetricGoals[metricId] ?? 0)
    openBodyGoalModal()
  }

  const handleSaveBodyGoal = () => {
    if (goalMetricId) {
      dispatch(setBodyMetricGoal({ metricId: goalMetricId, value: goalValue }))
      closeBodyGoalModal()
      setGoalMetricId(null)
      setGoalValue(0)
    }
  }

  const handleOpenExerciseGoalModal = (exerciseId: string) => {
    setGoalExerciseId(exerciseId)
    const goals = exerciseMetricGoals[exerciseId]
    setGoalWeight(goals?.weight ?? 0)
    setGoalRepetitions(goals?.repetitions ?? 0)
    openExerciseGoalModal()
  }

  const handleSaveExerciseGoal = () => {
    if (goalExerciseId) {
      dispatch(setExerciseMetricGoal({ exerciseId: goalExerciseId, weight: goalWeight || undefined, repetitions: goalRepetitions || undefined }))
      closeExerciseGoalModal()
      setGoalExerciseId(null)
      setGoalWeight(0)
      setGoalRepetitions(0)
    }
  }

  return (
    <Stack gap="xl">
      <Group justify="space-between" align="flex-start">
        <Stack gap={0}>
          <Text c="dimmed">{t('metricsPage.title')}</Text>
          <Title order={2}>{t('metricsPage.bodyMetrics')}</Title>
        </Stack>
        <Group gap="md">
        <SegmentedControl
          value={period}
          onChange={(value) => dispatch(setMetricsPeriod(value as typeof period))}
          data={periodSegments.map((segment) => ({
            label: t(`metricsPage.period.${segment.value}`),
            value: segment.value,
          }))}
        />
          <Button variant="light" leftSection={<IconPlus size={16} />} onClick={openBulkModal}>
            {t('metricsPage.bulkUpdate')}
          </Button>
        </Group>
      </Group>

      <Tabs defaultValue="body">
        <Tabs.List>
          <Tabs.Tab value="body">{t('metricsPage.tabs.body')}</Tabs.Tab>
          <Tabs.Tab value="exercises">{t('metricsPage.tabs.exercises')}</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="body" pt="md">
          <Group align="flex-start" gap="xl">
            <Card w={280} withBorder style={{ position: 'sticky', top: 20 }}>
              <Stack gap="md">
                <Group justify="space-between">
                  <Title order={4}>{t('metricsPage.bodyMetrics')}</Title>
                  <Group gap="xs">
                    <Button size="xs" variant="light" leftSection={<IconPlus size={14} />} onClick={openCreateBodyMetricModal}>
                      {t('metricsPage.createMetric')}
                    </Button>
                    <Button size="xs" variant="light" leftSection={<IconPlus size={14} />} onClick={openBodyModal} disabled={bodyMetrics.length === 0}>
                      {t('common.add')}
                    </Button>
                  </Group>
                </Group>
                <ScrollArea h={600}>
                  <Stack gap="xs">
                    {bodyMetrics.length === 0 ? (
                      <Card padding="md" withBorder>
                        <Stack gap="sm" align="center">
                          <Text size="sm" c="dimmed" ta="center">
                            {t('metricsPage.noMetrics')}
                          </Text>
                          <Button size="xs" variant="light" leftSection={<IconPlus size={14} />} onClick={openCreateBodyMetricModal}>
                            {t('metricsPage.createFirstMetric')}
                          </Button>
                        </Stack>
                      </Card>
                    ) : (
                      bodyMetrics.map((metric) => {
                      const isSelected = metric.id === selectedMetricId
                      const metricData = latestBodyValues.find((v) => v.metric.id === metric.id)
                      const latest = metricData?.latest
                      const start = metricData?.start
                      const goal = bodyMetricGoals[metric.id]
                      return (
                        <Card
                          key={metric.id}
                          onClick={() => setSelectedMetricId(metric.id)}
                          padding="sm"
                          withBorder
                          tabIndex={0}
                          role="button"
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault()
                              setSelectedMetricId(metric.id)
                            }
                          }}
                          style={{
                            borderColor: isSelected ? 'var(--mantine-color-violet-3)' : 'var(--mantine-color-gray-2)',
                            backgroundColor: isSelected ? 'var(--mantine-color-violet-0)' : 'var(--mantine-color-white)',
                            transition: 'all 0.2s',
                            cursor: 'pointer',
                          }}
                        >
                          <Stack gap={4}>
                    <Group justify="space-between">
                              <Text fw={600} size="sm">
                                {metric.label}
                              </Text>
                              <div
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleOpenBodyGoalModal(metric.id)
                                }}
                                style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '20px', height: '20px' }}
                              >
                                <IconTarget size={14} />
                              </div>
                            </Group>
                            <Text size="lg" fw={700} c={isSelected ? 'violet.7' : 'gray.9'}>
                              {latest ? `${latest.value.toFixed(2)} ${metric.unit}` : `— ${metric.unit}`}
                            </Text>
                            {start && (
                              <Text size="xs" c="dimmed">
                                {t('metricsPage.startValue')}: {start.value.toFixed(2)} {metric.unit}
                              </Text>
                            )}
                            {goal && (
                              <Badge variant="dot" size="xs" color="violet">
                                {t('metricsPage.goal')}: {goal.toFixed(2)} {metric.unit}
                              </Badge>
                            )}
                            {latest && (
                              <Text size="xs" c="dimmed">
                                {dayjs(latest.recordedAt).format('D MMM YYYY')}
                              </Text>
                            )}
                          </Stack>
                        </Card>
                      )
                    }))}
                  </Stack>
                </ScrollArea>
              </Stack>
            </Card>

            <Card withBorder style={{ flex: 1 }} padding="xl">
              <Stack gap="lg">
                {selectedMetric ? (
                  <>
                    <Group justify="space-between" align="center">
                      <Group>
                        <Title order={3}>{selectedMetric.label}</Title>
                        <Badge variant="light" size="lg">
                          {selectedMetric.unit}
                        </Badge>
                        {bodyMetricGoals[selectedMetric.id] && (
                          <Badge variant="dot" color="violet">
                            {t('metricsPage.goal')}: {bodyMetricGoals[selectedMetric.id].toFixed(2)} {selectedMetric.unit}
                          </Badge>
                        )}
                        {latestBodyValues.find((v) => v.metric.id === selectedMetric.id)?.start && (
                          <Badge variant="light" color="gray">
                            {t('metricsPage.startValue')}: {latestBodyValues.find((v) => v.metric.id === selectedMetric.id)?.start?.value.toFixed(2)} {selectedMetric.unit}
                          </Badge>
                        )}
                      </Group>
                      <Group gap="xs">
                        <Button
                          variant="light"
                          size="xs"
                          leftSection={<IconTarget size={14} />}
                          onClick={() => handleOpenBodyGoalModal(selectedMetric.id)}
                        >
                          {t('metricsPage.setGoal')}
                        </Button>
                        <Button
                          variant="light"
                          color="violet"
                          leftSection={<IconCalendarCheck size={16} />}
                          onClick={() => {
                            const today = new Date()
                            const existingEntry = bodyMetricEntries
                              .filter((entry) => entry.metricId === selectedMetric.id)
                              .find((entry) => dayjs(entry.recordedAt).isSame(dayjs(today), 'day'))
                            
                            const latestEntry = latestBodyValues.find((v) => v.metric.id === selectedMetric.id)?.latest
                            
                            if (existingEntry) {
                              setBodyForm({
                                metricId: selectedMetric.id,
                                value: existingEntry.value,
                                recordedAt: today,
                              })
                            } else if (latestEntry) {
                              setBodyForm({
                                metricId: selectedMetric.id,
                                value: latestEntry.value,
                                recordedAt: today,
                              })
                            } else {
                              setBodyForm({
                                metricId: selectedMetric.id,
                                value: 0,
                                recordedAt: today,
                              })
                            }
                            openBodyModal()
                          }}
                        >
                        {bodyMetricEntries
                          .filter((entry) => entry.metricId === selectedMetric.id)
                          .find((entry) => dayjs(entry.recordedAt).isSame(dayjs(), 'day'))
                          ? t('metricsPage.updateToday')
                          : t('metricsPage.addToday')}
                      </Button>
                      </Group>
                    </Group>
                    {chartData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={400}>
                        <AreaChart data={chartData} margin={{ top: 10, right: 80, left: 0, bottom: 0 }}>
                          <defs>
                            <linearGradient id={`colorGradient-${selectedMetric.id}`} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#7950f2" stopOpacity={0.4} />
                              <stop offset="95%" stopColor="#7950f2" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e9ecef" vertical={false} />
                          <XAxis
                            dataKey="date"
                            stroke="#6c757d"
                            style={{ fontSize: '12px', fontFamily: 'inherit' }}
                            tickLine={false}
                            axisLine={false}
                          />
                          <YAxis
                            stroke="#6c757d"
                            style={{ fontSize: '12px', fontFamily: 'inherit' }}
                            tickLine={false}
                            axisLine={false}
                            width={60}
                            domain={bodyChartDomain}
                            tickFormatter={(value) => value.toFixed(2)}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'white',
                              border: 'none',
                              borderRadius: '12px',
                              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                              padding: '12px',
                              fontFamily: 'inherit',
                            }}
                            labelStyle={{
                              color: '#495057',
                              fontWeight: 600,
                              marginBottom: '8px',
                              fontSize: '13px',
                            }}
                            itemStyle={{
                              color: '#212529',
                              padding: '4px 0',
                              fontSize: '13px',
                            }}
                            formatter={(value: number) => [`${value.toFixed(2)} ${selectedMetric.unit}`, selectedMetric.label]}
                          />
                          <Area
                            type="monotone"
                            dataKey="value"
                            stroke="#7950f2"
                            strokeWidth={3}
                            fill={`url(#colorGradient-${selectedMetric.id})`}
                            dot={{ r: 5, fill: '#7950f2', strokeWidth: 2, stroke: 'white' }}
                            activeDot={{ r: 7, strokeWidth: 2, stroke: '#7950f2', fill: 'white' }}
                            animationDuration={800}
                            animationEasing="ease-out"
                            name={selectedMetric.label}
                          />
                          {bodyMetricGoals[selectedMetric.id] && (
                            <ReferenceLine
                              y={bodyMetricGoals[selectedMetric.id]}
                              stroke="#7c3aed"
                              strokeWidth={2}
                              strokeDasharray="6 4"
                              strokeOpacity={0.7}
                              label={{
                                value: `${t('metricsPage.goal')}: ${bodyMetricGoals[selectedMetric.id].toFixed(2)} ${selectedMetric.unit}`,
                                position: 'insideTopRight',
                                fill: '#7c3aed',
                                fontSize: 11,
                                fontWeight: 600,
                                offset: 5,
                              }}
                            />
                          )}
                          {latestBodyValues.find((v) => v.metric.id === selectedMetric.id)?.start && (
                            <ReferenceLine
                              y={latestBodyValues.find((v) => v.metric.id === selectedMetric.id)?.start?.value}
                              stroke="#94a3b8"
                              strokeWidth={1.5}
                              strokeDasharray="3 3"
                              strokeOpacity={0.5}
                            />
                          )}
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <Stack gap="md" align="center" py="xl">
                        <Text c="dimmed" size="lg">
                          {t('metricsPage.noData')}
                    </Text>
                        <Button leftSection={<IconPlus size={16} />} onClick={openBodyModal}>
                          {t('metricsPage.addValue')}
                        </Button>
                      </Stack>
                    )}
                  </>
                ) : (
                  <Text c="dimmed">{t('metricsPage.selectMetric')}</Text>
                )}
                  </Stack>
                </Card>
          </Group>
        </Tabs.Panel>

        <Tabs.Panel value="exercises" pt="md">
          <Group align="flex-start" gap="xl">
            <Card w={280} withBorder style={{ position: 'sticky', top: 20 }}>
              <Stack gap="md">
                <Group justify="space-between">
                  <Title order={4}>{t('metricsPage.tabs.exercises')}</Title>
                  <Group gap="xs">
                    <Button size="xs" variant="light" leftSection={<IconPlus size={14} />} onClick={openCreateExerciseMetricModal}>
                      {t('metricsPage.createExerciseMetric')}
                    </Button>
                    <Button size="xs" variant="light" leftSection={<IconPlus size={14} />} onClick={openExerciseModal} disabled={exerciseMetrics.length === 0}>
                      {t('common.add')}
                    </Button>
                  </Group>
                </Group>
                <ScrollArea h={600}>
                  <Stack gap="xs">
                    {exerciseMetrics.length === 0 ? (
                      <Card padding="md" withBorder>
                        <Stack gap="sm" align="center">
                          <Text size="sm" c="dimmed" ta="center">
                            {t('metricsPage.noExerciseMetrics')}
                          </Text>
                          <Button size="xs" variant="light" leftSection={<IconPlus size={14} />} onClick={openCreateExerciseMetricModal}>
                            {t('metricsPage.createFirstExerciseMetric')}
                          </Button>
                        </Stack>
                      </Card>
                    ) : (
                      exerciseMetrics.map((exercise) => {
                      const isSelected = exercise.id === selectedExerciseId
                      const summary = exerciseSummaries.find((s) => s.exercise.id === exercise.id)
                      const todayEntry = exerciseMetricEntries
                        .filter((entry) => entry.exerciseId === exercise.id)
                        .find((entry) => dayjs(entry.date).isSame(dayjs(), 'day'))
                      const entries = exerciseMetricEntries
                        .filter((entry) => entry.exerciseId === exercise.id)
                        .sort((a, b) => dayjs(a.date).diff(dayjs(b.date)))
                      const startValue = entries[0]
                      const goals = exerciseMetricGoals[exercise.id]
                      
                      return (
                        <UnstyledButton
                          key={exercise.id}
                          onClick={() => setSelectedExerciseId(exercise.id)}
                          style={{
                            padding: '12px',
                            borderRadius: '8px',
                            backgroundColor: isSelected ? 'var(--mantine-color-violet-0)' : 'transparent',
                            border: `1px solid ${isSelected ? 'var(--mantine-color-violet-3)' : 'var(--mantine-color-gray-2)'}`,
                            transition: 'all 0.2s',
                          }}
                        >
                          <Stack gap={4}>
                            <Group justify="space-between" align="flex-start">
                              <Group gap={4}>
                                <Text fw={600} size="sm">
                                  {exercise.label}
                                </Text>
                                {todayEntry && (
                                  <Badge size="xs" variant="dot" color="green">
                                    {t('metricsPage.today')}
                                  </Badge>
                                )}
                              </Group>
                              <Group gap="xs">
                                <div
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleOpenExerciseGoalModal(exercise.id)
                                  }}
                                  style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '20px', height: '20px' }}
                                >
                                  <IconTarget size={14} />
                                </div>
                                <Badge size="xs" variant="light">
                                  {exercise.muscleGroup}
                                </Badge>
                              </Group>
                            </Group>
                            <Text size="lg" fw={700} c={isSelected ? 'violet.7' : 'gray.9'}>
                              {summary?.latest ? `${summary.latest.weight.toFixed(2)} кг` : '— кг'}
                          </Text>
                            {startValue && (
                              <Text size="xs" c="dimmed">
                                {t('metricsPage.startValue')}: {startValue.weight.toFixed(2)} кг
                              </Text>
                            )}
                            {goals?.weight && (
                              <Badge variant="dot" size="xs" color="violet">
                                {t('metricsPage.goal')}: {goals.weight.toFixed(2)} кг
                              </Badge>
                            )}
                            {summary?.latest && (
                              <Group justify="space-between" align="center">
                                <Text size="xs" c="dimmed">
                                  {dayjs(summary.latest.date).format('D MMM YYYY')}
                                </Text>
                                <div
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    const today = new Date()
                                    if (todayEntry) {
                                      setExerciseForm({
                                        exerciseId: exercise.id,
                                        date: today,
                                        weight: todayEntry.weight,
                                        repetitions: todayEntry.repetitions,
                                        sets: todayEntry.sets,
                                      })
                                    } else if (summary.latest) {
                                      setExerciseForm({
                                        exerciseId: exercise.id,
                                        date: today,
                                        weight: summary.latest.weight,
                                        repetitions: summary.latest.repetitions,
                                        sets: summary.latest.sets,
                                      })
                                    } else {
                                      setExerciseForm({
                                        exerciseId: exercise.id,
                                        date: today,
                                        weight: 0,
                                        repetitions: 0,
                                        sets: 1,
                                      })
                                    }
                                    openExerciseModal()
                                  }}
                                  style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '20px', height: '20px' }}
                                >
                                  <IconPlus size={12} />
                                </div>
                              </Group>
                            )}
                            {summary && summary.change !== 0 && (
                              <Text size="xs" c={summary.change >= 0 ? 'green.7' : 'red.7'} fw={600}>
                                {summary.change > 0 ? '+' : ''}
                                {summary.change.toFixed(2)} кг
                              </Text>
                            )}
                          </Stack>
                        </UnstyledButton>
                      )
                    }))}
                  </Stack>
                </ScrollArea>
              </Stack>
            </Card>

            <Card withBorder style={{ flex: 1 }} padding="xl">
          <Stack gap="lg">
                {selectedExercise ? (
                  <>
                    <Group justify="space-between" align="center">
                      <Group>
                        <Title order={3}>{selectedExercise.label}</Title>
                        <Badge variant="light" size="lg">
                          {selectedExercise.muscleGroup}
                        </Badge>
                        {exerciseMetricGoals[selectedExercise.id]?.weight && (
                          <Badge variant="dot" color="violet">
                            {t('metricsPage.goal')}: {exerciseMetricGoals[selectedExercise.id]?.weight?.toFixed(2)} кг
                          </Badge>
                        )}
                        {exerciseMetricEntries
                          .filter((entry) => entry.exerciseId === selectedExercise.id)
                          .sort((a, b) => dayjs(a.date).diff(dayjs(b.date)))[0] && (
                          <Badge variant="light" color="gray">
                            {t('metricsPage.startValue')}: {exerciseMetricEntries
                              .filter((entry) => entry.exerciseId === selectedExercise.id)
                              .sort((a, b) => dayjs(a.date).diff(dayjs(b.date)))[0].weight.toFixed(2)} кг
                          </Badge>
                        )}
                      </Group>
                      <Group gap="xs">
                        <Button
                          variant="light"
                          size="xs"
                          leftSection={<IconTarget size={14} />}
                          onClick={() => handleOpenExerciseGoalModal(selectedExercise.id)}
                        >
                          {t('metricsPage.setGoal')}
                        </Button>
                        <Button
                          variant="light"
                          color="violet"
                          leftSection={<IconCalendarCheck size={16} />}
                          onClick={() => {
                            const today = new Date()
                            const existingEntry = exerciseMetricEntries
                              .filter((entry) => entry.exerciseId === selectedExercise.id)
                              .find((entry) => dayjs(entry.date).isSame(dayjs(today), 'day'))
                            
                            const summary = exerciseSummaries.find((s) => s.exercise.id === selectedExercise.id)
                            
                            if (existingEntry) {
                              setExerciseForm({
                                exerciseId: selectedExercise.id,
                                date: today,
                                weight: existingEntry.weight,
                                repetitions: existingEntry.repetitions,
                                sets: existingEntry.sets,
                              })
                            } else if (summary?.latest) {
                              setExerciseForm({
                                exerciseId: selectedExercise.id,
                                date: today,
                                weight: summary.latest.weight,
                                repetitions: summary.latest.repetitions,
                                sets: summary.latest.sets,
                              })
                            } else {
                              setExerciseForm({
                                exerciseId: selectedExercise.id,
                                date: today,
                                weight: 0,
                                repetitions: 0,
                                sets: 1,
                              })
                            }
                            openExerciseModal()
                          }}
                      >
                        {exerciseMetricEntries
                          .filter((entry) => entry.exerciseId === selectedExercise.id)
                          .find((entry) => dayjs(entry.date).isSame(dayjs(), 'day'))
                          ? t('metricsPage.updateToday')
                          : t('metricsPage.addToday')}
                      </Button>
                      </Group>
                    </Group>
                    {exerciseChartDisplayData.length > 0 ? (
                      <Stack gap="sm">
                        <Group justify="space-between">
                          <SegmentedControl
                            size="xs"
                            value={exerciseChartMode}
                            onChange={(value) => setExerciseChartMode(value as ExerciseChartMode)}
                            data={[
                              { label: t('metricsPage.exerciseChart.modes.reps'), value: 'reps' },
                              { label: t('metricsPage.exerciseChart.modes.weight'), value: 'weight' },
                              { label: t('metricsPage.exerciseChart.modes.volume'), value: 'volume' },
                            ]}
                          />
                        </Group>
                      <ResponsiveContainer width="100%" height={400}>
                        <LineChart data={exerciseChartDisplayData} margin={{ top: 10, right: 40, left: 0, bottom: 0 }}>
                          <defs>
                            <linearGradient id="exerciseValueGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#667eea" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="#667eea" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e9ecef" vertical={false} />
                          <XAxis
                            dataKey="date"
                            stroke="#6c757d"
                            style={{ fontSize: '12px', fontFamily: 'inherit' }}
                            tickLine={false}
                            axisLine={false}
                          />
                          <YAxis
                            stroke="#667eea"
                            style={{ fontSize: '12px', fontFamily: 'inherit' }}
                            tickLine={false}
                            axisLine={false}
                            width={70}
                            domain={exerciseChartDomain}
                            tickFormatter={(value) =>
                              value.toLocaleString(undefined, {
                                maximumFractionDigits: currentModeConfig.fractionDigits,
                              })
                            }
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'white',
                              border: 'none',
                              borderRadius: '12px',
                              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                              padding: '12px',
                              fontFamily: 'inherit',
                            }}
                            labelStyle={{
                              color: '#495057',
                              fontWeight: 600,
                              marginBottom: '8px',
                              fontSize: '13px',
                            }}
                            itemStyle={{
                              color: '#212529',
                              padding: '4px 0',
                              fontSize: '13px',
                            }}
                            formatter={(value: number) => [
                              `${value.toFixed(currentModeConfig.fractionDigits)} ${currentModeConfig.unit}`,
                              currentModeConfig.label,
                            ]}
                          />
                          <Line
                            type="monotone"
                            dataKey="value"
                            stroke="#667eea"
                            strokeWidth={3}
                            dot={{ r: 5, fill: '#667eea', strokeWidth: 2, stroke: 'white' }}
                            activeDot={{ r: 7, strokeWidth: 2, stroke: '#667eea', fill: 'white' }}
                            animationDuration={800}
                            animationEasing="ease-out"
                            name="value"
                          />
                          <Line
                            type="natural"
                            dataKey="value"
                            stroke="#667eea"
                            strokeOpacity={0}
                            fill="url(#exerciseValueGradient)"
                            dot={false}
                            legendType="none"
                          />
                          {exerciseChartMode === 'weight' && exerciseMetricGoals[selectedExercise.id]?.weight && (
                            <ReferenceLine
                              y={exerciseMetricGoals[selectedExercise.id]?.weight}
                              stroke="#7c3aed"
                              strokeWidth={2}
                              strokeDasharray="6 4"
                              strokeOpacity={0.7}
                              label={{
                                value: `${t('metricsPage.exerciseChart.goal.weight')}: ${exerciseMetricGoals[selectedExercise.id]?.weight?.toFixed(2)} ${currentModeConfig.unit}`,
                                position: 'insideTopRight',
                                fill: '#7c3aed',
                                fontSize: 11,
                                fontWeight: 600,
                                offset: 5,
                              }}
                            />
                          )}
                          {exerciseChartMode === 'reps' && exerciseMetricGoals[selectedExercise.id]?.repetitions && (
                            <ReferenceLine
                              y={exerciseMetricGoals[selectedExercise.id]?.repetitions ?? 0}
                              stroke="#7c3aed"
                              strokeWidth={2}
                              strokeDasharray="6 4"
                              strokeOpacity={0.7}
                              label={{
                                value: `${t('metricsPage.exerciseChart.goal.reps')}: ${exerciseMetricGoals[selectedExercise.id]?.repetitions} ${currentModeConfig.unit}`,
                                position: 'insideTopRight',
                                fill: '#7c3aed',
                                fontSize: 11,
                                fontWeight: 600,
                                offset: 5,
                              }}
                            />
                          )}
                          {exerciseChartDisplayData[0] && (
                            <ReferenceLine
                              y={exerciseChartDisplayData[0].value}
                              stroke="#94a3b8"
                              strokeWidth={1.5}
                              strokeDasharray="3 3"
                              strokeOpacity={0.5}
                            />
                          )}
                        </LineChart>
                      </ResponsiveContainer>
                      </Stack>
                    ) : (
                      <Stack gap="md" align="center" py="xl">
                        <Text c="dimmed" size="lg">
                          {t('metricsPage.noData')}
                    </Text>
                        <Button leftSection={<IconPlus size={16} />} onClick={openExerciseModal}>
                          {t('metricsPage.addValue')}
                        </Button>
                      </Stack>
                    )}
                  </>
                ) : (
                  <Text c="dimmed">{t('metricsPage.selectExercise')}</Text>
                )}
                  </Stack>
                </Card>
          </Group>
        </Tabs.Panel>
      </Tabs>

      <Modal opened={bodyModalOpened} onClose={closeBodyModal} title={t('metricsPage.addValue')} size="md">
        <Stack gap="md">
          <Card
            radius="lg"
            padding="md"
            withBorder={false}
            style={{
              background: 'linear-gradient(135deg, rgba(129, 140, 248, 0.95) 0%, rgba(168, 85, 247, 0.95) 100%)',
              color: 'white',
              boxShadow: '0 20px 50px rgba(18, 18, 43, 0.25)',
            }}
          >
            <Group gap="sm" align="flex-start">
              <ActionIcon size="lg" radius="xl" variant="white" color="dark">
                <IconScale size={20} />
              </ActionIcon>
              <Stack gap={2} style={{ color: 'white' }}>
                <Text fw={600}>{selectedMetricForModal?.label ?? t('metricsPage.metric')}</Text>
                <Text size="xs" c="white" style={{ opacity: 0.85 }}>
                  {t('metricsPage.addValue')}
                </Text>
              </Stack>
            </Group>
          </Card>
          <Select
            label={t('metricsPage.metric')}
            data={bodyMetrics.map((m) => ({ value: m.id, label: m.label }))}
            value={bodyForm.metricId}
            leftSection={<IconScale size={16} />}
            onChange={(value) => value && setBodyForm((state) => ({ ...state, metricId: value }))}
            required
          />
          <DateInput
            label={t('metricsPage.date')}
            value={bodyForm.recordedAt}
            onChange={(value) => setBodyForm((state) => ({ ...state, recordedAt: value }))}
            required
            leftSection={<IconCalendarCheck size={16} />}
            maxDate={new Date()}
          />
          {bodyForm.recordedAt && dayjs(bodyForm.recordedAt).isSame(dayjs(), 'day') && (
            <Badge variant="light" color="green" leftSection={<IconCalendarCheck size={12} />}>
              {t('metricsPage.today')}
            </Badge>
          )}
          <NumberInput
            label={t('metricsPage.value')}
            value={bodyForm.value}
            onChange={(value) => setBodyForm((state) => ({ ...state, value: Number(value) || 0 }))}
            min={0}
            step={0.1}
            required
            leftSection={<IconActivity size={16} />}
            suffix={` ${bodyMetrics.find((m) => m.id === bodyForm.metricId)?.unit ?? ''}`}
            placeholder={t('metricsPage.valuePlaceholder')}
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={closeBodyModal}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleAddBodyMetric} disabled={!bodyForm.metricId || !bodyForm.recordedAt || bodyForm.value <= 0}>
              {t('common.save')}
                </Button>
              </Group>
                        </Stack>
      </Modal>

      <Modal opened={exerciseModalOpened} onClose={closeExerciseModal} title={t('metricsPage.addExerciseValue')} size="md">
        <Stack gap="md">
          <Card
            radius="lg"
            padding="md"
            withBorder={false}
            style={{
              background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.95) 0%, rgba(147, 51, 234, 0.95) 100%)',
              color: 'white',
              boxShadow: '0 20px 50px rgba(18, 18, 43, 0.25)',
            }}
          >
            <Group gap="sm" align="flex-start">
              <ActionIcon size="lg" radius="xl" variant="white" color="dark">
                <IconActivity size={20} />
              </ActionIcon>
              <Stack gap={2} style={{ color: 'white' }}>
                <Text fw={600}>{selectedExerciseForModal?.label ?? t('metricsPage.exercise')}</Text>
                <Text size="xs" c="white" style={{ opacity: 0.85 }}>
                  {t('metricsPage.addExerciseValue')}
                            </Text>
                          </Stack>
            </Group>
          </Card>
          <Select
            label={t('metricsPage.exercise')}
            data={exerciseMetrics.map((e) => ({ value: e.id, label: e.label }))}
            value={exerciseForm.exerciseId}
            leftSection={<IconActivity size={16} />}
            onChange={(value) => value && setExerciseForm((state) => ({ ...state, exerciseId: value }))}
            required
          />
          <DateInput
            label={t('metricsPage.date')}
            value={exerciseForm.date}
            onChange={(value) => setExerciseForm((state) => ({ ...state, date: value }))}
            required
            leftSection={<IconCalendarCheck size={16} />}
            maxDate={new Date()}
          />
          {exerciseForm.date && dayjs(exerciseForm.date).isSame(dayjs(), 'day') && (
            <Badge variant="light" color="green" leftSection={<IconCalendarCheck size={12} />}>
              {t('metricsPage.today')}
            </Badge>
          )}
          <Group grow>
            <NumberInput
              label={t('metricsPage.weight')}
              value={exerciseForm.weight}
              onChange={(value) => setExerciseForm((state) => ({ ...state, weight: Number(value) || 0 }))}
              min={0}
              step={0.5}
              required
              leftSection={<IconActivity size={16} />}
              suffix=" кг"
              placeholder={t('metricsPage.weightPlaceholder')}
            />
            <NumberInput
              label={t('metricsPage.repetitions')}
              value={exerciseForm.repetitions}
              onChange={(value) => setExerciseForm((state) => ({ ...state, repetitions: Number(value) || 0 }))}
              min={0}
              required
              leftSection={<IconActivity size={16} />}
              placeholder={t('metricsPage.repetitionsPlaceholder')}
            />
          </Group>
          <NumberInput
            label={t('metricsPage.sets')}
            value={exerciseForm.sets}
            onChange={(value) => setExerciseForm((state) => ({ ...state, sets: Number(value) || 1 }))}
            min={1}
            required
            leftSection={<IconAdjustments size={16} />}
            placeholder={t('metricsPage.setsPlaceholder')}
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={closeExerciseModal}>
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleAddExerciseMetric}
              disabled={!exerciseForm.exerciseId || !exerciseForm.date || exerciseForm.weight <= 0 || exerciseForm.repetitions <= 0}
            >
              {t('common.save')}
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal opened={bulkModalOpened} onClose={closeBulkModal} title={t('metricsPage.bulkUpdate')} size="lg">
        <Stack gap="md">
          <Card
            radius="lg"
            padding="md"
            withBorder={false}
            style={{
              background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.95) 0%, rgba(59, 130, 246, 0.95) 100%)',
              color: 'white',
              boxShadow: '0 20px 50px rgba(18, 18, 43, 0.25)',
            }}
          >
            <Group gap="sm" align="flex-start">
              <ActionIcon size="lg" radius="xl" variant="white" color="dark">
                <IconAdjustments size={20} />
              </ActionIcon>
              <Stack gap={2} style={{ color: 'white' }}>
                <Text fw={600}>{t('metricsPage.bulkUpdate')}</Text>
                <Text size="xs" c="white" style={{ opacity: 0.85 }}>
                  {t('metricsPage.bulkUpdateDescription')}
                            </Text>
                          </Stack>
            </Group>
          </Card>
          <Text size="sm" c="dimmed">
            {t('metricsPage.bulkUpdateDescription')}
          </Text>
          <SimpleGrid cols={2}>
            {bodyMetrics.map((metric) => (
              <NumberInput
                key={metric.id}
                label={metric.label}
                placeholder={`${metric.unit}`}
                value={bulkForm[metric.id] || undefined}
                onChange={(value) =>
                  setBulkForm((state) => ({
                    ...state,
                    [metric.id]: Number(value) || 0,
                  }))
                }
                leftSection={<IconActivity size={16} />}
                rightSection={<Text size="xs" c="dimmed">{metric.unit}</Text>}
                min={0}
                step={0.1}
              />
            ))}
          </SimpleGrid>
          <Group justify="flex-end">
            <Button variant="default" onClick={closeBulkModal}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleBulkAdd}>{t('common.save')}</Button>
          </Group>
        </Stack>
      </Modal>

      <Modal opened={bodyGoalModalOpened} onClose={closeBodyGoalModal} title={t('metricsPage.setGoal')} size="md">
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            {goalMetricId && bodyMetrics.find((m) => m.id === goalMetricId)?.label}
          </Text>
          <NumberInput
            label={t('metricsPage.goal')}
            placeholder={t('metricsPage.goalPlaceholder')}
            value={goalValue}
            onChange={(value) => setGoalValue(typeof value === 'number' ? value : 0)}
            suffix={goalMetricId ? ` ${bodyMetrics.find((m) => m.id === goalMetricId)?.unit ?? ''}` : ''}
            min={0}
            step={goalMetricId === 'weight' || goalMetricId === 'muscleMass' ? 0.1 : goalMetricId === 'sleep' ? 0.5 : 1}
            decimalScale={goalMetricId === 'weight' || goalMetricId === 'muscleMass' || goalMetricId === 'sleep' ? 1 : 0}
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={closeBodyGoalModal}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleSaveBodyGoal}>{t('common.save')}</Button>
          </Group>
        </Stack>
      </Modal>

      <Modal opened={exerciseGoalModalOpened} onClose={closeExerciseGoalModal} title={t('metricsPage.setGoal')} size="md">
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            {goalExerciseId && exerciseMetrics.find((e) => e.id === goalExerciseId)?.label}
          </Text>
          <NumberInput
            label={t('metricsPage.goalWeight')}
            placeholder={t('metricsPage.goalPlaceholder')}
            value={goalWeight}
            onChange={(value) => setGoalWeight(typeof value === 'number' ? value : 0)}
            suffix=" кг"
            min={0}
            step={0.5}
            decimalScale={1}
          />
          <NumberInput
            label={t('metricsPage.goalRepetitions')}
            placeholder={t('metricsPage.goalPlaceholder')}
            value={goalRepetitions}
            onChange={(value) => setGoalRepetitions(typeof value === 'number' ? value : 0)}
            min={0}
            step={1}
            decimalScale={0}
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={closeExerciseGoalModal}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleSaveExerciseGoal}>{t('common.save')}</Button>
          </Group>
          </Stack>
      </Modal>

      <Modal opened={createBodyMetricModalOpened} onClose={closeCreateBodyMetricModal} title={t('metricsPage.createMetric')} size="md">
        <Stack gap="md">
          <TextInput
            label={t('metricsPage.metricLabel')}
            placeholder={t('metricsPage.metricLabelPlaceholder')}
            value={createBodyMetricForm.label}
            onChange={(e) => setCreateBodyMetricForm((state) => ({ ...state, label: e.target.value }))}
            required
          />
          <TextInput
            label={t('metricsPage.unit')}
            placeholder={t('metricsPage.unitPlaceholder')}
            value={createBodyMetricForm.unit}
            onChange={(e) => setCreateBodyMetricForm((state) => ({ ...state, unit: e.target.value }))}
            required
          />
          <NumberInput
            label={t('metricsPage.target')}
            placeholder={t('metricsPage.targetPlaceholder')}
            value={createBodyMetricForm.target}
            onChange={(value) => setCreateBodyMetricForm((state) => ({ ...state, target: typeof value === 'number' ? value : undefined }))}
            min={0}
            step={0.1}
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={closeCreateBodyMetricModal}>
              {t('common.cancel')}
            </Button>
            <Button
              onClick={async () => {
                if (createBodyMetricForm.label && createBodyMetricForm.unit) {
                  try {
                    await dispatch(
                      createBodyMetricApi({
                        label: createBodyMetricForm.label,
                        unit: createBodyMetricForm.unit,
                        target: createBodyMetricForm.target,
                      }),
                    ).unwrap()
                    notifications.show({
                      title: t('common.success'),
                      message: t('metricsPage.metricCreated'),
                      color: 'green',
                    })
                    closeCreateBodyMetricModal()
                    setCreateBodyMetricForm({ label: '', unit: '', target: undefined })
                  } catch (error: any) {
                    notifications.show({
                      title: t('common.error'),
                      message: error || t('metricsPage.error.createMetric'),
                      color: 'red',
                    })
                  }
                }
              }}
              disabled={!createBodyMetricForm.label || !createBodyMetricForm.unit}
            >
              {t('common.create')}
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal opened={createExerciseMetricModalOpened} onClose={closeCreateExerciseMetricModal} title={t('metricsPage.createExerciseMetric')} size="md">
        <Stack gap="md">
          <TextInput
            label={t('metricsPage.exerciseLabel')}
            placeholder={t('metricsPage.exerciseLabelPlaceholder')}
            value={createExerciseMetricForm.label}
            onChange={(e) => setCreateExerciseMetricForm((state) => ({ ...state, label: e.target.value }))}
            required
          />
          <TextInput
            label={t('metricsPage.muscleGroup')}
            placeholder={t('metricsPage.muscleGroupPlaceholder')}
            value={createExerciseMetricForm.muscle_group}
            onChange={(e) => setCreateExerciseMetricForm((state) => ({ ...state, muscle_group: e.target.value }))}
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={closeCreateExerciseMetricModal}>
              {t('common.cancel')}
            </Button>
            <Button
              onClick={async () => {
                if (createExerciseMetricForm.label) {
                  try {
                    await dispatch(
                      createExerciseMetricApi({
                        label: createExerciseMetricForm.label,
                        muscle_group: createExerciseMetricForm.muscle_group || undefined,
                      }),
                    ).unwrap()
                    notifications.show({
                      title: t('common.success'),
                      message: t('metricsPage.exerciseMetricCreated'),
                      color: 'green',
                    })
                    closeCreateExerciseMetricModal()
                    setCreateExerciseMetricForm({ label: '', muscle_group: '' })
                  } catch (error: any) {
                    notifications.show({
                      title: t('common.error'),
                      message: error || t('metricsPage.error.createExerciseMetric'),
                      color: 'red',
                    })
                  }
                }
              }}
              disabled={!createExerciseMetricForm.label}
            >
              {t('common.create')}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  )
}
