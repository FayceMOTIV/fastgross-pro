import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import { OrgProvider, useOrg } from '@/contexts/OrgContext'
import { NotificationProvider } from '@/contexts/NotificationContext'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { DemoProvider, useDemo } from '@/contexts/DemoContext'
import { OnboardingFlowProvider } from '@/contexts/OnboardingContext'

// Components (not lazy - needed immediately)
import ErrorBoundary from '@/components/ErrorBoundary'
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
const OnboardingComplete = lazy(() => import('@/pages/OnboardingComplete'))

// Lazy loaded pages - App (v5.0 Hubs)
const Dashboard = lazy(() => import('@/pages/Dashboard'))
const AutoPilotHub = lazy(() => import('@/pages/AutoPilotHub'))
const SourcingHub = lazy(() => import('@/pages/SourcingHub'))
const ToolsHub = lazy(() => import('@/pages/ToolsHub'))
const CRMHub = lazy(() => import('@/pages/CRMHub'))
const OutreachHub = lazy(() => import('@/pages/OutreachHub'))
const InboxHub = lazy(() => import('@/pages/InboxHub'))
const PerformanceHub = lazy(() => import('@/pages/PerformanceHub'))
const ConfigHub = lazy(() => import('@/pages/ConfigHub'))
const AdminHub = lazy(() => import('@/pages/AdminHub'))

// Intent Hunter pages
const IntentHunterHome = lazy(() => import('@/pages/IntentHunterHome'))
const IntentHunterPro = lazy(() => import('@/pages/IntentHunterPro'))
const IntentHunterParticuliers = lazy(() => import('@/pages/IntentHunterParticuliers'))
const IntentHunterStats = lazy(() => import('@/pages/IntentHunterStats'))
const UnsubscribePage = lazy(() => import('@/pages/UnsubscribePage'))

// V4 pages
const ROIDashboard = lazy(() => import('@/pages/ROIDashboard'))
const ResellerDashboard = lazy(() => import('@/pages/ResellerDashboard'))

// CRM pages
const CRMList = lazy(() => import('@/pages/CRMList'))
const CRMLeadDetail = lazy(() => import('@/pages/CRMLeadDetail'))
const CRMKanban = lazy(() => import('@/pages/CRMKanban'))

// Campaign Engine pages
const ICPWizard = lazy(() => import('@/pages/ICPWizard'))
const CampaignList = lazy(() => import('@/pages/CampaignList'))
const CampaignSettings = lazy(() => import('@/pages/CampaignSettings'))
const HITLQueue = lazy(() => import('@/pages/HITLQueue'))

// Legacy pages still needed for direct routes
const Templates = lazy(() => import('@/pages/Templates'))
const Sequences = lazy(() => import('@/pages/Sequences'))
const Interactions = lazy(() => import('@/pages/Interactions'))
const Prospects = lazy(() => import('@/pages/Prospects'))

// Auth guard - simplified, no forced onboarding
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  const location = useLocation()
  const { isDemo } = useDemo()

  // Show loader while checking auth
  if (loading) {
    return <PageLoader />
  }

  // Allow access if user is authenticated OR in demo mode
  if (user || isDemo) {
    return children
  }

  // Redirect to login if not authenticated and not in demo mode
  return <Navigate to="/login" state={{ from: location }} replace />
}

// Onboarding route guard - allows demo mode or authenticated users needing onboarding
function OnboardingRoute({ children }) {
  const { user, loading, needsOnboarding } = useAuth()
  const { isDemo } = useDemo()

  // Demo mode - always allow
  if (isDemo) {
    return <OnboardingFlowProvider>{children}</OnboardingFlowProvider>
  }

  if (loading) {
    return <PageLoader />
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  // Still loading profile, show loader
  if (needsOnboarding === null) {
    return <PageLoader />
  }

  // If onboarding is complete, redirect to app
  if (!needsOnboarding) {
    return <Navigate to="/app" replace />
  }

  return <OnboardingFlowProvider>{children}</OnboardingFlowProvider>
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
    // Still loading profile, show loader
    if (needsOnboarding === null) {
      return <PageLoader />
    }
    if (needsOnboarding) {
      return <Navigate to="/onboarding" replace />
    }
    return <Navigate to="/app" replace />
  }

  return children
}

