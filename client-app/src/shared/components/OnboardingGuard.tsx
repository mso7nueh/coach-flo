import { Navigate } from 'react-router-dom'
import { useAppSelector } from '@/shared/hooks/useAppSelector'
import type { ReactNode } from 'react'

interface OnboardingGuardProps {
    children: ReactNode
}

export const OnboardingGuard = ({ children }: OnboardingGuardProps) => {
    const onboardingSeen = useAppSelector((state) => state.user.onboardingSeen)

    if (!onboardingSeen) {
        return <Navigate to="/onboarding" replace />
    }

    return <>{children}</>
}

