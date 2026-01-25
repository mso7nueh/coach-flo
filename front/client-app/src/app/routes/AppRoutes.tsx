import { Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from '@/shared/layouts/AppLayout'
import { ProtectedRoute } from '@/shared/components/ProtectedRoute'
import { OnboardingRouteGuard } from '@/shared/components/OnboardingRouteGuard'
import { OnboardingGuard } from '@/shared/components/OnboardingGuard'
import { LoginPage } from '@/pages/auth/LoginPage'
import { RegisterPage } from '@/pages/auth/RegisterPage'
import { OnboardingPage } from '@/pages/client/onboarding/OnboardingPage'
import { DashboardPage } from '@/pages/client/dashboard/DashboardPage'
import { CalendarPage } from '@/pages/client/calendar/CalendarPage'
import { ProgramPage } from '@/pages/client/program/ProgramPage'
import { MetricsPage } from '@/pages/client/metrics/MetricsPage'
import { NutritionPage } from '@/pages/client/nutrition/NutritionPage'
import { ProfilePage } from '@/pages/client/profile/ProfilePage'
import { EditProfilePage } from '@/pages/client/profile/EditProfilePage'
import { SettingsPage } from '@/pages/client/settings/SettingsPage'
import { ClientsPage } from '@/pages/trainer/clients/ClientsPage'
import { ClientDashboardPage } from '@/pages/trainer/clients/ClientDashboardPage'
import { ClientMetricsPage } from '@/pages/trainer/clients/ClientMetricsPage'
import { ClientProgramPage } from '@/pages/trainer/clients/ClientProgramPage'
import { ClientNotesPage } from '@/pages/trainer/clients/ClientNotesPage'
import { FinancesPage } from '@/pages/trainer/finances/FinancesPage'
import { LibraryPage } from '@/pages/trainer/library/LibraryPage'
import { TrainerCalendarPage } from '@/pages/trainer/calendar/TrainerCalendarPage'
import { SubscriptionPage } from '@/pages/trainer/subscription/SubscriptionPage'
import NotificationsPage from '@/pages/trainer/notifications/NotificationsPage'
import { useAppSelector } from '@/shared/hooks/useAppSelector'

const DefaultRedirect = () => {
    const role = useAppSelector((state) => state.user.role)
    return <Navigate to={role === 'trainer' ? 'trainer/clients' : 'dashboard'} replace />
}

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
            <Route index element={<DefaultRedirect />} />
            <Route
                path="onboarding"
                element={
                    <OnboardingRouteGuard>
                        <OnboardingPage />
                    </OnboardingRouteGuard>
                }
            />
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
            <Route path="nutrition" element={<NutritionPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="profile/edit" element={<EditProfilePage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="trainer/clients" element={<ClientsPage />} />
            <Route path="trainer/clients/:clientId/metrics" element={<ClientMetricsPage />} />
            <Route path="trainer/clients/:clientId/program" element={<ClientProgramPage />} />
            <Route path="trainer/clients/:clientId/notes" element={<ClientNotesPage />} />
            <Route path="trainer/clients/:clientId" element={<ClientDashboardPage />} />
            <Route path="trainer/library" element={<LibraryPage />} />
            <Route path="trainer/calendar" element={<TrainerCalendarPage />} />
            <Route path="trainer/finances" element={<FinancesPage />} />
            <Route path="trainer/notifications" element={<NotificationsPage />} />
            <Route path="trainer/subscription" element={<SubscriptionPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
)

