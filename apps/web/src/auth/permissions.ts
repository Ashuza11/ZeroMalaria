import { useAuth } from './AuthContext';

/** True when the signed-in user has the given permission code. */
export function useCan(code: string): boolean {
  const { user } = useAuth();
  if (!user?.permissions?.length) return false;
  return user.permissions.includes(code);
}
