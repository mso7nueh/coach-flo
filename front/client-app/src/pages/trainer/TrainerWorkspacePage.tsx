import { Badge, Card, Grid, Group, List, Stack, Text, Title } from '@mantine/core'

export const TrainerWorkspacePage = () => {

    const panels = [
        {
            title: 'Управление клиентами',
            items: ['Список клиентов', 'Распределение программ', 'Статусы подписки'],
        },
        {
            title: 'Календарь команды',
            items: ['Просмотр всех тренировок', 'Назначение тренеров', 'Повторяющиеся события'],
        },
        {
            title: 'Контент и шаблоны',
            items: ['Библиотека упражнений', 'Шаблоны программ', 'Рассылка уведомлений'],
        },
    ]

    return (
        <Stack gap="xl">
            <Stack gap={4}>
                <Title order={2}>Рабочая область тренера</Title>
                <Text c="dimmed">Заготовка для будущей реализации. Используйте переключатель ролей, чтобы вернуться в режим клиента.</Text>
            </Stack>
            <Grid>
                {panels.map((panel) => (
                    <Grid.Col span={{ base: 12, md: 6, lg: 4 }} key={panel.title}>
                        <Card withBorder>
                            <Stack gap="sm">
                                <Group justify="space-between">
                                    <Title order={4}>{panel.title}</Title>
                                    <Badge variant="light">Coming soon</Badge>
                                </Group>
                                <List spacing="xs">
                                    {panel.items.map((item) => (
                                        <List.Item key={item}>{item}</List.Item>
                                    ))}
                                </List>
                            </Stack>
                        </Card>
                    </Grid.Col>
                ))}
            </Grid>
            <Card withBorder>
                <Stack gap="sm">
                    <Title order={4}>Следующие шаги</Title>
                    <List spacing="sm">
                        <List.Item>Интегрировать реальные данные клиентов и подключить авторизацию</List.Item>
                        <List.Item>Добавить инструменты для управления группами и уведомлениями</List.Item>
                        <List.Item>Расширить аналитику и отчёты по прогрессу клиентов</List.Item>
                    </List>
                </Stack>
            </Card>
        </Stack>
    )
}

