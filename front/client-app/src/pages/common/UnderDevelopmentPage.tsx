import { Card, Stack, Text, Title } from '@mantine/core'
import { useTranslation } from 'react-i18next'

export const UnderDevelopmentPage = () => {
    const { t } = useTranslation()

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
            <Card shadow="xl" padding="xl" radius="lg" style={{ width: '100%', maxWidth: 500 }}>
                <Stack gap="lg" align="center">
                    <Title order={2} ta="center">
                        Страница в разработке
                    </Title>
                    <Text c="dimmed" size="lg" ta="center">
                        Данная функциональность находится в разработке и будет доступна в ближайшее время.
                    </Text>
                </Stack>
            </Card>
        </div>
    )
}

