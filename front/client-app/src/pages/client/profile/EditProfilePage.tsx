import { Button, Card, Divider, Group, NumberInput, Radio, Stack, Text, Textarea, TextInput, Title, Checkbox } from '@mantine/core'
import { useTranslation } from 'react-i18next'
import { useAppSelector } from '@/shared/hooks/useAppSelector'
import { useAppDispatch } from '@/shared/hooks/useAppDispatch'
import { updateUserApi, updateOnboardingApi } from '@/app/store/slices/userSlice'
import { useForm } from '@mantine/form'
import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { notifications } from '@mantine/notifications'
import { Avatar, FileButton, ActionIcon } from '@mantine/core'
import { IconCamera, IconUpload, IconX } from '@tabler/icons-react'
import heic2any from 'heic2any'

const GOALS = [
    { value: 'weight_loss', label: 'Похудение' },
    { value: 'muscle_gain', label: 'Набор мышечной массы' },
    { value: 'endurance', label: 'Выносливость' },
    { value: 'strength', label: 'Сила' },
    { value: 'flexibility', label: 'Гибкость' },
    { value: 'general_fitness', label: 'Общее здоровье' },
]

export const EditProfilePage = () => {
    const { t } = useTranslation()
    const user = useAppSelector((state) => state.user)
    const dispatch = useAppDispatch()
    const navigate = useNavigate()

    const form = useForm({
        initialValues: {
            fullName: user.fullName,
            email: user.email,
            phone: user.phone || '',
            weight: user.onboardingMetrics?.weight,
            height: user.onboardingMetrics?.height,
            age: user.onboardingMetrics?.age,
            goals: user.onboardingMetrics?.goals || [],
            restrictions: user.onboardingMetrics?.restrictions?.join(', ') || '',
            activityLevel: user.onboardingMetrics?.activityLevel,
            avatar: user.avatar || null,
        },
        validate: {
            fullName: (value) => (value.trim().length < 2 ? t('profile.validation.nameRequired') : null),
            email: (value) => (/^\S+@\S+$/.test(value) ? null : t('profile.validation.emailInvalid')),
        },
    })

    useEffect(() => {
        form.setValues({
            fullName: user.fullName,
            email: user.email,
            phone: user.phone || '',
            weight: user.onboardingMetrics?.weight,
            height: user.onboardingMetrics?.height,
            age: user.onboardingMetrics?.age,
            goals: user.onboardingMetrics?.goals || [],
            restrictions: user.onboardingMetrics?.restrictions?.join(', ') || '',
        })
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user.fullName, user.email, user.phone, user.onboardingMetrics, user.avatar])

    const [avatarFile, setAvatarFile] = useState<File | null>(null)
    const [isConverting, setIsConverting] = useState(false)

    const handleAvatarChange = async (file: File | null) => {
        if (!file) return
        setAvatarFile(file)

        // If HEIC, convert to JPEG for preview or immediate upload if needed
        if (file.name.toLowerCase().endsWith('.heic') || file.type === 'image/heic') {
            setIsConverting(true)
            try {
                const converted = await heic2any({ blob: file, toType: 'image/jpeg' })
                const blob = Array.isArray(converted) ? converted[0] : converted
                const jpegFile = new File([blob], file.name.replace(/\.heic$/i, '.jpg'), { type: 'image/jpeg' })
                setAvatarFile(jpegFile)
                // In a real app, you might upload here or on form submit
                // For simplicity, we'll just keep it in state and let the user click save
            } catch (e) {
                console.error('HEIC conversion failed', e)
            } finally {
                setIsConverting(false)
            }
        }
    }

    const handleSubmit = async (values: typeof form.values) => {
        try {
            // Обновляем профиль пользователя
            await dispatch(
                updateUserApi({
                    full_name: values.fullName,
                    email: values.email,
                    phone: values.phone || undefined,
                    // If we had a base64 or upload URL for avatar, we'd add it here
                }),
            ).unwrap()

            // Обновляем данные онбординга
            const restrictions = values.restrictions
                ?.split(',')
                .map((v) => v.trim())
                .filter(Boolean) || []

            await dispatch(
                updateOnboardingApi({
                    weight: values.weight,
                    height: values.height,
                    age: values.age,
                    goals: values.goals,
                    restrictions: restrictions.length > 0 ? restrictions : undefined,
                    activityLevel: values.activityLevel,
                }),
            ).unwrap()

            notifications.show({
                title: t('common.success'),
                message: t('profile.updated'),
                color: 'green',
            })

            navigate('/profile')
        } catch (error: any) {
            notifications.show({
                title: t('common.error'),
                message: error?.message || t('profile.error.update'),
                color: 'red',
            })
        }
    }

    return (
        <Stack gap="xl">
            <Title order={2}>{t('common.editProfile')}</Title>

            <Card withBorder padding="xl">
                <form onSubmit={form.onSubmit(handleSubmit)}>
                    <Stack gap="md">
                        <Group gap="xl" align="center" mb="md">
                            <Stack align="center" gap="xs">
                                <Avatar
                                    src={avatarFile ? URL.createObjectURL(avatarFile) : user.avatar}
                                    size={100}
                                    radius={100}
                                    color="violet"
                                >
                                    {user.fullName.split(' ').map(n => n[0]).join('')}
                                </Avatar>
                                <FileButton onChange={handleAvatarChange} accept="image/*">
                                    {(props) => (
                                        <Button {...props} variant="light" size="xs" color="violet" loading={isConverting} leftSection={<IconCamera size={14} />}>
                                            {t('profile.changePhoto')}
                                        </Button>
                                    )}
                                </FileButton>
                            </Stack>
                            <Stack gap={4} style={{ flex: 1 }}>
                                <Text fw={600} size="lg">{user.fullName}</Text>
                                <Text size="sm" c="dimmed">{user.email}</Text>
                            </Stack>
                        </Group>

                        <TextInput
                            label={t('profile.fullName')}
                            placeholder={t('profile.fullNamePlaceholder')}
                            {...form.getInputProps('fullName')}
                            required
                        />
                        <TextInput
                            label={t('profile.email')}
                            placeholder={t('profile.emailPlaceholder')}
                            type="email"
                            {...form.getInputProps('email')}
                            required
                        />
                        <TextInput
                            label={t('profile.phone')}
                            placeholder={t('profile.phonePlaceholder')}
                            {...form.getInputProps('phone')}
                        />

                        <Divider label={t('profile.onboardingData')} labelPosition="left" mt="md" />

                        <Group grow>
                            <NumberInput
                                label={t('onboarding.weight')}
                                placeholder={t('onboarding.weightPlaceholder')}
                                suffix=" кг"
                                min={30}
                                max={200}
                                {...form.getInputProps('weight')}
                            />
                            <NumberInput
                                label={t('onboarding.height')}
                                placeholder={t('onboarding.heightPlaceholder')}
                                suffix=" см"
                                min={100}
                                max={250}
                                {...form.getInputProps('height')}
                            />
                            <NumberInput
                                label={t('onboarding.age')}
                                placeholder={t('onboarding.agePlaceholder')}
                                suffix=" лет"
                                min={14}
                                max={100}
                                {...form.getInputProps('age')}
                            />
                        </Group>

                        <Stack gap="xs">
                            <Text size="sm" fw={500}>
                                {t('onboarding.goals')}
                            </Text>
                            <Checkbox.Group {...form.getInputProps('goals')}>
                                <Stack gap="sm">
                                    {GOALS.map((goal) => (
                                        <Checkbox key={goal.value} label={goal.label} value={goal.value} />
                                    ))}
                                </Stack>
                            </Checkbox.Group>
                        </Stack>

                        <Stack gap="xs">
                            <Text size="sm" fw={500}>
                                {t('onboarding.activityLevel')}
                            </Text>
                            <Radio.Group {...form.getInputProps('activityLevel')}>
                                <Stack gap="sm">
                                    <Radio label={t('onboarding.activityLow')} value="low" />
                                    <Radio label={t('onboarding.activityMedium')} value="medium" />
                                    <Radio label={t('onboarding.activityHigh')} value="high" />
                                </Stack>
                            </Radio.Group>
                        </Stack>

                        <Textarea
                            label={t('onboarding.restrictions')}
                            placeholder={t('onboarding.restrictionsDescription')}
                            description={t('onboarding.restrictionsDescription')}
                            minRows={3}
                            {...form.getInputProps('restrictions')}
                        />

                        <Group justify="flex-end" mt="md">
                            <Button variant="subtle" onClick={() => navigate('/profile')}>
                                {t('common.cancel')}
                            </Button>
                            <Button type="submit">{t('common.save')}</Button>
                        </Group>
                    </Stack>
                </form>
            </Card>
        </Stack>
    )
}

