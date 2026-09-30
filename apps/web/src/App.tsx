import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { AuthProvider, useAuth } from './auth/AuthContext';
import {
  ALL_ROLES,
  BROAD_ROLES,
  homePath,
  normalizeRole,
  webHomePath,
} from './auth/roleAccess';

import { RequireAuth, RequireRole } from './auth/guards';
import { ViewportShellSync } from './auth/ViewportShellSync';
import { SyncProvider } from './sync/SyncContext';
import { EventProvider } from './events/EventContext';
import { DemoBoardGate } from './auth/DemoBoardGate';
import { ThemeProvider } from './theme/ThemeContext';
import { ConversationProvider } from './voice/ConversationContext';
import { VoiceProvider } from './voice/VoiceContext';
import { ToastProvider } from './components/ToastProvider';
import { Skeleton } from './components/ui';
import { LoginPage } from './pages/LoginPage';
import { HomePage } from './pages/HomePage';
import { TriagePage } from './pages/TriagePage';
import { ResultPage } from './pages/ResultPage';
import { HandoverPage } from './pages/HandoverPage';
import { ReferralsPage } from './pages/ReferralsPage';
import { AlertsPage } from './pages/AlertsPage';
import { FacilityPage } from './pages/FacilityPage';
import { MobileLandingPage } from './pages/MobileLandingPage';
import { NotAuthorizedPage } from './pages/NotAuthorizedPage';
import { UsersPage } from './pages/UsersPage';
import { PermissionsPage } from './pages/PermissionsPage';
import { AuditLogPage } from './pages/AuditLogPage';
import { ChangePasswordPage } from './pages/ChangePasswordPage';
import { PasswordPromptModal } from './components/PasswordPromptModal';
import { FacilitiesAdminPage } from './pages/FacilitiesAdminPage';
import { ConfigPage } from './pages/ConfigPage';
import { AboutPage } from './pages/AboutPage';
import { AppLanguagePage } from './pages/AppLanguagePage';
import { PatientsPage } from './pages/PatientsPage';
import { SuppliesPage } from './pages/SuppliesPage';
import { PreventionPage } from './pages/PreventionPage';
import { VoiceSettingsPage } from './pages/VoiceSettingsPage';
import { LanguagePage } from './pages/LanguagePage';
import { ChwWebHome } from './pages/ChwWebHome';
import { VoiceReviewPage } from './pages/VoiceReviewPage';
import { TranslationReviewPage } from './pages/TranslationReviewPage';
import { DevTranslationsPage } from './pages/DevTranslationsPage';

const RbcPage = lazy(() => import('./pages/RbcPage'));

function DashFallback() {
  return (
    <div className="min-h-screen bg-app p-6">
      <Skeleton className="mb-4 h-12 w-64" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
    </div>
  );
}

function RootRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <DashFallback />;
  if (user) return <Navigate to={homePath(user.role)} replace />;
  return <Navigate to="/login" replace />;
}

function AppHome() {
  const { user } = useAuth();
  const role = user ? normalizeRole(user.role) : undefined;
  if (role === 'CHW') return <ChwWebHome />;
  if (role === 'HEALTH_CENTER') return <Navigate to="/app/referrals" replace />;
  if (role && BROAD_ROLES.includes(role)) {
    return (
      <Suspense fallback={<DashFallback />}>
        <RbcPage />
      </Suspense>
    );
  }
  return <Navigate to="/login" replace />;
}

function AppDashboard() {
  const { user } = useAuth();
  const role = user ? normalizeRole(user.role) : undefined;
  if (role === 'HEALTH_CENTER') return <Navigate to={webHomePath('HEALTH_CENTER')} replace />;
  if (role === 'CHW') return <Navigate to={webHomePath('CHW')} replace />;
  return (
    <Suspense fallback={<DashFallback />}>
      <RbcPage />
    </Suspense>
  );
}

function LegacyRedirect({ to }: { to: string }) {
  const location = useLocation();
  return <Navigate to={`${to}${location.search}`} replace />;
}

