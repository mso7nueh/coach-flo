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
} from '@mantine/core'
import { useTranslation } from 'react-i18next'
import { useAppDispatch } from '@/shared/hooks/useAppDispatch'
import { useAppSelector } from '@/shared/hooks/useAppSelector'
import {
    addClient,
    removeClient,
    setSearchQuery,
    setSelectedClient,
} from '@/app/store/slices/clientsSlice'
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
    phone?: string
    format: 'online' | 'offline' | 'both'
}

export const ClientsPage = () => {
    const { t } = useTranslation()
    const dispatch = useAppDispatch()
    const navigate = useNavigate()
    const { clients, searchQuery } = useAppSelector((state) => state.clients)
    const trainerConnectionCode = useAppSelector((state) => state.user.trainerConnectionCode)
    const trainerName = useAppSelector((state) => state.user.fullName)
    const [addModalOpened, { open: openAddModal, close: closeAddModal }] = useDisclosure(false)

    const form = useForm<AddClientForm>({
        initialValues: {
            fullName: '',
            email: '',
            phone: '',
            format: 'both',
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

    const filteredClients = clients.filter((client) =>
        client.fullName.toLowerCase().includes(searchQuery.toLowerCase()),
    )

    const handleAddClient = (values: AddClientForm) => {
        dispatch(addClient(values))
        
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
                        <TextInput
                            label={t('profile.phone')}
                            placeholder={t('trainer.clients.addClientModal.phonePlaceholder')}
                            {...form.getInputProps('phone')}
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
        </Stack>
    )
}

