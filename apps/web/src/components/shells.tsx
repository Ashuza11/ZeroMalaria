import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  AlertTriangle,
  BarChart3,
  Bell,
  ChevronLeft,
  ChevronRight,
  Home,
  Languages,
  LayoutDashboard,
  LogOut,
  Package,
  PanelLeft,
  Plus,
  Search,
  Settings,
  Stethoscope,
  User,
  Users,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { LogoMark as BrandMark } from './liquid';
import { SunMoon } from './liquid/alive';
import { spring } from '../lib/motion';
import { useSync } from '../sync/SyncContext';
import { useTheme } from '../theme/ThemeContext';
import { setLanguage } from '../i18n';
import { db } from '../db';
import { Badge, Disclaimer, IconButton, StatusPill, SyntheticBadge } from './ui';
import { PresenterMenu } from './PresenterMenu';
import { cn } from '../lib/cn';
import { easeOut, pageVariants } from '../lib/motion';
import { useAuth, type UserRole } from '../auth/AuthContext';
import { setPreferredView } from '../auth/roleAccess';
import { api } from '../api/client';

const SIDEBAR_KEY = 'zm_sidebar_collapsed';
const APP_VERSION = '0.2.0';

function roleLabel(role: UserRole | string, t: (k: string) => string) {
  const map: Record<string, string> = {
    chw: t('auth.roleChw'),
    nurse: t('auth.roleNurse'),
    supervisor: t('auth.roleSupervisor'),
    rbc: t('auth.roleRbc'),
  };
  return map[role] || role;
}

function LogoMark({ compact }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <BrandMark size={36} animated={false} />
      {!compact ? (
        <div>
          <p className="text-[16px] font-semibold leading-none tracking-[-0.02em] text-ink">
            Zero<span className="text-accent">Malaria</span>
          </p>
          <p className="mt-1 text-[11.5px] font-medium text-ink-muted">Malaria triage</p>
        </div>
      ) : null}
    </div>
  );
}

function SyncPill() {
  const { t } = useTranslation();
  const { status, pending } = useSync();
  const { offlineSim } = useTheme();
  const effective = offlineSim ? 'offline' : status;
  if (pending > 0 && effective !== 'offline') {
    return <Badge tone="info">{t('common.pending', { count: pending })}</Badge>;
  }
  return <StatusPill status={effective} />;
}

export function ChwShell({ children, title }: { children: ReactNode; title?: string }) {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const reduce = useReducedMotion();
  const [alertCount, setAlertCount] = useState(0);
  const [refCount, setRefCount] = useState(0);

  useEffect(() => {
    void (async () => {
      const refs = await db.referrals.toArray();
      setRefCount(refs.length);
      const cutoff = Date.now() - 24 * 3600 * 1000;
      setAlertCount(
        refs.filter(
          (r) =>
            !r.arrived_at &&
            ['sent', 'received'].includes(r.status) &&
            new Date(r.created_at).getTime() <= cutoff,
        ).length,
      );
    })();
  }, [location.pathname]);

  const hideTabs =
    location.pathname.endsWith('/triage') ||
    location.pathname.endsWith('/result') ||
    location.pathname.endsWith('/handover');

  return (
    <div className="zm-app-canvas zm-ios-scroll min-h-screen">
      <div className="mx-auto flex min-h-screen max-w-chw flex-col md:my-4 md:min-h-[calc(100vh-2rem)] md:overflow-hidden md:rounded-[36px] md:border md:border-white/70 md:bg-app/60 md:shadow-lift dark:md:border-white/10">
        <header className="zm-glass zm-glass-strong sticky top-0 z-30 flex items-center justify-between gap-2 !border-x-0 !border-t-0 px-4 py-3 !shadow-none">
          <LogoMark />
          <div className="flex flex-wrap items-center gap-2">
            <SyntheticBadge label={t('common.synthetic')} />
            <SyncPill />
            <IconButton
              label={i18n.language.startsWith('rw') ? 'RW' : 'EN'}
              showLabel
              onClick={() => setLanguage(i18n.language.startsWith('rw') ? 'en' : 'rw')}
            >
              <Languages className="h-3.5 w-3.5" strokeWidth={1.75} />
            </IconButton>
            <PresenterMenu />
          </div>
        </header>

        {title ? (
          <div className="px-4 pb-1 pt-5">
            <h1 className="text-[30px] font-bold leading-tight tracking-[-0.03em] text-ink">{title}</h1>
          </div>
        ) : null}

        <motion.main
          key={location.pathname + location.search}
          className={cn('flex-1 px-4 py-4', !hideTabs && 'pb-[calc(6.5rem+env(safe-area-inset-bottom))]')}
          variants={reduce ? undefined : pageVariants}
          initial="initial"
          animate="animate"
          transition={easeOut}
        >
          {children}
          <div className="mt-6">
            <Disclaimer text={t('common.disclaimer')} />
            <p className="mt-2 text-xs text-ink-muted">{t('common.synthetic')}</p>
          </div>
        </motion.main>

        {!hideTabs ? (
          <nav className="fixed bottom-0 left-1/2 z-30 w-full max-w-chw -translate-x-1/2 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 md:bottom-6">
            <div className="zm-glass zm-glass-strong mx-auto grid max-w-chw grid-cols-4 gap-1 rounded-[30px] p-1.5">
              <Tab to="/m/home" icon={<Home className="h-5 w-5" strokeWidth={1.75} />} label={t('nav.home')} />
              <Tab
                to="/m/triage"
                icon={<Plus className="h-5 w-5" strokeWidth={1.75} />}
                label={t('nav.new')}
                emphasize
              />
              <Tab
                to="/m/referrals"
                icon={<Stethoscope className="h-5 w-5" strokeWidth={1.75} />}
                label={t('nav.referrals')}
                badge={refCount || undefined}
              />
              <Tab
                to="/m/alerts"
                icon={<AlertTriangle className="h-5 w-5" strokeWidth={1.75} />}
                label={t('nav.alerts')}
                dot={alertCount > 0}
              />
            </div>
          </nav>
        ) : null}
      </div>
    </div>
  );
}

