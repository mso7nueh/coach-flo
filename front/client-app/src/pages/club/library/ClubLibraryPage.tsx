import { useState, useEffect } from 'react'
import {
    Stack, Title, Text, Card, Group, TextInput, Badge, Table,
    ScrollArea, Loader, Center, SimpleGrid, Select, Tabs, Button,
    Modal, TextInput as MTextInput, Textarea, NumberInput, ActionIcon, Tooltip
} from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { useForm } from '@mantine/form'
import { IconSearch, IconBarbell, IconCalendar, IconRepeat, IconPlus, IconTrash, IconCopy } from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'
import { apiClient } from '@/shared/api/client'
import { useAppSelector } from '@/shared/hooks/useAppSelector'

interface Exercise {
    id: string
    name: string
    description?: string
    muscle_groups?: string
    equipment?: string
    difficulty?: string
}

interface ClubTemplate {
    id: string
    title: string
    description?: string
    level?: string
    goal?: string
    duration?: number
    muscle_groups?: string[]
    equipment?: string[]
    exercise_count: number
    created_at: string
}

interface ClubProgram {
    id: string
    title: string
    description?: string
    level?: string
    goal?: string
    duration_weeks?: number
    sessions_per_week?: number
    created_at: string
}

const DIFFICULTY_LABELS: Record<string, { label: string; color: string }> = {
    beginner: { label: 'Начальный', color: 'green' },
    intermediate: { label: 'Средний', color: 'orange' },
    advanced: { label: 'Продвинутый', color: 'red' },
}

const LEVEL_LABELS = DIFFICULTY_LABELS

const GOAL_LABELS: Record<string, string> = {
    weight_loss: 'Похудение',
    muscle_gain: 'Набор мышц',
    endurance: 'Выносливость',
    flexibility: 'Гибкость',
    general: 'Общая физподготовка',
}

