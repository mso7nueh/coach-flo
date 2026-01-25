import {
    ActionIcon,
    Badge,
    Button,
    Card,
    Group,
    Modal,
    NumberInput,
    Select,
    SimpleGrid,
    Stack,
    Table,
    Text,
    TextInput,
    Title,
} from '@mantine/core'
import { useTranslation } from 'react-i18next'
import { useAppDispatch } from '@/shared/hooks/useAppDispatch'
import { useAppSelector } from '@/shared/hooks/useAppSelector'
import { setSelectedClient, fetchPayments, createPaymentApi, deletePaymentApi } from '@/app/store/slices/financesSlice'
import { useDisclosure } from '@mantine/hooks'
import { useMemo, useEffect } from 'react'
import { useForm } from '@mantine/form'
import { useLocation } from 'react-router-dom'
import { notifications } from '@mantine/notifications'
import { IconPlus, IconTrash, IconCurrencyRubel, IconCalendar } from '@tabler/icons-react'
import dayjs from 'dayjs'
import { DateInput } from '@mantine/dates'
import type { PaymentType } from '@/app/store/slices/financesSlice'
import {
    ResponsiveContainer,
    AreaChart,
    Area,
    BarChart,
    Bar,
    PieChart,
    Pie,
    Cell,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
} from 'recharts'

interface AddPaymentForm {
    clientId: string
    amount: number
    date: Date | null
    type: PaymentType
    packageSize?: number
    subscriptionDays?: number
    notes?: string
}

