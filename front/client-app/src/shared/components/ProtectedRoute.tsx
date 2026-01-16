import { Navigate } from 'react-router-dom'
import { useAppSelector } from '@/shared/hooks/useAppSelector'
import { useAppDispatch } from '@/shared/hooks/useAppDispatch'
import { fetchCurrentUser } from '@/app/store/slices/userSlice'
import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { apiClient } from '@/shared/api/client'

interface ProtectedRouteProps {
    children: ReactNode
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
    const isAuthenticated = useAppSelector((state) => state.user.isAuthenticated)
    const token = useAppSelector((state) => state.user.token)
    const dispatch = useAppDispatch()
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const checkAuth = async () => {
            const storedToken = apiClient.getToken()
            if (storedToken) {
                try {
                    // Всегда загружаем данные пользователя при наличии токена,
                    // чтобы получить актуальную информацию (включая привязанного тренера)
                    await dispatch(fetchCurrentUser()).unwrap()
                } catch (error: any) {
                    // Разлогиниваем только при ошибках авторизации (401), а не при всех ошибках
                    // Ошибки сети или сервера не должны разлогинивать пользователя
                    if (error?.status === 401 || error?.payload?.status === 401) {
                        apiClient.logout()
                    }
                }
            }
            setLoading(false)
        }
        checkAuth()
    }, [dispatch])

    if (loading) {
        return null
    }

    if (!isAuthenticated && !token) {
        return <Navigate to="/login" replace />
    }

    return <>{children}</>
}