function Tab({
  to,
  icon,
  label,
  badge,
  dot,
  emphasize,
}: {
  to: string;
  icon: ReactNode;
  label: string;
  badge?: number;
  dot?: boolean;
  emphasize?: boolean;
}) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          'relative flex touch-target flex-col items-center justify-center gap-0.5 rounded-[24px] px-1 py-1.5 text-[11px] font-semibold transition-colors duration-300',
          emphasize && 'mx-1 rounded-full bg-[linear-gradient(180deg,#135a85,#0b3c5d)] px-0 py-3 text-white shadow-[0_10px_24px_-10px_rgba(11,60,93,0.8)]',
          !emphasize && (isActive ? 'bg-primary-soft text-primary dark:text-sky-300' : 'text-ink-muted hover:text-ink'),
        )
      }
    >
      <span className="relative">
        {icon}
        {dot ? <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-danger" /> : null}
        {badge ? (
          <span className="absolute -right-3 -top-2 rounded-full bg-danger px-1 text-[9px] text-white">{badge}</span>
        ) : null}
      </span>
      {!emphasize ? label : <span className="sr-only">{label}</span>}
    </NavLink>
  );
}

type NavItem = {
  to: string;
  label: string;
  icon: typeof Home;
  roles: UserRole[];
  badge?: number;
  group?: string;
};

