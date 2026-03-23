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
    IconApple,
    IconCurrencyRubel,
    IconBuilding,
    IconCreditCard,
} from '@tabler/icons-react';

interface NavItem {
    to: string;
    label: string;
    icon: React.ComponentType<{ size?: number; color?: string; stroke?: number }>;
    accent?: boolean;
}

interface BottomNavBarProps {
    role: 'client' | 'trainer' | 'club_admin';
}

export const BottomNavBar = ({ role }: BottomNavBarProps) => {
    const { t } = useTranslation();
    const location = useLocation();

    const clientItems: NavItem[] = [
        { to: '/dashboard', label: t('common.dashboard'), icon: IconLayoutDashboard },
        { to: '/calendar', label: t('common.calendar'), icon: IconCalendarTime },
        { to: '/program', label: t('common.program'), icon: IconListDetails },
        { to: '/metrics', label: t('common.metrics'), icon: IconActivity },
        { to: '/nutrition', label: t('common.nutrition'), icon: IconApple },
    ];

    const trainerItems: NavItem[] = [
        { to: '/trainer/clients', label: t('common.clients'), icon: IconUsersGroup },
        { to: '/trainer/library', label: t('common.library'), icon: IconLibrary },
        { to: '/trainer/calendar', label: t('common.trainerCalendar'), icon: IconCalendarStats },
        { to: '/trainer/notifications', label: t('notificationsPage.title'), icon: IconBell },
        { to: '/trainer/subscription', label: 'Подписка', icon: IconCreditCard, accent: true },
    ];

    const clubItems: NavItem[] = [
        { to: '/club/trainers', label: 'Тренеры', icon: IconUsersGroup },
        { to: '/club/library', label: 'Библиотека', icon: IconLibrary },
        { to: '/club/calendar', label: 'Календарь', icon: IconCalendarStats },
        { to: '/club/metrics', label: 'Метрики', icon: IconBuilding },
    ];

    const items = role === 'client' ? clientItems : role === 'club_admin' ? clubItems : trainerItems;

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

                    if (item.accent) {
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
                                }}
                            >
                                <Stack align="center" gap={4}>
                                    <Box
                                        style={{
                                            width: 36,
                                            height: 28,
                                            borderRadius: '8px',
                                            background: isActive
                                                ? 'linear-gradient(135deg, #f59e0b 0%, #f97316 100%)'
                                                : 'linear-gradient(135deg, rgba(245,158,11,0.15) 0%, rgba(249,115,22,0.15) 100%)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            transition: 'all 0.2s',
                                        }}
                                    >
                                        <Icon
                                            size={18}
                                            color={isActive ? 'white' : '#f59e0b'}
                                            stroke={isActive ? 2 : 1.5}
                                        />
                                    </Box>
                                    <Text
                                        size="10px"
                                        fw={600}
                                        style={{
                                            letterSpacing: '0.2px',
                                            color: isActive ? '#f97316' : '#f59e0b',
                                        }}
                                    >
                                        {item.label}
                                    </Text>
                                </Stack>
                            </UnstyledButton>
                        );
                    }

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
                                        letterSpacing: '0.2px',
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
