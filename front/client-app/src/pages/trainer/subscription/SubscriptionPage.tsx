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

        // Mock getting confirmation token from backend
        // In real app: const { confirmation_token } = await api.createPayment({ amount, planId })
        // Since we don't have the backend endpoint yet, we'll demonstrate where the widget would initialize.

        console.log(`Initiating payment for ${planId}: ${amount} RUB`)
        alert(`Payment integration would start here for ${planId}. Need backend to generate confirmation_token using ShopID: 1252826`)

        /*
        // Example YooKassa Widget Usage:
        const checkout = new window.YooMoneyCheckoutWidget({
            confirmation_token: 'TOKEN_FROM_BACKEND', // Token obtained from your backend
            return_url: window.location.href, // Return URL after payment
            error_callback: function(error: any) {
                console.error(error)
            }
        });

        checkout.render('payment-form') or checkout.on('success', ...)
        */
    }

    return (
        <Container size="xl" py="xl">
            <Stack gap="xl">
                <Stack gap="xs" align="center" ta="center">
                    <Title order={1}>Тарифные планы</Title>
                    <Text c="dimmed" maw={600}>
                        Выберите план, который подходит именно вам. От начинающих тренеров до крупных фитнес-сетей.
                    </Text>
                </Stack>

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
