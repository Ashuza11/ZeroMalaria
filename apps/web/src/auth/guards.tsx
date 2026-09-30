import { Navigate, useLocation } from 'react-router-dom';

import { useAuth, type UserRole } from './AuthContext';

import { canAccess, homePath } from './roleAccess';

import { Skeleton } from '../components/ui';



export function RequireAuth({ children }: { children: React.ReactNode }) {

  const { user, loading } = useAuth();

  const location = useLocation();

  if (loading) {

    return (

      <div className="min-h-screen bg-app p-6">

        <Skeleton className="h-12 w-64" />

      </div>

    );

  }

  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;

  if (!canAccess(location.pathname, user.role as UserRole)) {

    return <Navigate to="/app/not-authorized" replace />;

  }

  return <>{children}</>;

}



export function RequireRole({ roles, children }: { roles: UserRole[]; children: React.ReactNode }) {

  const { user, loading } = useAuth();

  const location = useLocation();

  if (loading) return null;

  if (!user) return <Navigate to="/login" replace />;

  if (!roles.includes(user.role as UserRole)) {

    return <Navigate to="/app/not-authorized" replace />;

  }

  if (!canAccess(location.pathname, user.role as UserRole)) {

    return <Navigate to="/app/not-authorized" replace />;

  }

  return <>{children}</>;

}



export function RedirectIfAuthed({ children }: { children: React.ReactNode }) {

  const { user, loading } = useAuth();

  if (loading) return null;

  if (user) return <Navigate to={homePath(user.role as UserRole)} replace />;

  return <>{children}</>;

}

