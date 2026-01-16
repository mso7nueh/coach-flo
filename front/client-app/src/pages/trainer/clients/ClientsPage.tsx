import {
    ActionIcon,
    Avatar,
    Badge,
    Button,
    Card,
    Group,
    Menu,
    Modal,
    Stack,
    Table,
    Text,
    TextInput,
    Title,
    NumberInput,
    Radio,
    PasswordInput,
} from '@mantine/core'
import { DateInput } from '@mantine/dates'
import { useTranslation } from 'react-i18next'
import { useAppDispatch } from '@/shared/hooks/useAppDispatch'
import { useAppSelector } from '@/shared/hooks/useAppSelector'
import {
    setClients,
    addClient,
    removeClient,
    setSearchQuery,
    setSelectedClient,
    updateClient as updateClientLocal,
    checkAndDeactivateExpiredClients,
    type Client,
} from '@/app/store/slices/clientsSlice'
import { useState, useEffect } from 'react'
import { useDisclosure } from '@mantine/hooks'
import { useForm } from '@mantine/form'
import {
    IconDotsVertical,
    IconPlus,
    IconSearch,
    IconTrash,
    IconCalendar,
    IconCurrencyRubel,
    IconCopy,
    IconCheck,
} from '@tabler/icons-react'
import dayjs from 'dayjs'
import { useNavigate } from 'react-router-dom'
import { apiClient } from '@/shared/api/client'
import { notifications } from '@mantine/notifications'

interface AddClientForm {
    fullName: string
    email: string
    password: string
    format: 'online' | 'offline' | 'both'
    workoutsPackage?: number
    packageExpiryDate?: Date | null
}

interface EditClientForm {
    weight?: number
    height?: number
    age?: number
    activityLevel?: 'low' | 'medium' | 'high'
    goals: string[]
    restrictions: string[]
}

