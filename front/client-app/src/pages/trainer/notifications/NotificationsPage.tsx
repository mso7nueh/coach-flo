import {
    Badge,
    Card,
    Container,
    Group,
    Stack,
    Text,
    Title,
    ActionIcon,
    Tooltip,
    LoadingOverlay,
    Button,
} from '@mantine/core'
import { IconBell, IconCheck, IconExternalLink, IconTrash } from '@tabler/icons-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { apiClient, type Notification } from '../../../shared/api/client'
import dayjs from 'dayjs'
import { notifications as mantineNotifications } from '@mantine/notifications'
import { useNavigate } from 'react-router-dom'

export default function NotificationsPage() {
    const { t } = useTranslation()
    const navigate = useNavigate()
    const [notifications, setNotifications] = useState<Notification[]>([])
    const [loading, setLoading] = useState(true)

    const fetchNotifications = async () => {
        try {
            setLoading(true)
            const data = await apiClient.getNotifications()
            setNotifications(data)
        } catch (error) {
            console.error('Failed to fetch notifications:', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchNotifications()
    }, [])

    const markAsRead = async (id: string) => {
        try {
            await apiClient.markNotificationAsRead(id)
            setNotifications((prev) =>
                prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
            )
        } catch (error) {
            console.error('Failed to mark as read:', error)
        }
    }

    const deleteNotification = async (id: string) => {
        try {
            await apiClient.deleteNotification(id)
            setNotifications((prev) => prev.filter((n) => n.id !== id))
            mantineNotifications.show({
                title: t('common.success'),
                message: t('notificationsPage.deleted'),
                color: 'green',
            })
        } catch (error) {
            console.error('Failed to delete notification:', error)
        }
    }

    const handleNotificationClick = (notification: Notification) => {
        if (!notification.is_read) {
            markAsRead(notification.id)
        }
        if (notification.link) {
            navigate(notification.link)
        }
    }

    return (
        <Container size="md" py="xl">
            <Stack gap="lg">
                <Group justify="space-between">
                    <Title order={2}>
                        {t('notificationsPage.title')}
                        {notifications.filter((n) => !n.is_read).length > 0 && (
                            <Badge color="red" size="lg" ml="md">
                                {notifications.filter((n) => !n.is_read).length}
                            </Badge>
                        )}
                    </Title>
                </Group>

                <Card withBorder radius="md" p={0} style={{ position: 'relative', minHeight: '200px' }}>
                    <LoadingOverlay visible={loading} overlayProps={{ blur: 2 }} />

                    {notifications.length === 0 && !loading ? (
                        <Stack align="center" py={50} gap="md">
                            <IconBell size={48} color="var(--mantine-color-gray-4)" />
                            <Text c="dimmed">{t('notificationsPage.empty')}</Text>
                        </Stack>
                    ) : (
                        <Stack gap={0}>
                            {notifications.map((n) => (
                                <UnstyledNotificationItem
                                    key={n.id}
                                    notification={n}
                                    onClick={() => handleNotificationClick(n)}
                                    onMarkAsRead={() => markAsRead(n.id)}
                                    onDelete={() => deleteNotification(n.id)}
                                    t={t}
                                />
                            ))}
                        </Stack>
                    )}
                </Card>
            </Stack>
        </Container>
    )
}

function UnstyledNotificationItem({
    notification,
    onClick,
    onMarkAsRead,
    onDelete,
    t,
}: {
    notification: Notification
    onClick: () => void
    onMarkAsRead: () => void
    onDelete: () => void
    t: any
}) {
    return (
        <Group
            wrap="nowrap"
            p="md"
            gap="md"
            style={{
                borderBottom: '1px solid var(--mantine-color-gray-2)',
                cursor: 'pointer',
                backgroundColor: notification.is_read ? 'transparent' : 'var(--mantine-color-blue-0)',
                transition: 'background-color 0.2s ease',
            }}
            onClick={onClick}
        >
            <div style={{ flex: 1 }}>
                <Group justify="space-between" mb={4}>
                    <Text fw={notification.is_read ? 500 : 700} size="sm">
                        {notification.title}
                    </Text>
                    <Text size="xs" c="dimmed">
                        {dayjs(notification.created_at).format('D MMM, HH:mm')}
                    </Text>
                </Group>
                <Text size="sm" c="dimmed">
                    {notification.content}
                </Text>
            </div>

            <Group gap={8} wrap="nowrap" onClick={(e) => e.stopPropagation()}>
                {!notification.is_read && (
                    <Tooltip label={t('notificationsPage.markAsRead')}>
                        <ActionIcon variant="light" color="blue" onClick={onMarkAsRead}>
                            <IconCheck size={16} />
                        </ActionIcon>
                    </Tooltip>
                )}
                {notification.link && (
                    <Tooltip label={t('common.view')}>
                        <ActionIcon variant="light" color="gray" onClick={onClick}>
                            <IconExternalLink size={16} />
                        </ActionIcon>
                    </Tooltip>
                )}
                <Tooltip label={t('common.delete')}>
                    <ActionIcon variant="light" color="red" onClick={onDelete}>
                        <IconTrash size={16} />
                    </ActionIcon>
                </Tooltip>
            </Group>
        </Group>
    )
}
