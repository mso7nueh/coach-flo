import { Button, Card, Group, SegmentedControl, Stack, Text, TextInput, Title, PasswordInput, PinInput, Alert } from '@mantine/core'
import { useTranslation } from 'react-i18next'
import { useForm } from '@mantine/form'
import { useNavigate, Link, useSearchParams } from 'react-router-dom'
import { useAppDispatch } from '@/shared/hooks/useAppDispatch'
import { registerUserStep1, registerUserStep2, sendSMS, type RegisterData } from '@/app/store/slices/userSlice'
import { useState, useEffect } from 'react'
import { IconPhone, IconCheck, IconRefresh, IconInfoCircle } from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'
import type { UserRole } from '@/app/store/slices/userSlice'

const formatPhoneNumber = (value: string): string => {
    const cleaned = value.replace(/\D/g, '')
    if (cleaned.length === 0) return ''

    let digits = cleaned
    if (digits.startsWith('7')) {
        digits = digits.slice(1)
    }
    if (digits.length === 0) return '+7'
    if (digits.length <= 3) return `+7 (${digits}`
    if (digits.length <= 6) return `+7 (${digits.slice(0, 3)}) ${digits.slice(3)}`
    if (digits.length <= 8) return `+7 (${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
    return `+7 (${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 8)}-${digits.slice(8, 10)}`
}

const validatePhoneNumber = (phone: string): boolean => {
    const cleaned = phone.replace(/\D/g, '')
    let digits = cleaned
    if (digits.startsWith('7')) {
        digits = digits.slice(1)
    }
    return digits.length === 10
}

export const RegisterPage = () => {
    const { t } = useTranslation()
    const dispatch = useAppDispatch()
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const trainerCodeFromUrl = searchParams.get('code')
    const [phoneVerificationStep, setPhoneVerificationStep] = useState<'input' | 'verify'>('input')
    const [smsCode, setSmsCode] = useState('')
    const [canResend, setCanResend] = useState(false)
    const [resendTimer, setResendTimer] = useState(60)
    const [loading, setLoading] = useState(false)

    const form = useForm<RegisterData>({
        initialValues: {
            fullName: '',
            email: '',
            password: '',
            confirmPassword: '',
            phone: '',
            role: 'client',
            connectionCode: trainerCodeFromUrl || '',
        },
        validate: {
            fullName: (value) => (value.trim().length < 2 ? t('profile.validation.nameRequired') : null),
            email: (value) => (/^\S+@\S+$/.test(value) ? null : t('profile.validation.emailInvalid')),
            password: (value) => (value.length < 6 ? t('auth.passwordTooShort') : null),
            confirmPassword: (value, values: RegisterData) => (value !== values.password ? t('auth.passwordsDoNotMatch') : null),
            phone: (value) => {
                if (!value) return t('auth.phoneRequired')
                if (!validatePhoneNumber(value)) return t('auth.phoneInvalid')
                return null
            },
        },
    })

    useEffect(() => {
        if (resendTimer > 0 && !canResend) {
            const timer = setTimeout(() => setResendTimer((prev) => prev - 1), 1000)
            return () => clearTimeout(timer)
        } else if (resendTimer === 0) {
            setCanResend(true)
        }
    }, [resendTimer, canResend])

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const formatted = formatPhoneNumber(e.target.value)
        form.setFieldValue('phone', formatted)
    }

    const handleSendCode = async () => {
        if (!form.values.phone || !validatePhoneNumber(form.values.phone)) {
            form.setFieldError('phone', t('auth.phoneInvalid'))
            return
        }

        setLoading(true)
        try {
            await dispatch(registerUserStep1({
                full_name: form.values.fullName,
                email: form.values.email,
                password: form.values.password,
                phone: form.values.phone!,
                role: form.values.role || 'client',
                connection_code: form.values.connectionCode,
            })).unwrap()

            setPhoneVerificationStep('verify')
            setCanResend(false)
            setResendTimer(60)
            notifications.show({
                title: t('auth.codeSent'),
                message: t('auth.codeSentTo') + ' ' + form.values.phone,
                color: 'blue',
            })
        } catch (error) {
            notifications.show({
                title: t('auth.error'),
                message: error instanceof Error ? error.message : t('auth.errorGeneric'),
                color: 'red',
            })
        } finally {
            setLoading(false)
        }
    }

    const handleResendCode = async () => {
        if (!form.values.phone || !validatePhoneNumber(form.values.phone)) {
            return
        }

        setLoading(true)
        try {
            await dispatch(sendSMS(form.values.phone!)).unwrap()

            setCanResend(false)
            setResendTimer(60)
            notifications.show({
                title: t('auth.codeSent'),
                message: t('auth.codeSentTo') + ' ' + form.values.phone,
                color: 'blue',
            })
        } catch (error) {
            notifications.show({
                title: t('auth.error'),
                message: error instanceof Error ? error.message : t('auth.errorGeneric'),
                color: 'red',
            })
        } finally {
            setLoading(false)
        }
    }

    const handleVerifyCode = async () => {
        if (smsCode.length !== 4) {
            return
        }

        setLoading(true)
        try {
            const result = await dispatch(registerUserStep2({
                phone: form.values.phone!,
                code: smsCode,
            })).unwrap()

            const selectedRole = form.values.role || 'client'
            if (selectedRole === 'trainer') {
                navigate('/trainer/clients')
            } else {
                if (result.requiresOnboarding) {
                    navigate('/onboarding')
                } else {
                    navigate('/dashboard')
                }
            }
        } catch (error) {
            notifications.show({
                title: t('auth.codeInvalid'),
                message: error instanceof Error ? error.message : t('auth.codeInvalidGeneric'),
                color: 'red',
            })
        } finally {
            setLoading(false)
        }
    }

    const handleSubmit = async () => {
        if (phoneVerificationStep === 'input') {
            await handleSendCode()
            return
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
                            {t('auth.registerTitle')}
                        </Text>
                    </Stack>
                    {phoneVerificationStep === 'input' ? (
                        <form onSubmit={form.onSubmit(handleSubmit)}>
                            <Stack gap="md">
                                <SegmentedControl
                                    value={form.values.role || 'client'}
                                    onChange={(value) => {
                                        form.setFieldValue('role', value as UserRole)
                                        if (value === 'trainer') {
                                            form.setFieldValue('connectionCode', '')
                                        }
                                    }}
                                    data={[
                                        { label: t('common.roleClient'), value: 'client' },
                                        { label: t('common.roleTrainer'), value: 'trainer' },
                                    ]}
                                    fullWidth
                                />
                                {trainerCodeFromUrl && form.values.role === 'client' && (
                                    <Alert icon={<IconInfoCircle size={16} />} color="blue" variant="light">
                                        {t('auth.invitationCodeDetected')}
                                    </Alert>
                                )}
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
                                    placeholder="+7 (999) 123-45-67"
                                    required
                                    value={form.values.phone}
                                    onChange={handlePhoneChange}
                                    error={form.errors.phone}
                                    leftSection={<IconPhone size={16} />}
                                    maxLength={18}
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
                                {form.values.role === 'client' && (
                                    <TextInput
                                        label={t('auth.trainerCode')}
                                        placeholder={t('auth.trainerCodePlaceholder')}
                                        description={t('auth.trainerCodeDescription')}
                                        value={form.values.connectionCode || ''}
                                        onChange={(e) => form.setFieldValue('connectionCode', e.target.value)}
                                        disabled={!!trainerCodeFromUrl}
                                    />
                                )}
                                <Button type="submit" fullWidth disabled={!form.values.phone || !validatePhoneNumber(form.values.phone)} loading={loading}>
                                    {t('auth.sendCode')}
                                </Button>
                                <Text size="sm" c="dimmed" ta="center">
                                    {t('auth.hasAccount')}{' '}
                                    <Link to="/login" style={{ color: 'var(--mantine-color-violet-6)', textDecoration: 'none' }}>
                                        {t('auth.login')}
                                    </Link>
                                </Text>
                            </Stack>
                        </form>
                    ) : (
                        <Stack gap="md">
                            <Card withBorder padding="md" style={{ backgroundColor: 'var(--mantine-color-blue-0)' }}>
                                <Group gap="sm">
                                    <IconCheck size={20} color="var(--mantine-color-blue-6)" />
                                    <Stack gap={2}>
                                        <Text size="sm" fw={500}>
                                            {t('auth.codeSent')}
                                        </Text>
                                        <Text size="xs" c="dimmed">
                                            {t('auth.codeSentTo')} {form.values.phone}
                                        </Text>
                                    </Stack>
                                </Group>
                            </Card>
                            <Stack gap="xs">
                                <Text size="sm" fw={500} ta="center">
                                    {t('auth.enterCode')}
                                </Text>
                                <PinInput
                                    length={4}
                                    value={smsCode}
                                    onChange={setSmsCode}
                                    type="number"
                                    oneTimeCode
                                    style={{ justifyContent: 'center' }}
                                />
                            </Stack>
                            <Group gap="xs" justify="center">
                                <Text size="xs" c="dimmed">
                                    {t('auth.didNotReceiveCode')}
                                </Text>
                                {canResend ? (
                                    <Button
                                        variant="subtle"
                                        size="xs"
                                        leftSection={<IconRefresh size={14} />}
                                        onClick={handleResendCode}
                                    >
                                        {t('auth.resendCode')}
                                    </Button>
                                ) : (
                                    <Text size="xs" c="dimmed">
                                        {t('auth.resendIn')} {resendTimer}с
                                    </Text>
                                )}
                            </Group>
                            <Button
                                fullWidth
                                onClick={handleVerifyCode}
                                disabled={smsCode.length !== 4}
                                loading={loading}
                            >
                                {t('auth.verifyCode')}
                            </Button>
                            <Button
                                variant="subtle"
                                fullWidth
                                onClick={() => {
                                    setPhoneVerificationStep('input')
                                    setSmsCode('')
                                }}
                            >
                                {t('common.back')}
                            </Button>
                        </Stack>
                    )}
                </Stack>
            </Card>
        </div>
    )
}

