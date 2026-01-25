import {
    Badge,
    Button,
    Card,
    Container,
    Group,
    List,
    SimpleGrid,
    Stack,
    Text,
    ThemeIcon,
    Title,
    useMantineTheme,
} from '@mantine/core'
import { IconCheck, IconX } from '@tabler/icons-react'
import { useEffect, useState } from 'react'
import { createOnlinePayment, checkPaymentStatus } from '@/shared/api/client'
import { useAppSelector } from '@/shared/hooks/useAppSelector'
import { useAppDispatch } from '@/shared/hooks/useAppDispatch'
import { fetchCurrentUser } from '@/app/store/slices/userSlice'
import dayjs from 'dayjs'

declare global {
    interface Window {
        YooMoneyCheckoutWidget: any
    }
}

const PLANS = [
    {
        id: 'starter',
        title: 'Starter',
        price: 0,
        description: 'Идеально для начинающих тренеров.',
        features: [
            { label: 'До 5 клиентов', included: true },
            { label: 'Базовые инструменты', included: true },
            { label: 'Персональные программы', included: true },
            { label: 'Трекинг питания', included: false },
            { label: 'Командное управление', included: false },
        ],
        buttonText: 'Начать бесплатно',
        popular: false,
    },
    {
        id: 'pro',
        title: 'Pro',
        price: 1900,
        description: 'Для растущих тренеров и небольших команд.',
        features: [
            { label: 'До 30 клиентов', included: true },
            { label: 'Все функции Starter', included: true },
            { label: 'Трекинг питания', included: true },
            { label: 'Продвинутая аналитика', included: true },
            { label: 'Командное управление', included: false },
        ],
        buttonText: 'Начать Pro',
        popular: true,
    },
    {
        id: 'studio',
        title: 'Studio',
        price: 10500,
        description: 'Для студий и залов, масштабирующих бизнес.',
        features: [
            { label: 'До 100 клиентов', included: true },
            { label: 'Все функции Pro', included: true },
            { label: 'Командное управление', included: true },
            { label: 'Брендирование', included: true },
            { label: 'API доступ', included: true },
        ],
        buttonText: 'Начать Studio',
        popular: false,
    },
    {
        id: 'enterprise',
        title: 'Enterprise',
        price: null,
        description: 'Для крупных фитнес-сетей и топ-креаторов.',
        features: [
            { label: '500+ клиентов', included: true },
            { label: 'Персональная поддержка', included: true },
            { label: 'Индивидуальная разработка', included: true },
            { label: 'SLA', included: true },
        ],
        buttonText: 'Связаться с нами',
        popular: false,
    },
]

