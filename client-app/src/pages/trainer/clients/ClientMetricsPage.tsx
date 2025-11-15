import {
    Badge,
    Card,
    Group,
    SegmentedControl,
    Select,
    Stack,
    Tabs,
    Text,
    Title,
    Breadcrumbs,
    Anchor,
    Button,
} from '@mantine/core'
import { useTranslation } from 'react-i18next'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAppSelector } from '@/shared/hooks/useAppSelector'
import { IconArrowLeft, IconChartBar } from '@tabler/icons-react'
import { useMemo, useState } from 'react'
import dayjs from 'dayjs'
import {
    AreaChart,
    Area,
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    ReferenceLine,
} from 'recharts'
import { setMetricsPeriod } from '@/app/store/slices/metricsSlice'
import { useAppDispatch } from '@/shared/hooks/useAppDispatch'

const periodSegments = [
    { label: '1w', value: '1w' },
    { label: '4w', value: '4w' },
    { label: '12w', value: '12w' },
    { label: 'All', value: 'all' },
]

export const ClientMetricsPage = () => {
    const { t } = useTranslation()
    const { clientId } = useParams<{ clientId: string }>()
    const navigate = useNavigate()
    const dispatch = useAppDispatch()
    const { clients } = useAppSelector((state) => state.clients)
    const { bodyMetrics, bodyMetricEntries, exerciseMetrics, exerciseMetricEntries, period, bodyMetricGoals, exerciseMetricGoals, bodyMetricStartValues } =
        useAppSelector((state) => state.metrics)

    const client = clients.find((c) => c.id === clientId)

    if (!client) {
        return (
            <Stack gap="md">
                <Button leftSection={<IconArrowLeft size={16} />} variant="subtle" onClick={() => navigate('/trainer/clients')}>
                    {t('common.back')}
                </Button>
                <Text>{t('trainer.clients.clientNotFound')}</Text>
            </Stack>
        )
    }

    const [selectedMetricId, setSelectedMetricId] = useState<string | null>(bodyMetrics[0]?.id ?? null)
    const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(exerciseMetrics[0]?.id ?? null)

    const selectedMetric = bodyMetrics.find((m) => m.id === selectedMetricId)
    const selectedExercise = exerciseMetrics.find((e) => e.id === selectedExerciseId)

    const filteredBodyEntries = useMemo(() => {
        if (!selectedMetricId) return []
        const entries = bodyMetricEntries.filter((entry) => entry.metricId === selectedMetricId)
        const now = dayjs()
        return entries.filter((entry) => {
            const entryDate = dayjs(entry.recordedAt)
            switch (period) {
                case '1w':
                    return entryDate.isAfter(now.subtract(1, 'week'))
                case '4w':
                    return entryDate.isAfter(now.subtract(4, 'weeks'))
                case '12w':
                    return entryDate.isAfter(now.subtract(12, 'weeks'))
                default:
                    return true
            }
        })
    }, [bodyMetricEntries, selectedMetricId, period])

    const filteredExerciseEntries = useMemo(() => {
        if (!selectedExerciseId) return []
        const entries = exerciseMetricEntries.filter((entry) => entry.exerciseId === selectedExerciseId)
        const now = dayjs()
        return entries.filter((entry) => {
            const entryDate = dayjs(entry.date)
            switch (period) {
                case '1w':
                    return entryDate.isAfter(now.subtract(1, 'week'))
                case '4w':
                    return entryDate.isAfter(now.subtract(4, 'weeks'))
                case '12w':
                    return entryDate.isAfter(now.subtract(12, 'weeks'))
                default:
                    return true
            }
        })
    }, [exerciseMetricEntries, selectedExerciseId, period])

    const bodyChartData = useMemo(() => {
        return filteredBodyEntries.map((entry) => ({
            date: dayjs(entry.recordedAt).format('D MMM'),
            value: entry.value,
        }))
    }, [filteredBodyEntries])

    const exerciseChartData = useMemo(() => {
        return filteredExerciseEntries.map((entry) => ({
            date: dayjs(entry.date).format('D MMM'),
            weight: entry.weight,
            repetitions: entry.repetitions,
        }))
    }, [filteredExerciseEntries])

    const latestBodyValue = filteredBodyEntries.length > 0 ? filteredBodyEntries[filteredBodyEntries.length - 1] : null
    const latestExerciseValue = filteredExerciseEntries.length > 0 ? filteredExerciseEntries[filteredExerciseEntries.length - 1] : null

    return (
        <Stack gap="lg">
            <Breadcrumbs>
                <Anchor component={Link} to="/trainer/clients">
                    {t('trainer.clients.title')}
                </Anchor>
                <Anchor component={Link} to={`/trainer/clients/${clientId}`}>
                    {client.fullName}
                </Anchor>
                <Text>{t('common.metrics')}</Text>
            </Breadcrumbs>

            <Group justify="space-between">
                <Title order={2}>
                    {t('common.metrics')} - {client.fullName}
                </Title>
            </Group>

            <Card withBorder padding="md">
                <Stack gap="md">
                    <Group justify="space-between">
                        <SegmentedControl
                            value={period}
                            onChange={(value) => dispatch(setMetricsPeriod(value as '1w' | '4w' | '12w' | 'all'))}
                            data={periodSegments.map((seg) => ({
                                label: t(`metricsPage.period.${seg.value}`),
                                value: seg.value,
                            }))}
                        />
                    </Group>

                    <Tabs defaultValue="body">
                        <Tabs.List>
                            <Tabs.Tab value="body" leftSection={<IconChartBar size={16} />}>
                                {t('metricsPage.bodyMetrics')}
                            </Tabs.Tab>
                            <Tabs.Tab value="exercise" leftSection={<IconChartBar size={16} />}>
                                {t('metricsPage.exerciseMetrics')}
                            </Tabs.Tab>
                        </Tabs.List>

                        <Tabs.Panel value="body" pt="md">
                            <Stack gap="md">
                                <Select
                                    label={t('metricsPage.selectMetric')}
                                    data={bodyMetrics.map((m) => ({ value: m.id, label: m.label }))}
                                    value={selectedMetricId}
                                    onChange={(value) => setSelectedMetricId(value)}
                                />
                                {selectedMetric && latestBodyValue && (
                                    <Card withBorder padding="md">
                                        <Stack gap="md">
                                            <Group justify="space-between">
                                                <Text fw={600} size="lg">
                                                    {selectedMetric.label}
                                                </Text>
                                                <Group gap="xs">
                                                    {bodyMetricStartValues[selectedMetric.id] !== undefined && (
                                                        <Badge variant="light" color="gray">
                                                            {t('metricsPage.startValue')}: {bodyMetricStartValues[selectedMetric.id].toFixed(2)} {selectedMetric.unit}
                                                        </Badge>
                                                    )}
                                                    {bodyMetricGoals[selectedMetric.id] !== undefined && (
                                                        <Badge variant="light" color="violet">
                                                            {t('metricsPage.goal')}: {bodyMetricGoals[selectedMetric.id].toFixed(2)} {selectedMetric.unit}
                                                        </Badge>
                                                    )}
                                                </Group>
                                            </Group>
                                            <Text size="xl" fw={700}>
                                                {latestBodyValue.value.toFixed(2)} {selectedMetric.unit}
                                            </Text>
                                            {bodyChartData.length > 0 && (
                                                <ResponsiveContainer width="100%" height={300}>
                                                    <AreaChart data={bodyChartData}>
                                                        <CartesianGrid strokeDasharray="3 3" />
                                                        <XAxis dataKey="date" />
                                                        <YAxis tickFormatter={(value) => value.toFixed(2)} />
                                                        <Tooltip />
                                                        <Area type="monotone" dataKey="value" stroke="#667eea" fill="#667eea" fillOpacity={0.3} />
                                                        {bodyMetricGoals[selectedMetric.id] !== undefined && (
                                                            <ReferenceLine
                                                                y={bodyMetricGoals[selectedMetric.id]}
                                                                stroke="#7c3aed"
                                                                strokeWidth={2}
                                                                strokeDasharray="6 4"
                                                                strokeOpacity={0.7}
                                                                label={{ value: `Цель: ${bodyMetricGoals[selectedMetric.id].toFixed(2)}`, position: 'insideTopRight' }}
                                                            />
                                                        )}
                                                    </AreaChart>
                                                </ResponsiveContainer>
                                            )}
                                        </Stack>
                                    </Card>
                                )}
                            </Stack>
                        </Tabs.Panel>

                        <Tabs.Panel value="exercise" pt="md">
                            <Stack gap="md">
                                <Select
                                    label={t('metricsPage.selectExercise')}
                                    data={exerciseMetrics.map((e) => ({ value: e.id, label: e.label }))}
                                    value={selectedExerciseId}
                                    onChange={(value) => setSelectedExerciseId(value)}
                                />
                                {selectedExercise && latestExerciseValue && (
                                    <Card withBorder padding="md">
                                        <Stack gap="md">
                                            <Group justify="space-between">
                                                <Text fw={600} size="lg">
                                                    {selectedExercise.label}
                                                </Text>
                                                {exerciseMetricGoals[selectedExercise.id] && (
                                                    <Badge variant="light" color="violet">
                                                        {t('metricsPage.goal')}: {exerciseMetricGoals[selectedExercise.id]?.weight?.toFixed(2)} кг /{' '}
                                                        {exerciseMetricGoals[selectedExercise.id]?.repetitions} {t('metricsPage.reps')}
                                                    </Badge>
                                                )}
                                            </Group>
                                            <Group>
                                                <Text size="lg" fw={600}>
                                                    {latestExerciseValue.weight.toFixed(2)} кг × {latestExerciseValue.repetitions} {t('metricsPage.reps')}
                                                </Text>
                                            </Group>
                                            {exerciseChartData.length > 0 && (
                                                <ResponsiveContainer width="100%" height={300}>
                                                    <LineChart data={exerciseChartData}>
                                                        <CartesianGrid strokeDasharray="3 3" />
                                                        <XAxis dataKey="date" />
                                                        <YAxis yAxisId="left" tickFormatter={(value) => value.toFixed(2)} />
                                                        <YAxis yAxisId="right" orientation="right" tickFormatter={(value) => value.toFixed(0)} />
                                                        <Tooltip />
                                                        <Legend />
                                                        <Line yAxisId="left" type="monotone" dataKey="weight" stroke="#667eea" name="Вес (кг)" />
                                                        <Line yAxisId="right" type="monotone" dataKey="repetitions" stroke="#f59e0b" strokeDasharray="5 5" name="Повторения" />
                                                    </LineChart>
                                                </ResponsiveContainer>
                                            )}
                                        </Stack>
                                    </Card>
                                )}
                            </Stack>
                        </Tabs.Panel>
                    </Tabs>
                </Stack>
            </Card>
        </Stack>
    )
}

