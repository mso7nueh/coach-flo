import {
    Button,
    Card,
    Checkbox,
    Group,
    NumberInput,
    Radio,
    Stack,
    Stepper,
    Text,
    TextInput,
    Title,
} from '@mantine/core'
import { useTranslation } from 'react-i18next'
import { useForm } from '@mantine/form'
import { useNavigate } from 'react-router-dom'
import { useAppDispatch } from '@/shared/hooks/useAppDispatch'
import { useAppSelector } from '@/shared/hooks/useAppSelector'
import { completeOnboarding, type OnboardingMetrics } from '@/app/store/slices/userSlice'
import { useState } from 'react'
import { addBodyMetricEntry, addBodyMetric } from '@/app/store/slices/metricsSlice'

const GOALS = [
    { value: 'weight_loss', label: 'Похудение' },
    { value: 'muscle_gain', label: 'Набор мышечной массы' },
    { value: 'endurance', label: 'Выносливость' },
    { value: 'strength', label: 'Сила' },
    { value: 'flexibility', label: 'Гибкость' },
    { value: 'general_fitness', label: 'Общее здоровье' },
]

const RESTRICTIONS = [
    { value: 'back_injury', label: 'Травма спины' },
    { value: 'knee_injury', label: 'Травма колена' },
    { value: 'shoulder_injury', label: 'Травма плеча' },
    { value: 'heart_disease', label: 'Заболевания сердца' },
    { value: 'high_blood_pressure', label: 'Высокое давление' },
    { value: 'diabetes', label: 'Диабет' },
    { value: 'none', label: 'Нет ограничений' },
]

export const OnboardingPage = () => {
    const { t } = useTranslation()
    const dispatch = useAppDispatch()
    const navigate = useNavigate()
    const user = useAppSelector((state) => state.user)

    const [activeStep, setActiveStep] = useState(0)

    const form = useForm<OnboardingMetrics & { confirmPassword?: string }>({
        initialValues: {
            weight: undefined,
            height: undefined,
            age: undefined,
            goals: [],
            restrictions: [],
            activityLevel: undefined,
        },
        validate: {
            weight: (value) => (!value || value < 30 || value > 200 ? t('onboarding.validation.weightInvalid') : null),
            height: (value) => (!value || value < 100 || value > 250 ? t('onboarding.validation.heightInvalid') : null),
            age: (value) => (!value || value < 14 || value > 100 ? t('onboarding.validation.ageInvalid') : null),
            goals: (value) => (value && value.length === 0 ? t('onboarding.validation.goalsRequired') : null),
            activityLevel: (value) => (!value ? t('onboarding.validation.activityLevelRequired') : null),
        },
    })

    const handleNext = () => {
        if (activeStep === 0) {
            form.validateField('weight')
            form.validateField('height')
            form.validateField('age')
            if (form.isValid('weight') && form.isValid('height') && form.isValid('age')) {
                setActiveStep(1)
            }
        } else if (activeStep === 1) {
            form.validateField('goals')
            form.validateField('activityLevel')
            if (form.isValid('goals') && form.isValid('activityLevel')) {
                setActiveStep(2)
            }
        } else if (activeStep === 2) {
            handleComplete()
        }
    }

    const handleComplete = () => {
        const metrics = form.values
        dispatch(completeOnboarding(metrics))

        if (typeof window !== 'undefined') {
            window.localStorage.setItem('coach-fit-onboarding-seen', 'true')
        }

        if (metrics.height) {
            dispatch(
                addBodyMetric({
                    id: 'height',
                    label: 'Рост',
                    unit: 'см',
                }),
            )
        }

        if (metrics.weight) {
            dispatch(
                addBodyMetricEntry({
                    metricId: 'weight',
                    value: metrics.weight,
                    unit: 'кг',
                    recordedAt: new Date().toISOString(),
                }),
            )
        }

        if (metrics.height) {
            dispatch(
                addBodyMetricEntry({
                    metricId: 'height',
                    value: metrics.height,
                    unit: 'см',
                    recordedAt: new Date().toISOString(),
                }),
            )
        }

        navigate('/dashboard')
    }

    const handleBack = () => {
        if (activeStep > 0) {
            setActiveStep(activeStep - 1)
        }
    }

    return (
        <div
            style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '20px',
                background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%)',
            }}
        >
            <Card shadow="xl" padding="xl" radius="lg" style={{ width: '100%', maxWidth: 600 }}>
                <Stack gap="xl">
                    <Stack gap={4}>
                        <Title order={2}>{t('onboarding.welcomeTitle')}</Title>
                        <Text c="dimmed">{t('onboarding.welcomeDescription')}</Text>
                    </Stack>

                    <Stepper active={activeStep} onStepClick={setActiveStep} breakpoint="sm">
                        <Stepper.Step label={t('onboarding.steps.profile.title')} description={t('onboarding.steps.profile.description')}>
                            <Stack gap="md" mt="xl">
                                <NumberInput
                                    label={t('onboarding.weight')}
                                    placeholder={t('onboarding.weightPlaceholder')}
                                    suffix=" кг"
                                    min={30}
                                    max={200}
                                    required
                                    {...form.getInputProps('weight')}
                                />
                                <NumberInput
                                    label={t('onboarding.height')}
                                    placeholder={t('onboarding.heightPlaceholder')}
                                    suffix=" см"
                                    min={100}
                                    max={250}
                                    required
                                    {...form.getInputProps('height')}
                                />
                                <NumberInput
                                    label={t('onboarding.age')}
                                    placeholder={t('onboarding.agePlaceholder')}
                                    suffix=" лет"
                                    min={14}
                                    max={100}
                                    required
                                    {...form.getInputProps('age')}
                                />
                            </Stack>
                        </Stepper.Step>

                        <Stepper.Step label={t('onboarding.steps.goals.title')} description={t('onboarding.steps.goals.description')}>
                            <Stack gap="md" mt="xl">
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

                                <Text size="sm" fw={500} mt="md">
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
                        </Stepper.Step>

                        <Stepper.Step label={t('onboarding.steps.schedule.title')} description={t('onboarding.steps.schedule.description')}>
                            <Stack gap="md" mt="xl">
                                <Text size="sm" fw={500}>
                                    {t('onboarding.restrictions')}
                                </Text>
                                <Text size="xs" c="dimmed" mb="sm">
                                    {t('onboarding.restrictionsDescription')}
                                </Text>
                                <Checkbox.Group {...form.getInputProps('restrictions')}>
                                    <Stack gap="sm">
                                        {RESTRICTIONS.map((restriction) => (
                                            <Checkbox key={restriction.value} label={restriction.label} value={restriction.value} />
                                        ))}
                                    </Stack>
                                </Checkbox.Group>
                            </Stack>
                        </Stepper.Step>
                    </Stepper>

                    <Group justify="space-between" mt="xl">
                        <Button variant="subtle" color="gray" onClick={handleBack} disabled={activeStep === 0}>
                            {t('onboarding.back')}
                        </Button>
                        <Button onClick={handleNext}>{activeStep === 2 ? t('onboarding.finish') : t('onboarding.next')}</Button>
                    </Group>
                </Stack>
            </Card>
        </div>
    )
}