// Organization guard - ensures user has an org selected
function OrgGuard({ children }) {
  const { currentOrg, loading } = useOrg()
  const { isDemo } = useDemo()

  if (isDemo) {
    return children
  }

  // Wait for org loading to complete
  if (loading) {
    return <PageLoader />
  }

  // OrgContext now auto-creates org, so we should always have one
  // Just show children - if somehow no org, OrgContext handles it
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
                  <ErrorBoundary>
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
                        <Route path="/unsubscribed" element={<UnsubscribePage />} />

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
                        <Route
                          path="/onboarding/complete"
                          element={
                            <OnboardingRoute>
                              <OnboardingComplete />
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

                          {/* v5.0 Hub Pages */}
                          <Route path="autopilot" element={<AutoPilotHub />} />
                          <Route path="sourcing" element={<SourcingHub />} />
                          <Route path="tools" element={<ToolsHub />} />
                          <Route path="crm" element={<CRMHub />} />
                          <Route path="crm/list" element={<CRMList />} />
                          <Route path="crm/kanban" element={<CRMKanban />} />
                          <Route path="crm/lead/:prospectId" element={<CRMLeadDetail />} />

                          {/* Campaign Engine */}
                          <Route path="campaigns/wizard" element={<ICPWizard />} />
                          <Route path="campaigns/list" element={<CampaignList />} />
                          <Route path="campaigns/settings" element={<CampaignSettings />} />
                          <Route path="campaigns/hitl" element={<HITLQueue />} />

                          <Route path="outreach" element={<OutreachHub />} />
                          <Route path="inbox" element={<InboxHub />} />
                          <Route path="performance" element={<PerformanceHub />} />
                          <Route path="config" element={<ConfigHub />} />
                          <Route path="admin" element={<AdminHub />} />

                          {/* V4 — ROI + Reseller */}
                          <Route path="roi" element={<ROIDashboard />} />
                          <Route path="reseller" element={<ResellerDashboard />} />

                          {/* Intent Hunter */}
                          <Route path="intent-hunter" element={<IntentHunterHome />} />
                          <Route path="intent-hunter/pro" element={<IntentHunterPro />} />
                          <Route
                            path="intent-hunter/particuliers"
                            element={<IntentHunterParticuliers />}
                          />
                          <Route path="intent-hunter/stats" element={<IntentHunterStats />} />

                          {/* Legacy pages still needed as direct routes */}
                          <Route path="templates" element={<Templates />} />
                          <Route path="templates/:templateId" element={<Templates />} />
                          <Route path="sequences" element={<Sequences />} />
                          <Route path="sequences/:sequenceId" element={<Sequences />} />
                          <Route path="interactions" element={<Interactions />} />
                          <Route path="prospects/:prospectId" element={<Prospects />} />

                          {/* ============================================ */}
                          {/* REDIRECTIONS — anciennes routes vers v5.0 */}
                          {/* ============================================ */}

                          {/* AutoPilot */}
                          <Route
                            path="daily-prospects"
                            element={<Navigate to="/app/autopilot?tab=daily" replace />}
                          />
                          <Route
                            path="test-autopilot"
                            element={<Navigate to="/app/autopilot?tab=test" replace />}
                          />
                          <Route
                            path="autopilot/setup"
                            element={<Navigate to="/app/autopilot?tab=setup" replace />}
                          />

                          {/* Sourcing */}
                          <Route
                            path="hunter"
                            element={<Navigate to="/app/sourcing?tab=social" replace />}
                          />
                          <Route
                            path="linkedin"
                            element={<Navigate to="/app/sourcing?tab=linkedin" replace />}
                          />
                          <Route
                            path="google-maps"
                            element={<Navigate to="/app/sourcing?tab=maps" replace />}
                          />
                          <Route
                            path="prospecting-sources"
                            element={<Navigate to="/app/sourcing" replace />}
                          />
                          <Route
                            path="enrichment"
                            element={<Navigate to="/app/sourcing?tab=enrichment" replace />}
                          />

                          {/* Outils IA */}
                          <Route path="scanner" element={<Navigate to="/app/tools" replace />} />
                          <Route
                            path="forgeur"
                            element={<Navigate to="/app/tools?tab=forgeur" replace />}
                          />
                          <Route
                            path="radar"
                            element={<Navigate to="/app/tools?tab=radar" replace />}
                          />
                          <Route path="ai" element={<Navigate to="/app/tools?tab=ai" replace />} />
                          <Route
                            path="posting"
                            element={<Navigate to="/app/tools?tab=posting" replace />}
                          />

                          {/* CRM */}
                          <Route
                            path="prospects"
                            element={<Navigate to="/app/crm?tab=prospects" replace />}
                          />
                          <Route
                            path="pipeline"
                            element={<Navigate to="/app/crm?tab=pipeline" replace />}
                          />

                          {/* Outreach */}
                          <Route
                            path="campaigns"
                            element={<Navigate to="/app/outreach" replace />}
                          />
                          <Route
                            path="email-sequences"
                            element={<Navigate to="/app/outreach?tab=email" replace />}
                          />
                          <Route
                            path="social-outreach"
                            element={<Navigate to="/app/outreach?tab=social" replace />}
                          />
                          <Route
                            path="whatsapp"
                            element={<Navigate to="/app/outreach?tab=whatsapp" replace />}
                          />

                          {/* Inbox */}
                          <Route
                            path="escalations"
                            element={<Navigate to="/app/inbox?tab=escalations" replace />}
                          />

                          {/* Performance */}
                          <Route
                            path="analytics"
                            element={<Navigate to="/app/performance" replace />}
                          />
                          <Route
                            path="proof"
                            element={<Navigate to="/app/performance?tab=proof" replace />}
                          />
                          <Route
                            path="monitoring"
                            element={<Navigate to="/app/performance?tab=monitoring" replace />}
                          />

                          {/* Config */}
                          <Route path="settings" element={<Navigate to="/app/config" replace />} />
                          <Route
                            path="settings/:section"
                            element={<Navigate to="/app/config" replace />}
                          />
                          <Route
                            path="email-infra"
                            element={<Navigate to="/app/config?section=email-infra" replace />}
                          />
                          <Route
                            path="knowledge-base"
                            element={<Navigate to="/app/config?section=knowledge" replace />}
                          />
                          <Route
                            path="base-de-connaissances"
                            element={<Navigate to="/app/config?section=knowledge" replace />}
                          />
                          <Route
                            path="sequence-builder"
                            element={<Navigate to="/app/config?section=sequences" replace />}
                          />
                          <Route
                            path="voice-config"
                            element={<Navigate to="/app/config?section=voice" replace />}
                          />
                          <Route
                            path="integrations"
                            element={<Navigate to="/app/config?section=integrations" replace />}
                          />
                          <Route
                            path="team"
                            element={<Navigate to="/app/config?section=team" replace />}
                          />
                          <Route
                            path="setup"
                            element={<Navigate to="/app/config?section=setup" replace />}
                          />
                          <Route
                            path="hunter-pricing"
                            element={<Navigate to="/app/config?section=billing" replace />}
                          />

                          {/* Admin */}
                          <Route
                            path="test-email"
                            element={<Navigate to="/app/admin?tab=test-email" replace />}
                          />
                          <Route
                            path="war-room"
                            element={<Navigate to="/app/admin?tab=war-room" replace />}
                          />
                        </Route>

                        {/* ============================================ */}
                        {/* CATCH-ALL REDIRECT */}
                        {/* ============================================ */}
                        <Route path="*" element={<Navigate to="/app" replace />} />
                      </Routes>
                    </Suspense>
                  </ErrorBoundary>
                </NotificationProvider>
              </OrgProvider>
            </AuthProvider>
          </DemoProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  )
}