export const ClientsPage = () => {
    const { t } = useTranslation()
    const dispatch = useAppDispatch()
    const navigate = useNavigate()
    const { clients, searchQuery } = useAppSelector((state) => state.clients)
    const trainerConnectionCode = useAppSelector((state) => state.user.trainerConnectionCode)
    const trainerName = useAppSelector((state) => state.user.fullName)
    const [addModalOpened, { open: openAddModal, close: closeAddModal }] = useDisclosure(false)
    const [editModalOpened, { open: openEditModal, close: closeEditModal }] = useDisclosure(false)
    const [invitationModalOpened, { open: openInvitationModal, close: closeInvitationModal }] = useDisclosure(false)
    const [editingClient, setEditingClient] = useState<Client | null>(null)
    const [invitationLink, setInvitationLink] = useState('')
    const [copiedLink, setCopiedLink] = useState(false)
    const [copiedCode, setCopiedCode] = useState(false)
    const [loading, setLoading] = useState(false)

    const form = useForm<AddClientForm>({
        initialValues: {
            fullName: '',
            email: '',
            password: '',
            format: 'both',
            workoutsPackage: undefined,
            packageExpiryDate: null,
        },
        validate: {
            fullName: (value) => (value.trim().length < 2 ? t('trainer.clients.addClientModal.nameRequired') : null),
            email: (value) => {
                if (!value || value.trim().length === 0) {
                    return t('trainer.clients.addClientModal.emailRequired')
                }
                if (!/^\S+@\S+$/.test(value)) {
                    return t('profile.validation.emailInvalid')
                }
                return null
            },
            password: (value) => (value.length < 6 ? t('auth.passwordTooShort') : null),
        },
    })

    const editForm = useForm<EditClientForm>({
        initialValues: {
            weight: undefined,
            height: undefined,
            age: undefined,
            activityLevel: undefined,
            goals: [],
            restrictions: [],
        },
    })

    useEffect(() => {
        dispatch(checkAndDeactivateExpiredClients())
        // Загружаем клиентов с бэкенда при монтировании компонента
        const loadClients = async () => {
            try {
                const clientsData = await apiClient.getClients()
                // Преобразуем данные из API в формат локального состояния
                const mappedClients: Client[] = clientsData.map((client: any) => ({
                    id: client.id,
                    fullName: client.full_name,
                    email: client.email,
                    phone: client.phone,
                    avatar: client.avatar,
                    format: (client.client_format || 'both') as 'online' | 'offline' | 'both',
                    workoutsPackage: client.workouts_package,
                    packageExpiryDate: client.package_expiry_date,
                    isActive: client.is_active ?? true,
                    attendanceRate: 0, // Эти данные можно получить из статистики клиента
                    totalWorkouts: 0,
                    completedWorkouts: 0,
                    joinedDate: client.created_at || new Date().toISOString(),
                }))
                dispatch(setClients(mappedClients))
            } catch (error) {
                console.error('Error loading clients:', error)
            }
        }
        loadClients()
    }, [dispatch])

    const filteredClients = clients.filter((client) =>
        client.fullName.toLowerCase().includes(searchQuery.toLowerCase()),
    )

    const handleAddClient = async (values: AddClientForm) => {
        setLoading(true)
        try {
            // Создаем клиента через API
            const createdClient = await apiClient.createClient({
                full_name: values.fullName,
                email: values.email!,
                password: values.password,
                role: 'client',
            })

            // Обновляем локальное состояние
            dispatch(addClient({
                id: createdClient.id,
                fullName: createdClient.full_name,
                email: createdClient.email,
                phone: createdClient.phone,
                avatar: createdClient.avatar,
                format: values.format,
                workoutsPackage: values.workoutsPackage,
                packageExpiryDate: values.packageExpiryDate?.toISOString(),
                isActive: true,
            }))

            // Если нужно обновить дополнительные поля (format, workoutsPackage и т.д.), делаем это через updateClient
            if (values.format !== 'both' || values.workoutsPackage || values.packageExpiryDate) {
                await apiClient.updateClient(createdClient.id, {
                    client_format: values.format,
                    workouts_package: values.workoutsPackage,
                    package_expiry_date: values.packageExpiryDate?.toISOString(),
                })
            }

            // Генерируем ссылку приглашения
            if (trainerConnectionCode) {
                const link = `${window.location.origin}/register?code=${trainerConnectionCode}`
                setInvitationLink(link)
                form.reset()
                closeAddModal()
                openInvitationModal()
            } else {
                form.reset()
                closeAddModal()
                notifications.show({
                    title: t('common.success'),
                    message: t('trainer.clients.clientCreated'),
                    color: 'green',
                })
            }
        } catch (error: any) {
            notifications.show({
                title: t('common.error'),
                message: error?.response?.data?.detail || error?.message || t('trainer.clients.error.createClient'),
                color: 'red',
            })
        } finally {
            setLoading(false)
        }
    }

    const handleCopyLink = async () => {
        try {
            await navigator.clipboard.writeText(invitationLink)
            setCopiedLink(true)
            setTimeout(() => setCopiedLink(false), 2000)
            notifications.show({
                title: t('common.success'),
                message: t('trainer.clients.invitationLinkCopied'),
                color: 'green',
            })
        } catch (error) {
            notifications.show({
                title: t('common.error'),
                message: t('trainer.clients.error.copyLink'),
                color: 'red',
            })
        }
    }

    const handleCopyCode = async () => {
        if (!trainerConnectionCode) return
        try {
            await navigator.clipboard.writeText(trainerConnectionCode)
            setCopiedCode(true)
            setTimeout(() => setCopiedCode(false), 2000)
            notifications.show({
                title: t('common.success'),
                message: t('trainer.clients.invitationCodeCopied'),
                color: 'green',
            })
        } catch (error) {
            notifications.show({
                title: t('common.error'),
                message: t('trainer.clients.error.copyCode'),
                color: 'red',
            })
        }
    }

    const handleOpenEditClient = (client: Client) => {
        setEditingClient(client)
        editForm.setValues({
            weight: client.weight,
            height: client.height,
            age: client.age,
            activityLevel: client.activityLevel,
            goals: client.goals ?? [],
            restrictions: client.restrictions ?? [],
        })
        openEditModal()
    }

    const handleSaveClient = async (values: EditClientForm) => {
        if (!editingClient) return
        setLoading(true)
        try {
            await apiClient.updateClient(editingClient.id, {
                weight: values.weight,
                height: values.height,
                age: values.age,
                activity_level: values.activityLevel,
                goals: values.goals,
                restrictions: values.restrictions,
            })

            dispatch(
                updateClientLocal({
                    id: editingClient.id,
                    updates: {
                        weight: values.weight,
                        height: values.height,
                        age: values.age,
                        activityLevel: values.activityLevel,
                        goals: values.goals,
                        restrictions: values.restrictions,
                    },
                }),
            )

            closeEditModal()
            setEditingClient(null)
            notifications.show({
                title: t('common.success'),
                message: t('trainer.clients.clientUpdated'),
                color: 'green',
            })
        } catch (error: any) {
            notifications.show({
                title: t('common.error'),
                message: error?.response?.data?.detail || error?.message || t('trainer.clients.error.updateClient'),
                color: 'red',
            })
        } finally {
            setLoading(false)
        }
    }

    const handleDeleteClient = async (id: string) => {
        if (!confirm(t('common.delete') + '?')) return
        setLoading(true)
        try {
            await apiClient.deleteClient(id)
            dispatch(removeClient(id))
            notifications.show({
                title: t('common.success'),
                message: t('trainer.clients.clientDeleted'),
                color: 'green',
            })
        } catch (error: any) {
            notifications.show({
                title: t('common.error'),
                message: error?.response?.data?.detail || error?.message || t('trainer.clients.error.deleteClient'),
                color: 'red',
            })
        } finally {
            setLoading(false)
        }
    }

    const formatDate = (date?: string) => {
        if (!date) return t('trainer.clients.noWorkouts')
        return dayjs(date).format('D MMM, HH:mm')
    }

    const getFormatLabel = (format: string) => {
        switch (format) {
            case 'online':
                return t('trainer.clients.formatOnline')
            case 'offline':
                return t('trainer.clients.formatOffline')
            case 'both':
                return t('trainer.clients.formatBoth')
            default:
                return format
        }
    }

    return (
        <Stack gap="lg">
            <Group justify="space-between">
                <Title order={2}>{t('trainer.clients.title')}</Title>
                <Button leftSection={<IconPlus size={16} />} onClick={openAddModal}>
                    {t('trainer.clients.addClient')}
                </Button>
            </Group>

            <Card withBorder padding="md">
                <Stack gap="md">
                    <Group justify="space-between">
                        <TextInput
                            placeholder={t('trainer.clients.search')}
                            leftSection={<IconSearch size={16} />}
                            value={searchQuery}
                            onChange={(e) => dispatch(setSearchQuery(e.target.value))}
                            style={{ flex: 1, maxWidth: 400 }}
                        />
                        <Text size="sm" c="dimmed">
                            {t('trainer.clients.totalClients', { count: clients.length })}
                        </Text>
                    </Group>

                    <Table>
                        <Table.Thead>
                            <Table.Tr>
                                <Table.Th>{t('trainer.clients.name')}</Table.Th>
                                <Table.Th>{t('trainer.clients.lastWorkout')}</Table.Th>
                                <Table.Th>{t('trainer.clients.nextWorkout')}</Table.Th>
                                <Table.Th>{t('trainer.clients.attendance')}</Table.Th>
                                <Table.Th>{t('trainer.clients.format')}</Table.Th>
                                <Table.Th>{t('trainer.clients.status.label')}</Table.Th>
                                <Table.Th></Table.Th>
                            </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                            {filteredClients.length === 0 ? (
                                <Table.Tr>
                                    <Table.Td colSpan={7} style={{ textAlign: 'center', padding: '2rem' }}>
                                        <Text c="dimmed">{t('trainer.clients.noWorkouts')}</Text>
                                    </Table.Td>
                                </Table.Tr>
                            ) : (
                                filteredClients.map((client) => (
                                    <Table.Tr key={client.id}>
                                        <Table.Td>
                                            <Group gap="sm">
                                                <Avatar src={client.avatar} size="sm">
                                                    {client.fullName.charAt(0)}
                                                </Avatar>
                                                <Text
                                                    fw={500}
                                                    style={{ cursor: 'pointer' }}
                                                    onClick={() => {
                                                        dispatch(setSelectedClient(client.id))
                                                        navigate(`/trainer/clients/${client.id}`)
                                                    }}
                                                >
                                                    {client.fullName}
                                                </Text>
                                            </Group>
                                        </Table.Td>
                                        <Table.Td>
                                            <Text size="sm">{formatDate(client.lastWorkout)}</Text>
                                        </Table.Td>
                                        <Table.Td>
                                            <Text size="sm">{formatDate(client.nextWorkout)}</Text>
                                        </Table.Td>
                                        <Table.Td>
                                            <Badge color={client.attendanceRate >= 80 ? 'green' : client.attendanceRate >= 60 ? 'yellow' : 'red'}>
                                                {client.attendanceRate}%
                                            </Badge>
                                        </Table.Td>
                                        <Table.Td>
                                            <Badge variant="light">{getFormatLabel(client.format)}</Badge>
                                        </Table.Td>
                                        <Table.Td>
                                            <Badge color={client.isActive ? 'green' : 'gray'} variant={client.isActive ? 'light' : 'outline'}>
                                                {t(`trainer.clients.status.${client.isActive ? 'active' : 'inactive'}`)}
                                            </Badge>
                                        </Table.Td>
                                        <Table.Td>
                                            <Menu shadow="md" width={200}>
                                                <Menu.Target>
                                                    <ActionIcon variant="subtle">
                                                        <IconDotsVertical size={16} />
                                                    </ActionIcon>
                                                </Menu.Target>
                                                <Menu.Dropdown>
                                                    <Menu.Item
                                                        onClick={() => handleOpenEditClient(client)}
                                                    >
                                                        {t('trainer.clients.editClientModal.title')}
                                                    </Menu.Item>
                                                    <Menu.Item
                                                        leftSection={<IconCalendar size={16} />}
                                                        onClick={() => {
                                                            dispatch(setSelectedClient(client.id))
                                                            navigate('/trainer/calendar', { state: { clientId: client.id } })
                                                        }}
                                                    >
                                                        {t('trainer.clients.openInCalendar')}
                                                    </Menu.Item>
                                                    <Menu.Item
                                                        leftSection={<IconCurrencyRubel size={16} />}
                                                        onClick={() => {
                                                            dispatch(setSelectedClient(client.id))
                                                            navigate('/trainer/finances', { state: { clientId: client.id } })
                                                        }}
                                                    >
                                                        {t('trainer.clients.openFinances')}
                                                    </Menu.Item>
                                                    <Menu.Divider />
                                                    <Menu.Item
                                                        color="red"
                                                        leftSection={<IconTrash size={16} />}
                                                        onClick={() => handleDeleteClient(client.id)}
                                                    >
                                                        {t('trainer.clients.delete')}
                                                    </Menu.Item>
                                                </Menu.Dropdown>
                                            </Menu>
                                        </Table.Td>
                                    </Table.Tr>
                                ))
                            )}
                        </Table.Tbody>
                    </Table>
                </Stack>
            </Card>

            <Modal opened={addModalOpened} onClose={closeAddModal} title={t('trainer.clients.addClientModal.title')}>
                <form onSubmit={form.onSubmit(handleAddClient)}>
                    <Stack gap="md">
                        <TextInput
                            label={t('trainer.clients.name')}
                            placeholder={t('trainer.clients.addClientModal.namePlaceholder')}
                            required
                            {...form.getInputProps('fullName')}
                        />
                        <TextInput
                            label="Email"
                            placeholder={t('trainer.clients.addClientModal.emailPlaceholder')}
                            required
                            {...form.getInputProps('email')}
                        />
                        <PasswordInput
                            label={t('auth.password')}
                            placeholder={t('auth.passwordPlaceholder')}
                            required
                            {...form.getInputProps('password')}
                        />
                        <Radio.Group
                            label={t('trainer.clients.format')}
                            {...form.getInputProps('format')}
                        >
                            <Stack gap="xs" mt="xs">
                                <Radio value="online" label={t('trainer.clients.formatOnline')} />
                                <Radio value="offline" label={t('trainer.clients.formatOffline')} />
                                <Radio value="both" label={t('trainer.clients.formatBoth')} />
                            </Stack>
                        </Radio.Group>
                        <NumberInput
                            label={t('trainer.clients.addClientModal.workoutsPackage')}
                            placeholder={t('trainer.clients.addClientModal.workoutsPackagePlaceholder')}
                            min={1}
                            {...form.getInputProps('workoutsPackage')}
                        />
                        <DateInput
                            label={t('trainer.clients.addClientModal.packageExpiryDate')}
                            placeholder={t('trainer.clients.addClientModal.packageExpiryDatePlaceholder')}
                            valueFormat="DD.MM.YYYY"
                            {...form.getInputProps('packageExpiryDate')}
                        />
                        <Group justify="flex-end" mt="md">
                            <Button variant="subtle" onClick={closeAddModal}>
                                {t('common.cancel')}
                            </Button>
                            <Button type="submit" loading={loading}>{t('common.add')}</Button>
                        </Group>
                    </Stack>
                </form>
            </Modal>

            <Modal
                opened={editModalOpened}
                onClose={closeEditModal}
                title={t('trainer.clients.editClientModal.title')}
                size="lg"
            >
                <form onSubmit={editForm.onSubmit(handleSaveClient)}>
                    <Stack gap="md">
                        <Text fw={500}>{t('trainer.clients.editClientModal.metricsSection')}</Text>
                        <Group grow>
                            <NumberInput
                                label={t('trainer.clients.editClientModal.weight')}
                                suffix=" кг"
                                min={30}
                                max={250}
                                {...editForm.getInputProps('weight')}
                            />
                            <NumberInput
                                label={t('trainer.clients.editClientModal.height')}
                                suffix=" см"
                                min={120}
                                max={230}
                                {...editForm.getInputProps('height')}
                            />
                            <NumberInput
                                label={t('trainer.clients.editClientModal.age')}
                                suffix=" лет"
                                min={14}
                                max={100}
                                {...editForm.getInputProps('age')}
                            />
                        </Group>

                        <Radio.Group
                            label={t('trainer.clients.editClientModal.activityLevel')}
                            {...editForm.getInputProps('activityLevel')}
                        >
                            <Stack gap="xs" mt="xs">
                                <Radio value="low" label={t('onboarding.activityLow')} />
                                <Radio value="medium" label={t('onboarding.activityMedium')} />
                                <Radio value="high" label={t('onboarding.activityHigh')} />
                            </Stack>
                        </Radio.Group>

                        <TextInput
                            label={t('trainer.clients.editClientModal.goals')}
                            placeholder={t('onboarding.goals')}
                            value={editForm.values.goals.join(', ')}
                            onChange={(event) =>
                                editForm.setFieldValue(
                                    'goals',
                                    event.currentTarget.value
                                        .split(',')
                                        .map((v) => v.trim())
                                        .filter(Boolean),
                                )
                            }
                        />

                        <TextInput
                            label={t('trainer.clients.editClientModal.restrictions')}
                            placeholder={t('onboarding.restrictionsDescription')}
                            value={editForm.values.restrictions.join(', ')}
                            onChange={(event) =>
                                editForm.setFieldValue(
                                    'restrictions',
                                    event.currentTarget.value
                                        .split(',')
                                        .map((v) => v.trim())
                                        .filter(Boolean),
                                )
                            }
                        />

                        <Group justify="flex-end" mt="md">
                            <Button variant="subtle" onClick={closeEditModal}>
                                {t('common.cancel')}
                            </Button>
                            <Button type="submit" loading={loading}>{t('common.save')}</Button>
                        </Group>
                    </Stack>
                </form>
            </Modal>

            <Modal
                opened={invitationModalOpened}
                onClose={closeInvitationModal}
                title={t('trainer.clients.invitationModal.title')}
                size="md"
            >
                <Stack gap="md">
                    <Text size="sm" c="dimmed">
                        {t('trainer.clients.invitationModal.description')}
                    </Text>
                    
                    <div>
                        <Text size="sm" fw={500} mb="xs">
                            {t('trainer.clients.invitationModal.linkLabel')}
                        </Text>
                        <Group gap="xs">
                            <TextInput
                                value={invitationLink}
                                readOnly
                                style={{ flex: 1 }}
                            />
                            <ActionIcon
                                variant="light"
                                color={copiedLink ? 'green' : 'gray'}
                                onClick={handleCopyLink}
                            >
                                {copiedLink ? <IconCheck size={16} /> : <IconCopy size={16} />}
                            </ActionIcon>
                        </Group>
                    </div>

                    <div>
                        <Text size="sm" fw={500} mb="xs">
                            {t('trainer.clients.invitationModal.codeLabel')}
                        </Text>
                        <Group gap="xs">
                            <TextInput
                                value={trainerConnectionCode || ''}
                                readOnly
                                style={{ flex: 1 }}
                            />
                            <ActionIcon
                                variant="light"
                                color={copiedCode ? 'green' : 'gray'}
                                onClick={handleCopyCode}
                            >
                                {copiedCode ? <IconCheck size={16} /> : <IconCopy size={16} />}
                            </ActionIcon>
                        </Group>
                    </div>

                    <Group justify="flex-end" mt="md">
                        <Button onClick={closeInvitationModal}>
                            {t('common.close')}
                        </Button>
                    </Group>
                </Stack>
            </Modal>
        </Stack>
    )
}

