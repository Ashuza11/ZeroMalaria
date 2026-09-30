import type { ReactNode } from 'react';
import { useCan } from './permissions';

/** Renders children only when the current user has `code` in permissions. */
export function Can({ code, children }: { code: string; children: ReactNode }) {
  if (!useCan(code)) return null;
  return <>{children}</>;
}
