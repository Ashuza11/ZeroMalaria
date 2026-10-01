import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

/** Legacy entry: all authenticated CHWs now use the same mobile-first workflow. */
export function MobileLandingPage() {
  const { user } = useAuth();
  return <Navigate to={user ? '/app/home' : '/login'} replace />;
}