export const SubscriptionPage = () => {
    const theme = useMantineTheme()
    const user = useAppSelector((state) => state.user)
    const [widget, setWidget] = useState<any>(null)
    const [paymentInProgress, setPaymentInProgress] = useState(false)
    const [currentPaymentId, setCurrentPaymentId] = useState<string | null>(null)
    const [successMessage, setSuccessMessage] = useState<string | null>(null)

    // We need dispatch to refresh user
    const dispatch = useAppDispatch()
    // Need to import useAppDispatch
    // Assuming we can add it to imports later or it might fail if not imported.
    // Let's check imports first. Wait, I can't check imports in the middle of replace.
    // I will add the import in a separate call or hope it is available via hooks if standard. 
    // Actually I should add `import { useAppDispatch } from '@/shared/hooks/useAppSelector'` (usually adjacent) or similar.
    // Checking previous file content: `import { useAppSelector } from '@/shared/hooks/useAppSelector'`
    // Usually `useAppDispatch` is in `useAppDispatch.ts` or same file.
    // I will try to import it from store or hooks.

    // Let's implement the logic assuming dispatch is available or I will add it.

    useEffect(() => {
        // Load YooKassa Widget Script
        const script = document.createElement('script')
        script.src = 'https://yookassa.ru/checkout-widget/v1/checkout-widget.js'
        script.async = true
        document.body.appendChild(script)

        return () => {
            document.body.removeChild(script)
            if (widget) {
                widget.destroy()
            }
        }
    }, [])

    const handlePayment = async (planId: string, amount: number) => {
        if (!amount) {
            alert('Contacting sales or starting free plan...')
            return
        }

        setPaymentInProgress(true)
        setSuccessMessage(null)

        try {
            const { confirmation_token, payment_id } = await createOnlinePayment({
                amount,
                description: `Подписка ${planId}`,
                plan_id: planId
            })

            setCurrentPaymentId(payment_id)

            if (window.YooMoneyCheckoutWidget) {
                const checkout = new window.YooMoneyCheckoutWidget({
                    confirmation_token: confirmation_token,
                    // Remove return_url to prevent redirect if we want to stay and check status
                    // Or keep it if we want redirect? User asked to "not change anything as if nothing happened"
                    // Better to handle it here.
                    // return_url: window.location.href, 
                    error_callback: function (error: any) {
                        console.error(error)
                        setPaymentInProgress(false)
                    }
                });

                checkout.on('success', async () => {
                    // Payment successful
                    setPaymentInProgress(false)
                    checkout.destroy()

                    // Verify on backend
                    try {
                        await checkPaymentStatus(payment_id)
                        // Refresh user data
                        dispatch(fetchCurrentUser())
                        setSuccessMessage('Оплата прошла успешно! Подписка активирована.')
                    } catch (e) {
                        console.error('Error verifying payment', e)
                        alert('Оплата прошла, но возникла ошибка при активации. Обратитесь в поддержку.')
                    }
                })

                checkout.on('fail', () => {
                    setPaymentInProgress(false)
                    checkout.destroy()
                })

                checkout.render('payment-form')
                setWidget(checkout)
            }

        } catch (error) {
            console.error('Payment creation failed', error)
            alert('Ошибка создания платежа')
            setPaymentInProgress(false)
        }
    }

    return (
        <Container size="xl" py="xl">
            <Stack gap="xl">
                {!paymentInProgress && !successMessage && (
                    <Stack gap="xs" align="center" ta="center">
                        <Title order={1}>Тарифные планы</Title>
                        <Text c="dimmed" maw={600}>
                            Выберите план, который подходит именно вам.
                        </Text>
                    </Stack>
                )}

                {/* Success Message */}
                {successMessage && (
                    <Card withBorder padding="xl" radius="md" style={{ borderColor: 'var(--mantine-color-green-5)', backgroundColor: 'var(--mantine-color-green-0)' }}>
                        <Stack align="center" gap="md">
                            <ThemeIcon size={60} radius="xl" color="green">
                                <IconCheck size={40} />
                            </ThemeIcon>
                            <Title order={2} c="green">Успешно!</Title>
                            <Text size="lg">{successMessage}</Text>
                            <Button onClick={() => setSuccessMessage(null)}>Вернуться к тарифам</Button>
                        </Stack>
                    </Card>
                )}

                {/* Active Subscription Status */}
                {user.subscription_expires_at && dayjs(user.subscription_expires_at).isAfter(dayjs()) && (
                    <Card withBorder padding="lg" radius="md" style={{ borderColor: 'var(--mantine-color-violet-5)', backgroundColor: 'var(--mantine-color-violet-0)' }}>
                        <Group justify="center" gap="xs">
                            <Text fw={600} c="violet">
                                Ваша подписка активна!
                            </Text>
                            <Text c="dimmed">
                                Истекает: {dayjs(user.subscription_expires_at).format('D MMMM YYYY')} ({dayjs(user.subscription_expires_at).diff(dayjs(), 'day')} дн.)
                            </Text>
                        </Group>
                    </Card>
                )}

                {/* Payment Widget Area (Replaces Plans when in progress) */}
                {paymentInProgress ? (
                    <Card withBorder padding="xl" radius="md">
                        <Stack align="center" gap="md">
                            <Title order={3}>Оплата подписки</Title>
                            <div id="payment-form" style={{ width: '100%' }}></div>
                            <Button variant="subtle" color="gray" onClick={() => {
                                setPaymentInProgress(false)
                                if (widget) widget.destroy()
                            }}>
                                Отмена
                            </Button>
                        </Stack>
                    </Card>
                ) : (
                    !successMessage && (
                        <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="lg" pt="lg">
                            {PLANS.map((plan) => (
                                <Card
                                    key={plan.id}
                                    withBorder
                                    padding="xl"
                                    radius="md"
                                    style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        borderColor: plan.popular ? 'var(--mantine-color-violet-5)' : undefined,
                                        borderWidth: plan.popular ? 2 : 1,
                                        height: '100%',
                                    }}
                                >
                                    {plan.popular && (
                                        <Badge
                                            variant="filled"
                                            color="violet"
                                            style={{ position: 'absolute', top: 12, right: 12 }}
                                        >
                                            Популярный
                                        </Badge>
                                    )}

                                    <Stack gap="xs" mt="xs">
                                        <Text fw={700} size="xl">
                                            {plan.title}
                                        </Text>
                                        <Text c="dimmed" size="sm" h={40}>
                                            {plan.description}
                                        </Text>
                                    </Stack>

                                    <Group align="flex-end" gap={4} mt="xl">
                                        {plan.price !== null ? (
                                            <>
                                                <Text fw={700} size="xl" style={{ fontSize: 32, lineHeight: 1 }}>
                                                    {plan.price.toLocaleString()} ₽
                                                </Text>
                                                <Text c="dimmed" fw={500} mb={4}>
                                                    / мес
                                                </Text>
                                            </>
                                        ) : (
                                            <Text fw={700} size="xl" style={{ fontSize: 32, lineHeight: 1 }}>
                                                Индивидуально
                                            </Text>
                                        )}
                                    </Group>

                                    <List mt="xl" spacing="sm" size="sm" center={false} icon={
                                        <ThemeIcon size={20} radius="xl" color="violet" variant="light" style={{ marginTop: 2 }}>
                                            <IconCheck size={12} stroke={1.5} />
                                        </ThemeIcon>
                                    }>
                                        {plan.features.map((feature, index) => (
                                            <List.Item
                                                key={index}
                                                icon={
                                                    !feature.included ? (
                                                        <ThemeIcon size={20} radius="xl" color="gray" variant="light" style={{ marginTop: 2 }}>
                                                            <IconX size={12} stroke={1.5} />
                                                        </ThemeIcon>
                                                    ) : undefined
                                                }
                                                style={{ opacity: feature.included ? 1 : 0.5 }}
                                            >
                                                {feature.label}
                                            </List.Item>
                                        ))}
                                    </List>

                                    <Button
                                        fullWidth
                                        mt="auto"
                                        pt="lg" // visual spacer
                                        variant={plan.popular ? 'filled' : 'outline'}
                                        color={plan.popular ? 'violet' : 'gray'}
                                        onClick={() => handlePayment(plan.id, plan.price || 0)}
                                    >
                                        {plan.buttonText}
                                    </Button>
                                </Card>
                            ))}
                        </SimpleGrid>
                    )
                )}
            </Stack>
        </Container>
    )
}
