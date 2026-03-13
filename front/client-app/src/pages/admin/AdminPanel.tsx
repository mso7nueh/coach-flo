import { useState } from 'react'
import {
    Stack, Title, Tabs, TextInput, Button, Card, Table, Badge,
    Group, Text, Modal, Select, PasswordInput, Loader, Center,
    ActionIcon, Tooltip, Divider, Alert, Paper,
} from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import {
    IconKey, IconBuilding, IconUsers, IconPlus, IconTrash,
    IconRefresh, IconAlertCircle, IconCheck,
} from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'
import { apiClient } from '@/shared/api/client'

interface AdminUser {
    id: string
    full_name: string
    email: string
    phone?: string
    role: string
    created_at: string
}

interface AdminClub {
    id: string
    name: string
    admin_id: string
    admin_name: string
    admin_email: string
    trainers_count: number
    connection_code?: string
    created_at: string
}

export const AdminPanel = () => {
    // ─── Auth ─────────────────────────────────────────────────────────────────
    const [secret, setSecret] = useState('')
    const [secretInput, setSecretInput] = useState('')
    const [unlocked, setUnlocked] = useState(false)
    const [unlocking, setUnlocking] = useState(false)

    const tryUnlock = async () => {
        setUnlocking(true)
        try {
            await apiClient.adminGetUsers(secretInput, { limit: 1 })
            setSecret(secretInput)
            setUnlocked(true)
        } catch {
            notifications.show({ title: 'Ошибка', message: 'Неверный ключ администратора', color: 'red' })
        } finally {
            setUnlocking(false)
        }
    }

    // ─── Users tab ────────────────────────────────────────────────────────────
    const [users, setUsers] = useState<AdminUser[]>([])
    const [usersTotal, setUsersTotal] = useState(0)
    const [usersLoading, setUsersLoading] = useState(false)
    const [userSearch, setUserSearch] = useState('')
    const [userRoleFilter, setUserRoleFilter] = useState<string | null>(null)

    const loadUsers = async () => {
        setUsersLoading(true)
        try {
            const data = await apiClient.adminGetUsers(secret, {
                search: userSearch || undefined,
                role: userRoleFilter || undefined,
                limit: 100,
            })
            setUsers(data.items)
            setUsersTotal(data.total)
        } catch (e: any) {
            notifications.show({ title: 'Ошибка', message: e?.message, color: 'red' })
        } finally {
            setUsersLoading(false)
        }
    }

    const handleChangeRole = async (userId: string, role: string) => {
        try {
            await apiClient.adminChangeUserRole(secret, userId, role)
            notifications.show({ title: 'Готово', message: 'Роль изменена', color: 'green' })
            loadUsers()
        } catch (e: any) {
            notifications.show({ title: 'Ошибка', message: e?.message, color: 'red' })
        }
    }

    // ─── Create club_admin modal ──────────────────────────────────────────────
    const [createAdminModal, { open: openCreateAdmin, close: closeCreateAdmin }] = useDisclosure(false)
    const [newAdminForm, setNewAdminForm] = useState({ full_name: '', email: '', password: '', phone: '', club_name: '' })
    const [creatingAdmin, setCreatingAdmin] = useState(false)

    const handleCreateAdmin = async () => {
        setCreatingAdmin(true)
        try {
            const result = await apiClient.adminCreateClubAdmin(secret, {
                full_name: newAdminForm.full_name,
                email: newAdminForm.email,
                password: newAdminForm.password,
                phone: newAdminForm.phone || undefined,
                club_name: newAdminForm.club_name || undefined,
            })
            notifications.show({
                title: 'Успешно',
                message: `Пользователь ${result.user.email} создан${result.club ? ` с клубом "${result.club.name}"` : ''}`,
                color: 'green',
            })
            closeCreateAdmin()
            setNewAdminForm({ full_name: '', email: '', password: '', phone: '', club_name: '' })
            loadUsers()
        } catch (e: any) {
            notifications.show({ title: 'Ошибка', message: e?.message, color: 'red' })
        } finally {
            setCreatingAdmin(false)
        }
    }

    // ─── Clubs tab ────────────────────────────────────────────────────────────
    const [clubs, setClubs] = useState<AdminClub[]>([])
    const [clubsLoading, setClubsLoading] = useState(false)
    const [clubSearch, setClubSearch] = useState('')

    const loadClubs = async () => {
        setClubsLoading(true)
        try {
            const data = await apiClient.adminGetClubs(secret, clubSearch || undefined)
            setClubs(data)
        } catch (e: any) {
            notifications.show({ title: 'Ошибка', message: e?.message, color: 'red' })
        } finally {
            setClubsLoading(false)
        }
    }

    const handleDeleteClub = async (clubId: string, name: string) => {
        if (!confirm(`Удалить клуб "${name}"? Все связи с тренерами будут удалены.`)) return
        try {
            await apiClient.adminDeleteClub(secret, clubId)
            notifications.show({ title: 'Удалено', message: `Клуб "${name}" удалён`, color: 'green' })
            loadClubs()
        } catch (e: any) {
            notifications.show({ title: 'Ошибка', message: e?.message, color: 'red' })
        }
    }

    // ─── Create club modal ────────────────────────────────────────────────────
    const [createClubModal, { open: openCreateClub, close: closeCreateClub }] = useDisclosure(false)
    const [newClubForm, setNewClubForm] = useState({ name: '', admin_email: '' })
    const [creatingClub, setCreatingClub] = useState(false)

    const handleCreateClub = async () => {
        setCreatingClub(true)
        try {
            const result = await apiClient.adminCreateClub(secret, newClubForm)
            notifications.show({
                title: 'Готово',
                message: `Клуб "${result.name}" создан, администратор: ${result.admin_email}`,
                color: 'green',
            })
            closeCreateClub()
            setNewClubForm({ name: '', admin_email: '' })
            loadClubs()
        } catch (e: any) {
            notifications.show({ title: 'Ошибка', message: e?.message, color: 'red' })
        } finally {
            setCreatingClub(false)
        }
    }

    const getRoleBadgeColor = (role: string) =>
        role === 'club_admin' ? 'violet' : role === 'trainer' ? 'blue' : 'gray'

    // ─── Lock screen ──────────────────────────────────────────────────────────
    if (!unlocked) {
        return (
            <Center h="80vh">
                <Paper withBorder p="xl" radius="md" style={{ width: 360 }}>
                    <Stack gap="md" align="center">
                        <IconKey size={40} color="var(--mantine-color-violet-5)" />
                        <Title order={3} ta="center">Панель администратора</Title>
                        <Text c="dimmed" size="sm" ta="center">
                            Введите секретный ключ для доступа к управлению клубами
                        </Text>
                        <PasswordInput
                            placeholder="Секретный ключ (ADMIN_SECRET)"
                            value={secretInput}
                            onChange={e => setSecretInput(e.currentTarget.value)}
                            style={{ width: '100%' }}
                            onKeyDown={e => e.key === 'Enter' && tryUnlock()}
                        />
                        <Button fullWidth onClick={tryUnlock} loading={unlocking} leftSection={<IconKey size={16} />}>
                            Войти
                        </Button>
                    </Stack>
                </Paper>
            </Center>
        )
    }

    // ─── Main panel ───────────────────────────────────────────────────────────
    return (
        <Stack gap="lg" p="md">
            <Group justify="space-between">
                <Title order={2}>Администрирование</Title>
                <Badge color="violet" size="lg" variant="light">Системный администратор</Badge>
            </Group>

            <Tabs defaultValue="clubs" onChange={v => { if (v === 'clubs') loadClubs(); if (v === 'users') loadUsers() }}>
                <Tabs.List>
                    <Tabs.Tab value="clubs" leftSection={<IconBuilding size={16} />}>
                        Клубы
                    </Tabs.Tab>
                    <Tabs.Tab value="users" leftSection={<IconUsers size={16} />}>
                        Пользователи
                    </Tabs.Tab>
                </Tabs.List>

                {/* ─── Клубы ─── */}
                <Tabs.Panel value="clubs" pt="md">
                    <Stack gap="md">
                        <Group justify="space-between">
                            <Group gap="sm">
                                <TextInput
                                    placeholder="Поиск по названию..."
                                    value={clubSearch}
                                    onChange={e => setClubSearch(e.currentTarget.value)}
                                    style={{ width: 280 }}
                                    onKeyDown={e => e.key === 'Enter' && loadClubs()}
                                />
                                <Tooltip label="Обновить">
                                    <ActionIcon variant="light" onClick={loadClubs} loading={clubsLoading}>
                                        <IconRefresh size={16} />
                                    </ActionIcon>
                                </Tooltip>
                            </Group>
                            <Button leftSection={<IconPlus size={16} />} onClick={openCreateClub}>
                                Создать клуб
                            </Button>
                        </Group>

                        {clubsLoading ? (
                            <Center h={120}><Loader /></Center>
                        ) : clubs.length === 0 ? (
                            <Alert icon={<IconAlertCircle size={16} />} color="gray">
                                Клубов нет. Нажмите «Создать клуб», чтобы добавить первый.
                            </Alert>
                        ) : (
                            <Card withBorder padding={0}>
                                <Table>
                                    <Table.Thead>
                                        <Table.Tr>
                                            <Table.Th>Клуб</Table.Th>
                                            <Table.Th>Администратор</Table.Th>
                                            <Table.Th>Тренеры</Table.Th>
                                            <Table.Th>Код</Table.Th>
                                            <Table.Th>Создан</Table.Th>
                                            <Table.Th />
                                        </Table.Tr>
                                    </Table.Thead>
                                    <Table.Tbody>
                                        {clubs.map(club => (
                                            <Table.Tr key={club.id}>
                                                <Table.Td><Text fw={500}>{club.name}</Text></Table.Td>
                                                <Table.Td>
                                                    <Stack gap={0}>
                                                        <Text size="sm">{club.admin_name}</Text>
                                                        <Text size="xs" c="dimmed">{club.admin_email}</Text>
                                                    </Stack>
                                                </Table.Td>
                                                <Table.Td>
                                                    <Badge variant="light">{club.trainers_count}</Badge>
                                                </Table.Td>
                                                <Table.Td>
                                                    <Text size="xs" ff="monospace" c="dimmed">{club.connection_code || '—'}</Text>
                                                </Table.Td>
                                                <Table.Td>
                                                    <Text size="xs" c="dimmed">{new Date(club.created_at).toLocaleDateString('ru')}</Text>
                                                </Table.Td>
                                                <Table.Td>
                                                    <Tooltip label="Удалить клуб">
                                                        <ActionIcon color="red" variant="subtle" onClick={() => handleDeleteClub(club.id, club.name)}>
                                                            <IconTrash size={16} />
                                                        </ActionIcon>
                                                    </Tooltip>
                                                </Table.Td>
                                            </Table.Tr>
                                        ))}
                                    </Table.Tbody>
                                </Table>
                            </Card>
                        )}
                    </Stack>
                </Tabs.Panel>

                {/* ─── Пользователи ─── */}
                <Tabs.Panel value="users" pt="md">
                    <Stack gap="md">
                        <Group justify="space-between">
                            <Group gap="sm">
                                <TextInput
                                    placeholder="Поиск по имени/email..."
                                    value={userSearch}
                                    onChange={e => setUserSearch(e.currentTarget.value)}
                                    style={{ width: 280 }}
                                    onKeyDown={e => e.key === 'Enter' && loadUsers()}
                                />
                                <Select
                                    placeholder="Роль"
                                    clearable
                                    value={userRoleFilter}
                                    onChange={setUserRoleFilter}
                                    data={[
                                        { value: 'client', label: 'Клиент' },
                                        { value: 'trainer', label: 'Тренер' },
                                        { value: 'club_admin', label: 'Администратор клуба' },
                                    ]}
                                    style={{ width: 200 }}
                                />
                                <Tooltip label="Обновить">
                                    <ActionIcon variant="light" onClick={loadUsers} loading={usersLoading}>
                                        <IconRefresh size={16} />
                                    </ActionIcon>
                                </Tooltip>
                            </Group>
                            <Group gap="sm">
                                <Text size="sm" c="dimmed">Всего: {usersTotal}</Text>
                                <Button leftSection={<IconPlus size={16} />} onClick={openCreateAdmin}>
                                    Создать club_admin
                                </Button>
                            </Group>
                        </Group>

                        {usersLoading ? (
                            <Center h={120}><Loader /></Center>
                        ) : users.length === 0 ? (
                            <Alert icon={<IconAlertCircle size={16} />} color="gray">
                                Загрузите список, нажав кнопку обновления.
                            </Alert>
                        ) : (
                            <Card withBorder padding={0}>
                                <Table>
                                    <Table.Thead>
                                        <Table.Tr>
                                            <Table.Th>Пользователь</Table.Th>
                                            <Table.Th>Телефон</Table.Th>
                                            <Table.Th>Роль</Table.Th>
                                            <Table.Th>Зарегистрирован</Table.Th>
                                            <Table.Th>Изменить роль</Table.Th>
                                        </Table.Tr>
                                    </Table.Thead>
                                    <Table.Tbody>
                                        {users.map(user => (
                                            <Table.Tr key={user.id}>
                                                <Table.Td>
                                                    <Stack gap={0}>
                                                        <Text size="sm" fw={500}>{user.full_name}</Text>
                                                        <Text size="xs" c="dimmed">{user.email}</Text>
                                                    </Stack>
                                                </Table.Td>
                                                <Table.Td>
                                                    <Text size="sm" c="dimmed">{user.phone || '—'}</Text>
                                                </Table.Td>
                                                <Table.Td>
                                                    <Badge color={getRoleBadgeColor(user.role)} variant="light">
                                                        {user.role}
                                                    </Badge>
                                                </Table.Td>
                                                <Table.Td>
                                                    <Text size="xs" c="dimmed">{new Date(user.created_at).toLocaleDateString('ru')}</Text>
                                                </Table.Td>
                                                <Table.Td>
                                                    <Select
                                                        size="xs"
                                                        value={user.role}
                                                        onChange={v => v && handleChangeRole(user.id, v)}
                                                        data={[
                                                            { value: 'client', label: 'client' },
                                                            { value: 'trainer', label: 'trainer' },
                                                            { value: 'club_admin', label: 'club_admin' },
                                                        ]}
                                                        style={{ width: 150 }}
                                                    />
                                                </Table.Td>
                                            </Table.Tr>
                                        ))}
                                    </Table.Tbody>
                                </Table>
                            </Card>
                        )}
                    </Stack>
                </Tabs.Panel>
            </Tabs>

            {/* ─── Modal: Создать администратора ─── */}
            <Modal opened={createAdminModal} onClose={closeCreateAdmin} title="Создать администратора клуба" centered size="md">
                <Stack gap="sm">
                    <Alert icon={<IconCheck size={16} />} color="violet" variant="light">
                        Создаётся пользователь с ролью <b>club_admin</b>. Необязательно: если указать название клуба, клуб создастся автоматически.
                    </Alert>
                    <TextInput label="Полное имя" required value={newAdminForm.full_name} onChange={e => setNewAdminForm(p => ({ ...p, full_name: e.target.value }))} />
                    <TextInput label="Email" required value={newAdminForm.email} onChange={e => setNewAdminForm(p => ({ ...p, email: e.target.value }))} />
                    <PasswordInput label="Пароль" required value={newAdminForm.password} onChange={e => setNewAdminForm(p => ({ ...p, password: e.target.value }))} />
                    <TextInput label="Телефон" value={newAdminForm.phone} onChange={e => setNewAdminForm(p => ({ ...p, phone: e.target.value }))} />
                    <Divider label="Опционально: создать клуб сразу" labelPosition="center" />
                    <TextInput label="Название клуба" placeholder="Оставьте пустым, если клуб нужен отдельно" value={newAdminForm.club_name} onChange={e => setNewAdminForm(p => ({ ...p, club_name: e.target.value }))} />
                    <Button fullWidth loading={creatingAdmin} onClick={handleCreateAdmin}
                        disabled={!newAdminForm.full_name || !newAdminForm.email || !newAdminForm.password}>
                        Создать
                    </Button>
                </Stack>
            </Modal>

            {/* ─── Modal: Создать клуб ─── */}
            <Modal opened={createClubModal} onClose={closeCreateClub} title="Создать клуб" centered>
                <Stack gap="sm">
                    <Text size="sm" c="dimmed">
                        Пользователь с указанным email получит роль <b>club_admin</b> и станет администратором клуба.
                    </Text>
                    <TextInput label="Название клуба" required value={newClubForm.name} onChange={e => setNewClubForm(p => ({ ...p, name: e.target.value }))} />
                    <TextInput label="Email администратора" required placeholder="существующий пользователь" value={newClubForm.admin_email} onChange={e => setNewClubForm(p => ({ ...p, admin_email: e.target.value }))} />
                    <Button fullWidth loading={creatingClub} onClick={handleCreateClub}
                        disabled={!newClubForm.name || !newClubForm.admin_email}>
                        Создать клуб
                    </Button>
                </Stack>
            </Modal>
        </Stack>
    )
}
