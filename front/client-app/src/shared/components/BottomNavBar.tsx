import { Box, Group, UnstyledButton, Text, Stack } from '@mantine/core';
import { NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
    IconLayoutDashboard,
    IconCalendarTime,
    IconListDetails,
    IconActivity,
    IconUsersGroup,
    IconLibrary,
    IconCalendarStats,
    IconBell,
    IconApple
} from '@tabler/icons-react';

interface BottomNavBarProps {
    role: 'client' | 'trainer';
}

export const BottomNavBar = ({ role }: BottomNavBarProps) => {
    const { t } = useTranslation();
    const location = useLocation();

    const clientItems = [
        { to: '/dashboard', label: t('common.dashboard'), icon: IconLayoutDashboard },
        { to: '/calendar', label: t('common.calendar'), icon: IconCalendarTime },
        { to: '/program', label: t('common.program'), icon: IconListDetails },
        { to: '/metrics', label: t('common.metrics'), icon: IconActivity },
        { to: '/nutrition', label: t('common.nutrition'), icon: IconApple },
    ];

    const trainerItems = [
        { to: '/trainer/clients', label: t('common.clients'), icon: IconUsersGroup },
        { to: '/trainer/library', label: t('common.library'), icon: IconLibrary },
        { to: '/trainer/calendar', label: t('common.trainerCalendar'), icon: IconCalendarStats },
        { to: '/trainer/notifications', label: t('notificationsPage.title'), icon: IconBell },
    ];

    const items = role === 'client' ? clientItems : trainerItems;

    return (
        <Box
            hiddenFrom="sm"
            style={{
                position: 'fixed',
                bottom: 0,
                left: 0,
                right: 0,
                height: '70px',
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(10px)',
                borderTop: '1px solid var(--mantine-color-gray-2)',
                zIndex: 100,
                paddingBottom: 'env(safe-area-inset-bottom)',
            }}
        >
            <Group grow h="100%" align="center" gap={0}>
                {items.map((item) => {
                    const isActive = location.pathname === item.to || location.pathname.startsWith(item.to + '/');
                    const Icon = item.icon;
                    return (
                        <UnstyledButton
                            key={item.to}
                            component={NavLink}
                            to={item.to}
                            style={{
                                height: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.2s',
                            }}
                        >
                            <Stack align="center" gap={4}>
                                <Icon
                                    size={24}
                                    color={isActive ? 'var(--mantine-color-violet-6)' : 'var(--mantine-color-gray-5)'}
                                    stroke={isActive ? 2 : 1.5}
                                />
                                <Text
                                    size="10px"
                                    fw={isActive ? 600 : 500}
                                    c={isActive ? 'violet.6' : 'dimmed'}
                                    style={{
                                        letterSpacing: '0.2px'
                                    }}
                                >
                                    {item.label}
                                </Text>
                            </Stack>
                        </UnstyledButton>
                    );
                })}
            </Group>
        </Box>
    );
};
