import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import { OrgProvider, useOrg } from '@/contexts/OrgContext'
import { NotificationProvider } from '@/contexts/NotificationContext'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { DemoProvider, useDemo } from '@/contexts/DemoContext'

// Components (not lazy - needed immediately)
import Layout from '@/components/Layout'
import { OnboardingProvider } from '@/components/OnboardingTour'
import { TooltipProvider } from '@/components/Tooltip'
import PageLoader from '@/components/PageLoader'
import CookieBanner from '@/components/CookieBanner'

// Lazy loaded pages - Public
const Landing = lazy(() => import('@/pages/Landing'))
const Login = lazy(() => import('@/pages/Login'))
const Signup = lazy(() => import('@/pages/Signup'))
const Legal = lazy(() => import('@/pages/Legal'))
const Unsubscribe = lazy(() => import('@/pages/Unsubscribe'))
const Pricing = lazy(() => import('@/pages/Pricing'))

// Lazy loaded pages - Onboarding
const OnboardingChat = lazy(() => import('@/pages/OnboardingChat'))
const OnboardingPlan = lazy(() => import('@/pages/OnboardingPlan'))
const OnboardingSequence = lazy(() => import('@/pages/OnboardingSequence'))

// Lazy loaded pages - App (v4.0)
const Dashboard = lazy(() => import('@/pages/Dashboard'))
const Prospects = lazy(() => import('@/pages/Prospects'))
const Templates = lazy(() => import('@/pages/Templates'))
const Sequences = lazy(() => import('@/pages/Sequences'))
const Interactions = lazy(() => import('@/pages/Interactions'))
const Analytics = lazy(() => import('@/pages/Analytics'))
const Team = lazy(() => import('@/pages/Team'))
const Integrations = lazy(() => import('@/pages/Integrations'))
const Settings = lazy(() => import('@/pages/Settings'))
const Scanner = lazy(() => import('@/pages/Scanner'))
const Forgeur = lazy(() => import('@/pages/Forgeur'))
const Radar = lazy(() => import('@/pages/Radar'))
const Campaigns = lazy(() => import('@/pages/Campaigns'))
const Proof = lazy(() => import('@/pages/Proof'))

// Auth guard with onboarding check
function ProtectedRoute({ children }) {
  const { user, loading, needsOnboarding } = useAuth()
  const location = useLocation()
  const { isDemo } = useDemo()

  // Show loader while checking auth
  if (loading) {
    return <PageLoader />
  }

  // Allow access if user is authenticated OR in demo mode
  if (user || isDemo) {
    // Check if user needs to complete onboarding (skip for demo)
    if (!isDemo && needsOnboarding && !location.pathname.startsWith('/onboarding')) {
      return <Navigate to="/onboarding" replace />
    }
    return children
  }

  // Redirect to login if not authenticated and not in demo mode
  return <Navigate to="/login" state={{ from: location }} replace />
}

