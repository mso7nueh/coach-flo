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
import { createOnlinePayment } from '@/shared/api/client'
import { useAppSelector } from '@/shared/hooks/useAppSelector'
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

    useEffect(() => {
        // Load YooKassa Widget Script
        const script = document.createElement('script')
        script.src = 'https://yookassa.ru/checkout-widget/v1/checkout-widget.js'
        script.async = true
        script.onload = () => {
            // Initialize widget if needed or just mark as loaded
            // Usually we create the widget instance when we have a confirmation token
        }
        document.body.appendChild(script)

        return () => {
            document.body.removeChild(script)
        }
    }, [])

    const handlePayment = async (planId: string, amount: number) => {
        if (!amount) {
            // Enterprise or Free logic
            alert('Contacting sales or starting free plan...')
            return
        }

        try {
            const { confirmation_token } = await createOnlinePayment({
                amount,
                description: `Подписка ${planId}`,
                plan_id: planId
            })

            if (window.YooMoneyCheckoutWidget) {
                const checkout = new window.YooMoneyCheckoutWidget({
                    confirmation_token: confirmation_token,
                    return_url: window.location.href,
                    error_callback: function (error: any) {
                        console.error(error)
                    }
                });
                checkout.render('payment-form')
            }

        } catch (error) {
            console.error('Payment creation failed', error)
            alert('Ошибка создания платежа')
        }
    }

    // Display subscription info if active
    // We need to fetch current user to check subscription_expires_at
    // assuming it is available in user profile (which we updated in backend schemas)
    // For now, let's just assume we reload or show it from props if passed, 
    // but better to use useAppSelector(state => state.user) if it was updated properly.

    // NOTE: Need to update userSlice to include the new fields in User interface first?
    // User type in client.ts was updated? No, I need to update User interface in client.ts as well!


    return (
        <Container size="xl" py="xl">
            <Stack gap="xl">
                <Stack gap="xs" align="center" ta="center">
                    <Title order={1}>Тарифные планы</Title>
                    <Text c="dimmed" maw={600}>
                        Выберите план, который подходит именно вам. От начинающих тренеров до крупных фитнес-сетей.
                    </Text>
                </Stack>

                {user.subscription_expires_at && dayjs(user.subscription_expires_at).isAfter(dayjs()) && (
                    <Card withBorder padding="lg" radius="md" style={{ borderColor: 'var(--mantine-color-violet-5)', backgroundColor: 'var(--mantine-color-violet-0)' }}>
                        <Group justify="center" gap="xs">
                            <Text fw={600} c="violet">
                                Ваша подписка активна!
                            </Text>
                            <Text c="dimmed">
                                Осталось дней: {dayjs(user.subscription_expires_at).diff(dayjs(), 'day')}
                            </Text>
                        </Group>
                    </Card>
                )}

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

                {/* Container for YooKassa widget if we wanted to render it inline */}
                <div id="payment-form"></div>
            </Stack>
        </Container>
    )
}
