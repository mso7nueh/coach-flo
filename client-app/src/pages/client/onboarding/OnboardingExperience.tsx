import {
  Button,
  Group,
  List,
  Modal,
  Paper,
  Stack,
  Stepper,
  Text,
  Title,
} from '@mantine/core'
import { IconCheck } from '@tabler/icons-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppDispatch } from '@/shared/hooks/useAppDispatch'
import { useAppSelector } from '@/shared/hooks/useAppSelector'
import { markOnboardingSeen } from '@/app/store/slices/userSlice'

const STORAGE_KEY = 'coach-fit-onboarding-seen'

const shouldShowOnboarding = (role: string, onboardingSeen: boolean): boolean => {
  if (role !== 'client') {
    return false
  }
  if (onboardingSeen) {
    return false
  }
  if (typeof window === 'undefined') {
    return false
  }
  const stored = window.localStorage.getItem(STORAGE_KEY)
  return !stored
}

export const OnboardingExperience = () => {
  const { t } = useTranslation()
  const dispatch = useAppDispatch()
  const user = useAppSelector((state) => state.user)
  const role = user.role
  const [opened, setOpened] = useState(() => shouldShowOnboarding(role, user.onboardingSeen))
  const [activeStep, setActiveStep] = useState(0)

  const steps = useMemo(
    () => [
      {
        title: t('onboarding.steps.profile.title'),
        description: t('onboarding.steps.profile.description'),
        items: [t('metricsPage.addValue'), t('metricsPage.configureMetrics')],
      },
      {
        title: t('onboarding.steps.goals.title'),
        description: t('onboarding.steps.goals.description'),
        items: [t('dashboard.configureMetrics'), t('calendar.upcoming')],
      },
      {
        title: t('onboarding.steps.schedule.title'),
        description: t('onboarding.steps.schedule.description'),
        items: [t('calendar.title'), t('program.assignToCalendar')],
      },
    ],
    [t],
  )

  const completeOnboarding = () => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, 'true')
    }
    dispatch(markOnboardingSeen())
    setOpened(false)
  }

  const nextStep = () => {
    if (activeStep < steps.length - 1) {
      setActiveStep((step) => step + 1)
    } else {
      completeOnboarding()
    }
  }

  const skip = () => {
    completeOnboarding()
  }

  if (!opened || role !== 'client') {
    return null
  }

  return (
    <Modal opened={opened} onClose={skip} size="lg" radius="lg" withCloseButton={false}>
      <Stack gap="lg">
        <Stack gap={4}>
          <Title order={2}>{t('onboarding.welcomeTitle')}</Title>
          <Text c="dimmed">{t('onboarding.welcomeDescription')}</Text>
        </Stack>
        <Stepper active={activeStep} onStepClick={setActiveStep}>
          {steps.map((step, index) => (
            <Stepper.Step key={step.title} label={step.title} description={step.description}>
              <Paper p="md" radius="md" withBorder>
                <List spacing="sm">
                  {step.items.map((item, itemIndex) => (
                    <List.Item key={`${index}-${itemIndex}`} icon={<IconCheck size={16} color="var(--mantine-color-violet-6)" />}>
                      {item}
                    </List.Item>
                  ))}
                </List>
              </Paper>
            </Stepper.Step>
          ))}
        </Stepper>
        <Group justify="space-between">
          <Button variant="subtle" color="gray" onClick={skip}>
            {t('onboarding.skip')}
          </Button>
          <Button onClick={nextStep}>{activeStep === steps.length - 1 ? t('onboarding.finish') : t('onboarding.start')}</Button>
        </Group>
      </Stack>
    </Modal>
  )
}