// Onboarding route guard
function OnboardingRoute({ children }) {
  const { user, loading, needsOnboarding } = useAuth()

  if (loading) {
    return <PageLoader />
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  // If onboarding is complete, redirect to app
  if (!needsOnboarding) {
    return <Navigate to="/app" replace />
  }

  return children
}

// Public route - redirects authenticated users to app
function PublicRoute({ children }) {
  const { user, loading, needsOnboarding } = useAuth()
  const { isDemo } = useDemo()

  // Show loader while checking auth
  if (loading) {
    return <PageLoader />
  }

  // If user is logged in (and not in demo mode), redirect appropriately
  if (user && !isDemo) {
    if (needsOnboarding) {
      return <Navigate to="/onboarding" replace />
    }
    return <Navigate to="/app" replace />
  }

  return children
}

// Organization guard - ensures user has an org selected
function OrgGuard({ children }) {
  const { currentOrg, loading, orgs } = useOrg()
  const { isDemo } = useDemo()

  if (isDemo) {
    return children
  }

  if (loading) {
    return <PageLoader />
  }

  // If no orgs at all, redirect to create one
  if (!loading && orgs.length === 0) {
    return <Navigate to="/onboarding" replace />
  }

  return children
}

// Permission guard component
function PermissionGuard({ permission, fallback = null, children }) {
  const { can } = useOrg()

  if (permission && !can(permission)) {
    return fallback || <Navigate to="/app" replace />
  }

  return children
}

export default function App() {
  return (
    <ThemeProvider>
      <TooltipProvider>
        <BrowserRouter>
          <DemoProvider>
            <AuthProvider>
              <OrgProvider>
                <NotificationProvider>
                  <Suspense fallback={<PageLoader />}>
                    <CookieBanner />
                    <Routes>
                      {/* ============================================ */}
                      {/* PUBLIC ROUTES */}
                      {/* ============================================ */}

                      {/* Landing page */}
                      <Route
                        path="/"
                        element={
                          <PublicRoute>
                            <Landing />
                          </PublicRoute>
                        }
                      />

                      {/* Auth pages */}
                      <Route
                        path="/login"
                        element={
                          <PublicRoute>
                            <Login />
                          </PublicRoute>
                        }
                      />
                      <Route
                        path="/signup"
                        element={
                          <PublicRoute>
                            <Signup />
                          </PublicRoute>
                        }
                      />

                      {/* Pricing page */}
                      <Route path="/pricing" element={<Pricing />} />

                      {/* Legal pages */}
                      <Route path="/legal" element={<Legal />} />
                      <Route path="/legal/:page" element={<Legal />} />

                      {/* Unsubscribe (public, no auth) */}
                      <Route path="/unsubscribe" element={<Unsubscribe />} />
                      <Route path="/unsubscribe/:token" element={<Unsubscribe />} />

                      {/* ============================================ */}
                      {/* ONBOARDING ROUTES */}
                      {/* ============================================ */}
                      <Route
                        path="/onboarding"
                        element={
                          <OnboardingRoute>
                            <OnboardingChat />
                          </OnboardingRoute>
                        }
                      />
                      <Route
                        path="/onboarding/chat"
                        element={
                          <OnboardingRoute>
                            <OnboardingChat />
                          </OnboardingRoute>
                        }
                      />
                      <Route
                        path="/onboarding/plan"
                        element={
                          <OnboardingRoute>
                            <OnboardingPlan />
                          </OnboardingRoute>
                        }
                      />
                      <Route
                        path="/onboarding/sequence"
                        element={
                          <OnboardingRoute>
                            <OnboardingSequence />
                          </OnboardingRoute>
                        }
                      />

                      {/* ============================================ */}
                      {/* APP ROUTES (Protected + Org Required) */}
                      {/* ============================================ */}
                      <Route
                        path="/app"
                        element={
                          <ProtectedRoute>
                            <OrgGuard>
                              <OnboardingProvider>
                                <Layout />
                              </OnboardingProvider>
                            </OrgGuard>
                          </ProtectedRoute>
                        }
                      >
                        {/* Dashboard */}
                        <Route index element={<Dashboard />} />

                        {/* Core v4.0 Pages */}
                        <Route path="prospects" element={<Prospects />} />
                        <Route path="prospects/:prospectId" element={<Prospects />} />
                        <Route path="scanner" element={<Scanner />} />
                        <Route path="forgeur" element={<Forgeur />} />
                        <Route path="radar" element={<Radar />} />
                        <Route path="campaigns" element={<Campaigns />} />
                        <Route path="proof" element={<Proof />} />
                        <Route path="templates" element={<Templates />} />
                        <Route path="templates/:templateId" element={<Templates />} />
                        <Route path="sequences" element={<Sequences />} />
                        <Route path="sequences/:sequenceId" element={<Sequences />} />
                        <Route path="interactions" element={<Interactions />} />
                        <Route path="analytics" element={<Analytics />} />

                        {/* Team Management (requires permission) */}
                        <Route
                          path="team"
                          element={
                            <PermissionGuard permission="team:read">
                              <Team />
                            </PermissionGuard>
                          }
                        />

                        {/* Integrations (requires admin) */}
                        <Route
                          path="integrations"
                          element={
                            <PermissionGuard permission="integrations:read">
                              <Integrations />
                            </PermissionGuard>
                          }
                        />

                        {/* Settings */}
                        <Route path="settings" element={<Settings />} />
                        <Route path="settings/:section" element={<Settings />} />
                      </Route>

                      {/* ============================================ */}
                      {/* CATCH-ALL REDIRECT */}
                      {/* ============================================ */}
                      <Route path="*" element={<Navigate to="/app" replace />} />
                    </Routes>
                  </Suspense>
                </NotificationProvider>
              </OrgProvider>
            </AuthProvider>
          </DemoProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  )
}
