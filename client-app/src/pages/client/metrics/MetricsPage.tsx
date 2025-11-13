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
  Title,
  UnstyledButton,
} from '@mantine/core'
import { DateInput } from '@mantine/dates'
import { IconPlus, IconCalendarCheck } from '@tabler/icons-react'
import { useMemo, useState } from 'react'
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
    Legend,
    ResponsiveContainer,
    ReferenceLine,
} from 'recharts'
import { useAppSelector } from '@/shared/hooks/useAppSelector'
import { useAppDispatch } from '@/shared/hooks/useAppDispatch'
import {
  setMetricsPeriod,
  addBodyMetricEntry,
  addExerciseEntry,
  type BodyMetricDescriptor,
  type ExerciseMetricDescriptor,
} from '@/app/store/slices/metricsSlice'
import { useDisclosure } from '@mantine/hooks'

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

export const MetricsPage = () => {
  const { t } = useTranslation()
  const dispatch = useAppDispatch()
  const { bodyMetrics, bodyMetricEntries, exerciseMetrics, exerciseMetricEntries, period } = useAppSelector(
    (state) => state.metrics,
  )
  const role = useAppSelector((state) => state.user.role)
  const [selectedMetricId, setSelectedMetricId] = useState<string | null>(bodyMetrics[0]?.id ?? null)
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(exerciseMetrics[0]?.id ?? null)
  const [bodyModalOpened, { open: openBodyModal, close: closeBodyModal }] = useDisclosure(false)
  const [exerciseModalOpened, { open: openExerciseModal, close: closeExerciseModal }] = useDisclosure(false)
  const [bulkModalOpened, { open: openBulkModal, close: closeBulkModal }] = useDisclosure(false)
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

  const getFilteredEntries = (metricId: string, entries: typeof bodyMetricEntries) => {
    const filtered = entries.filter((entry) => entry.metricId === metricId).sort((a, b) => dayjs(a.recordedAt).diff(dayjs(b.recordedAt)))
    const daysAgo = period === '1w' ? 7 : period === '4w' ? 28 : period === '12w' ? 84 : Infinity
    if (daysAgo === Infinity) {
      return filtered
    }
    const cutoff = dayjs().subtract(daysAgo, 'day')
    return filtered.filter((entry) => dayjs(entry.recordedAt).isAfter(cutoff))
  }

  const selectedMetric = useMemo(() => bodyMetrics.find((m) => m.id === selectedMetricId) ?? null, [bodyMetrics, selectedMetricId])

  const chartData = useMemo(() => {
    if (!selectedMetric) return []
    const entries = getFilteredEntries(selectedMetric.id, bodyMetricEntries)
    return entries.map((entry) => ({
      date: dayjs(entry.recordedAt).format('D MMM'),
      value: entry.value,
      fullDate: entry.recordedAt,
    }))
  }, [selectedMetric, bodyMetricEntries, period])

  const selectedExercise = useMemo(() => exerciseMetrics.find((e) => e.id === selectedExerciseId) ?? null, [exerciseMetrics, selectedExerciseId])

  const exerciseChartData = useMemo(() => {
    if (!selectedExercise) return []
    const filtered = exerciseMetricEntries
      .filter((entry) => entry.exerciseId === selectedExercise.id)
      .sort((a, b) => dayjs(a.date).diff(dayjs(b.date)))
    const daysAgo = period === '1w' ? 7 : period === '4w' ? 28 : period === '12w' ? 84 : Infinity
    if (daysAgo !== Infinity) {
      const cutoff = dayjs().subtract(daysAgo, 'day')
      return filtered.filter((entry) => dayjs(entry.date).isAfter(cutoff))
    }
    return filtered.map((entry) => ({
      date: dayjs(entry.date).format('D MMM'),
      weight: entry.weight,
      repetitions: entry.repetitions,
      sets: entry.sets,
      fullDate: entry.date,
    }))
  }, [selectedExercise, exerciseMetricEntries, period])

  const latestBodyValues = useMemo(() => {
    return bodyMetrics.map((metric) => {
      const entries = bodyMetricEntries
        .filter((entry) => entry.metricId === metric.id)
        .sort((a, b) => dayjs(b.recordedAt).diff(dayjs(a.recordedAt)))
      return {
        metric,
        latest: entries[0],
        history: entries.slice(0, 6),
      }
    })
  }, [bodyMetrics, bodyMetricEntries])

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

  const handleAddBodyMetric = () => {
    if (bodyForm.metricId && bodyForm.recordedAt && bodyForm.value > 0) {
      const metric = bodyMetrics.find((m) => m.id === bodyForm.metricId)
      if (metric) {
        dispatch(
          addBodyMetricEntry({
            metricId: bodyForm.metricId,
            value: bodyForm.value,
            unit: metric.unit,
            recordedAt: bodyForm.recordedAt.toISOString(),
          }),
        )
        closeBodyModal()
        setBodyForm({
          metricId: bodyMetrics[0]?.id ?? '',
          value: 0,
          recordedAt: new Date(),
        })
      }
    }
  }

  const handleAddExerciseMetric = () => {
    if (exerciseForm.exerciseId && exerciseForm.date && exerciseForm.weight > 0 && exerciseForm.repetitions > 0) {
      dispatch(
        addExerciseEntry({
          exerciseId: exerciseForm.exerciseId,
          date: exerciseForm.date.toISOString(),
          weight: exerciseForm.weight,
          repetitions: exerciseForm.repetitions,
          sets: exerciseForm.sets,
        }),
      )
      closeExerciseModal()
      setExerciseForm({
        exerciseId: exerciseMetrics[0]?.id ?? '',
        date: new Date(),
        weight: 0,
        repetitions: 0,
        sets: 1,
      })
    }
  }

  const handleBulkAdd = () => {
    const today = new Date()
    Object.entries(bulkForm).forEach(([metricId, value]) => {
      if (value > 0) {
        const metric = bodyMetrics.find((m) => m.id === metricId)
        if (metric) {
          dispatch(
            addBodyMetricEntry({
              metricId,
              value,
              unit: metric.unit,
              recordedAt: today.toISOString(),
            }),
          )
        }
      }
    })
    setBulkForm({})
    closeBulkModal()
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
                  <Button size="xs" variant="light" leftSection={<IconPlus size={14} />} onClick={openBodyModal}>
                    {t('common.add')}
                  </Button>
                </Group>
                <ScrollArea h={600}>
                  <Stack gap="xs">
                    {bodyMetrics.map((metric) => {
                      const isSelected = metric.id === selectedMetricId
                      const latest = latestBodyValues.find((v) => v.metric.id === metric.id)?.latest
                      return (
                        <UnstyledButton
                          key={metric.id}
                          onClick={() => setSelectedMetricId(metric.id)}
                          style={{
                            padding: '12px',
                            borderRadius: '8px',
                            backgroundColor: isSelected ? 'var(--mantine-color-violet-0)' : 'transparent',
                            border: `1px solid ${isSelected ? 'var(--mantine-color-violet-3)' : 'var(--mantine-color-gray-2)'}`,
                            transition: 'all 0.2s',
                          }}
                        >
                          <Stack gap={4}>
                            <Group justify="space-between">
                              <Text fw={600} size="sm">
                                {metric.label}
                              </Text>
                              {metric.latestChange !== undefined && (
                                <Badge
                                  size="xs"
                                  variant={metric.latestChange >= 0 ? 'light' : 'filled'}
                                  color={metric.latestChange >= 0 ? 'green' : 'red'}
                                >
                                  {metric.latestChange > 0 ? '+' : ''}
                                  {metric.latestChange} {metric.unit}
                                </Badge>
                              )}
                            </Group>
                            <Text size="lg" fw={700} c={isSelected ? 'violet.7' : 'gray.9'}>
                              {latest ? `${latest.value.toFixed(2)} ${metric.unit}` : `— ${metric.unit}`}
                            </Text>
                            {latest && (
                              <Text size="xs" c="dimmed">
                                {dayjs(latest.recordedAt).format('D MMM YYYY')}
                              </Text>
                            )}
                          </Stack>
                        </UnstyledButton>
                      )
                    })}
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
                      </Group>
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
                    {chartData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={400}>
                        <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
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
                          {selectedMetric.target && (
                            <ReferenceLine
                              y={selectedMetric.target}
                              stroke="#22c55e"
                              strokeDasharray="5 5"
                              label={{ value: `Цель: ${selectedMetric.target}`, position: 'right', fill: '#22c55e' }}
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
                  <Button size="xs" variant="light" leftSection={<IconPlus size={14} />} onClick={openExerciseModal}>
                    {t('common.add')}
                  </Button>
                </Group>
                <ScrollArea h={600}>
                  <Stack gap="xs">
                    {exerciseMetrics.map((exercise) => {
                      const isSelected = exercise.id === selectedExerciseId
                      const summary = exerciseSummaries.find((s) => s.exercise.id === exercise.id)
                      const todayEntry = exerciseMetricEntries
                        .filter((entry) => entry.exerciseId === exercise.id)
                        .find((entry) => dayjs(entry.date).isSame(dayjs(), 'day'))
                      
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
                              <Badge size="xs" variant="light">
                                {exercise.muscleGroup}
                              </Badge>
                            </Group>
                            <Text size="lg" fw={700} c={isSelected ? 'violet.7' : 'gray.9'}>
                              {summary?.latest ? `${summary.latest.weight.toFixed(2)} кг` : '— кг'}
                            </Text>
                            {summary?.latest && (
                              <Group justify="space-between" align="center">
                                <Text size="xs" c="dimmed">
                                  {dayjs(summary.latest.date).format('D MMM YYYY')}
                                </Text>
                                <ActionIcon
                                  size="xs"
                                  variant="light"
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
                                >
                                  <IconPlus size={12} />
                                </ActionIcon>
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
                    })}
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
                      </Group>
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
                    {exerciseChartData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={400}>
                        <LineChart data={exerciseChartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorWeight" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#667eea" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="#667eea" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="colorReps" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#f093fb" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="#f093fb" stopOpacity={0} />
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
                            yAxisId="left"
                            stroke="#667eea"
                            style={{ fontSize: '12px', fontFamily: 'inherit' }}
                            tickLine={false}
                            axisLine={false}
                            width={60}
                          />
                          <YAxis
                            yAxisId="right"
                            orientation="right"
                            stroke="#f093fb"
                            style={{ fontSize: '12px', fontFamily: 'inherit' }}
                            tickLine={false}
                            axisLine={false}
                            width={60}
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
                            formatter={(value: number, name: string) => {
                              if (name === 'weight') return [`${value.toFixed(2)} кг`, 'Вес']
                              if (name === 'repetitions') return [`${value}`, 'Повторения']
                              if (name === 'sets') return [`${value}`, 'Подходы']
                              return value
                            }}
                          />
                          <Legend
                            wrapperStyle={{ paddingTop: '20px', fontFamily: 'inherit', fontSize: '13px' }}
                            iconType="line"
                            formatter={(value) => {
                              if (value === 'weight') return 'Вес (кг)'
                              if (value === 'repetitions') return 'Повторения'
                              if (value === 'sets') return 'Подходы'
                              return value
                            }}
                          />
                          <Area
                            yAxisId="left"
                            type="monotone"
                            dataKey="weight"
                            stroke="#667eea"
                            strokeWidth={3}
                            fill="url(#colorWeight)"
                            dot={{ r: 5, fill: '#667eea', strokeWidth: 2, stroke: 'white' }}
                            activeDot={{ r: 7, strokeWidth: 2, stroke: '#667eea', fill: 'white' }}
                            animationDuration={800}
                            animationEasing="ease-out"
                            name="weight"
                          />
                          <Line
                            yAxisId="right"
                            type="monotone"
                            dataKey="repetitions"
                            stroke="#f093fb"
                            strokeWidth={3}
                            dot={{ r: 5, fill: '#f093fb', strokeWidth: 2, stroke: 'white' }}
                            activeDot={{ r: 7, strokeWidth: 2, stroke: '#f093fb', fill: 'white' }}
                            strokeDasharray="5 5"
                            animationDuration={800}
                            animationEasing="ease-out"
                            name="repetitions"
                          />
                        </LineChart>
                      </ResponsiveContainer>
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
          <Select
            label={t('metricsPage.metric')}
            data={bodyMetrics.map((m) => ({ value: m.id, label: m.label }))}
            value={bodyForm.metricId}
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
          <Select
            label={t('metricsPage.exercise')}
            data={exerciseMetrics.map((e) => ({ value: e.id, label: e.label }))}
            value={exerciseForm.exerciseId}
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
              suffix=" кг"
              placeholder={t('metricsPage.weightPlaceholder')}
            />
            <NumberInput
              label={t('metricsPage.repetitions')}
              value={exerciseForm.repetitions}
              onChange={(value) => setExerciseForm((state) => ({ ...state, repetitions: Number(value) || 0 }))}
              min={0}
              required
              placeholder={t('metricsPage.repetitionsPlaceholder')}
            />
          </Group>
          <NumberInput
            label={t('metricsPage.sets')}
            value={exerciseForm.sets}
            onChange={(value) => setExerciseForm((state) => ({ ...state, sets: Number(value) || 1 }))}
            min={1}
            required
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
    </Stack>
  )
}
