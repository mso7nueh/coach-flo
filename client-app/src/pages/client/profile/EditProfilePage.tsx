import { Button, Card, Group, Stack, TextInput, Title } from '@mantine/core'
import { useTranslation } from 'react-i18next'
import { useAppSelector } from '@/shared/hooks/useAppSelector'
import { useAppDispatch } from '@/shared/hooks/useAppDispatch'
import { updateProfile } from '@/app/store/slices/userSlice'
import { useForm } from '@mantine/form'
import { useNavigate } from 'react-router-dom'
import { useEffect } from 'react'

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
        })
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user.fullName, user.email, user.phone])

    const handleSubmit = (values: typeof form.values) => {
        dispatch(
            updateProfile({
                fullName: values.fullName,
                email: values.email,
                phone: values.phone || undefined,
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

