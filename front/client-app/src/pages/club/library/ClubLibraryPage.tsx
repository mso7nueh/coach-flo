import { Stack, Title, Text, Card } from '@mantine/core'
import { IconLibrary } from '@tabler/icons-react'

/**
 * Библиотека клуба — общая библиотека упражнений/тренировок/программ.
 * В текущей версии: заглушка.
 * TODO: подключить существующий LibraryPage с фильтрацией по клубу.
 */
export const ClubLibraryPage = () => {
    return (
        <Stack gap="lg">
            <Title order={2}>Библиотека клуба</Title>
            <Card withBorder padding="xl">
                <Stack align="center" gap="md" py="xl">
                    <IconLibrary size={48} color="var(--mantine-color-violet-5)" />
                    <Text fw={600} size="lg">Общая библиотека клуба</Text>
                    <Text c="dimmed" ta="center" maw={480}>
                        Здесь будет единая библиотека упражнений, тренировок и программ клуба,
                        доступная всем тренерам как общий источник контента.
                    </Text>
                    <Text size="sm" c="dimmed">
                        Функция находится в разработке и будет доступна в следующем обновлении.
                    </Text>
                </Stack>
            </Card>
        </Stack>
    )
}