export default function App() {
  return (
    <ThemeProvider>
      <VoiceProvider>
        <ConversationProvider>
        <AuthProvider>
          <SyncProvider>
            <ToastProvider>
              <EventProvider>
              <BrowserRouter
                future={{
                  v7_startTransition: true,
                  v7_relativeSplatPath: true,
                }}
              >
              <ViewportShellSync />
              <PasswordPromptModal />
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/dev/translations" element={<DevTranslationsPage />} />
                <Route path="/" element={<RootRedirect />} />

                <Route path="/m" element={<MobileLandingPage />} />
                <Route path="/m/home" element={<HomePage />} />
                <Route path="/m/triage" element={<TriagePage />} />
                <Route path="/m/result" element={<ResultPage />} />
                <Route path="/m/handover" element={<HandoverPage />} />
                <Route path="/m/referrals" element={<ReferralsPage />} />
                <Route path="/m/alerts" element={<AlertsPage />} />
                <Route path="/m/prevention" element={<PreventionPage />} />
                <Route path="/m/voice-settings" element={<VoiceSettingsPage />} />

                <Route
                  path="/app"
                  element={
                    <RequireAuth>
                      <Navigate to="/app/home" replace />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/app/home"
                  element={
                    <RequireAuth>
                      <AppHome />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/app/dashboard"
                  element={
                    <RequireAuth>
                      <AppDashboard />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/app/referrals"
                  element={
                    <RequireAuth>
                      <RequireRole roles={['HEALTH_CENTER', ...BROAD_ROLES]}>
                        <FacilityPage />
                      </RequireRole>
                    </RequireAuth>
                  }
                />
                <Route
                  path="/app/patients"
                  element={
                    <RequireAuth>
                      <RequireRole roles={['HEALTH_CENTER', ...BROAD_ROLES]}>
                        <PatientsPage />
                      </RequireRole>
                    </RequireAuth>
                  }
                />
                <Route
                  path="/app/analytics"
                  element={
                    <RequireAuth>
                      <RequireRole roles={[...BROAD_ROLES]}>
                        <Suspense fallback={<DashFallback />}>
                          <RbcPage />
                        </Suspense>
                      </RequireRole>
                    </RequireAuth>
                  }
                />
                <Route
                  path="/app/supplies"
                  element={
                    <RequireAuth>
                      <RequireRole roles={[...BROAD_ROLES]}>
                        <SuppliesPage />
                      </RequireRole>
                    </RequireAuth>
                  }
                />
                <Route
                  path="/app/users"
                  element={
                    <RequireAuth>
                      <RequireRole roles={[...BROAD_ROLES]}>
                        <UsersPage />
                      </RequireRole>
                    </RequireAuth>
                  }
                />
                <Route
                  path="/app/permissions"
                  element={
                    <RequireAuth>
                      <RequireRole roles={['SUPER_ADMIN']}>
                        <PermissionsPage />
                      </RequireRole>
                    </RequireAuth>
                  }
                />
                <Route
                  path="/app/audit"
                  element={
                    <RequireAuth>
                      <RequireRole roles={[...BROAD_ROLES]}>
                        <AuditLogPage />
                      </RequireRole>
                    </RequireAuth>
                  }
                />
                <Route
                  path="/app/facilities"
                  element={
                    <RequireAuth>
                      <RequireRole roles={[...BROAD_ROLES]}>
                        <FacilitiesAdminPage />
                      </RequireRole>
                    </RequireAuth>
                  }
                />
                <Route
                  path="/app/config"
                  element={
                    <RequireAuth>
                      <RequireRole roles={['SUPER_ADMIN', 'RBC_ADMIN']}>
                        <ConfigPage />
                      </RequireRole>
                    </RequireAuth>
                  }
                />
                <Route
                  path="/app/change-password"
                  element={
                    <RequireAuth>
                      <ChangePasswordPage />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/app/settings/language"
                  element={
                    <RequireAuth>
                      <AppLanguagePage />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/app/settings/about"
                  element={
                    <RequireAuth>
                      <AboutPage />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/app/chw"
                  element={
                    <RequireAuth>
                      <RequireRole roles={['CHW']}>
                        <Navigate to="/app/home" replace />
                      </RequireRole>
                    </RequireAuth>
                  }
                />
                <Route
                  path="/app/my-referrals"
                  element={
                    <RequireAuth>
                      <RequireRole roles={['CHW']}>
                        <ReferralsPage />
                      </RequireRole>
                    </RequireAuth>
                  }
                />
                <Route
                  path="/app/my-patients"
                  element={
                    <RequireAuth>
                      <RequireRole roles={['CHW']}>
                        <PatientsPage />
                      </RequireRole>
                    </RequireAuth>
                  }
                />
                <Route
                  path="/app/alerts"
                  element={
                    <RequireAuth>
                      <RequireRole roles={['CHW']}>
                        <AlertsPage />
                      </RequireRole>
                    </RequireAuth>
                  }
                />
                <Route
                  path="/app/triage"
                  element={
                    <RequireAuth>
                      <RequireRole roles={['CHW']}>
                        <TriagePage />
                      </RequireRole>
                    </RequireAuth>
                  }
                />
                <Route
                  path="/app/result"
                  element={
                    <RequireAuth>
                      <RequireRole roles={['CHW']}>
                        <ResultPage />
                      </RequireRole>
                    </RequireAuth>
                  }
                />
                <Route
                  path="/app/settings/voice"
                  element={
                    <RequireAuth>
                      <VoiceSettingsPage />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/app/settings/voice-review"
                  element={
                    <RequireAuth>
                      <RequireRole roles={[...ALL_ROLES]}>
                        <VoiceReviewPage />
                      </RequireRole>
                    </RequireAuth>
                  }
                />
                <Route
                  path="/app/settings/translations"
                  element={
                    <RequireAuth>
                      <RequireRole roles={[...ALL_ROLES]}>
                        <TranslationReviewPage />
                      </RequireRole>
                    </RequireAuth>
                  }
                />
                <Route
                  path="/app/not-authorized"
                  element={
                    <RequireAuth>
                      <NotAuthorizedPage />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/demo/board"
                  element={
                    <RequireAuth>
                      <DemoBoardGate />
                    </RequireAuth>
                  }
                />

                <Route path="/home" element={<LegacyRedirect to="/m/home" />} />
                <Route path="/triage" element={<LegacyRedirect to="/m/triage" />} />
                <Route path="/result" element={<LegacyRedirect to="/m/result" />} />
                <Route path="/handover" element={<LegacyRedirect to="/m/handover" />} />
                <Route path="/referrals" element={<LegacyRedirect to="/m/referrals" />} />
                <Route path="/alerts" element={<LegacyRedirect to="/m/alerts" />} />
                <Route path="/facility" element={<FacilityPage />} />
                <Route path="/rbc" element={<LegacyRedirect to="/app" />} />
                <Route path="/lang" element={<LanguagePage />} />
                <Route path="/about" element={<AboutPage />} />

                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </BrowserRouter>
              </EventProvider>
          </ToastProvider>
        </SyncProvider>
      </AuthProvider>
        </ConversationProvider>
      </VoiceProvider>
    </ThemeProvider>
  );
}
