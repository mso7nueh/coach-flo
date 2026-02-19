import { Box, Container, Divider, Group, Stack, Text, Anchor } from '@mantine/core';
import { IconMail, IconPhone, IconMapPin, IconDownload } from '@tabler/icons-react';

export const Footer = () => {
    return (
        <Box
            component="footer"
            p="xl"
            bg="gray.0"
            style={{
                borderTop: '1px solid var(--mantine-color-gray-2)',
                marginTop: 'auto'
            }}
        >
            <Container size="lg">
                <Stack gap="xl">
                    <Group justify="space-between" align="flex-start" wrap="wrap">
                        <Stack gap="xs">
                            <Text fw={700} size="lg" variant="gradient" gradient={{ from: 'violet', to: 'purple', deg: 135 }}>
                                ООО "Аполло-Тех"
                            </Text>
                            <Text size="sm" c="dimmed">
                                Инновационные решения для фитнеса и коучинга
                            </Text>
                        </Stack>

                        <Stack gap="xs">
                            <Text fw={600} size="sm">Контакты</Text>
                            <Group gap="xs" wrap="nowrap">
                                <IconPhone size={16} color="var(--mantine-color-violet-6)" />
                                <Anchor href="tel:+79088669633" size="sm" c="dimmed">+7 (908) 866-96-33</Anchor>
                            </Group>
                            <Group gap="xs" wrap="nowrap">
                                <IconMail size={16} color="var(--mantine-color-violet-6)" />
                                <Anchor href="mailto:coachfitio@yandex.ru" size="sm" c="dimmed">coachfitio@yandex.ru</Anchor>
                            </Group>
                        </Stack>

                        <Stack gap="xs" style={{ maxWidth: 300 }}>
                            <Text fw={600} size="sm">Адрес</Text>
                            <Group gap="xs" wrap="nowrap" align="flex-start">
                                <IconMapPin size={16} color="var(--mantine-color-violet-6)" style={{ marginTop: 4 }} />
                                <Text size="sm" c="dimmed">
                                    Тюменская область, г. Тюмень, улица Герцена, д. 62, кв. 11
                                </Text>
                            </Group>
                        </Stack>

                        <Stack gap="xs">
                            <Text fw={600} size="sm">Документы</Text>
                            <Anchor
                                href="/user_agere.pdf"
                                download="user_agere.pdf"
                                size="sm"
                                c="violet.6"
                                fw={500}
                                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                            >
                                <IconDownload size={16} />
                                Пользовательское соглашение
                            </Anchor>
                            <Anchor
                                href="/pers_data.pdf"
                                download="pers_data.pdf"
                                size="sm"
                                c="violet.6"
                                fw={500}
                                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                            >
                                <IconDownload size={16} />
                                Политика обработки ПД
                            </Anchor>
                        </Stack>
                    </Group>

                    <Divider />

                    <Group justify="space-between" wrap="wrap" gap="md">
                        <Group gap="xl">
                            <Text size="xs" c="dimmed">
                                ИНН: 7203602451
                            </Text>
                            <Text size="xs" c="dimmed">
                                ОГРН: 1257200020472
                            </Text>
                        </Group>
                        <Text size="xs" c="dimmed">
                            © {new Date().getFullYear()} ООО "Аполло-Тех". Все права защищены.
                        </Text>
                    </Group>
                </Stack>
            </Container>
        </Box>
    );
};
