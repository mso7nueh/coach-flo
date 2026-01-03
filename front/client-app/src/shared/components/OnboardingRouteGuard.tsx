import { Navigate } from 'react-router-dom'
import { useAppSelector } from '@/shared/hooks/useAppSelector'

interface OnboardingRouteGuardProps {
    children: React.ReactNode
}

export const OnboardingRouteGuard = ({ children }: OnboardingRouteGuardProps) => {
    const role = useAppSelector((state) => state.user.role)

    if (role === 'trainer') {
        return <Navigate to="/trainer/clients" replace />
    }

    return <>{children}</>
}



