import { Button, Card, Divider, Group, NumberInput, Radio, Stack, Text, Textarea, TextInput, Title, Checkbox } from '@mantine/core'
import { useTranslation } from 'react-i18next'
import { useAppSelector } from '@/shared/hooks/useAppSelector'
import { useAppDispatch } from '@/shared/hooks/useAppDispatch'
import { updateProfile, updateOnboardingMetrics } from '@/app/store/slices/userSlice'
import { useForm } from '@mantine/form'
import { useNavigate } from 'react-router-dom'
import { useEffect } from 'react'

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
            activityLevel: user.onboardingMetrics?.activityLevel,
        })
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user.fullName, user.email, user.phone, user.onboardingMetrics])

    const handleSubmit = (values: typeof form.values) => {
        dispatch(
            updateProfile({
                fullName: values.fullName,
                email: values.email,
                phone: values.phone || undefined,
            }),
        )

        const restrictions = values.restrictions
            ?.split(',')
            .map((v) => v.trim())
            .filter(Boolean) || []

        dispatch(
            updateOnboardingMetrics({
                weight: values.weight,
                height: values.height,
                age: values.age,
                goals: values.goals,
                restrictions: restrictions.length > 0 ? restrictions : undefined,
                activityLevel: values.activityLevel,
            }),
        )

        navigate('/profile')
    }

    return (
        <Stack gap="xl">
            <Title order={2}>{t('common.editProfile')}</Title>

            <Card withBorder padding="xl">
                <form onSubmit={form.onSubmit(handleSubmit)}>
                    <Stack gap="md">
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

