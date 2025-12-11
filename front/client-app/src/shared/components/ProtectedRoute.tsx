import { Navigate } from 'react-router-dom'
import { useAppSelector } from '@/shared/hooks/useAppSelector'
import type { ReactNode } from 'react'

interface ProtectedRouteProps {
    children: ReactNode
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
    const isAuthenticated = useAppSelector((state) => state.user.isAuthenticated)

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />
    }

    return <>{children}</>
}

