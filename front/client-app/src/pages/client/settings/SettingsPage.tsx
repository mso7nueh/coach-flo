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
import { updateSettingsApi, getSettingsApi } from '@/app/store/slices/userSlice'
import {
    toggleNotificationChannel,
    toggleNotificationType,
    setReminderBeforeMinutes,
    updateNotificationSettings,
} from '@/app/store/slices/notificationsSlice'
import { useId, useEffect, useRef } from 'react'
import { notifications } from '@mantine/notifications'

export const SettingsPage = () => {
    const { t, i18n } = useTranslation()
    const locale = useAppSelector((state) => state.user.locale)
    const notificationSettings = useAppSelector((state) => state.notifications.settings)
    const dispatch = useAppDispatch()
    const labelId = useId()
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
    const isInitialMount = useRef(true)

    useEffect(() => {
        // Загружаем настройки при монтировании компонента (только один раз)
        dispatch(getSettingsApi()).then((result) => {
            if (getSettingsApi.fulfilled.match(result)) {
                dispatch(updateNotificationSettings(result.payload.notificationSettings))
                if (result.payload.locale) {
                    i18n.changeLanguage(result.payload.locale)
                }
            }
            // Помечаем, что начальная загрузка завершена
            isInitialMount.current = false
        })
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []) // Загружаем только при монтировании

    const handleLocaleChange = async (value: 'ru' | 'en') => {
        try {
            await dispatch(
                updateSettingsApi({
                    locale: value,
                    notificationSettings: notificationSettings,
                }),
            ).unwrap()
            i18n.changeLanguage(value)
            notifications.show({
                title: t('common.success'),
                message: t('settings.updated'),
                color: 'green',
            })
        } catch (error: any) {
            notifications.show({
                title: t('common.error'),
                message: error?.message || t('settings.error.update'),
                color: 'red',
            })
        }
    }

    // Автоматически сохраняем настройки уведомлений при их изменении (debounce)
    useEffect(() => {
        // Не сохраняем при первой загрузке (настройки загружаются из API)
        if (isInitialMount.current) {
            return
        }

        // Очищаем предыдущий таймаут
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current)
        }

        // Сохраняем с задержкой (debounce) после изменений
        saveTimeoutRef.current = setTimeout(async () => {
            try {
                await dispatch(
                    updateSettingsApi({
                        locale: locale,
                        notificationSettings: notificationSettings,
                    }),
                ).unwrap()
            } catch (error: any) {
                notifications.show({
                    title: t('common.error'),
                    message: error?.message || t('settings.error.update'),
                    color: 'red',
                })
            }
        }, 1000)

        // Очищаем таймаут при размонтировании или при изменении зависимостей
        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current)
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [notificationSettings]) // Сохраняем при изменении настроек уведомлений

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
                                onChange={() => {
                                    dispatch(toggleNotificationChannel('email'))
                                }}
                            />
                            <Switch
                                label={t('settings.notifications.push')}
                                checked={notificationSettings.pushEnabled}
                                onChange={() => {
                                    dispatch(toggleNotificationChannel('push'))
                                }}
                            />
                            <Switch
                                label={t('settings.notifications.sms')}
                                checked={notificationSettings.smsEnabled}
                                onChange={() => {
                                    dispatch(toggleNotificationChannel('sms'))
                                }}
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
                                onChange={() => {
                                    dispatch(toggleNotificationType('workout_reminder'))
                                }}
                            />
                            <Switch
                                label={t('settings.notifications.workoutScheduled')}
                                description={t('settings.notifications.workoutScheduledDescription')}
                                checked={notificationSettings.workoutScheduled}
                                onChange={() => {
                                    dispatch(toggleNotificationType('workout_scheduled'))
                                }}
                            />
                            <Switch
                                label={t('settings.notifications.workoutCompleted')}
                                description={t('settings.notifications.workoutCompletedDescription')}
                                checked={notificationSettings.workoutCompleted}
                                onChange={() => {
                                    dispatch(toggleNotificationType('workout_completed'))
                                }}
                            />
                            <Switch
                                label={t('settings.notifications.metricsUpdate')}
                                description={t('settings.notifications.metricsUpdateDescription')}
                                checked={notificationSettings.metricsUpdate}
                                onChange={() => {
                                    dispatch(toggleNotificationType('metrics_update'))
                                }}
                            />
                            <Switch
                                label={t('settings.notifications.trainerNote')}
                                description={t('settings.notifications.trainerNoteDescription')}
                                checked={notificationSettings.trainerNote}
                                onChange={() => {
                                    dispatch(toggleNotificationType('trainer_note'))
                                }}
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
                                onChange={(value) => {
                                    dispatch(setReminderBeforeMinutes(Number(value) || 30))
                                }}
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