export function WebShell({
  children,
  title,
  crumbs,
}: {
  children: ReactNode;
  title: string;
  crumbs?: string[];
}) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { dark, toggleDark, offlineSim } = useTheme();
  const { user, logout } = useAuth();
  const reduce = useReducedMotion();
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(SIDEBAR_KEY) === '1');
  const [mobileNav, setMobileNav] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteQuery, setPaletteQuery] = useState('');
  const [notifOpen, setNotifOpen] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [overdueAlerts, setOverdueAlerts] = useState<{ id: string; summary: string }[]>([]);
  const notifRef = useRef<HTMLDivElement>(null);
  const avatarRef = useRef<HTMLDivElement>(null);

  const role = user?.role as UserRole | undefined;

  const loadAlerts = useCallback(async () => {
    try {
      const data = await api.alerts();
      setOverdueAlerts(
        (data as { id: string; summary?: string; message?: string }[])
          .slice(0, 8)
          .map((a) => ({ id: a.id, summary: a.summary || a.message || t('alerts.notArrived') })),
      );
    } catch {
      setOverdueAlerts([]);
    }
  }, [t]);

  useEffect(() => {
    void loadAlerts();
    const id = window.setInterval(() => void loadAlerts(), 15000);
    return () => window.clearInterval(id);
  }, [loadAlerts]);

  useEffect(() => {
    localStorage.setItem(SIDEBAR_KEY, collapsed ? '1' : '0');
  }, [collapsed]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen(true);
      }
      if (e.key === 'Escape') {
        setPaletteOpen(false);
        setNotifOpen(false);
        setAvatarOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!notifRef.current?.contains(e.target as Node)) setNotifOpen(false);
      if (!avatarRef.current?.contains(e.target as Node)) setAvatarOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const navItems: NavItem[] = useMemo(
    () => [
      { to: '/app/chw', label: t('nav.home'), icon: Home, roles: ['chw'] },
      { to: '/m/triage', label: t('nav.newTriage'), icon: Plus, roles: ['chw'] },
      { to: '/app/my-patients', label: t('nav.myPatients'), icon: Users, roles: ['chw'] },
      {
        to: '/app/my-referrals',
        label: t('nav.myReferrals'),
        icon: Stethoscope,
        roles: ['chw'],
        badge: overdueAlerts.length || undefined,
      },
      { to: '/app/alerts', label: t('nav.alerts'), icon: AlertTriangle, roles: ['chw'] },
      { to: '/app/dashboard', label: t('nav.dashboard'), icon: LayoutDashboard, roles: ['supervisor', 'rbc'] },
      { to: '/app/patients', label: t('nav.patients'), icon: Users, roles: ['nurse', 'supervisor', 'rbc'] },
      {
        to: '/app/referrals',
        label: t('nav.referralsInbox'),
        icon: Stethoscope,
        roles: ['nurse', 'supervisor', 'rbc'],
        badge: overdueAlerts.length || undefined,
      },
      { to: '/app/analytics', label: t('nav.analytics'), icon: BarChart3, roles: ['supervisor', 'rbc'] },
      { to: '/app/supplies', label: t('nav.supplies'), icon: Package, roles: ['supervisor', 'rbc'] },
      { to: '/app/users', label: t('nav.users'), icon: User, roles: ['supervisor', 'rbc'], group: 'settings' },
      {
        to: '/app/settings/language',
        label: t('nav.language'),
        icon: Languages,
        roles: ['chw', 'nurse', 'supervisor', 'rbc'],
        group: 'settings',
      },
      {
        to: '/m/voice-settings',
        label: t('nav.voice'),
        icon: Settings,
        roles: ['chw'],
        group: 'settings',
      },
      {
        to: '/app/settings/about',
        label: t('nav.about'),
        icon: Settings,
        roles: ['chw', 'nurse', 'supervisor', 'rbc'],
        group: 'settings',
      },
    ],
    [t, overdueAlerts.length],
  );

  const visibleNav = user
    ? navItems.filter((item) => role && item.roles.includes(role))
    : [
        { to: '/facility', label: t('nav.referralsInbox'), icon: Stethoscope, roles: ['nurse'] as UserRole[] },
        { to: '/about', label: t('nav.about'), icon: Settings, roles: ['nurse'] as UserRole[], group: 'settings' as const },
      ];

  const paletteItems = visibleNav.filter((item) =>
    item.label.toLowerCase().includes(paletteQuery.trim().toLowerCase()),
  );

  const connectionStatus = offlineSim ? 'offline' : 'online';

  const Sidebar = (
    <aside
      className={cn(
        'zm-glass zm-glass-strong flex h-full flex-col overflow-hidden rounded-[28px] transition-[width] duration-500 [transition-timing-function:cubic-bezier(.32,.72,0,1)]',
        collapsed ? 'w-[76px]' : 'w-[264px]',
      )}
    >
      <div className={cn('flex items-center justify-between px-4 pb-3 pt-5', collapsed && 'flex-col gap-3 px-2')}>
        <LogoMark compact={collapsed} />
        <button
          type="button"
          className="hidden h-8 w-8 items-center justify-center rounded-full bg-[rgba(118,118,128,0.12)] text-ink-muted transition hover:bg-[rgba(118,118,128,0.2)] hover:text-ink lg:inline-flex"
          onClick={() => setCollapsed((c) => !c)}
          aria-label={t('nav.toggleSidebar')}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>
      {user ? (
        <div className={cn('px-4 pb-2', collapsed && 'px-2 text-center')}>
          {!collapsed ? <Badge tone="primary">{roleLabel(user.role, t)}</Badge> : <span className="mx-auto block h-1.5 w-6 rounded-full bg-primary/30" />}
        </div>
      ) : (
        <div className={cn('px-4 pb-2', collapsed && 'px-2 text-center')}>
          <Badge tone="neutral">{t('common.demoMode')}</Badge>
        </div>
      )}
      <nav className="zm-scroll-hide flex-1 space-y-0.5 overflow-y-auto px-3 py-2">
        {visibleNav
          .filter((item) => !item.group)
          .map((item) => {
            const Icon = item.icon;
            const active =
              item.to === '/app'
                ? location.pathname === '/app' || location.pathname === '/app/dashboard'
                : location.pathname.startsWith(item.to);
            return (
              <button
                key={item.to}
                type="button"
                title={item.label}
                onClick={() => {
                  navigate(item.to);
                  setMobileNav(false);
                }}
                className={cn(
                  'relative flex w-full items-center gap-3 rounded-[14px] px-3 py-2.5 text-[14.5px] font-medium transition-colors duration-300',
                  active ? 'font-semibold text-primary dark:text-sky-300' : 'text-ink-muted hover:bg-[rgba(118,118,128,0.1)] hover:text-ink',
                  collapsed && 'justify-center px-2',
                )}
              >
                {active ? (
                  <motion.span
                    layoutId="sidebar-active"
                    transition={spring}
                    className="absolute inset-0 rounded-[14px] bg-primary-soft shadow-[inset_0_0_0_1px_rgba(11,60,93,0.06)]"
                  />
                ) : null}
                <Icon className="relative z-10 h-[18px] w-[18px] shrink-0" strokeWidth={1.8} />
                {!collapsed ? <span className="relative z-10 flex-1 text-left">{item.label}</span> : null}
                {!collapsed && item.badge ? (
                  <span className="relative z-10 min-w-[20px] rounded-full bg-danger px-1.5 py-px text-center text-[11px] font-semibold text-white">{item.badge}</span>
                ) : null}
              </button>
            );
          })}
        {!collapsed ? (
          <p className="mb-1.5 mt-5 px-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-muted/80">
            {t('nav.settingsGroup')}
          </p>
        ) : null}
        {visibleNav
          .filter((item) => item.group === 'settings')
          .map((item) => {
            const Icon = item.icon;
            const active = location.pathname.startsWith(item.to);
            return (
              <button
                key={item.to}
                type="button"
                title={item.label}
                onClick={() => {
                  navigate(item.to);
                  setMobileNav(false);
                }}
                className={cn(
                  'relative flex w-full items-center gap-3 rounded-[14px] px-3 py-2.5 text-[14.5px] font-medium transition-colors duration-300',
                  active ? 'font-semibold text-primary dark:text-sky-300' : 'text-ink-muted hover:bg-[rgba(118,118,128,0.1)] hover:text-ink',
                  collapsed && 'justify-center px-2',
                )}
              >
                {active ? (
                  <motion.span
                    layoutId="sidebar-active"
                    transition={spring}
                    className="absolute inset-0 rounded-[14px] bg-primary-soft shadow-[inset_0_0_0_1px_rgba(11,60,93,0.06)]"
                  />
                ) : null}
                <Icon className="relative z-10 h-[18px] w-[18px] shrink-0" strokeWidth={1.8} />
                {!collapsed ? <span className="relative z-10 flex-1 text-left">{item.label}</span> : null}
              </button>
            );
          })}
      </nav>
      <div className={cn('m-3 space-y-2 rounded-[20px] bg-[rgba(118,118,128,0.08)] p-3.5 text-xs text-ink-muted', collapsed && 'hidden')}>
        <SyncPill />
        <p className="flex flex-wrap items-center gap-2">
          <span>v{APP_VERSION}</span>
          <SyntheticBadge label={t('common.synthetic')} />
        </p>
        {user && !collapsed ? (
          <p className="truncate text-[13px] font-semibold text-ink">
            {user.display_name} · {roleLabel(user.role, t)}
          </p>
        ) : null}
      </div>
    </aside>
  );

  const initials =
    user?.display_name
      ?.split(' ')
      .map((p) => p[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'ZM';

  return (
    <div className="zm-app-canvas zm-ios-scroll min-h-screen text-ink">
      <div className="flex min-h-screen">
        <div className="sticky top-0 hidden h-screen shrink-0 p-3 pr-0 lg:block">{Sidebar}</div>
        {mobileNav ? (
          <div className="fixed inset-0 z-40 flex lg:hidden">
            <button type="button" className="zm-backdrop absolute inset-0 bg-ink/40" aria-label="Close" onClick={() => setMobileNav(false)} />
            <div className="relative z-10 h-full p-3 [animation:zm-pop_.45s_cubic-bezier(.32,.72,0,1)_both] [transform-origin:left_center]">{Sidebar}</div>
          </div>
        ) : null}
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-3 z-20 mx-3 mt-3 flex h-[64px] items-center justify-between gap-3 rounded-[24px] border border-white/70 bg-surface/75 px-3 shadow-[0_10px_30px_-18px_rgba(6,36,58,0.35)] backdrop-blur-2xl backdrop-saturate-150 dark:border-white/[0.07] dark:bg-[rgba(14,27,40,0.72)] sm:px-4">
            <div className="flex min-w-0 items-center gap-2">
              <button
                type="button"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-[rgba(118,118,128,0.12)] lg:hidden"
                onClick={() => setMobileNav(true)}
                aria-label="Menu"
              >
                <PanelLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                className="hidden h-10 w-10 items-center justify-center rounded-full bg-[rgba(118,118,128,0.12)] text-ink-muted transition hover:bg-[rgba(118,118,128,0.2)] hover:text-ink lg:inline-flex"
                onClick={() => setCollapsed((c) => !c)}
                aria-label={t('nav.toggleSidebar')}
              >
                <PanelLeft className="h-4 w-4" />
              </button>
              <div className="min-w-0">
                <p className="truncate text-[12px] font-medium text-ink-muted">{(crumbs || [title]).join('  ›  ')}</p>
                <h1 className="truncate text-[17px] font-semibold tracking-[-0.02em]">{title}</h1>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className="hidden md:inline-flex">
                <SyntheticBadge label={t('common.synthetic')} />
              </span>
              <div className="flex items-center gap-1 rounded-full bg-[rgba(118,118,128,0.1)] p-1">
              <IconButton
                label={t('nav.commandPalette')}
                className="hidden !bg-transparent hover:!bg-surface sm:inline-flex"
                onClick={() => setPaletteOpen(true)}
              >
                <Search className="h-4 w-4" strokeWidth={1.9} />
              </IconButton>
              <IconButton
                label={t('nav.language')}
                className="!bg-transparent px-3 text-[13px] font-bold hover:!bg-surface"
                onClick={() => setLanguage(i18n.language.startsWith('rw') ? 'en' : 'rw')}
              >
                {i18n.language.startsWith('rw') ? 'RW' : 'EN'}
              </IconButton>
              <IconButton label={t('common.toggleTheme')} className="!bg-transparent hover:!bg-surface" onClick={toggleDark}>
                <SunMoon dark={dark} />
              </IconButton>
              <div className="relative" ref={notifRef}>
                <IconButton
                  label={t('nav.notifications')}
                  className="relative !bg-transparent hover:!bg-surface"
                  onClick={() => setNotifOpen((o) => !o)}
                >
                  <Bell className="h-4 w-4" strokeWidth={1.9} />
                  {overdueAlerts.length ? (
                    <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-white ring-2 ring-surface">
                      {overdueAlerts.length}
                    </span>
                  ) : null}
                </IconButton>
                {notifOpen ? (
                  <div className="zm-popover absolute right-0 z-40 mt-3 w-80 rounded-card border border-border bg-surface shadow-lift">
                    <p className="border-b border-border px-4 py-3 text-[13px] font-semibold text-ink">
                      {t('nav.notifications')}
                    </p>
                    {overdueAlerts.length === 0 ? (
                      <p className="px-4 py-6 text-center text-sm text-ink-muted">{t('alerts.empty')}</p>
                    ) : (
                      <ul className="max-h-64 overflow-y-auto">
                        {overdueAlerts.map((a) => (
                          <li key={a.id} className="flex gap-3 border-b border-border/60 px-4 py-3 text-sm last:border-0">
                            <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-warning" aria-hidden />
                            <span>{a.summary}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ) : null}
              </div>
              </div>
              <span className="hidden sm:inline-flex">
                <StatusPill status={connectionStatus} />
              </span>
              <PresenterMenu />
              <div className="relative" ref={avatarRef}>
                <button
                  type="button"
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-[linear-gradient(145deg,#14807a,#0b3c5d)] text-[13px] font-bold text-white shadow-[0_6px_16px_-6px_rgba(11,60,93,0.7)] ring-2 ring-white/70 transition active:scale-95 dark:ring-white/10"
                  onClick={() => setAvatarOpen((o) => !o)}
                  aria-label={user?.display_name || 'Account'}
                >
                  {initials}
                </button>
                {avatarOpen ? (
                  <div className="zm-popover absolute right-0 z-40 mt-3 w-64 rounded-card border border-border bg-surface shadow-lift">
                    <div className="flex items-center gap-3 border-b border-border px-4 py-3.5">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(145deg,#14807a,#0b3c5d)] text-[13px] font-bold text-white">{initials}</span>
                      <div className="min-w-0">
                        <p className="truncate text-[15px] font-semibold">{user?.display_name}</p>
                        <p className="truncate text-xs text-ink-muted">{user?.username}</p>
                      </div>
                    </div>
                    {user ? (
                      <>
                        <button
                          type="button"
                          className="flex w-full px-4 py-3 text-left text-[14.5px] transition-colors hover:bg-surface-muted"
                          onClick={() => {
                            setPreferredView('mobile');
                            setAvatarOpen(false);
                            navigate('/m/home');
                          }}
                        >
                          {t('nav.switchView')} → /m
                        </button>
                        <button
                          type="button"
                          className="flex w-full px-4 py-3 text-left text-[14.5px] transition-colors hover:bg-surface-muted"
                          onClick={() => {
                            setPreferredView('web');
                            setAvatarOpen(false);
                            navigate(role === 'chw' ? '/app/chw' : '/app/dashboard');
                          }}
                        >
                          {t('nav.switchView')} → /app
                        </button>
                        <button
                          type="button"
                          className="flex w-full items-center gap-2 border-t border-border px-4 py-3 text-left text-[14.5px] font-semibold text-danger transition-colors hover:bg-surface-muted"
                          onClick={() => void logout().then(() => navigate('/login'))}
                        >
                          <LogOut className="h-4 w-4" strokeWidth={1.75} />
                          {t('auth.signOut')}
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        className="flex w-full items-center gap-2 px-4 py-3 text-left text-[14.5px] transition-colors hover:bg-surface-muted"
                        onClick={() => navigate('/login')}
                      >
                        <LogOut className="h-4 w-4" strokeWidth={1.75} />
                        {t('login.signIn')}
                      </button>
                    )}
                  </div>
                ) : null}
              </div>
            </div>
          </header>
          <motion.main
            key={location.pathname}
            className="mx-auto w-full max-w-[1440px] flex-1 px-4 pb-10 pt-6 sm:px-6 lg:px-8"
            variants={reduce ? undefined : pageVariants}
            initial="initial"
            animate="animate"
            transition={easeOut}
          >
            {children}
          </motion.main>
        </div>
      </div>

      {paletteOpen ? (
        <div className="zm-backdrop fixed inset-0 z-50 flex items-start justify-center bg-ink/40 p-4 pt-[15vh]">
          <div className="zm-dialog w-full max-w-xl rounded-card border border-border bg-surface shadow-lift">
            <div className="flex items-center gap-3 border-b border-border px-5 py-3">
              <Search className="h-5 w-5 text-ink-muted" />
              <input
                autoFocus
                className="h-12 flex-1 bg-transparent text-[17px] outline-none placeholder:text-ink-muted"
                placeholder={t('nav.commandPalettePlaceholder')}
                value={paletteQuery}
                onChange={(e) => setPaletteQuery(e.target.value)}
              />
            </div>
            <ul className="max-h-80 overflow-y-auto p-2">
              {paletteItems.map((item) => (
                <li key={item.to}>
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 rounded-[14px] px-3 py-3 text-left text-[15px] font-medium transition-colors hover:bg-primary-soft hover:text-primary"
                    onClick={() => {
                      navigate(item.to);
                      setPaletteOpen(false);
                      setPaletteQuery('');
                    }}
                  >
                    <item.icon className="h-[18px] w-[18px] text-ink-muted" strokeWidth={1.8} />
                    {item.label}
                  </button>
                </li>
              ))}
              {paletteItems.length === 0 ? (
                <li className="px-4 py-6 text-sm text-ink-muted">{t('common.empty')}</li>
              ) : null}
            </ul>
          </div>
          <button type="button" className="absolute inset-0 -z-10" aria-label="Close" onClick={() => setPaletteOpen(false)} />
        </div>
      ) : null}
    </div>
  );
}

/** @deprecated use WebShell */
export const DesktopShell = WebShell;
