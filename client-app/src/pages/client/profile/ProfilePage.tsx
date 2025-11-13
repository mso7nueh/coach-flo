import { Avatar, Button, Card, Group, Stack, Text, Title } from '@mantine/core'
import { useTranslation } from 'react-i18next'
import { useAppSelector } from '@/shared/hooks/useAppSelector'
import { IconMail, IconPhone, IconUserEdit } from '@tabler/icons-react'
import { NavLink } from 'react-router-dom'

const getInitials = (name: string) => {
    return name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
}

export const ProfilePage = () => {
    const { t } = useTranslation()
    const user = useAppSelector((state) => state.user)

    return (
        <Stack gap="xl">
            <Group justify="space-between">
                <Title order={2}>{t('common.profile')}</Title>
                <Button leftSection={<IconUserEdit size={16} />} component={NavLink} to="/profile/edit">
                    {t('common.editProfile')}
                </Button>
            </Group>

            <Card withBorder padding="xl">
                <Stack gap="lg">
                    <Group gap="md">
                        <Avatar size={80} color="violet">
                            {getInitials(user.fullName)}
                        </Avatar>
                        <Stack gap={4}>
                            <Title order={3}>{user.fullName}</Title>
                            <Text c="dimmed" size="sm">
                                {t('common.roleClient')}
                            </Text>
                        </Stack>
                    </Group>

                    <Stack gap="md">
                        <Group gap="sm">
                            <IconMail size={18} color="var(--mantine-color-gray-6)" />
                            <Stack gap={2}>
                                <Text size="xs" c="dimmed">
                                    {t('profile.email')}
                                </Text>
                                <Text size="sm" fw={500}>
                                    {user.email}
                                </Text>
                            </Stack>
                        </Group>

                        {user.phone && (
                            <Group gap="sm">
                                <IconPhone size={18} color="var(--mantine-color-gray-6)" />
                                <Stack gap={2}>
                                    <Text size="xs" c="dimmed">
                                        {t('profile.phone')}
                                    </Text>
                                    <Text size="sm" fw={500}>
                                        {user.phone}
                                    </Text>
                                </Stack>
                            </Group>
                        )}
                    </Stack>
                </Stack>
            </Card>

            {user.trainer && (
                <Card withBorder padding="xl">
                    <Stack gap="md">
                        <Title order={4}>{t('common.myTrainer')}</Title>
                        <Group gap="md">
                            <Avatar size={60} color="blue">
                                {getInitials(user.trainer.fullName)}
                            </Avatar>
                            <Stack gap={4} flex={1}>
                                <Text fw={600} size="lg">
                                    {user.trainer.fullName}
                                </Text>
                                {user.trainer.email && (
                                    <Group gap="xs">
                                        <IconMail size={16} color="var(--mantine-color-gray-6)" />
                                        <Text size="sm" c="dimmed">
                                            {user.trainer.email}
                                        </Text>
                                    </Group>
                                )}
                                {user.trainer.phone && (
                                    <Group gap="xs">
                                        <IconPhone size={16} color="var(--mantine-color-gray-6)" />
                                        <Text size="sm" c="dimmed">
                                            {user.trainer.phone}
                                        </Text>
                                    </Group>
                                )}
                            </Stack>
                        </Group>
                    </Stack>
                </Card>
            )}
        </Stack>
    )
}

