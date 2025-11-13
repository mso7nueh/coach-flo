import { Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from '@/shared/layouts/AppLayout'
import { ProtectedRoute } from '@/shared/components/ProtectedRoute'
import { LoginPage } from '@/pages/auth/LoginPage'
import { RegisterPage } from '@/pages/auth/RegisterPage'
import { DashboardPage } from '@/pages/client/dashboard/DashboardPage'
import { CalendarPage } from '@/pages/client/calendar/CalendarPage'
import { ProgramPage } from '@/pages/client/program/ProgramPage'
import { MetricsPage } from '@/pages/client/metrics/MetricsPage'
import { ProfilePage } from '@/pages/client/profile/ProfilePage'
import { EditProfilePage } from '@/pages/client/profile/EditProfilePage'
import { SettingsPage } from '@/pages/client/settings/SettingsPage'
import { OnboardingPage } from '@/pages/client/onboarding/OnboardingPage'
import { OnboardingGuard } from '@/shared/components/OnboardingGuard'

export const AppRoutes = () => (
    <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route
            path="/"
            element={
                <ProtectedRoute>
                    <AppLayout />
                </ProtectedRoute>
            }
        >
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="onboarding" element={<OnboardingPage />} />
            <Route
                path="dashboard"
                element={
                    <OnboardingGuard>
                        <DashboardPage />
                    </OnboardingGuard>
                }
            />
            <Route path="calendar" element={<CalendarPage />} />
            <Route path="program" element={<ProgramPage />} />
            <Route path="metrics" element={<MetricsPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="profile/edit" element={<EditProfilePage />} />
            <Route path="settings" element={<SettingsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
)

