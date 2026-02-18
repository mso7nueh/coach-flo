import { AppShell, Avatar, Burger, Button, Divider, Group, Menu, SegmentedControl, Stack, Text, UnstyledButton, Box } from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { useTranslation } from 'react-i18next'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAppDispatch } from '@/shared/hooks/useAppDispatch'
import { useAppSelector } from '@/shared/hooks/useAppSelector'
import { setLocale, logout } from '@/app/store/slices/userSlice'
import { useId } from 'react'
import {
    IconChevronDown,
    IconLogout,
    IconSettings,
    IconUser,
    IconUserEdit,
    IconLayoutDashboard,
    IconCalendarTime,
    IconListDetails,
    IconActivity,
    IconUsersGroup,
    IconLibrary,
    IconCalendarStats,
    IconCurrencyRubel,
    IconApple,
    IconCreditCard,
    IconBell,
} from '@tabler/icons-react'

import { BottomNavBar } from '@/shared/components/BottomNavBar'

export const AppLayout = () => {
    const [opened, { toggle }] = useDisclosure()
    const { t, i18n } = useTranslation()
    const dispatch = useAppDispatch()
    const role = useAppSelector((state) => state.user.role)
    const locale = useAppSelector((state) => state.user.locale)
    const user = useAppSelector((state) => state.user)
    const labelId = useId()
    const location = useLocation()

    const isClient = role === 'client'

    const clientItems = [
        { to: '/dashboard', label: t('common.dashboard'), icon: IconLayoutDashboard },
        { to: '/calendar', label: t('common.calendar'), icon: IconCalendarTime },
        { to: '/program', label: t('common.program'), icon: IconListDetails },
        { to: '/metrics', label: t('common.metrics'), icon: IconActivity },
        { to: '/nutrition', label: t('common.nutrition'), icon: IconApple },
    ]

    const trainerItems = [
        { to: '/trainer/clients', label: t('common.clients'), icon: IconUsersGroup },
        { to: '/trainer/library', label: t('common.library'), icon: IconLibrary },
        { to: '/trainer/calendar', label: t('common.trainerCalendar'), icon: IconCalendarStats },
        { to: '/trainer/notifications', label: t('notificationsPage.title'), icon: IconBell },
        { to: '/trainer/finances', label: t('common.finances'), icon: IconCurrencyRubel },
    ]

    const items = isClient ? clientItems : trainerItems

    const handleLocaleChange = (value: 'ru' | 'en') => {
        dispatch(setLocale(value))
        i18n.changeLanguage(value)
    }

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map((n) => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2)
    }

    const headerHeight = isClient ? 70 : 60

    return (
        <AppShell
            header={{ height: headerHeight }}
            navbar={{
                width: 240,
                breakpoint: 'sm',
                collapsed: { mobile: true } // Always collapse navbar on mobile, use BottomNavBar instead
            }}
            padding={0}
        >
            <AppShell.Header>
                <Group justify="space-between" px="md" h="100%">
                    {isClient ? (
                        <>
                            <Group gap="md">
                                <Text
                                    fw={800}
                                    size="xl"
                                    variant="gradient"
                                    gradient={{ from: 'violet', to: 'purple', deg: 135 }}
                                    style={{ letterSpacing: '-0.5px' }}
                                >
                                    Coach Flo
                                </Text>
                            </Group>
                            <Group gap="md">
                                <SegmentedControl
                                    aria-labelledby={labelId}
                                    value={locale}
                                    onChange={(value) => handleLocaleChange(value as 'ru' | 'en')}
                                    data={[
                                        { label: 'RU', value: 'ru' },
                                        { label: 'EN', value: 'en' },
                                    ]}
                                    size="xs"
                                />
                                <Menu shadow="md" width={280} position="bottom-end">
                                    <Menu.Target>
                                        <UnstyledButton>
                                            <Group gap="sm">
                                                <Avatar size="md" color="violet">
                                                    {getInitials(user.fullName)}
                                                </Avatar>
                                                <Stack gap={0} visibleFrom="sm">
                                                    <Text size="sm" fw={500}>
                                                        {user.fullName}
                                                    </Text>
                                                    <Text size="xs" c="dimmed">
                                                        {role === 'client' ? t('common.roleClient') : t('common.roleTrainer')}
                                                    </Text>
                                                </Stack>
                                                <IconChevronDown size={16} style={{ opacity: 0.6 }} />
                                            </Group>
                                        </UnstyledButton>
                                    </Menu.Target>
                                    <Menu.Dropdown>
                                        <Menu.Label>
                                            <Stack gap={4}>
                                                <Text size="sm" fw={600}>
                                                    {user.fullName}
                                                </Text>
                                                <Text size="xs" c="dimmed">
                                                    {user.email}
                                                </Text>
                                            </Stack>
                                        </Menu.Label>
                                        <Divider />
                                        <Menu.Item leftSection={<IconUser size={16} />} component={NavLink} to="/profile">
                                            {t('common.profile')}
                                        </Menu.Item>
                                        <Menu.Item leftSection={<IconUserEdit size={16} />} component={NavLink} to="/profile/edit">
                                            {t('common.editProfile')}
                                        </Menu.Item>
                                        {user.trainer && (
                                            <>
                                                <Divider />
                                                <Menu.Label>{t('common.myTrainer')}</Menu.Label>
                                                <Menu.Item leftSection={<IconUser size={16} />}>
                                                    <Stack gap={2}>
                                                        <Text size="sm" fw={500}>
                                                            {user.trainer.fullName}
                                                        </Text>
                                                        {user.trainer.email && (
                                                            <Text size="xs" c="dimmed">
                                                                {user.trainer.email}
                                                            </Text>
                                                        )}
                                                        {user.trainer.phone && (
                                                            <Text size="xs" c="dimmed">
                                                                {user.trainer.phone}
                                                            </Text>
                                                        )}
                                                    </Stack>
                                                </Menu.Item>
                                            </>
                                        )}
                                        <Divider />
                                        <Menu.Item leftSection={<IconSettings size={16} />} component={NavLink} to="/settings">
                                            {t('common.settings')}
                                        </Menu.Item>
                                        <Divider />
                                        <Menu.Item
                                            leftSection={<IconLogout size={16} />}
                                            color="red"
                                            onClick={() => dispatch(logout())}
                                        >
                                            {t('common.logout')}
                                        </Menu.Item>
                                    </Menu.Dropdown>
                                </Menu>
                            </Group>
                        </>
                    ) : (
                        <>
                            <Group gap="md">
                                <Text
                                    fw={800}
                                    size="xl"
                                    variant="gradient"
                                    gradient={{ from: 'violet', to: 'purple', deg: 135 }}
                                    style={{ letterSpacing: '-0.5px' }}
                                >
                                    Coach Flo
                                </Text>
                            </Group>
                            <Group gap="lg">
                                <SegmentedControl
                                    aria-labelledby={labelId}
                                    value={locale}
                                    onChange={(value) => handleLocaleChange(value as 'ru' | 'en')}
                                    data={[
                                        { label: 'RU', value: 'ru' },
                                        { label: 'EN', value: 'en' },
                                    ]}
                                    size="xs"
                                />
                                <Menu shadow="md" width={280} position="bottom-end">
                                    <Menu.Target>
                                        <UnstyledButton>
                                            <Group gap="sm">
                                                <Avatar size="md" color="violet">
                                                    {getInitials(user.fullName)}
                                                </Avatar>
                                                <Stack gap={0} visibleFrom="sm">
                                                    <Text size="sm" fw={500}>
                                                        {user.fullName}
                                                    </Text>
                                                    <Text size="xs" c="dimmed">
                                                        {t('common.roleTrainer')}
                                                    </Text>
                                                </Stack>
                                                <IconChevronDown size={16} style={{ opacity: 0.6 }} />
                                            </Group>
                                        </UnstyledButton>
                                    </Menu.Target>
                                    <Menu.Dropdown>
                                        <Menu.Label>
                                            <Stack gap={4}>
                                                <Text size="sm" fw={600}>
                                                    {user.fullName}
                                                </Text>
                                                <Text size="xs" c="dimmed">
                                                    {user.email}
                                                </Text>
                                            </Stack>
                                        </Menu.Label>
                                        <Divider />
                                        <Menu.Item leftSection={<IconUser size={16} />} component={NavLink} to="/profile">
                                            {t('common.profile')}
                                        </Menu.Item>
                                        <Menu.Item leftSection={<IconUserEdit size={16} />} component={NavLink} to="/profile/edit">
                                            {t('common.editProfile')}
                                        </Menu.Item>
                                        <Divider />
                                        <Menu.Item leftSection={<IconSettings size={16} />} component={NavLink} to="/settings">
                                            {t('common.settings')}
                                        </Menu.Item>
                                        <Divider />
                                        <Menu.Item
                                            leftSection={<IconLogout size={16} />}
                                            color="red"
                                            onClick={() => dispatch(logout())}
                                        >
                                            {t('common.logout')}
                                        </Menu.Item>
                                    </Menu.Dropdown>
                                </Menu>
                            </Group>
                        </>
                    )}
                </Group>
            </AppShell.Header>
            <AppShell.Navbar p="md" style={{ display: 'flex', flexDirection: 'column' }}>
                <Stack gap="xs" style={{ flex: 1 }}>
                    {items.map((item) => {
                        const isActive = location.pathname === item.to || location.pathname.startsWith(item.to + '/')
                        const Icon = item.icon
                        return (
                            <UnstyledButton
                                key={item.to}
                                component={NavLink}
                                to={item.to}
                                style={{
                                    textDecoration: 'none',
                                    display: 'block',
                                    padding: '10px 12px',
                                    borderRadius: '8px',
                                    backgroundColor: isActive ? 'var(--mantine-color-violet-0)' : 'transparent',
                                    transition: 'background-color 0.2s',
                                }}
                            >
                                <Group gap="sm">
                                    {Icon && (
                                        <Icon
                                            size={18}
                                            color={isActive ? 'var(--mantine-color-violet-6)' : 'var(--mantine-color-gray-6)'}
                                        />
                                    )}
                                    <Text
                                        fw={isActive ? 600 : 500}
                                        c={isActive ? 'violet.6' : 'var(--mantine-color-gray-7)'}
                                        style={{ transition: 'color 0.2s' }}
                                    >
                                        {item.label}
                                    </Text>
                                </Group>
                            </UnstyledButton>
                        )
                    })}
                </Stack>
                {!isClient && (
                    <Box mt="auto" pt="md">
                        <UnstyledButton
                            component={NavLink}
                            to="/trainer/subscription"
                            style={{
                                display: 'block',
                                width: '100%',
                                padding: '12px 16px',
                                borderRadius: '8px',
                                background: 'linear-gradient(135deg, #f59e0b 0%, #f97316 100%)',
                                color: 'white',
                                textDecoration: 'none',
                                transition: 'all 0.2s',
                                boxShadow: '0 2px 8px rgba(249, 115, 22, 0.3)',
                            }}
                        >
                            <Group gap="sm" justify="center">
                                <IconCreditCard size={18} />
                                <Text fw={600} size="sm">Подписка</Text>
                            </Group>
                        </UnstyledButton>
                    </Box>
                )}
            </AppShell.Navbar>
            <AppShell.Main
                style={{
                    paddingTop: headerHeight,
                    paddingBottom: '70px', // For BottomNavBar
                    minHeight: `calc(100vh - ${headerHeight}px)`,
                }}
            >
                {location.pathname === '/onboarding' ? (
                    <Outlet />
                ) : (
                    <Box p={{ base: 'md', sm: 'lg' }} style={{ height: '100%' }}>
                        <Outlet />
                    </Box>
                )}
            </AppShell.Main>
            <BottomNavBar role={role as 'client' | 'trainer'} />
        </AppShell>
    )
}

