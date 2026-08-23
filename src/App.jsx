import { useState, useEffect, lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './lib/supabase.js'
import { SubscriptionProvider } from './hooks/useSubscription.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import { authHeaders } from './services/chatService.js'

const ChildPage   = lazy(() => import('./pages/ChildPage.jsx'))
const ParentPage  = lazy(() => import('./pages/ParentPage.jsx'))
const PromotionCenterPage = lazy(() => import('./pages/PromotionCenterPage.jsx'))
const AuthPage    = lazy(() => import('./pages/AuthPage.jsx'))
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage.jsx'))
const LandingPage = lazy(() => import('./pages/LandingPage.jsx'))
const CoursesPage = lazy(() => import('./pages/CoursesPage.jsx'))
const LessonPage  = lazy(() => import('./pages/LessonPage.jsx'))
const PrivacyPolicyPage = lazy(() => import('./pages/PrivacyPolicyPage.jsx'))
const DataDeletionPage  = lazy(() => import('./pages/DataDeletionPage.jsx'))
const TermsOfServicePage = lazy(() => import('./pages/TermsOfServicePage.jsx'))
const RefundPolicyPage   = lazy(() => import('./pages/RefundPolicyPage.jsx'))
const CookiePolicyPage   = lazy(() => import('./pages/CookiePolicyPage.jsx'))
const AdminPage = lazy(() => import('./pages/AdminPage.jsx'))
const AdminUserDetailPage = lazy(() => import('./pages/AdminUserDetailPage.jsx'))

// Must match ADMIN_EMAIL in api/_admin.js exactly. This check is UX-only —
// the API endpoints re-check server-side, which is the real security boundary.
const ADMIN_EMAIL = 'rebawntech@gmail.com'

const Loader = () => (
  <main
    id="main"
    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', background: '#030712' }}
  >
    {/* rgba(255,255,255,0.3) on #030712 was 2.54:1 — below the 4.5:1 AA
        floor every user hits on every cold load while the session
        resolves (AccessLint audit_live, 2026-08-17). */}
    <h1 style={{ color: 'rgba(255,255,255,0.75)', fontFamily: 'sans-serif', fontSize: '1rem', fontWeight: 400 }}>Loading…</h1>
  </main>
)

export default function App() {
  const [session, setSession] = useState(undefined) // undefined = loading

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const s = data.session
      setSession(s)
      // Provision trial row for new users
      if (s?.user) ensureSubscription()
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s)
      if (s?.user) ensureSubscription()
    })
    return () => subscription.unsubscribe()
  }, [])

  if (session === undefined) {
    return <Loader />
  }

  return (
    <BrowserRouter>
      <SubscriptionProvider userId={session?.user?.id}>
        <ErrorBoundary>
        <Suspense fallback={<Loader />}>
        <Routes>
          {/* Public */}
          <Route path="/"      element={session ? <Navigate to="/app" replace /> : <LandingPage />} />
          <Route path="/login" element={session ? <Navigate to="/app" replace /> : <AuthPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/privacy" element={<PrivacyPolicyPage />} />
          <Route path="/data-deletion" element={<DataDeletionPage />} />
          <Route path="/terms" element={<TermsOfServicePage />} />
          <Route path="/refunds" element={<RefundPolicyPage />} />
          <Route path="/cookies" element={<CookiePolicyPage />} />

          {/* Authenticated */}
          <Route path="/app"     element={session ? <ChildPage session={session} />  : <Navigate to="/" replace />} />
          <Route path="/parent"  element={session ? <ParentPage session={session} /> : <Navigate to="/" replace />} />
          <Route path="/parent/promotion" element={session ? <PromotionCenterPage session={session} /> : <Navigate to="/" replace />} />
          <Route path="/courses" element={session ? <CoursesPage session={session} /> : <Navigate to="/" replace />} />
          <Route path="/lesson"  element={session ? <LessonPage session={session} /> : <Navigate to="/" replace />} />
          <Route path="/admin" element={session?.user?.email === ADMIN_EMAIL ? <AdminPage /> : <Navigate to={session ? '/app' : '/'} replace />} />
          <Route path="/admin/users/:id" element={session?.user?.email === ADMIN_EMAIL ? <AdminUserDetailPage /> : <Navigate to={session ? '/app' : '/'} replace />} />

          {/* Dev-only preview routes. Wrapped in import.meta.env.DEV so Vite
              statically eliminates them from production builds — they mint a
              fake session and would otherwise bypass auth and the paywall. */}
          {import.meta.env.DEV && (
            <>
              <Route path="/dev-child" element={<ChildPage session={{ user: { id: 'dev-preview' } }} />} />
              <Route path="/dev-courses" element={<CoursesPage session={{ user: { id: 'dev-preview' } }} />} />
              <Route path="/dev-parent" element={<ParentPage session={{ user: { id: 'dev-preview' } }} />} />
              <Route path="/dev-promotion" element={<PromotionCenterPage session={{ access_token: 'dev', user: { id: 'dev-preview' } }} />} />
              <Route path="/dev-lesson" element={<LessonPage session={{ user: { id: 'dev-preview' } }} />} />
            </>
          )}

          {/* Catch-all */}
          <Route path="*" element={<Navigate to={session ? '/app' : '/'} replace />} />
        </Routes>
        </Suspense>
        </ErrorBoundary>
      </SubscriptionProvider>
    </BrowserRouter>
  )
}

// Trial rows are provisioned server-side (service key) so a client can never
// mint or extend its own entitlement. Idempotent; safe to call on every load.
let ensureTrialDone = false
async function ensureSubscription() {
  if (ensureTrialDone) return
  ensureTrialDone = true
  try {
    const res = await fetch('/api/ensure-trial', { method: 'POST', headers: await authHeaders() })
    if (!res.ok) ensureTrialDone = false
  } catch {
    ensureTrialDone = false // network hiccup — retry on next auth event
  }
}