export const ClubLibraryPage = () => {
    const role = useAppSelector((state) => state.user.role)
    const isAdmin = role === 'club_admin'

    // Exercises
    const [exercises, setExercises] = useState<Exercise[]>([])
    const [exLoading, setExLoading] = useState(true)
    const [exSearch, setExSearch] = useState('')
    const [exMuscle, setExMuscle] = useState<string | null>(null)
    const [exDiff, setExDiff] = useState<string | null>(null)

    // Templates
    const [templates, setTemplates] = useState<ClubTemplate[]>([])
    const [tplLoading, setTplLoading] = useState(true)
    const [tplSearch, setTplSearch] = useState('')
    const [createTplOpened, { open: openCreateTpl, close: closeCreateTpl }] = useDisclosure(false)
    const [deletingTpl, setDeletingTpl] = useState<string | null>(null)
    const [copyingTpl, setCopyingTpl] = useState<string | null>(null)

    // Programs
    const [programs, setPrograms] = useState<ClubProgram[]>([])
    const [progLoading, setProgLoading] = useState(true)
    const [progSearch, setProgSearch] = useState('')
    const [createProgOpened, { open: openCreateProg, close: closeCreateProg }] = useDisclosure(false)
    const [deletingProg, setDeletingProg] = useState<string | null>(null)

    const tplForm = useForm({
        initialValues: { title: '', description: '', level: '', goal: '', duration: undefined as number | undefined },
    })
    const progForm = useForm({
        initialValues: { title: '', description: '', level: '', goal: '', duration_weeks: undefined as number | undefined, sessions_per_week: undefined as number | undefined },
    })

    useEffect(() => {
        apiClient.getExercises()
            .then((d: any[]) => setExercises(d))
            .catch(() => {})
            .finally(() => setExLoading(false))

        apiClient.getClubTemplates()
            .then(setTemplates)
            .catch(() => {})
            .finally(() => setTplLoading(false))

        apiClient.getClubPrograms()
            .then(setPrograms)
            .catch(() => {})
            .finally(() => setProgLoading(false))
    }, [])

    // ── Exercises helpers ──
    const muscleGroups = Array.from(new Set(
        exercises.flatMap(e => (e.muscle_groups || '').split(',').map(m => m.trim())).filter(Boolean)
    )).sort()

    const filteredEx = exercises.filter(e => {
        const matchS = !exSearch || e.name.toLowerCase().includes(exSearch.toLowerCase())
        const matchM = !exMuscle || (e.muscle_groups || '').toLowerCase().includes(exMuscle.toLowerCase())
        const matchD = !exDiff || e.difficulty === exDiff
        return matchS && matchM && matchD
    })

    // ── Templates ──
    const filteredTpl = templates.filter(t =>
        !tplSearch || t.title.toLowerCase().includes(tplSearch.toLowerCase())
    )

    const handleCreateTpl = async (values: typeof tplForm.values) => {
        try {
            const created = await apiClient.createClubTemplate({
                title: values.title,
                description: values.description || undefined,
                level: values.level || undefined,
                goal: values.goal || undefined,
                duration: values.duration,
            })
            setTemplates(prev => [created, ...prev])
            notifications.show({ title: 'Создано', message: 'Шаблон добавлен в библиотеку клуба', color: 'green' })
            tplForm.reset()
            closeCreateTpl()
        } catch (e: any) {
            notifications.show({ title: 'Ошибка', message: e?.message, color: 'red' })
        }
    }

    const handleDeleteTpl = async (id: string) => {
        if (!confirm('Удалить шаблон?')) return
        setDeletingTpl(id)
        try {
            await apiClient.deleteClubTemplate(id)
            setTemplates(prev => prev.filter(t => t.id !== id))
            notifications.show({ title: 'Удалено', message: 'Шаблон удалён', color: 'green' })
        } catch (e: any) {
            notifications.show({ title: 'Ошибка', message: e?.message, color: 'red' })
        } finally { setDeletingTpl(null) }
    }

    const handleCopyTpl = async (id: string) => {
        setCopyingTpl(id)
        try {
            await apiClient.copyClubTemplate(id)
            notifications.show({ title: 'Скопировано', message: 'Шаблон скопирован в вашу личную библиотеку', color: 'green' })
        } catch (e: any) {
            notifications.show({ title: 'Ошибка', message: e?.message, color: 'red' })
        } finally { setCopyingTpl(null) }
    }

    // ── Programs ──
    const filteredProg = programs.filter(p =>
        !progSearch || p.title.toLowerCase().includes(progSearch.toLowerCase())
    )

    const handleCreateProg = async (values: typeof progForm.values) => {
        try {
            const created = await apiClient.createClubProgram({
                title: values.title,
                description: values.description || undefined,
                level: values.level || undefined,
                goal: values.goal || undefined,
                duration_weeks: values.duration_weeks,
                sessions_per_week: values.sessions_per_week,
            })
            setPrograms(prev => [created, ...prev])
            notifications.show({ title: 'Создано', message: 'Программа добавлена в библиотеку клуба', color: 'green' })
            progForm.reset()
            closeCreateProg()
        } catch (e: any) {
            notifications.show({ title: 'Ошибка', message: e?.message, color: 'red' })
        }
    }

    const handleDeleteProg = async (id: string) => {
        if (!confirm('Удалить программу?')) return
        setDeletingProg(id)
        try {
            await apiClient.deleteClubProgram(id)
            setPrograms(prev => prev.filter(p => p.id !== id))
            notifications.show({ title: 'Удалено', message: 'Программа удалена', color: 'green' })
        } catch (e: any) {
            notifications.show({ title: 'Ошибка', message: e?.message, color: 'red' })
        } finally { setDeletingProg(null) }
    }

    return (
        <Stack gap="lg">
            <Group justify="space-between" align="flex-start">
                <Stack gap={2}>
                    <Title order={2}>Библиотека клуба</Title>
                    <Text c="dimmed" size="sm">Единый ресурс упражнений, тренировок и программ для всех тренеров</Text>
                </Stack>
            </Group>

            <Tabs defaultValue="exercises">
                <Tabs.List>
                    <Tabs.Tab value="exercises" leftSection={<IconBarbell size={16} />}>
                        Упражнения <Badge ml={6} size="xs" variant="light">{exercises.length}</Badge>
                    </Tabs.Tab>
                    <Tabs.Tab value="templates" leftSection={<IconCalendar size={16} />}>
                        Тренировки <Badge ml={6} size="xs" variant="light">{templates.length}</Badge>
                    </Tabs.Tab>
                    <Tabs.Tab value="programs" leftSection={<IconRepeat size={16} />}>
                        Программы <Badge ml={6} size="xs" variant="light">{programs.length}</Badge>
                    </Tabs.Tab>
                </Tabs.List>

                {/* ── Exercises ── */}
                <Tabs.Panel value="exercises" pt="md">
                    <Stack gap="md">
                        <Card withBorder padding="md">
                            <Group gap="md">
                                <TextInput
                                    placeholder="Поиск по названию..."
                                    leftSection={<IconSearch size={16} />}
                                    value={exSearch}
                                    onChange={e => setExSearch(e.target.value)}
                                    style={{ flex: 1 }}
                                />
                                <Select
                                    placeholder="Группа мышц"
                                    data={[{ value: '', label: 'Все' }, ...muscleGroups.map(m => ({ value: m, label: m }))]}
                                    value={exMuscle || ''}
                                    onChange={v => setExMuscle(v || null)}
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
                                    value={exDiff || ''}
                                    onChange={v => setExDiff(v || null)}
                                    clearable
                                    style={{ width: 150 }}
                                />
                            </Group>
                        </Card>
                        <Card withBorder padding="md">
                            {exLoading ? <Center py="xl"><Loader /></Center> : filteredEx.length === 0 ? (
                                <Stack align="center" py="xl"><IconBarbell size={40} color="var(--mantine-color-gray-4)" /><Text c="dimmed">Не найдено</Text></Stack>
                            ) : (
                                <ScrollArea>
                                    <Table striped highlightOnHover miw={640}>
                                        <Table.Thead>
                                            <Table.Tr>
                                                <Table.Th>Упражнение</Table.Th>
                                                <Table.Th>Мышцы</Table.Th>
                                                <Table.Th>Инвентарь</Table.Th>
                                                <Table.Th>Уровень</Table.Th>
                                            </Table.Tr>
                                        </Table.Thead>
                                        <Table.Tbody>
                                            {filteredEx.slice(0, 100).map(ex => {
                                                const diff = ex.difficulty ? DIFFICULTY_LABELS[ex.difficulty] : null
                                                return (
                                                    <Table.Tr key={ex.id}>
                                                        <Table.Td>
                                                            <Text fw={500} size="sm">{ex.name}</Text>
                                                            {ex.description && <Text size="xs" c="dimmed" lineClamp={1}>{ex.description}</Text>}
                                                        </Table.Td>
                                                        <Table.Td>
                                                            <Group gap={4} wrap="wrap">
                                                                {(ex.muscle_groups || '').split(',').filter(Boolean).map(m => (
                                                                    <Badge key={m.trim()} size="xs" variant="light" color="violet">{m.trim()}</Badge>
                                                                ))}
                                                                {!ex.muscle_groups && <Text size="sm" c="dimmed">—</Text>}
                                                            </Group>
                                                        </Table.Td>
                                                        <Table.Td><Text size="sm" c="dimmed">{ex.equipment || '—'}</Text></Table.Td>
                                                        <Table.Td>
                                                            {diff ? <Badge size="sm" color={diff.color} variant="light">{diff.label}</Badge> : <Text size="sm" c="dimmed">—</Text>}
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
                </Tabs.Panel>

                {/* ── Templates ── */}
                <Tabs.Panel value="templates" pt="md">
                    <Stack gap="md">
                        <Group justify="space-between">
                            <TextInput
                                placeholder="Поиск по шаблонам..."
                                leftSection={<IconSearch size={16} />}
                                value={tplSearch}
                                onChange={e => setTplSearch(e.target.value)}
                                style={{ width: 280 }}
                            />
                            {isAdmin && (
                                <Button leftSection={<IconPlus size={16} />} onClick={openCreateTpl}>
                                    Создать шаблон
                                </Button>
                            )}
                        </Group>

                        {tplLoading ? <Center py="xl"><Loader /></Center> : filteredTpl.length === 0 ? (
                            <Card withBorder padding="xl">
                                <Stack align="center" py="xl" gap="xs">
                                    <IconCalendar size={48} color="var(--mantine-color-gray-4)" />
                                    <Text fw={500} c="dimmed">Шаблонов тренировок ещё нет</Text>
                                    {isAdmin && <Text size="sm" c="dimmed">Создайте первый шаблон для клуба</Text>}
                                    {!isAdmin && <Text size="sm" c="dimmed">Администратор клуба ещё не добавил шаблоны</Text>}
                                </Stack>
                            </Card>
                        ) : (
                            <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
                                {filteredTpl.map(tpl => {
                                    const lvl = tpl.level ? LEVEL_LABELS[tpl.level] : null
                                    return (
                                        <Card key={tpl.id} withBorder padding="md" style={{ position: 'relative' }}>
                                            <Stack gap="sm">
                                                <Group justify="space-between" align="flex-start">
                                                    <Text fw={600} lineClamp={1} style={{ flex: 1 }}>{tpl.title}</Text>
                                                    <Group gap={4}>
                                                        {!isAdmin && (
                                                            <Tooltip label="Скопировать в личную библиотеку">
                                                                <ActionIcon
                                                                    size="sm"
                                                                    variant="subtle"
                                                                    color="violet"
                                                                    loading={copyingTpl === tpl.id}
                                                                    onClick={() => handleCopyTpl(tpl.id)}
                                                                >
                                                                    <IconCopy size={14} />
                                                                </ActionIcon>
                                                            </Tooltip>
                                                        )}
                                                        {isAdmin && (
                                                            <ActionIcon
                                                                size="sm"
                                                                variant="subtle"
                                                                color="red"
                                                                loading={deletingTpl === tpl.id}
                                                                onClick={() => handleDeleteTpl(tpl.id)}
                                                            >
                                                                <IconTrash size={14} />
                                                            </ActionIcon>
                                                        )}
                                                    </Group>
                                                </Group>
                                                {tpl.description && <Text size="sm" c="dimmed" lineClamp={2}>{tpl.description}</Text>}
                                                <Group gap="xs" wrap="wrap">
                                                    <Badge size="sm" variant="light" color="blue">
                                                        {tpl.exercise_count} упр.
                                                    </Badge>
                                                    {tpl.duration && <Badge size="sm" variant="light" color="teal">{tpl.duration} мин</Badge>}
                                                    {lvl && <Badge size="sm" variant="light" color={lvl.color}>{lvl.label}</Badge>}
                                                    {tpl.goal && <Badge size="sm" variant="light" color="grape">{GOAL_LABELS[tpl.goal] || tpl.goal}</Badge>}
                                                </Group>
                                            </Stack>
                                        </Card>
                                    )
                                })}
                            </SimpleGrid>
                        )}
                    </Stack>
                </Tabs.Panel>

                {/* ── Programs ── */}
                <Tabs.Panel value="programs" pt="md">
                    <Stack gap="md">
                        <Group justify="space-between">
                            <TextInput
                                placeholder="Поиск программ..."
                                leftSection={<IconSearch size={16} />}
                                value={progSearch}
                                onChange={e => setProgSearch(e.target.value)}
                                style={{ width: 280 }}
                            />
                            {isAdmin && (
                                <Button leftSection={<IconPlus size={16} />} onClick={openCreateProg}>
                                    Создать программу
                                </Button>
                            )}
                        </Group>

                        {progLoading ? <Center py="xl"><Loader /></Center> : filteredProg.length === 0 ? (
                            <Card withBorder padding="xl">
                                <Stack align="center" py="xl" gap="xs">
                                    <IconRepeat size={48} color="var(--mantine-color-gray-4)" />
                                    <Text fw={500} c="dimmed">Программ ещё нет</Text>
                                    {isAdmin && <Text size="sm" c="dimmed">Создайте первую программу для клуба</Text>}
                                    {!isAdmin && <Text size="sm" c="dimmed">Администратор клуба ещё не добавил программы</Text>}
                                </Stack>
                            </Card>
                        ) : (
                            <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
                                {filteredProg.map(prog => {
                                    const lvl = prog.level ? LEVEL_LABELS[prog.level] : null
                                    return (
                                        <Card key={prog.id} withBorder padding="md">
                                            <Stack gap="sm">
                                                <Group justify="space-between" align="flex-start">
                                                    <Text fw={600} lineClamp={1} style={{ flex: 1 }}>{prog.title}</Text>
                                                    {isAdmin && (
                                                        <ActionIcon
                                                            size="sm"
                                                            variant="subtle"
                                                            color="red"
                                                            loading={deletingProg === prog.id}
                                                            onClick={() => handleDeleteProg(prog.id)}
                                                        >
                                                            <IconTrash size={14} />
                                                        </ActionIcon>
                                                    )}
                                                </Group>
                                                {prog.description && <Text size="sm" c="dimmed" lineClamp={2}>{prog.description}</Text>}
                                                <Group gap="xs" wrap="wrap">
                                                    {prog.duration_weeks && <Badge size="sm" variant="light" color="blue">{prog.duration_weeks} нед.</Badge>}
                                                    {prog.sessions_per_week && <Badge size="sm" variant="light" color="teal">{prog.sessions_per_week}×/нед</Badge>}
                                                    {lvl && <Badge size="sm" variant="light" color={lvl.color}>{lvl.label}</Badge>}
                                                    {prog.goal && <Badge size="sm" variant="light" color="grape">{GOAL_LABELS[prog.goal] || prog.goal}</Badge>}
                                                </Group>
                                            </Stack>
                                        </Card>
                                    )
                                })}
                            </SimpleGrid>
                        )}
                    </Stack>
                </Tabs.Panel>
            </Tabs>

            {/* Create Template Modal */}
            <Modal opened={createTplOpened} onClose={closeCreateTpl} title="Создать шаблон тренировки" size="md">
                <form onSubmit={tplForm.onSubmit(handleCreateTpl)}>
                    <Stack gap="md">
                        <MTextInput label="Название" placeholder="Силовая для верха" required {...tplForm.getInputProps('title')} />
                        <Textarea label="Описание" placeholder="Краткое описание тренировки" {...tplForm.getInputProps('description')} />
                        <Group grow>
                            <Select
                                label="Уровень"
                                data={[
                                    { value: 'beginner', label: 'Начальный' },
                                    { value: 'intermediate', label: 'Средний' },
                                    { value: 'advanced', label: 'Продвинутый' },
                                ]}
                                clearable
                                {...tplForm.getInputProps('level')}
                            />
                            <Select
                                label="Цель"
                                data={Object.entries(GOAL_LABELS).map(([v, l]) => ({ value: v, label: l }))}
                                clearable
                                {...tplForm.getInputProps('goal')}
                            />
                        </Group>
                        <NumberInput label="Длительность (мин)" min={1} {...tplForm.getInputProps('duration')} />
                        <Group justify="flex-end" mt="sm">
                            <Button variant="subtle" onClick={closeCreateTpl}>Отмена</Button>
                            <Button type="submit">Создать</Button>
                        </Group>
                    </Stack>
                </form>
            </Modal>

            {/* Create Program Modal */}
            <Modal opened={createProgOpened} onClose={closeCreateProg} title="Создать программу тренировок" size="md">
                <form onSubmit={progForm.onSubmit(handleCreateProg)}>
                    <Stack gap="md">
                        <MTextInput label="Название" placeholder="12-недельный старт" required {...progForm.getInputProps('title')} />
                        <Textarea label="Описание" placeholder="Для кого программа, что даёт" {...progForm.getInputProps('description')} />
                        <Group grow>
                            <Select
                                label="Уровень"
                                data={[
                                    { value: 'beginner', label: 'Начальный' },
                                    { value: 'intermediate', label: 'Средний' },
                                    { value: 'advanced', label: 'Продвинутый' },
                                ]}
                                clearable
                                {...progForm.getInputProps('level')}
                            />
                            <Select
                                label="Цель"
                                data={Object.entries(GOAL_LABELS).map(([v, l]) => ({ value: v, label: l }))}
                                clearable
                                {...progForm.getInputProps('goal')}
                            />
                        </Group>
                        <Group grow>
                            <NumberInput label="Длительность (нед.)" min={1} {...progForm.getInputProps('duration_weeks')} />
                            <NumberInput label="Занятий в неделю" min={1} max={14} {...progForm.getInputProps('sessions_per_week')} />
                        </Group>
                        <Group justify="flex-end" mt="sm">
                            <Button variant="subtle" onClick={closeCreateProg}>Отмена</Button>
                            <Button type="submit">Создать</Button>
                        </Group>
                    </Stack>
                </form>
            </Modal>
        </Stack>
    )
}
