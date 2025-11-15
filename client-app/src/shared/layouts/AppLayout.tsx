import { AppShell, Avatar, Burger, Divider, Group, Menu, SegmentedControl, Stack, Text, UnstyledButton } from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { useTranslation } from 'react-i18next'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAppDispatch } from '@/shared/hooks/useAppDispatch'
import { useAppSelector } from '@/shared/hooks/useAppSelector'
import { setLocale, logout } from '@/app/store/slices/userSlice'
import { useId } from 'react'
import { IconChevronDown, IconLogout, IconSettings, IconUser, IconUserEdit } from '@tabler/icons-react'

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
        { to: '/dashboard', label: t('common.dashboard') },
        { to: '/calendar', label: t('common.calendar') },
        { to: '/program', label: t('common.program') },
        { to: '/metrics', label: t('common.metrics') },
    ]

    const trainerItems = [
        { to: '/trainer/clients', label: t('common.clients') },
        { to: '/trainer/library', label: t('common.library') },
        { to: '/trainer/calendar', label: t('common.trainerCalendar') },
        { to: '/trainer/finances', label: t('common.finances') },
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
            navbar={
                isClient
                    ? { width: 240, breakpoint: 'sm', collapsed: { desktop: true, mobile: !opened } }
                    : { width: 240, breakpoint: 'sm', collapsed: { mobile: !opened } }
            }
            padding={{ base: 'md', sm: 'lg' }}
        >
            <AppShell.Header>
                <Group justify="space-between" px="md" h="100%">
                    {isClient ? (
                        <>
                            <Group gap="md">
                                <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
                                <Text
                                    fw={800}
                                    size="xl"
                                    variant="gradient"
                                    gradient={{ from: 'violet', to: 'purple', deg: 135 }}
                                    style={{ letterSpacing: '-0.5px' }}
                                >
                                    Coach Fit
                                </Text>
                            </Group>
                            <Group gap="md" visibleFrom="md" style={{ flex: 1, justifyContent: 'center' }}>
                                {items.map((item) => {
                                    const isActive = location.pathname === item.to || location.pathname.startsWith(item.to + '/')
                                    return (
                                        <UnstyledButton
                                            key={item.to}
                                            component={NavLink}
                                            to={item.to}
                                            style={{
                                                textDecoration: 'none',
                                                padding: '10px 20px',
                                                borderRadius: '10px',
                                                backgroundColor: isActive ? 'var(--mantine-color-violet-6)' : 'transparent',
                                                transition: 'all 0.2s ease-in-out',
                                                position: 'relative',
                                            }}
                                            onMouseEnter={(e) => {
                                                if (!isActive) {
                                                    e.currentTarget.style.backgroundColor = 'var(--mantine-color-violet-0)'
                                                }
                                            }}
                                            onMouseLeave={(e) => {
                                                if (!isActive) {
                                                    e.currentTarget.style.backgroundColor = 'transparent'
                                                }
                                            }}
                                        >
                                            <Text
                                                fw={isActive ? 700 : 600}
                                                c={isActive ? 'white' : 'var(--mantine-color-gray-7)'}
                                                size="sm"
                                                style={{ transition: 'color 0.2s' }}
                                            >
                                                {item.label}
                                            </Text>
                                        </UnstyledButton>
                                    )
                                })}
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
                                <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
                                <Text
                                    fw={800}
                                    size="xl"
                                    variant="gradient"
                                    gradient={{ from: 'violet', to: 'purple', deg: 135 }}
                                    style={{ letterSpacing: '-0.5px' }}
                                >
                                    Coach Fit
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
            <AppShell.Navbar p="md">
                <Stack gap="xs">
                    {items.map((item) => {
                        const isActive = location.pathname === item.to || location.pathname.startsWith(item.to + '/')
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
                                <Text
                                    fw={isActive ? 600 : 500}
                                    c={isActive ? 'violet.6' : 'var(--mantine-color-gray-7)'}
                                    style={{ transition: 'color 0.2s' }}
                                >
                                    {item.label}
                                </Text>
                            </UnstyledButton>
                        )
                    })}
                </Stack>
            </AppShell.Navbar>
            <AppShell.Main
                style={{
                    paddingTop: `${headerHeight + 16}px`,
                    minHeight: `calc(100vh - ${headerHeight + 16}px)`,
                }}
            >
                <Outlet />
            </AppShell.Main>
        </AppShell>
    )
}

