import { useState, useEffect } from 'react'
import {
    Stack, Title, Text, Card, Group, TextInput, Badge, Table,
    ScrollArea, Loader, Center, SimpleGrid, Select, ActionIcon, Tooltip
} from '@mantine/core'
import { IconSearch, IconBarbell, IconEye } from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'
import { apiClient } from '@/shared/api/client'

interface Exercise {
    id: string
    name: string
    description?: string
    muscle_groups?: string
    equipment?: string
    difficulty?: string
    visibility?: string
}

const DIFFICULTY_LABELS: Record<string, { label: string; color: string }> = {
    beginner: { label: 'Начальный', color: 'green' },
    intermediate: { label: 'Средний', color: 'orange' },
    advanced: { label: 'Продвинутый', color: 'red' },
}

/**
 * Библиотека клуба — общая библиотека упражнений.
 * Показывает все упражнения, доступные тренерам клуба.
 */
export const ClubLibraryPage = () => {
    const [exercises, setExercises] = useState<Exercise[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [muscleFilter, setMuscleFilter] = useState<string | null>(null)
    const [difficultyFilter, setDifficultyFilter] = useState<string | null>(null)

    useEffect(() => {
        apiClient.getExercises()
            .then((data: any[]) => setExercises(data))
            .catch(e => notifications.show({ title: 'Ошибка', message: e?.message, color: 'red' }))
            .finally(() => setLoading(false))
    }, [])

    const muscleGroups = Array.from(
        new Set(
            exercises
                .flatMap(e => (e.muscle_groups || '').split(',').map(m => m.trim()))
                .filter(Boolean)
        )
    ).sort()

    const filtered = exercises.filter(e => {
        const matchSearch = !search ||
            e.name.toLowerCase().includes(search.toLowerCase()) ||
            (e.description || '').toLowerCase().includes(search.toLowerCase())
        const matchMuscle = !muscleFilter ||
            (e.muscle_groups || '').toLowerCase().includes(muscleFilter.toLowerCase())
        const matchDiff = !difficultyFilter || e.difficulty === difficultyFilter
        return matchSearch && matchMuscle && matchDiff
    })

    const stats = {
        total: exercises.length,
        beginner: exercises.filter(e => e.difficulty === 'beginner').length,
        intermediate: exercises.filter(e => e.difficulty === 'intermediate').length,
        advanced: exercises.filter(e => e.difficulty === 'advanced').length,
    }

    return (
        <Stack gap="lg">
            <Group justify="space-between" align="flex-start">
                <Stack gap={2}>
                    <Title order={2}>Библиотека клуба</Title>
                    <Text c="dimmed" size="sm">
                        Общая библиотека упражнений, доступная всем тренерам клуба
                    </Text>
                </Stack>
                <Badge variant="light" color="violet" size="lg">
                    {filtered.length} из {stats.total} упражнений
                </Badge>
            </Group>

            {/* Stats */}
            <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="md">
                {[
                    { label: 'Всего упражнений', value: stats.total, color: 'violet' },
                    { label: 'Начальный', value: stats.beginner, color: 'green' },
                    { label: 'Средний', value: stats.intermediate, color: 'orange' },
                    { label: 'Продвинутый', value: stats.advanced, color: 'red' },
                ].map(s => (
                    <Card key={s.label} withBorder padding="md" style={{ borderLeft: `3px solid var(--mantine-color-${s.color}-5)` }}>
                        <Stack gap={2}>
                            <Text size="xl" fw={800}>{s.value}</Text>
                            <Text size="xs" c="dimmed">{s.label}</Text>
                        </Stack>
                    </Card>
                ))}
            </SimpleGrid>

            {/* Filters */}
            <Card withBorder padding="md">
                <Group gap="md">
                    <TextInput
                        placeholder="Поиск по названию или описанию..."
                        leftSection={<IconSearch size={16} />}
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        style={{ flex: 1, minWidth: 220 }}
                    />
                    <Select
                        placeholder="Группа мышц"
                        data={[
                            { value: '', label: 'Все группы' },
                            ...muscleGroups.map(m => ({ value: m, label: m }))
                        ]}
                        value={muscleFilter || ''}
                        onChange={v => setMuscleFilter(v || null)}
                        clearable
                        style={{ width: 180 }}
                    />
                    <Select
                        placeholder="Уровень"
                        data={[
                            { value: '', label: 'Все уровни' },
                            { value: 'beginner', label: 'Начальный' },
                            { value: 'intermediate', label: 'Средний' },
                            { value: 'advanced', label: 'Продвинутый' },
                        ]}
                        value={difficultyFilter || ''}
                        onChange={v => setDifficultyFilter(v || null)}
                        clearable
                        style={{ width: 160 }}
                    />
                </Group>
            </Card>

            {/* Exercise table */}
            <Card withBorder padding="md">
                {loading ? (
                    <Center py="xl">
                        <Loader />
                    </Center>
                ) : filtered.length === 0 ? (
                    <Stack align="center" py="xl" gap="xs">
                        <IconBarbell size={48} color="var(--mantine-color-gray-4)" />
                        <Text c="dimmed" fw={500}>Упражнений не найдено</Text>
                        <Text size="sm" c="dimmed">Попробуйте изменить параметры поиска</Text>
                    </Stack>
                ) : (
                    <ScrollArea>
                        <Table striped highlightOnHover miw={700}>
                            <Table.Thead>
                                <Table.Tr>
                                    <Table.Th>Упражнение</Table.Th>
                                    <Table.Th>Группы мышц</Table.Th>
                                    <Table.Th>Инвентарь</Table.Th>
                                    <Table.Th>Уровень</Table.Th>
                                    <Table.Th>Доступность</Table.Th>
                                </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                                {filtered.map(ex => {
                                    const diff = ex.difficulty ? DIFFICULTY_LABELS[ex.difficulty] : null
                                    return (
                                        <Table.Tr key={ex.id}>
                                            <Table.Td>
                                                <Stack gap={2}>
                                                    <Text fw={500} size="sm">{ex.name}</Text>
                                                    {ex.description && (
                                                        <Text size="xs" c="dimmed" lineClamp={1}>
                                                            {ex.description}
                                                        </Text>
                                                    )}
                                                </Stack>
                                            </Table.Td>
                                            <Table.Td>
                                                <Group gap={4} wrap="wrap">
                                                    {(ex.muscle_groups || '').split(',').filter(Boolean).map(m => (
                                                        <Badge key={m.trim()} size="xs" variant="light" color="violet">
                                                            {m.trim()}
                                                        </Badge>
                                                    ))}
                                                    {!ex.muscle_groups && <Text size="sm" c="dimmed">—</Text>}
                                                </Group>
                                            </Table.Td>
                                            <Table.Td>
                                                <Text size="sm" c="dimmed">{ex.equipment || '—'}</Text>
                                            </Table.Td>
                                            <Table.Td>
                                                {diff ? (
                                                    <Badge size="sm" color={diff.color} variant="light">
                                                        {diff.label}
                                                    </Badge>
                                                ) : (
                                                    <Text size="sm" c="dimmed">—</Text>
                                                )}
                                            </Table.Td>
                                            <Table.Td>
                                                <Badge
                                                    size="sm"
                                                    variant="light"
                                                    color={ex.visibility === 'all' ? 'blue' : ex.visibility === 'trainer' ? 'orange' : 'gray'}
                                                >
                                                    {ex.visibility === 'all' ? 'Все' : ex.visibility === 'trainer' ? 'Тренер' : ex.visibility || 'Все'}
                                                </Badge>
                                            </Table.Td>
                                        </Table.Tr>
                                    )
                                })}
                            </Table.Tbody>
                        </Table>
                    </ScrollArea>
                )}
            </Card>
        </Stack>
    )
}
