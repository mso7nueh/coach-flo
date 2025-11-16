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
} from '@mantine/core'
import { DateInput } from '@mantine/dates'
import { useTranslation } from 'react-i18next'
import { useAppDispatch } from '@/shared/hooks/useAppDispatch'
import { useAppSelector } from '@/shared/hooks/useAppSelector'
import {
    addClient,
    removeClient,
    setSearchQuery,
    setSelectedClient,
    updateClient,
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
} from '@tabler/icons-react'
import dayjs from 'dayjs'
import { useNavigate } from 'react-router-dom'

interface AddClientForm {
    fullName: string
    email?: string
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
    const [editingClient, setEditingClient] = useState<Client | null>(null)

    const form = useForm<AddClientForm>({
        initialValues: {
            fullName: '',
            email: '',
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
    }, [dispatch])

    const filteredClients = clients.filter((client) =>
        client.fullName.toLowerCase().includes(searchQuery.toLowerCase()),
    )

    const handleAddClient = (values: AddClientForm) => {
        dispatch(addClient({
            fullName: values.fullName,
            email: values.email,
            format: values.format,
            workoutsPackage: values.workoutsPackage,
            packageExpiryDate: values.packageExpiryDate?.toISOString(),
            isActive: true,
        }))
        
        if (values.email && trainerConnectionCode) {
            const invitationLink = `${window.location.origin}/register?code=${trainerConnectionCode}`
            
            console.log('Отправка приглашения:', {
                to: values.email,
                subject: t('trainer.clients.invitationEmailSubject'),
                body: t('trainer.clients.invitationEmailBody', {
                    trainerName: trainerName || 'Тренер',
                    invitationLink,
                }),
                invitationLink,
            })
        }
        
        form.reset()
        closeAddModal()
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

    const handleSaveClient = (values: EditClientForm) => {
        if (!editingClient) return
        dispatch(
            updateClient({
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
    }

    const handleDeleteClient = (id: string) => {
        if (confirm(t('common.delete') + '?')) {
            dispatch(removeClient(id))
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
                                <Table.Th></Table.Th>
                            </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                            {filteredClients.length === 0 ? (
                                <Table.Tr>
                                    <Table.Td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>
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
                            <Button type="submit">{t('common.add')}</Button>
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
                            <Button type="submit">{t('common.save')}</Button>
                        </Group>
                    </Stack>
                </form>
            </Modal>
        </Stack>
    )
}

