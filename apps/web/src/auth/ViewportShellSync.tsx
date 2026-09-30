import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import {
  DESKTOP_MIN_WIDTH,
  getPreferredView,
  mapPathAcrossShells,
} from './roleAccess';


/**
 * When preferred view is "auto", crossing the 1024px breakpoint remaps
 * /app/* ↔ /m/* without dropping the user on an unrelated page.
 */
export function ViewportShellSync() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const wasDesktop = useRef(
    typeof window !== 'undefined' ? window.innerWidth >= DESKTOP_MIN_WIDTH : true,
  );

  useEffect(() => {
    const onResize = () => {
      if (getPreferredView() !== 'auto' || !user) return;
      const desktop = window.innerWidth >= DESKTOP_MIN_WIDTH;
      if (desktop === wasDesktop.current) return;
      wasDesktop.current = desktop;
      const next = mapPathAcrossShells(location.pathname, !desktop, user.role);
      if (next && next !== location.pathname) {
        navigate(`${next}${location.search}`, { replace: true });
      }
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [user, location.pathname, location.search, navigate]);

  return null;
}
