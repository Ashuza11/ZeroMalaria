import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { ChwShell, WebShell } from '../components/shells';

/** Prefer WebShell for any /app/* route (desktop workspace). */
export function useIsAppRoute(): boolean {
  const { pathname } = useLocation();
  return pathname.startsWith('/app');
}

export function AppOrChwShell({
  title,
  crumbs,
  children,
}: {
  title: string;
  crumbs?: string[];
  children: ReactNode;
}) {
  const isApp = useIsAppRoute();
  if (isApp) {
    return (
      <WebShell title={title} crumbs={crumbs || [title]}>
        {children}
      </WebShell>
    );
  }
  return <ChwShell title={title}>{children}</ChwShell>;
}
