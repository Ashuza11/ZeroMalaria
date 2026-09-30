export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ');
}

/** @deprecated use lib/relativeTime */
export { relativeTime } from './relativeTime';
