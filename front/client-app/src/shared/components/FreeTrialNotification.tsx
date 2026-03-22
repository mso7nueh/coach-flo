import { Modal, Stack, Title, Text, Button, ThemeIcon, Group } from '@mantine/core'
import { IconGift } from '@tabler/icons-react'
import { useState, useEffect } from 'react'
import { useAppSelector } from '@/shared/hooks/useAppSelector'
import dayjs from 'dayjs'

const TRIAL_DAYS = 14
const STORAGE_KEY = 'trial_popup_seen'

export const FreeTrialNotification = () => {
    const user = useAppSelector((state) => state.user)
    const [opened, setOpened] = useState(false)

    useEffect(() => {
        // Only show for trainers without a paid subscription
        if (user.role !== 'trainer') return
        if (user.subscription_expires_at && dayjs(user.subscription_expires_at).isAfter(dayjs())) return
        if (!user.isAuthenticated || !user.created_at) return

        // Show only once per session
        const seen = localStorage.getItem(STORAGE_KEY)
        if (!seen) {
            setOpened(true)
        }
    }, [user.isAuthenticated, user.created_at, user.role, user.subscription_expires_at])

    const handleClose = () => {
        localStorage.setItem(STORAGE_KEY, '1')
        setOpened(false)
    }

    if (!opened) return null

    const trialEnd = user.created_at ? dayjs(user.created_at).add(TRIAL_DAYS, 'day') : null
    const daysLeft = trialEnd ? Math.max(0, trialEnd.diff(dayjs(), 'day')) : TRIAL_DAYS

    return (
        <Modal
            opened={opened}
            onClose={handleClose}
            withCloseButton={false}
            centered
            size="md"
            radius="lg"
            overlayProps={{ blur: 3, backgroundOpacity: 0.55 }}
        >
            <Stack align="center" gap="lg" py="md">
                <ThemeIcon size={72} radius="xl" color="violet" variant="light">
                    <IconGift size={40} />
                </ThemeIcon>

                <Stack align="center" gap="xs">
                    <Title order={2} ta="center" c="violet">
                        Добро пожаловать в Coach Flo!
                    </Title>
                    <Text ta="center" c="dimmed" size="md">
                        Ваш бесплатный пробный период начался!
                    </Text>
                </Stack>

                <div
                    style={{
                        background: 'var(--mantine-color-violet-0)',
                        border: '2px solid var(--mantine-color-violet-3)',
                        borderRadius: 'var(--mantine-radius-lg)',
                        padding: '16px 32px',
                        textAlign: 'center',
                    }}
                >
                    <Text size="xl" fw={800} c="violet">
                        {daysLeft} дней
                    </Text>
                    <Text size="sm" c="dimmed">
                        бесплатного доступа ко всем функциям
                    </Text>
                </div>

                <Text ta="center" size="sm" c="dimmed" maw={340}>
                    Используйте все возможности платформы без ограничений. По истечению пробного периода
                    выберите подходящий тарифный план.
                </Text>

                <Group justify="center">
                    <Button size="md" color="violet" onClick={handleClose} radius="lg">
                        Начать работу!
                    </Button>
                </Group>
            </Stack>
        </Modal>
    )
}
