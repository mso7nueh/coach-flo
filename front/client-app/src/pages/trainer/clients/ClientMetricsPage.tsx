import {
    Anchor,
    Breadcrumbs,
    Button,
    Group,
    Stack,
    Text,
    Title,
} from '@mantine/core'
import { useTranslation } from 'react-i18next'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAppSelector } from '@/shared/hooks/useAppSelector'
import { IconArrowLeft } from '@tabler/icons-react'
import { useState, useEffect } from 'react'
import { useAppDispatch } from '@/shared/hooks/useAppDispatch'
import { setClients } from '@/app/store/slices/clientsSlice'
import { apiClient } from '@/shared/api/client'
import { MetricsPage } from '../../client/metrics/MetricsPage'

export const ClientMetricsContent = ({ embedded = false }: { embedded?: boolean }) => {
    const { t } = useTranslation()
    const { clientId } = useParams<{ clientId: string }>()
    const navigate = useNavigate()
    const dispatch = useAppDispatch()
    const { clients } = useAppSelector((state) => state.clients)
    const [isLoadingClients, setIsLoadingClients] = useState(false)

    // Загружаем клиентов при монтировании, если клиент не найден
    useEffect(() => {
        const client = clients.find((c) => c.id === clientId)
        if (!client && !isLoadingClients && clientId) {
            setIsLoadingClients(true)
            const loadClients = async () => {
                try {
                    const clientsData = await apiClient.getClients()
                    const mappedClients = clientsData.map((client: any) => ({
                        id: client.id,
                        fullName: client.full_name,
                        email: client.email,
                        phone: client.phone,
                        avatar: client.avatar,
                        format: (client.client_format || 'both') as 'online' | 'offline' | 'both',
                        workoutsPackage: client.workouts_package,
                        packageExpiryDate: client.package_expiry_date,
                        isActive: client.is_active ?? true,
                        attendanceRate: 0,
                        totalWorkouts: 0,
                        completedWorkouts: 0,
                        joinedDate: client.created_at || new Date().toISOString(),
                    }))
                    dispatch(setClients(mappedClients))
                } catch (error) {
                    console.error('Error loading clients:', error)
                } finally {
                    setIsLoadingClients(false)
                }
            }
            loadClients()
        }
    }, [dispatch, clientId, clients, isLoadingClients])

    const client = clients.find((c) => c.id === clientId)

    // Пока загружаем, показываем заглушку или ничего
    if (!client) {
        if (isLoadingClients) return null // или можно показать Loader

        return (
            <Stack gap="md">
                <Button leftSection={<IconArrowLeft size={16} />} variant="subtle" onClick={() => navigate('/trainer/clients')}>
                    {t('common.back')}
                </Button>
                <Text>{t('trainer.clients.clientNotFound')}</Text>
            </Stack>
        )
    }

    return (
        <Stack gap="lg">
            {!embedded && (
                <>
                    <Breadcrumbs>
                        <Anchor component={Link} to="/trainer/clients">
                            {t('trainer.clients.title')}
                        </Anchor>
                        <Anchor component={Link} to={`/trainer/clients/${clientId}`}>
                            {client.fullName}
                        </Anchor>
                        <Text>{t('common.metrics')}</Text>
                    </Breadcrumbs>

                    <Group justify="space-between">
                        <Title order={2}>
                            {t('common.metrics')} - {client.fullName}
                        </Title>
                    </Group>
                </>
            )}

            <MetricsPage clientId={clientId} readOnly={true} />
        </Stack>
    )
}

export const ClientMetricsPage = () => {
    return <ClientMetricsContent />
}
