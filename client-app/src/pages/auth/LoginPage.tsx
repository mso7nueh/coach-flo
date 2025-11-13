import { Button, Card, Stack, Text, TextInput, Title, PasswordInput } from '@mantine/core'
import { useTranslation } from 'react-i18next'
import { useForm } from '@mantine/form'
import { useNavigate, Link } from 'react-router-dom'
import { useAppDispatch } from '@/shared/hooks/useAppDispatch'
import { login, type LoginCredentials } from '@/app/store/slices/userSlice'
import { nanoid } from '@reduxjs/toolkit'

export const LoginPage = () => {
    const { t } = useTranslation()
    const dispatch = useAppDispatch()
    const navigate = useNavigate()

    const form = useForm<LoginCredentials>({
        initialValues: {
            email: '',
            password: '',
        },
        validate: {
            email: (value) => (/^\S+@\S+$/.test(value) ? null : t('profile.validation.emailInvalid')),
            password: (value) => (value.length < 6 ? t('auth.passwordTooShort') : null),
        },
    })

    const handleSubmit = (values: LoginCredentials) => {
        const mockToken = `token-${nanoid()}`
        const onboardingSeen = localStorage.getItem('coach-fit-onboarding-seen') === 'true'
        dispatch(
            login({
                user: {
                    id: 'client-001',
                    fullName: 'Алексей Петров',
                    email: values.email,
                    phone: '+7 (999) 123-45-67',
                    role: 'client',
                    onboardingSeen,
                    locale: 'ru',
                    trainer: {
                        id: 'trainer-001',
                        fullName: 'Иван Сидоров',
                        email: 'ivan.sidorov@coachfit.com',
                        phone: '+7 (999) 765-43-21',
                    },
                },
                token: mockToken,
            }),
        )
        if (onboardingSeen) {
            navigate('/dashboard')
        } else {
            navigate('/onboarding')
        }
    }

    return (
        <div
            style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%)',
                padding: '20px',
            }}
        >
            <Card shadow="xl" padding="xl" radius="lg" style={{ width: '100%', maxWidth: 400 }}>
                <Stack gap="lg">
                    <Stack gap={4} align="center">
                        <Title order={2}>
                            <Text span variant="gradient" gradient={{ from: 'violet', to: 'purple', deg: 135 }}>
                                Coach Fit
                            </Text>
                        </Title>
                        <Text c="dimmed" size="sm">
                            {t('auth.loginTitle')}
                        </Text>
                    </Stack>
                    <form onSubmit={form.onSubmit(handleSubmit)}>
                        <Stack gap="md">
                            <TextInput
                                label={t('profile.email')}
                                placeholder={t('profile.emailPlaceholder')}
                                required
                                {...form.getInputProps('email')}
                            />
                            <PasswordInput
                                label={t('auth.password')}
                                placeholder={t('auth.passwordPlaceholder')}
                                required
                                {...form.getInputProps('password')}
                            />
                            <Button type="submit" fullWidth>
                                {t('auth.login')}
                            </Button>
                            <Text size="sm" c="dimmed" ta="center">
                                {t('auth.noAccount')}{' '}
                                <Link to="/register" style={{ color: 'var(--mantine-color-violet-6)', textDecoration: 'none' }}>
                                    {t('auth.register')}
                                </Link>
                            </Text>
                        </Stack>
                    </form>
                </Stack>
            </Card>
        </div>
    )
}

