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
    Box,
    ScrollArea,
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

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <Card padding="sm" radius="md" shadow="sm" withBorder>
                <Text size="xs" c="dimmed" mb={4}>{label}</Text>
                {payload.map((p: any, index: number) => (
                    <Text key={index} size="sm" fw={600} style={{ color: p.stroke || p.fill }}>
                        {p.value.toLocaleString()} ₽
                        {p.name && <span style={{ fontWeight: 400, color: 'var(--mantine-color-gray-6)' }}> • {p.name}</span>}
                    </Text>
                ))}
            </Card>
        )
    }
    return null
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
                name: name,
                revenue: Math.round(revenue),
            }))
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 10)
    }, [filteredPayments, clients])

    const COLORS = ['#7c3aed', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899']

    return (
        <Stack gap="lg" style={{ animation: 'fadeIn 0.5s ease-out' }}>
            <Group justify="space-between">
                <Stack gap={0}>
                    <Title order={2} fw={800}>{t('trainer.finances.title')}</Title>
                    <Text size="sm" c="dimmed">{t('trainer.finances.statistics')}</Text>
                </Stack>
                <Button
                    leftSection={<IconPlus size={16} />}
                    onClick={openAddModal}
                    radius="md"
                    variant="filled"
                    color="violet"
                >
                    {t('trainer.finances.addPayment')}
                </Button>
            </Group>

            <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="md">
                {[
                    { label: t('trainer.finances.monthlyRevenue'), value: monthlyRevenue, color: 'violet' },
                    { label: t('trainer.finances.averageCheck'), value: averageCheck, color: 'blue' },
                    { label: t('trainer.finances.totalRevenue'), value: totalRevenue, color: 'emerald' },
                    { label: t('trainer.finances.totalPayments'), value: filteredPayments.length, color: 'gray' },
                ].map((stat, i) => (
                    <Card key={i} withBorder padding="md" radius="md" style={{ borderLeft: `4px solid var(--mantine-color-${stat.color}-6)` }}>
                        <Stack gap="xs">
                            <Text size="xs" c="dimmed" fw={700} tt="uppercase">
                                {stat.label}
                            </Text>
                            <Text fw={800} size="xl">
                                {stat.label.includes('Всего') && !stat.label.includes('выручка') ? stat.value : `${stat.value.toLocaleString()} ₽`}
                            </Text>
                        </Stack>
                    </Card>
                ))}
            </SimpleGrid>

            <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="md">
                <Card withBorder padding="xl" radius="md" shadow="sm">
                    <Stack gap="md">
                        <Group justify="space-between">
                            <Text fw={700} size="lg">
                                {t('trainer.finances.revenueByMonth')}
                            </Text>
                            <Badge variant="light" color="violet">{t('common.period')}</Badge>
                        </Group>
                        <ResponsiveContainer width="100%" height={250}>
                            <AreaChart data={monthlyRevenueData}>
                                <defs>
                                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="var(--mantine-color-violet-6)" stopOpacity={0.2} />
                                        <stop offset="95%" stopColor="var(--mantine-color-violet-6)" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--mantine-color-gray-1)" />
                                <XAxis
                                    dataKey="month"
                                    tick={{ fontSize: 11, fill: 'var(--mantine-color-gray-5)', fontWeight: 500 }}
                                    tickLine={false}
                                    axisLine={false}
                                    dy={10}
                                />
                                <YAxis
                                    tick={{ fontSize: 11, fill: 'var(--mantine-color-gray-5)', fontWeight: 500 }}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(value) => value >= 1000 ? `${value / 1000}k` : value}
                                />
                                <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'var(--mantine-color-violet-6)', strokeWidth: 1 }} />
                                <Area
                                    type="monotone"
                                    dataKey="revenue"
                                    name={t('trainer.finances.amount')}
                                    stroke="var(--mantine-color-violet-6)"
                                    strokeWidth={3}
                                    fillOpacity={1}
                                    fill="url(#colorRevenue)"
                                    dot={{ r: 4, fill: 'var(--mantine-color-violet-6)', strokeWidth: 2, stroke: 'white' }}
                                    activeDot={{ r: 6, strokeWidth: 0, fill: 'var(--mantine-color-violet-6)' }}
                                    animationDuration={1500}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </Stack>
                </Card>

                <Card withBorder padding="xl" radius="md" shadow="sm">
                    <Stack gap="md" h="100%">
                        <Text fw={700} size="lg">
                            {t('trainer.finances.paymentsByType')}
                        </Text>
                        <Box style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <ResponsiveContainer width="100%" height={200}>
                                <PieChart>
                                    <Pie
                                        data={paymentsByTypeData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={65}
                                        outerRadius={85}
                                        paddingAngle={6}
                                        dataKey="value"
                                        stroke="none"
                                        animationBegin={200}
                                        animationDuration={1500}
                                        cornerRadius={4}
                                    >
                                        {paymentsByTypeData.map((_, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip content={<CustomTooltip />} />
                                </PieChart>
                            </ResponsiveContainer>
                        </Box>
                        <Group justify="center" gap="md">
                            {paymentsByTypeData.map((item, index) => (
                                <Group key={index} gap={6}>
                                    <Box w={8} h={8} style={{ borderRadius: '50%', backgroundColor: COLORS[index % COLORS.length] }} />
                                    <Text size="xs" fw={500} c="gray.7">{item.name}</Text>
                                </Group>
                            ))}
                        </Group>
                    </Stack>
                </Card>
            </SimpleGrid>

            <Card withBorder padding="xl" radius="md" shadow="sm">
                <Stack gap="md">
                    <Text fw={700} size="lg">
                        {t('trainer.finances.revenueByClient')}
                    </Text>
                    <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={revenueByClientData} margin={{ top: 10, right: 30, left: 20, bottom: 60 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--mantine-color-gray-1)" />
                            <XAxis
                                dataKey="name"
                                angle={-30}
                                textAnchor="end"
                                height={60}
                                tick={{ fontSize: 11, fill: 'var(--mantine-color-gray-5)', fontWeight: 500 }}
                                tickLine={false}
                                axisLine={false}
                            />
                            <YAxis
                                tick={{ fontSize: 11, fill: 'var(--mantine-color-gray-5)', fontWeight: 500 }}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(value) => `${value.toLocaleString()}`}
                            />
                            <Tooltip
                                content={<CustomTooltip />}
                                cursor={{ fill: 'var(--mantine-color-gray-0)', opacity: 0.4 }}
                            />
                            <Bar
                                dataKey="revenue"
                                fill="var(--mantine-color-violet-6)"
                                radius={[6, 6, 0, 0]}
                                barSize={34}
                                animationDuration={1500}
                            >
                                {revenueByClientData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={index === 0 ? 'var(--mantine-color-violet-6)' : 'var(--mantine-color-violet-4)'} />
                                ))}
                            </Bar>
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

                    <ScrollArea>
                        <Table miw={800}>
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
                    </ScrollArea>
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
                            onChange={(value) => form.setFieldValue('date', value as Date | null)}
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

