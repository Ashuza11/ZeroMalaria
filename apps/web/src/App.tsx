import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { AuthProvider, useAuth, type UserRole } from './auth/AuthContext';
import { homePath } from './auth/roleAccess';
import { RequireAuth, RequireRole } from './auth/guards';
import { SyncProvider } from './sync/SyncContext';
import { ThemeProvider } from './theme/ThemeContext';
import { VoiceProvider } from './voice/VoiceContext';
import { ToastProvider } from './components/ToastProvider';
import { Skeleton } from './components/ui';
import { LoginPage } from './pages/LoginPage';
import { LandingPage } from './pages/landing/LandingPage';
import { AuthLayout } from './pages/auth/AuthLayout';
import { SignUpPage } from './pages/auth/SignUpPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';
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
  if (user) return <Navigate to={homePath(user.role as UserRole)} replace />;
  return <Navigate to="/login" replace />;
}

function AppDashboard() {
  const { user } = useAuth();
  if (user?.role === 'nurse') return <Navigate to="/app/referrals" replace />;
  if (user?.role === 'chw') return <Navigate to="/app/chw" replace />;
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
        <AuthProvider>
          <SyncProvider>
            <ToastProvider>
              <BrowserRouter>
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route element={<AuthLayout />}>
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/signup" element={<SignUpPage />} />
                  <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                </Route>
                <Route path="/start" element={<RootRedirect />} />

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
                      <AppDashboard />
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
                      <RequireRole roles={['nurse', 'supervisor', 'rbc']}>
                        <FacilityPage />
                      </RequireRole>
                    </RequireAuth>
                  }
                />
                <Route
                  path="/app/patients"
                  element={
                    <RequireAuth>
                      <RequireRole roles={['nurse', 'supervisor', 'rbc']}>
                        <PatientsPage />
                      </RequireRole>
                    </RequireAuth>
                  }
                />
                <Route
                  path="/app/analytics"
                  element={
                    <RequireAuth>
                      <RequireRole roles={['supervisor', 'rbc']}>
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
                      <RequireRole roles={['supervisor', 'rbc']}>
                        <SuppliesPage />
                      </RequireRole>
                    </RequireAuth>
                  }
                />
                <Route
                  path="/app/users"
                  element={
                    <RequireAuth>
                      <RequireRole roles={['supervisor', 'rbc']}>
                        <UsersPage />
                      </RequireRole>
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
                      <RequireRole roles={['chw']}>
                        <ChwWebHome />
                      </RequireRole>
                    </RequireAuth>
                  }
                />
                <Route
                  path="/app/my-referrals"
                  element={
                    <RequireAuth>
                      <RequireRole roles={['chw']}>
                        <ReferralsPage />
                      </RequireRole>
                    </RequireAuth>
                  }
                />
                <Route
                  path="/app/my-patients"
                  element={
                    <RequireAuth>
                      <RequireRole roles={['chw']}>
                        <PatientsPage />
                      </RequireRole>
                    </RequireAuth>
                  }
                />
                <Route
                  path="/app/alerts"
                  element={
                    <RequireAuth>
                      <RequireRole roles={['chw']}>
                        <AlertsPage />
                      </RequireRole>
                    </RequireAuth>
                  }
                />
                <Route
                  path="/app/triage"
                  element={
                    <RequireAuth>
                      <RequireRole roles={['chw']}>
                        <TriagePage />
                      </RequireRole>
                    </RequireAuth>
                  }
                />
                <Route
                  path="/app/result"
                  element={
                    <RequireAuth>
                      <RequireRole roles={['chw']}>
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
                      <RequireRole roles={['chw', 'nurse', 'supervisor', 'rbc']}>
                        <VoiceReviewPage />
                      </RequireRole>
                    </RequireAuth>
                  }
                />
                <Route
                  path="/app/settings/translations"
                  element={
                    <RequireAuth>
                      <RequireRole roles={['chw', 'nurse', 'supervisor', 'rbc']}>
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
          </ToastProvider>
        </SyncProvider>
      </AuthProvider>
      </VoiceProvider>
    </ThemeProvider>
  );
}