export const FinancesPage = () => {
    const { t } = useTranslation()
    const dispatch = useAppDispatch()
    const location = useLocation()
    const { payments, selectedClientId } = useAppSelector((state) => state.finances)
    const { clients } = useAppSelector((state) => state.clients)
    const [addModalOpened, { open: openAddModal, close: closeAddModal }] = useDisclosure(false)

    // Загружаем платежи при монтировании компонента
    useEffect(() => {
        dispatch(fetchPayments())
    }, [dispatch])

    // Обрабатываем clientId из навигации (если переходим со страницы клиентов)
    useEffect(() => {
        const state = location.state as { clientId?: string } | null
        if (state?.clientId) {
            dispatch(setSelectedClient(state.clientId))
        }
    }, [location.state, dispatch])

    const form = useForm<AddPaymentForm>({
        initialValues: {
            clientId: selectedClientId || '',
            amount: 0,
            date: new Date(),
            type: 'single',
            packageSize: undefined,
            subscriptionDays: undefined,
            notes: '',
        },
        validate: {
            clientId: (value) => (!value ? t('trainer.finances.clientRequired') : null),
            amount: (value) => (value <= 0 ? t('trainer.finances.amountRequired') : null),
            date: (value) => (!value ? t('trainer.finances.dateRequired') : null),
        },
    })

    // Обновляем форму при изменении selectedClientId
    useEffect(() => {
        if (selectedClientId) {
            form.setFieldValue('clientId', selectedClientId)
        }
    }, [selectedClientId])

    const filteredPayments = useMemo(() => {
        if (selectedClientId) {
            return payments.filter((p) => p.clientId === selectedClientId)
        }
        return payments
    }, [payments, selectedClientId])

    const handleAddPayment = async (values: AddPaymentForm) => {
        try {
            await dispatch(
                createPaymentApi({
                    client_id: values.clientId,
                    amount: values.amount,
                    date: dayjs(values.date).toISOString(),
                    type: values.type,
                    package_size: values.type === 'package' ? values.packageSize : undefined,
                    subscription_days: values.type === 'subscription' ? values.subscriptionDays : undefined,
                    notes: values.notes || undefined,
                })
            ).unwrap()
            notifications.show({
                title: t('common.success'),
                message: t('trainer.finances.paymentCreated'),
                color: 'green',
            })
            form.reset()
            closeAddModal()
        } catch (error: any) {
            notifications.show({
                title: t('common.error'),
                message: error || t('trainer.finances.error.createPayment'),
                color: 'red',
            })
        }
    }

    const handleDeletePayment = async (id: string) => {
        if (confirm(t('common.delete') + '?')) {
            try {
                await dispatch(deletePaymentApi(id)).unwrap()
                notifications.show({
                    title: t('common.success'),
                    message: t('trainer.finances.paymentDeleted'),
                    color: 'green',
                })
            } catch (error: any) {
                notifications.show({
                    title: t('common.error'),
                    message: error || t('trainer.finances.error.deletePayment'),
                    color: 'red',
                })
            }
        }
    }

    const getClientName = (clientId: string) => {
        return clients.find((c) => c.id === clientId)?.fullName || clientId
    }

    const getPaymentTypeLabel = (type: PaymentType) => {
        switch (type) {
            case 'single':
                return t('trainer.finances.typeSingle')
            case 'package':
                return t('trainer.finances.typePackage')
            case 'subscription':
                return t('trainer.finances.typeSubscription')
        }
    }

    const monthlyRevenue = useMemo(() => {
        const currentMonth = dayjs().month()
        const currentYear = dayjs().year()
        return filteredPayments
            .filter((p) => {
                const paymentDate = dayjs(p.date)
                return paymentDate.month() === currentMonth && paymentDate.year() === currentYear
            })
            .reduce((sum, p) => sum + p.amount, 0)
    }, [filteredPayments])

    const averageCheck = useMemo(() => {
        if (filteredPayments.length === 0) return 0
        const total = filteredPayments.reduce((sum, p) => sum + p.amount, 0)
        return Math.round(total / filteredPayments.length)
    }, [filteredPayments])

    const totalRevenue = useMemo(() => {
        return filteredPayments.reduce((sum, p) => sum + p.amount, 0)
    }, [filteredPayments])

    const monthlyRevenueData = useMemo(() => {
        const monthsMap = new Map<string, number>()
        const now = dayjs()

        for (let i = 5; i >= 0; i--) {
            const month = now.subtract(i, 'month')
            const key = month.format('YYYY-MM')
            monthsMap.set(key, 0)
        }

        filteredPayments.forEach((payment) => {
            const monthKey = dayjs(payment.date).format('YYYY-MM')
            const current = monthsMap.get(monthKey) || 0
            monthsMap.set(monthKey, current + payment.amount)
        })

        return Array.from(monthsMap.entries()).map(([month, revenue]) => ({
            month: dayjs(month).format('MMM YYYY'),
            revenue: Math.round(revenue),
        }))
    }, [filteredPayments])

    const paymentsByTypeData = useMemo(() => {
        const typeMap = new Map<PaymentType, number>()
        filteredPayments.forEach((payment) => {
            const current = typeMap.get(payment.type) || 0
            typeMap.set(payment.type, current + payment.amount)
        })

        return Array.from(typeMap.entries()).map(([type, amount]) => ({
            name: getPaymentTypeLabel(type),
            value: Math.round(amount),
            type,
        }))
    }, [filteredPayments, t])

    const revenueByClientData = useMemo(() => {
        const clientMap = new Map<string, number>()
        filteredPayments.forEach((payment) => {
            const clientName = getClientName(payment.clientId)
            const current = clientMap.get(clientName) || 0
            clientMap.set(clientName, current + payment.amount)
        })

        return Array.from(clientMap.entries())
            .map(([name, revenue]) => ({
                name: name.length > 30 ? name.substring(0, 30) + '...' : name,
                revenue: Math.round(revenue),
            }))
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 10)
    }, [filteredPayments, clients])

    const COLORS = ['#4c6ef5', '#51cf66', '#ffd43b', '#ff8787', '#845ef7']

    return (
        <Stack gap="lg">
            <Group justify="space-between">
                <Title order={2}>{t('trainer.finances.title')}</Title>
                <Button leftSection={<IconPlus size={16} />} onClick={openAddModal}>
                    {t('trainer.finances.addPayment')}
                </Button>
            </Group>

            <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="md">
                <Card withBorder padding="md">
                    <Stack gap="xs">
                        <Text size="sm" c="dimmed">
                            {t('trainer.finances.monthlyRevenue')}
                        </Text>
                        <Text fw={700} size="xl">
                            {monthlyRevenue.toLocaleString()} ₽
                        </Text>
                    </Stack>
                </Card>
                <Card withBorder padding="md">
                    <Stack gap="xs">
                        <Text size="sm" c="dimmed">
                            {t('trainer.finances.averageCheck')}
                        </Text>
                        <Text fw={700} size="xl">
                            {averageCheck.toLocaleString()} ₽
                        </Text>
                    </Stack>
                </Card>
                <Card withBorder padding="md">
                    <Stack gap="xs">
                        <Text size="sm" c="dimmed">
                            {t('trainer.finances.totalRevenue')}
                        </Text>
                        <Text fw={700} size="xl">
                            {totalRevenue.toLocaleString()} ₽
                        </Text>
                    </Stack>
                </Card>
                <Card withBorder padding="md">
                    <Stack gap="xs">
                        <Text size="sm" c="dimmed">
                            {t('trainer.finances.totalPayments')}
                        </Text>
                        <Text fw={700} size="xl">
                            {filteredPayments.length}
                        </Text>
                    </Stack>
                </Card>
            </SimpleGrid>

            <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="md">
                <Card withBorder padding="md">
                    <Stack gap="md">
                        <Text fw={600} size="lg">
                            {t('trainer.finances.revenueByMonth')}
                        </Text>
                        <ResponsiveContainer width="100%" height={300}>
                            <AreaChart data={monthlyRevenueData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="month" />
                                <YAxis />
                                <Tooltip
                                    formatter={(value: number) => [`${value.toLocaleString()} ₽`, t('trainer.finances.amount')]}
                                />
                                <Area type="monotone" dataKey="revenue" stroke="#4c6ef5" fill="#4c6ef5" fillOpacity={0.6} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </Stack>
                </Card>

                <Card withBorder padding="md">
                    <Stack gap="md">
                        <Text fw={600} size="lg">
                            {t('trainer.finances.paymentsByType')}
                        </Text>
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={paymentsByTypeData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ name, percent }) => `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    dataKey="value"
                                >
                                    {paymentsByTypeData.map((_, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(value: number) => `${value.toLocaleString()} ₽`} />
                            </PieChart>
                        </ResponsiveContainer>
                    </Stack>
                </Card>
            </SimpleGrid>

            <Card withBorder padding="md">
                <Stack gap="md">
                    <Text fw={600} size="lg">
                        {t('trainer.finances.revenueByClient')}
                    </Text>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={revenueByClientData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                            <YAxis />
                            <Tooltip
                                formatter={(value: number) => [`${value.toLocaleString()} ₽`, t('trainer.finances.amount')]}
                            />
                            <Bar dataKey="revenue" fill="#4c6ef5" />
                        </BarChart>
                    </ResponsiveContainer>
                </Stack>
            </Card>

            <Card withBorder padding="md">
                <Stack gap="md">
                    <Group justify="space-between">
                        <Select
                            placeholder={t('trainer.finances.filterByClient')}
                            data={[
                                { value: '', label: t('common.all') },
                                ...clients.map((c) => ({ value: c.id, label: c.fullName })),
                            ]}
                            value={selectedClientId || ''}
                            onChange={(value) => dispatch(setSelectedClient(value || null))}
                            clearable
                            style={{ width: 250 }}
                        />
                    </Group>

                    <Table>
                        <Table.Thead>
                            <Table.Tr>
                                <Table.Th>{t('trainer.finances.client')}</Table.Th>
                                <Table.Th>{t('trainer.finances.amount')}</Table.Th>
                                <Table.Th>{t('trainer.finances.date')}</Table.Th>
                                <Table.Th>{t('trainer.finances.type')}</Table.Th>
                                <Table.Th>{t('trainer.finances.remainingSessions')}</Table.Th>
                                <Table.Th>{t('trainer.finances.nextPayment')}</Table.Th>
                                <Table.Th></Table.Th>
                            </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                            {filteredPayments.length === 0 ? (
                                <Table.Tr>
                                    <Table.Td colSpan={7} style={{ textAlign: 'center', padding: '2rem' }}>
                                        <Text c="dimmed">{t('trainer.finances.noPayments')}</Text>
                                    </Table.Td>
                                </Table.Tr>
                            ) : (
                                filteredPayments.map((payment) => (
                                    <Table.Tr key={payment.id}>
                                        <Table.Td>
                                            <Text fw={500}>{getClientName(payment.clientId)}</Text>
                                        </Table.Td>
                                        <Table.Td>
                                            <Text fw={600}>{payment.amount.toLocaleString()} ₽</Text>
                                        </Table.Td>
                                        <Table.Td>
                                            <Text size="sm">{dayjs(payment.date).format('D MMM YYYY')}</Text>
                                        </Table.Td>
                                        <Table.Td>
                                            <Badge variant="light">{getPaymentTypeLabel(payment.type)}</Badge>
                                        </Table.Td>
                                        <Table.Td>
                                            {payment.remainingSessions !== undefined ? (
                                                <Badge color={payment.remainingSessions > 0 ? 'green' : 'red'}>
                                                    {payment.remainingSessions}
                                                </Badge>
                                            ) : (
                                                <Text size="sm" c="dimmed">
                                                    -
                                                </Text>
                                            )}
                                        </Table.Td>
                                        <Table.Td>
                                            {payment.nextPaymentDate ? (
                                                <Text size="sm">{dayjs(payment.nextPaymentDate).format('D MMM YYYY')}</Text>
                                            ) : (
                                                <Text size="sm" c="dimmed">
                                                    -
                                                </Text>
                                            )}
                                        </Table.Td>
                                        <Table.Td>
                                            <ActionIcon color="red" variant="subtle" onClick={() => handleDeletePayment(payment.id)}>
                                                <IconTrash size={16} />
                                            </ActionIcon>
                                        </Table.Td>
                                    </Table.Tr>
                                ))
                            )}
                        </Table.Tbody>
                    </Table>
                </Stack>
            </Card>

            <Modal opened={addModalOpened} onClose={closeAddModal} title={t('trainer.finances.addPayment')} size="lg">
                <form onSubmit={form.onSubmit(handleAddPayment)}>
                    <Stack gap="md">
                        <Select
                            label={t('trainer.finances.client')}
                            placeholder={t('trainer.finances.selectClient')}
                            data={clients.map((c) => ({ value: c.id, label: c.fullName }))}
                            required
                            {...form.getInputProps('clientId')}
                        />
                        <NumberInput
                            label={t('trainer.finances.amount')}
                            placeholder="0"
                            required
                            min={0}
                            leftSection={<IconCurrencyRubel size={16} />}
                            {...form.getInputProps('amount')}
                        />
                        <DateInput
                            label={t('trainer.finances.date')}
                            placeholder={t('trainer.finances.datePlaceholder')}
                            required
                            leftSection={<IconCalendar size={16} />}
                            value={form.values.date}
                            onChange={(value) => form.setFieldValue('date', value)}
                        />
                        <Select
                            label={t('trainer.finances.type')}
                            data={[
                                { value: 'single', label: t('trainer.finances.typeSingle') },
                                { value: 'package', label: t('trainer.finances.typePackage') },
                                { value: 'subscription', label: t('trainer.finances.typeSubscription') },
                            ]}
                            required
                            {...form.getInputProps('type')}
                        />
                        {form.values.type === 'package' && (
                            <NumberInput
                                label={t('trainer.finances.packageSize')}
                                placeholder="10"
                                min={1}
                                {...form.getInputProps('packageSize')}
                            />
                        )}
                        {form.values.type === 'subscription' && (
                            <NumberInput
                                label={t('trainer.finances.subscriptionDays')}
                                placeholder="30"
                                min={1}
                                {...form.getInputProps('subscriptionDays')}
                            />
                        )}
                        <TextInput label={t('common.notes')} {...form.getInputProps('notes')} />
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

