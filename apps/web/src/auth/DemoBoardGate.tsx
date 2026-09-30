import { Navigate } from 'react-router-dom';
import { isDemoModeEnabled, useAuth } from './AuthContext';
import { BROAD_ROLES, normalizeRole } from './roleAccess';
import { LiveDemoBoard } from '../pages/LiveDemoBoard';

export function DemoBoardGate() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  const role = normalizeRole(user.role);
  const allowed =
    isDemoModeEnabled ||
    BROAD_ROLES.includes(role) ||
    user.username.endsWith('.demo') ||
    user.username === 'health.center' ||
    user.username === 'super.admin' ||
    user.username === 'rbc.admin';
  if (!allowed) return <Navigate to="/app/not-authorized" replace />;
  return <LiveDemoBoard />;
}
