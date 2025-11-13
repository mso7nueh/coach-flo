import { Button, Card, Stack, Text, TextInput, Title, PasswordInput } from '@mantine/core'
import { useTranslation } from 'react-i18next'
import { useForm } from '@mantine/form'
import { useNavigate, Link } from 'react-router-dom'
import { useAppDispatch } from '@/shared/hooks/useAppDispatch'
import { register, type RegisterData } from '@/app/store/slices/userSlice'
import { nanoid } from '@reduxjs/toolkit'

export const RegisterPage = () => {
    const { t } = useTranslation()
    const dispatch = useAppDispatch()
    const navigate = useNavigate()

    const form = useForm<RegisterData>({
        initialValues: {
            fullName: '',
            email: '',
            password: '',
            confirmPassword: '',
            phone: '',
            role: 'client',
        },
        validate: {
            fullName: (value) => (value.trim().length < 2 ? t('profile.validation.nameRequired') : null),
            email: (value) => (/^\S+@\S+$/.test(value) ? null : t('profile.validation.emailInvalid')),
            password: (value) => (value.length < 6 ? t('auth.passwordTooShort') : null),
            confirmPassword: (value, values) => (value !== values.password ? t('auth.passwordsDoNotMatch') : null),
        },
    })

    const handleSubmit = (values: Omit<RegisterData, 'confirmPassword'>) => {
        const mockToken = `token-${nanoid()}`
        dispatch(
            register({
                user: {
                    id: `client-${nanoid()}`,
                    fullName: values.fullName,
                    email: values.email,
                    phone: values.phone,
                    role: values.role || 'client',
                    onboardingSeen: false,
                    locale: 'ru',
                },
                token: mockToken,
            }),
        )
        navigate('/dashboard')
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
                        <Title order={2} variant="gradient" gradient={{ from: 'violet', to: 'purple', deg: 135 }}>
                            Coach Fit
                        </Title>
                        <Text c="dimmed" size="sm">
                            {t('auth.registerTitle')}
                        </Text>
                    </Stack>
                    <form onSubmit={form.onSubmit(handleSubmit)}>
                        <Stack gap="md">
                            <TextInput
                                label={t('profile.fullName')}
                                placeholder={t('profile.fullNamePlaceholder')}
                                required
                                {...form.getInputProps('fullName')}
                            />
                            <TextInput
                                label={t('profile.email')}
                                placeholder={t('profile.emailPlaceholder')}
                                required
                                {...form.getInputProps('email')}
                            />
                            <TextInput
                                label={t('profile.phone')}
                                placeholder={t('profile.phonePlaceholder')}
                                {...form.getInputProps('phone')}
                            />
                            <PasswordInput
                                label={t('auth.password')}
                                placeholder={t('auth.passwordPlaceholder')}
                                required
                                {...form.getInputProps('password')}
                            />
                            <PasswordInput
                                label={t('auth.confirmPassword')}
                                placeholder={t('auth.confirmPasswordPlaceholder')}
                                required
                                {...form.getInputProps('confirmPassword')}
                            />
                            <Button type="submit" fullWidth>
                                {t('auth.register')}
                            </Button>
                            <Text size="sm" c="dimmed" ta="center">
                                {t('auth.hasAccount')}{' '}
                                <Link to="/login" style={{ color: 'var(--mantine-color-violet-6)', textDecoration: 'none' }}>
                                    {t('auth.login')}
                                </Link>
                            </Text>
                        </Stack>
                    </form>
                </Stack>
            </Card>
        </div>
    )
}

