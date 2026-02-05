import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import { OrgProvider } from '@/contexts/OrgContext'
import { NotificationProvider } from '@/contexts/NotificationContext'
import { ThemeProvider } from '@/contexts/ThemeContext'

// Components (not lazy - needed immediately)
import Layout from '@/components/Layout'
import { OnboardingProvider } from '@/components/OnboardingTour'
import { TooltipProvider } from '@/components/Tooltip'
import PageLoader from '@/components/PageLoader'

// Lazy loaded pages
const Landing = lazy(() => import('@/pages/Landing'))
const Login = lazy(() => import('@/pages/Login'))
const Signup = lazy(() => import('@/pages/Signup'))
const Onboarding = lazy(() => import('@/pages/Onboarding'))
const Dashboard = lazy(() => import('@/pages/Dashboard'))
const Scanner = lazy(() => import('@/pages/Scanner'))
const Forgeur = lazy(() => import('@/pages/Forgeur'))
const Radar = lazy(() => import('@/pages/Radar'))
const Proof = lazy(() => import('@/pages/Proof'))
const Clients = lazy(() => import('@/pages/Clients'))
const ClientDetail = lazy(() => import('@/pages/ClientDetail'))
const Settings = lazy(() => import('@/pages/Settings'))
const Analytics = lazy(() => import('@/pages/Analytics'))
const Legal = lazy(() => import('@/pages/Legal'))

// Auth guard
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return <PageLoader />
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return children
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return <PageLoader />
  }

  if (user) {
    return <Navigate to="/app" replace />
  }

  return children
}

export default function App() {
  return (
    <ThemeProvider>
      <TooltipProvider>
        <BrowserRouter>
          <AuthProvider>
            <OrgProvider>
              <NotificationProvider>
              <Suspense fallback={<PageLoader />}>
                <Routes>
                {/* Public routes */}
                <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
                <Route path="/signup" element={<PublicRoute><Signup /></PublicRoute>} />

                {/* Onboarding */}
                <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />

                {/* App routes (protected) */}
                <Route path="/app" element={<ProtectedRoute><OnboardingProvider><Layout /></OnboardingProvider></ProtectedRoute>}>
                  <Route index element={<Dashboard />} />
                  <Route path="clients" element={<Clients />} />
                  <Route path="clients/:clientId" element={<ClientDetail />} />
                  <Route path="scanner" element={<Scanner />} />
                  <Route path="forgeur" element={<Forgeur />} />
                  <Route path="radar" element={<Radar />} />
                  <Route path="proof" element={<Proof />} />
                  <Route path="analytics" element={<Analytics />} />
                  <Route path="settings" element={<Settings />} />
                </Route>

                {/* Landing page (public) */}
                <Route path="/" element={<PublicRoute><Landing /></PublicRoute>} />

                {/* Legal pages (public) */}
                <Route path="/legal" element={<Legal />} />

                {/* Redirect */}
                <Route path="*" element={<Navigate to="/app" replace />} />
                </Routes>
              </Suspense>
            </NotificationProvider>
            </OrgProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  )
}
