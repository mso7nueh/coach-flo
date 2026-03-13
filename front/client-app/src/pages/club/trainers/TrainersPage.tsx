import { useState, useEffect } from 'react'
import {
    Stack, Title, Group, Button, TextInput, Card, Table,
    Avatar, Text, Badge, ActionIcon, Menu, Modal, Loader, Center,
} from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { useNavigate } from 'react-router-dom'
import { IconPlus, IconSearch, IconDotsVertical, IconTrash, IconUser } from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'
import { apiClient } from '@/shared/api/client'

interface ClubTrainer {
    id: string
    full_name: string
    email: string
    phone?: string
    avatar?: string
    total_clients: number
    active_clients: number
    total_workouts: number
    completed_workouts: number
    total_revenue: number
}

export const TrainersPage = () => {
    const navigate = useNavigate()
    const [trainers, setTrainers] = useState<ClubTrainer[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [trainerCode, setTrainerCode] = useState('')
    const [adding, setAdding] = useState(false)
    const [addModalOpened, { open: openAdd, close: closeAdd }] = useDisclosure(false)

    const loadTrainers = async () => {
        try {
            const data = await apiClient.getClubTrainers()
            setTrainers(data)
        } catch (e: any) {
            // If club doesn't exist yet, ignore
            if (e?.status !== 404) {
                notifications.show({ title: 'Ошибка', message: e?.message, color: 'red' })
            }
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { loadTrainers() }, [])

    const handleAddTrainer = async () => {
        if (!trainerCode.trim()) return
        setAdding(true)
        try {
            await apiClient.addTrainerToClub(trainerCode.trim())
            notifications.show({ title: 'Успешно', message: 'Тренер добавлен в клуб', color: 'green' })
            setTrainerCode('')
            closeAdd()
            await loadTrainers()
        } catch (e: any) {
            notifications.show({ title: 'Ошибка', message: e?.message || 'Не удалось добавить тренера', color: 'red' })
        } finally {
            setAdding(false)
        }
    }

    const handleRemoveTrainer = async (id: string) => {
        if (!confirm('Убрать тренера из клуба?')) return
        try {
            await apiClient.removeTrainerFromClub(id)
            notifications.show({ title: 'Успешно', message: 'Тренер убран из клуба', color: 'green' })
            setTrainers(prev => prev.filter(t => t.id !== id))
        } catch (e: any) {
            notifications.show({ title: 'Ошибка', message: e?.message, color: 'red' })
        }
    }

    const getInitials = (name: string) =>
        name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)

    const filtered = trainers.filter(t =>
        t.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.email.toLowerCase().includes(searchQuery.toLowerCase())
    )

    if (loading) return <Center h={200}><Loader /></Center>

    return (
        <Stack gap="lg">
            <Group justify="space-between">
                <Title order={2}>Тренеры клуба</Title>
                <Button leftSection={<IconPlus size={18} />} onClick={openAdd}>
                    Добавить тренера
                </Button>
            </Group>

            <Card withBorder padding="md">
                <Stack gap="md">
                    <Group justify="space-between">
                        <TextInput
                            placeholder="Поиск тренера..."
                            leftSection={<IconSearch size={16} />}
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.currentTarget.value)}
                            style={{ flex: 1, maxWidth: 400 }}
                        />
                        <Text size="sm" c="dimmed">
                            Всего тренеров: {trainers.length}
                        </Text>
                    </Group>

                    <Table>
                        <Table.Thead>
                            <Table.Tr>
                                <Table.Th>Тренер</Table.Th>
                                <Table.Th>Клиенты</Table.Th>
                                <Table.Th>Тренировки</Table.Th>
                                <Table.Th>Посещаемость</Table.Th>
                                <Table.Th>Выручка</Table.Th>
                                <Table.Th />
                            </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                            {filtered.length === 0 ? (
                                <Table.Tr>
                                    <Table.Td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>
                                        <Text c="dimmed">
                                            {trainers.length === 0
                                                ? 'В клубе ещё нет тренеров. Добавьте первого!'
                                                : 'Тренеры не найдены'}
                                        </Text>
                                    </Table.Td>
                                </Table.Tr>
                            ) : filtered.map(trainer => {
                                const attendance = trainer.total_workouts > 0
                                    ? Math.round(trainer.completed_workouts / trainer.total_workouts * 100)
                                    : 0
                                return (
                                    <Table.Tr key={trainer.id}>
                                        <Table.Td>
                                            <Group gap="sm">
                                                <Avatar src={trainer.avatar} size="sm" color="violet">
                                                    {getInitials(trainer.full_name)}
                                                </Avatar>
                                                <Stack gap={0}>
                                                    <Text
                                                        fw={500}
                                                        style={{ cursor: 'pointer' }}
                                                        onClick={() => navigate(`/club/trainers/${trainer.id}`)}
                                                    >
                                                        {trainer.full_name}
                                                    </Text>
                                                    <Text size="xs" c="dimmed">{trainer.email}</Text>
                                                </Stack>
                                            </Group>
                                        </Table.Td>
                                        <Table.Td>
                                            <Group gap={4}>
                                                <Text size="sm">{trainer.active_clients}</Text>
                                                <Text size="xs" c="dimmed">/ {trainer.total_clients} всего</Text>
                                            </Group>
                                        </Table.Td>
                                        <Table.Td>
                                            <Text size="sm">{trainer.total_workouts}</Text>
                                        </Table.Td>
                                        <Table.Td>
                                            <Badge
                                                color={attendance >= 80 ? 'green' : attendance >= 60 ? 'yellow' : 'red'}
                                            >
                                                {attendance}%
                                            </Badge>
                                        </Table.Td>
                                        <Table.Td>
                                            <Text size="sm" fw={500}>
                                                {trainer.total_revenue.toLocaleString('ru')} ₽
                                            </Text>
                                        </Table.Td>
                                        <Table.Td>
                                            <Menu shadow="md" width={180}>
                                                <Menu.Target>
                                                    <ActionIcon variant="subtle">
                                                        <IconDotsVertical size={16} />
                                                    </ActionIcon>
                                                </Menu.Target>
                                                <Menu.Dropdown>
                                                    <Menu.Item
                                                        leftSection={<IconUser size={16} />}
                                                        onClick={() => navigate(`/club/trainers/${trainer.id}`)}
                                                    >
                                                        Карточка тренера
                                                    </Menu.Item>
                                                    <Menu.Divider />
                                                    <Menu.Item
                                                        color="red"
                                                        leftSection={<IconTrash size={16} />}
                                                        onClick={() => handleRemoveTrainer(trainer.id)}
                                                    >
                                                        Убрать из клуба
                                                    </Menu.Item>
                                                </Menu.Dropdown>
                                            </Menu>
                                        </Table.Td>
                                    </Table.Tr>
                                )
                            })}
                        </Table.Tbody>
                    </Table>
                </Stack>
            </Card>

            <Modal
                opened={addModalOpened}
                onClose={closeAdd}
                title="Добавить тренера"
                centered
            >
                <Stack gap="md">
                    <Text size="sm" c="dimmed">
                        Введите код подключения тренера (connection_code). Тренер может найти его в своём профиле.
                    </Text>
                    <TextInput
                        label="Код подключения"
                        placeholder="ABC12345"
                        value={trainerCode}
                        onChange={e => setTrainerCode(e.currentTarget.value.toUpperCase())}
                    />
                    <Button
                        fullWidth
                        onClick={handleAddTrainer}
                        loading={adding}
                        disabled={!trainerCode.trim()}
                    >
                        Добавить в клуб
                    </Button>
                </Stack>
            </Modal>
        </Stack>
    )
}
