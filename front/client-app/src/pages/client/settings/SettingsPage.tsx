import {
    Card,
    Divider,
    Group,
    NumberInput,
    SegmentedControl,
    Stack,
    Switch,
    Text,
    Title,
} from '@mantine/core'
import { useTranslation } from 'react-i18next'
import { useAppDispatch } from '@/shared/hooks/useAppDispatch'
import { useAppSelector } from '@/shared/hooks/useAppSelector'
import { setLocale } from '@/app/store/slices/userSlice'
import {
    toggleNotificationChannel,
    toggleNotificationType,
    setReminderBeforeMinutes,
} from '@/app/store/slices/notificationsSlice'
import { useId } from 'react'

export const SettingsPage = () => {
    const { t, i18n } = useTranslation()
    const locale = useAppSelector((state) => state.user.locale)
    const notificationSettings = useAppSelector((state) => state.notifications.settings)
    const dispatch = useAppDispatch()
    const labelId = useId()

    const handleLocaleChange = (value: 'ru' | 'en') => {
        dispatch(setLocale(value))
        i18n.changeLanguage(value)
    }

    return (
        <Stack gap="xl">
            <Title order={2}>{t('common.settings')}</Title>

            <Card withBorder padding="xl">
                <Stack gap="md">
                    <Group justify="space-between">
                        <Stack gap={4}>
                            <Text fw={500}>{t('settings.language')}</Text>
                            <Text size="sm" c="dimmed">
                                {t('settings.languageDescription')}
                            </Text>
                        </Stack>
                        <SegmentedControl
                            aria-labelledby={labelId}
                            value={locale}
                            onChange={(value) => handleLocaleChange(value as 'ru' | 'en')}
                            data={[
                                { label: 'Русский', value: 'ru' },
                                { label: 'English', value: 'en' },
                            ]}
                        />
                    </Group>
                </Stack>
            </Card>

            <Card withBorder padding="xl">
                <Stack gap="lg">
                    <Stack gap={4}>
                        <Title order={3}>{t('settings.notifications.title')}</Title>
                        <Text size="sm" c="dimmed">
                            {t('settings.notifications.description')}
                        </Text>
                    </Stack>

                    <Divider />

                    <Stack gap="md">
                        <Text fw={600} size="sm">
                            {t('settings.notifications.channels')}
                        </Text>
                        <Group gap="md">
                            <Switch
                                label={t('settings.notifications.email')}
                                checked={notificationSettings.emailEnabled}
                                onChange={() => dispatch(toggleNotificationChannel('email'))}
                            />
                            <Switch
                                label={t('settings.notifications.push')}
                                checked={notificationSettings.pushEnabled}
                                onChange={() => dispatch(toggleNotificationChannel('push'))}
                            />
                            <Switch
                                label={t('settings.notifications.sms')}
                                checked={notificationSettings.smsEnabled}
                                onChange={() => dispatch(toggleNotificationChannel('sms'))}
                            />
                        </Group>
                    </Stack>

                    <Divider />

                    <Stack gap="md">
                        <Text fw={600} size="sm">
                            {t('settings.notifications.types')}
                        </Text>
                        <Stack gap="xs">
                            <Switch
                                label={t('settings.notifications.workoutReminders')}
                                description={t('settings.notifications.workoutRemindersDescription')}
                                checked={notificationSettings.workoutReminders}
                                onChange={() => dispatch(toggleNotificationType('workout_reminder'))}
                            />
                            <Switch
                                label={t('settings.notifications.workoutScheduled')}
                                description={t('settings.notifications.workoutScheduledDescription')}
                                checked={notificationSettings.workoutScheduled}
                                onChange={() => dispatch(toggleNotificationType('workout_scheduled'))}
                            />
                            <Switch
                                label={t('settings.notifications.workoutCompleted')}
                                description={t('settings.notifications.workoutCompletedDescription')}
                                checked={notificationSettings.workoutCompleted}
                                onChange={() => dispatch(toggleNotificationType('workout_completed'))}
                            />
                            <Switch
                                label={t('settings.notifications.metricsUpdate')}
                                description={t('settings.notifications.metricsUpdateDescription')}
                                checked={notificationSettings.metricsUpdate}
                                onChange={() => dispatch(toggleNotificationType('metrics_update'))}
                            />
                            <Switch
                                label={t('settings.notifications.trainerNote')}
                                description={t('settings.notifications.trainerNoteDescription')}
                                checked={notificationSettings.trainerNote}
                                onChange={() => dispatch(toggleNotificationType('trainer_note'))}
                            />
                        </Stack>
                    </Stack>

                    <Divider />

                    <Stack gap="md">
                        <Group justify="space-between" align="flex-start">
                            <Stack gap={4}>
                                <Text fw={600} size="sm">
                                    {t('settings.notifications.reminderBefore')}
                                </Text>
                                <Text size="xs" c="dimmed">
                                    {t('settings.notifications.reminderBeforeDescription')}
                                </Text>
                            </Stack>
                            <NumberInput
                                value={notificationSettings.reminderBeforeMinutes}
                                onChange={(value) =>
                                    dispatch(setReminderBeforeMinutes(Number(value) || 30))
                                }
                                min={5}
                                max={1440}
                                step={5}
                                suffix=" мин"
                                style={{ width: '120px' }}
                            />
                        </Group>
                    </Stack>
                </Stack>
            </Card>
        </Stack>
    )
}

