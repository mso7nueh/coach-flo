import { Button, Card, SegmentedControl, Stack, Text, TextInput, Title, PasswordInput } from '@mantine/core'
import { useTranslation } from 'react-i18next'
import { useForm } from '@mantine/form'
import { useNavigate, Link } from 'react-router-dom'
import { useAppDispatch } from '@/shared/hooks/useAppDispatch'
import { loginUser, type LoginCredentials } from '@/app/store/slices/userSlice'
import { useState } from 'react'
import type { UserRole } from '@/app/store/slices/userSlice'
import { notifications } from '@mantine/notifications'

export const LoginPage = () => {
    const { t } = useTranslation()
    const dispatch = useAppDispatch()
    const navigate = useNavigate()
    const [role, setRole] = useState<UserRole>('client')
    const [loading, setLoading] = useState(false)

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

    const handleSubmit = async (values: LoginCredentials) => {
        setLoading(true)
        try {
            const result = await dispatch(loginUser({
                email: values.email,
                password: values.password,
            })).unwrap()

            if (result.user.role === 'trainer') {
                navigate('/trainer/clients')
            } else {
                if (result.user.onboardingSeen) {
                    navigate('/dashboard')
                } else {
                    navigate('/onboarding')
                }
            }
        } catch (error) {
            notifications.show({
                title: t('auth.error'),
                message: error instanceof Error ? error.message : t('auth.loginError'),
                color: 'red',
            })
        } finally {
            setLoading(false)
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
                                Coach Flo
                            </Text>
                        </Title>
                        <Text c="dimmed" size="sm">
                            {t('auth.loginTitle')}
                        </Text>
                    </Stack>
                    <form onSubmit={form.onSubmit(handleSubmit)}>
                        <Stack gap="md">
                            <SegmentedControl
                                value={role}
                                onChange={(value) => setRole(value as UserRole)}
                                data={[
                                    { label: t('common.roleClient'), value: 'client' },
                                    { label: t('common.roleTrainer'), value: 'trainer' },
                                ]}
                                fullWidth
                            />
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
                            <Button type="submit" fullWidth loading={loading}>
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
