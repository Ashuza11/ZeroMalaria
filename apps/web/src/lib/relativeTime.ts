import i18n from '../i18n';

const RW_FALLBACK: Record<'second' | 'minute' | 'hour' | 'day', (n: number) => string> = {
  second: () => 'ubu nyine',
  minute: (n) => `hashize iminota ${n}`,
  hour: (n) => `hashize amasaha ${n}`,
  day: (n) => `hashize iminsi ${n}`,
};

function resolveLang(language?: string): 'rw' | 'en' {
  const raw = language || i18n.language || 'rw';
  return raw.startsWith('rw') ? 'rw' : 'en';
}

/**
 * Relative time via Intl.RelativeTimeFormat when available.
 * Kinyarwanda uses hand-written fallback if the runtime lacks 'rw'.
 */
export function formatRelativeTime(date: string | Date, language?: string): string {
  const lang = resolveLang(language);
  const then = typeof date === 'string' ? new Date(date) : date;
  const diffMs = Date.now() - then.getTime();
  const minutes = Math.round(diffMs / 60000);

  if (Math.abs(minutes) < 1) {
    return lang === 'rw' ? RW_FALLBACK.second(0) : i18n.t('time.justNow', { lng: lang });
  }

  let value: number;
  let unit: Intl.RelativeTimeFormatUnit;
  if (Math.abs(minutes) < 60) {
    value = minutes;
    unit = 'minute';
  } else {
    const hours = Math.round(minutes / 60);
    if (Math.abs(hours) < 48) {
      value = hours;
      unit = 'hour';
    } else {
      value = Math.round(hours / 24);
      unit = 'day';
    }
  }

  if (lang === 'rw') {
    try {
      const rtf = new Intl.RelativeTimeFormat('rw', { numeric: 'always' });
      const formatted = rtf.format(-Math.abs(value), unit);
      // Some engines return Latin fallback; prefer curated keys when odd.
      if (formatted && !/[A-Za-z]{3,}/.test(formatted)) return formatted;
    } catch {
      /* use hand-written */
    }
    if (unit === 'minute') return i18n.t('time.minutesAgo', { count: Math.abs(value), lng: 'rw' });
    if (unit === 'hour') return i18n.t('time.hoursAgo', { count: Math.abs(value), lng: 'rw' });
    return i18n.t('time.daysAgo', { count: Math.abs(value), lng: 'rw' });
  }

  try {
    const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
    return rtf.format(-value, unit);
  } catch {
    if (unit === 'minute') return i18n.t('time.minutesAgo', { count: Math.abs(value), lng: 'en' });
    if (unit === 'hour') return i18n.t('time.hoursAgo', { count: Math.abs(value), lng: 'en' });
    return i18n.t('time.daysAgo', { count: Math.abs(value), lng: 'en' });
  }
}

/** @deprecated Prefer formatRelativeTime */
export function relativeTime(iso: string, language?: string): string {
  return formatRelativeTime(iso, language);
}

/** Format a date with rw-RW / en-GB, with fallback. */
export function formatDate(date: string | Date, language?: string): string {
  const lang = resolveLang(language);
  const d = typeof date === 'string' ? new Date(date) : date;
  const locale = lang === 'rw' ? 'rw-RW' : 'en-GB';
  try {
    return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(d);
  } catch {
    return d.toISOString();
  }
}

/** Format a number with rw-RW / en-GB. */
export function formatNumber(value: number, language?: string): string {
  const lang = resolveLang(language);
  const locale = lang === 'rw' ? 'rw-RW' : 'en-GB';
  try {
    return new Intl.NumberFormat(locale).format(value);
  } catch {
    return String(value);
  }
}
