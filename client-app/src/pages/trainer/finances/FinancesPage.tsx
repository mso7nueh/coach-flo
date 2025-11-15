import {
    ActionIcon,
    Badge,
    Button,
    Card,
    Group,
    Modal,
    NumberInput,
    Select,
    Stack,
    Table,
    Text,
    TextInput,
    Title,
} from '@mantine/core'
import { useTranslation } from 'react-i18next'
import { useAppDispatch } from '@/shared/hooks/useAppDispatch'
import { useAppSelector } from '@/shared/hooks/useAppSelector'
import { addPayment, removePayment, setSelectedClient } from '@/app/store/slices/financesSlice'
import { useDisclosure } from '@mantine/hooks'
import { useMemo } from 'react'
import { useForm } from '@mantine/form'
import { IconPlus, IconTrash, IconCurrencyRubel, IconCalendar } from '@tabler/icons-react'
import dayjs from 'dayjs'
import { DateInput } from '@mantine/dates'
import type { PaymentType } from '@/app/store/slices/financesSlice'

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
    const { payments, selectedClientId } = useAppSelector((state) => state.finances)
    const { clients } = useAppSelector((state) => state.clients)
    const [addModalOpened, { open: openAddModal, close: closeAddModal }] = useDisclosure(false)

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

    const filteredPayments = useMemo(() => {
        if (selectedClientId) {
            return payments.filter((p) => p.clientId === selectedClientId)
        }
        return payments
    }, [payments, selectedClientId])

    const handleAddPayment = (values: AddPaymentForm) => {
        const paymentData: Omit<typeof payments[0], 'id'> = {
            clientId: values.clientId,
            amount: values.amount,
            date: dayjs(values.date).format('YYYY-MM-DD'),
            type: values.type,
            packageSize: values.type === 'package' ? values.packageSize : undefined,
            remainingSessions: values.type === 'package' ? values.packageSize : undefined,
            subscriptionDays: values.type === 'subscription' ? values.subscriptionDays : undefined,
            nextPaymentDate:
                values.type === 'subscription' && values.subscriptionDays
                    ? dayjs(values.date).add(values.subscriptionDays, 'day').format('YYYY-MM-DD')
                    : undefined,
            notes: values.notes,
        }
        dispatch(addPayment(paymentData))
        form.reset()
        closeAddModal()
    }

    const handleDeletePayment = (id: string) => {
        if (confirm(t('common.delete') + '?')) {
            dispatch(removePayment(id))
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

    return (
        <Stack gap="lg">
            <Group justify="space-between">
                <Title order={2}>{t('trainer.finances.title')}</Title>
                <Button leftSection={<IconPlus size={16} />} onClick={openAddModal}>
                    {t('trainer.finances.addPayment')}
                </Button>
            </Group>

            <Group gap="md">
                <Card withBorder padding="md" style={{ flex: 1 }}>
                    <Stack gap="xs">
                        <Text size="sm" c="dimmed">
                            {t('trainer.finances.monthlyRevenue')}
                        </Text>
                        <Text fw={700} size="xl">
                            {monthlyRevenue.toLocaleString()} ₽
                        </Text>
                    </Stack>
                </Card>
                <Card withBorder padding="md" style={{ flex: 1 }}>
                    <Stack gap="xs">
                        <Text size="sm" c="dimmed">
                            {t('trainer.finances.averageCheck')}
                        </Text>
                        <Text fw={700} size="xl">
                            {averageCheck.toLocaleString()} ₽
                        </Text>
                    </Stack>
                </Card>
            </Group>

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

