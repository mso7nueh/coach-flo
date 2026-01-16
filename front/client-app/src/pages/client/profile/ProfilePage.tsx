import { Avatar, Badge, Button, Card, Group, Stack, Text, Title, TextInput, Alert } from '@mantine/core'
import { useTranslation } from 'react-i18next'
import { useAppSelector } from '@/shared/hooks/useAppSelector'
import { useAppDispatch } from '@/shared/hooks/useAppDispatch'
import { linkTrainerApi, unlinkTrainerApi } from '@/app/store/slices/userSlice'
import { IconMail, IconPhone, IconUserEdit, IconCopy, IconCheck } from '@tabler/icons-react'
import { NavLink } from 'react-router-dom'
import { useState } from 'react'

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
    const dispatch = useAppDispatch()
    const user = useAppSelector((state) => state.user)
    const [codeCopied, setCodeCopied] = useState(false)
    const [trainerCode, setTrainerCode] = useState('')
    const [trainerMessage, setTrainerMessage] = useState<string | null>(null)
    const isTrainer = user.role === 'trainer'

    const handleCopyCode = async () => {
        if (user.trainerConnectionCode) {
            await navigator.clipboard.writeText(user.trainerConnectionCode)
            setCodeCopied(true)
            setTimeout(() => setCodeCopied(false), 2000)
        }
    }

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
                            <Badge color="violet" variant="light">
                                {isTrainer ? t('common.roleTrainer') : t('common.roleClient')}
                            </Badge>
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

            {isTrainer && user.trainerConnectionCode && (
                <Card withBorder padding="xl">
                    <Stack gap="md">
                        <Title order={4}>{t('profile.connectionCode')}</Title>
                        <Group gap="md">
                            <Text size="lg" fw={600} style={{ fontFamily: 'monospace', letterSpacing: '2px' }}>
                                {user.trainerConnectionCode}
                            </Text>
                            <Button
                                variant="light"
                                size="sm"
                                leftSection={codeCopied ? <IconCheck size={16} /> : <IconCopy size={16} />}
                                onClick={handleCopyCode}
                            >
                                {codeCopied ? t('profile.codeCopied') : t('profile.copyCode')}
                            </Button>
                        </Group>
                        <Text size="sm" c="dimmed">
                            {t('profile.connectionCodeDescription')}
                        </Text>
                    </Stack>
                </Card>
            )}

            {isTrainer && user.trainer?.description && (
                <Card withBorder padding="xl">
                    <Stack gap="md">
                        <Title order={4}>{t('profile.description')}</Title>
                        <Text size="sm" c="dimmed">
                            {user.trainer.description}
                        </Text>
                    </Stack>
                </Card>
            )}

            {!isTrainer && user.trainer && (
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
                                {user.trainer.description && (
                                    <Text size="sm" c="dimmed" mt="xs">
                                        {user.trainer.description}
                                    </Text>
                                )}
                                {user.trainer.email && (
                                    <Group gap="xs" mt="xs">
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
                        <Group justify="flex-end">
                            <Button
                                variant="outline"
                                color="red"
                                size="xs"
                                onClick={async () => {
                                    try {
                                        await dispatch(unlinkTrainerApi()).unwrap()
                                        setTrainerMessage(t('profile.trainerRemoved'))
                                    } catch (error) {
                                        setTrainerMessage(error instanceof Error ? error.message : t('profile.error'))
                                    }
                                }}
                            >
                                {t('profile.removeTrainer')}
                            </Button>
                        </Group>
                        {trainerMessage && (
                            <Alert color="green" radius="md">
                                {trainerMessage}
                            </Alert>
                        )}
                    </Stack>
                </Card>
            )}

            {!isTrainer && !user.trainer && (
                <Card withBorder padding="xl">
                    <Stack gap="md">
                        <Title order={4}>{t('profile.addTrainer')}</Title>
                        <Text size="sm" c="dimmed">
                            {t('profile.trainerCodeHelp')}
                        </Text>
                        <Group align="flex-end" gap="md">
                            <TextInput
                                label={t('profile.trainerCodeLabel')}
                                placeholder={t('profile.trainerCodePlaceholder')}
                                value={trainerCode}
                                onChange={(event) => setTrainerCode(event.currentTarget.value)}
                                style={{ flex: 1 }}
                            />
                            <Button
                                onClick={async () => {
                                    const code = trainerCode.trim()
                                    if (!code) return
                                    try {
                                        await dispatch(linkTrainerApi(code)).unwrap()
                                        setTrainerMessage(t('profile.trainerConnected'))
                                        setTrainerCode('') // Очищаем поле после успешного связывания
                                    } catch (error) {
                                        setTrainerMessage(error instanceof Error ? error.message : t('profile.error'))
                                    }
                                }}
                            >
                                {t('profile.addTrainer')}
                            </Button>
                        </Group>
                        {trainerMessage && (
                            <Alert color="green" radius="md">
                                {trainerMessage}
                            </Alert>
                        )}
                    </Stack>
                </Card>
            )}
        </Stack>
    )
}

