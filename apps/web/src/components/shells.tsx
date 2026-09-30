import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Bell,
  ChevronLeft,
  ChevronRight,
  Home,
  Languages,
  LayoutDashboard,
  LogOut,
  Moon,
  Package,
  PanelLeft,
  Plus,
  Search,
  Settings,
  Stethoscope,
  Sun,
  User,
  Users,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
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
    <div className="flex items-center gap-2">
      <div className="flex h-9 w-9 items-center justify-center rounded-control bg-primary text-primary-foreground">
        <Activity className="h-5 w-5" strokeWidth={1.75} />
      </div>
      {!compact ? (
        <div>
          <p className="text-sm font-bold leading-none text-ink">ZeroMalaria</p>
          <p className="mt-1 text-[11px] text-ink-muted">Malaria triage</p>
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
    <div className="min-h-screen bg-app">
      <div className="mx-auto flex min-h-screen max-w-chw flex-col border-x border-border/60 bg-app shadow-card md:my-4 md:min-h-[calc(100vh-2rem)] md:rounded-[20px] md:border">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-2 border-b border-border bg-surface/95 px-4 py-3 backdrop-blur">
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
          <div className="border-b border-border px-4 py-3">
            <h1 className="text-lg font-semibold text-ink">{title}</h1>
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
          <nav className="fixed bottom-0 left-1/2 z-30 w-full max-w-chw -translate-x-1/2 border-t border-border bg-surface/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur md:left-auto md:right-auto md:translate-x-0">
            <div className="mx-auto grid max-w-chw grid-cols-4 gap-1">
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
          'relative flex touch-target flex-col items-center justify-center gap-0.5 rounded-control px-1 py-1 text-[11px] font-semibold',
          emphasize && 'mx-1 -mt-3 rounded-full bg-primary px-0 py-3 text-primary-foreground shadow-card',
          !emphasize && (isActive ? 'text-primary' : 'text-ink-muted'),
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
        'flex h-full flex-col border-r border-border bg-surface transition-all',
        collapsed ? 'w-[72px]' : 'w-64',
      )}
    >
      <div className="flex items-center justify-between border-b border-border p-4">
        <LogoMark compact={collapsed} />
        <button
          type="button"
          className="hidden rounded-control border border-border p-1 lg:inline-flex"
          onClick={() => setCollapsed((c) => !c)}
          aria-label={t('nav.toggleSidebar')}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>
      {user ? (
        <div className={cn('border-b border-border px-3 py-3', collapsed && 'px-2 text-center')}>
          <Badge tone="primary">{roleLabel(user.role, t)}</Badge>
        </div>
      ) : (
        <div className={cn('border-b border-border px-3 py-3', collapsed && 'px-2 text-center')}>
          <Badge tone="neutral">{t('common.demoMode')}</Badge>
        </div>
      )}
      <nav className="flex-1 space-y-1 p-3">
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
                  'flex w-full items-center gap-3 rounded-control px-3 py-2.5 text-sm font-semibold transition',
                  active ? 'bg-primary-soft text-primary' : 'text-ink-muted hover:bg-surface-muted hover:text-ink',
                  collapsed && 'justify-center px-2',
                )}
              >
                <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                {!collapsed ? <span className="flex-1 text-left">{item.label}</span> : null}
                {!collapsed && item.badge ? (
                  <span className="rounded-full bg-danger px-1.5 text-[10px] text-white">{item.badge}</span>
                ) : null}
              </button>
            );
          })}
        {!collapsed ? (
          <p className="mb-1 mt-4 px-2 text-[10px] font-bold uppercase tracking-wide text-ink-muted">
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
                  'flex w-full items-center gap-3 rounded-control px-3 py-2.5 text-sm font-semibold transition',
                  active ? 'bg-primary-soft text-primary' : 'text-ink-muted hover:bg-surface-muted hover:text-ink',
                  collapsed && 'justify-center px-2',
                )}
              >
                <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                {!collapsed ? <span className="flex-1 text-left">{item.label}</span> : null}
              </button>
            );
          })}
      </nav>
      <div className="space-y-2 border-t border-border p-4 text-xs text-ink-muted">
        <SyncPill />
        <p className="flex flex-wrap items-center gap-2">
          <span>v{APP_VERSION}</span>
          <SyntheticBadge label={t('common.synthetic')} />
        </p>
        {user && !collapsed ? (
          <p className="truncate font-medium text-ink">
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
    <div className="min-h-screen bg-app text-ink">
      <div className="flex min-h-screen">
        <div className="hidden lg:block">{Sidebar}</div>
        {mobileNav ? (
          <div className="fixed inset-0 z-40 flex lg:hidden">
            <button type="button" className="absolute inset-0 bg-ink/40" aria-label="Close" onClick={() => setMobileNav(false)} />
            <div className="relative z-10 h-full">{Sidebar}</div>
          </div>
        ) : null}
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b border-border bg-surface/95 px-4 backdrop-blur">
            <div className="flex min-w-0 items-center gap-2">
              <button
                type="button"
                className="rounded-control border border-border p-2 lg:hidden"
                onClick={() => setMobileNav(true)}
                aria-label="Menu"
              >
                <PanelLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                className="hidden rounded-control border border-border p-2 lg:inline-flex"
                onClick={() => setCollapsed((c) => !c)}
                aria-label={t('nav.toggleSidebar')}
              >
                <PanelLeft className="h-4 w-4" />
              </button>
              <div className="min-w-0">
                <p className="truncate text-xs text-ink-muted">{(crumbs || [title]).join(' / ')}</p>
                <h1 className="truncate text-lg font-semibold">{title}</h1>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <SyntheticBadge label={t('common.synthetic')} />
              <IconButton
                label={t('nav.commandPalette')}
                showLabel
                className="hidden sm:inline-flex"
                onClick={() => setPaletteOpen(true)}
              >
                <Search className="h-3.5 w-3.5" strokeWidth={1.75} />
              </IconButton>
              <IconButton
                label={i18n.language.startsWith('rw') ? 'RW' : 'EN'}
                showLabel
                onClick={() => setLanguage(i18n.language.startsWith('rw') ? 'en' : 'rw')}
              >
                <Languages className="h-3.5 w-3.5" strokeWidth={1.75} />
              </IconButton>
              <IconButton label={t('common.toggleTheme')} showLabel onClick={toggleDark}>
                {dark ? <Sun className="h-4 w-4" strokeWidth={1.75} /> : <Moon className="h-4 w-4" strokeWidth={1.75} />}
              </IconButton>
              <div className="relative" ref={notifRef}>
                <IconButton
                  label={t('nav.notifications')}
                  showLabel
                  className="relative"
                  onClick={() => setNotifOpen((o) => !o)}
                >
                  <Bell className="h-4 w-4" strokeWidth={1.75} />
                  {overdueAlerts.length ? (
                    <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] text-white">
                      {overdueAlerts.length}
                    </span>
                  ) : null}
                </IconButton>
                {notifOpen ? (
                  <div className="absolute right-0 z-40 mt-2 w-72 rounded-card border border-border bg-surface shadow-lift">
                    <p className="border-b border-border px-3 py-2 text-xs font-semibold uppercase text-ink-muted">
                      {t('nav.notifications')}
                    </p>
                    {overdueAlerts.length === 0 ? (
                      <p className="px-3 py-4 text-sm text-ink-muted">{t('alerts.empty')}</p>
                    ) : (
                      <ul className="max-h-64 overflow-y-auto">
                        {overdueAlerts.map((a) => (
                          <li key={a.id} className="border-b border-border/60 px-3 py-2 text-sm last:border-0">
                            {a.summary}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ) : null}
              </div>
              <StatusPill status={connectionStatus} />
              <PresenterMenu />
              <div className="relative" ref={avatarRef}>
                <button
                  type="button"
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-soft text-sm font-bold text-primary"
                  onClick={() => setAvatarOpen((o) => !o)}
                  aria-label={user?.display_name || 'Account'}
                >
                  {initials}
                </button>
                {avatarOpen ? (
                  <div className="absolute right-0 z-40 mt-2 w-52 rounded-card border border-border bg-surface shadow-lift">
                    <div className="border-b border-border px-3 py-2">
                      <p className="text-sm font-semibold">{user?.display_name}</p>
                      <p className="text-xs text-ink-muted">{user?.username}</p>
                    </div>
                    {user ? (
                      <>
                        <button
                          type="button"
                          className="flex w-full px-3 py-2.5 text-left text-sm hover:bg-surface-muted"
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
                          className="flex w-full px-3 py-2.5 text-left text-sm hover:bg-surface-muted"
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
                          className="flex w-full items-center gap-2 px-3 py-3 text-left text-sm hover:bg-surface-muted"
                          onClick={() => void logout().then(() => navigate('/login'))}
                        >
                          <LogOut className="h-4 w-4" strokeWidth={1.75} />
                          {t('auth.signOut')}
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        className="flex w-full items-center gap-2 px-3 py-3 text-left text-sm hover:bg-surface-muted"
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
            className="mx-auto w-full max-w-[1440px] flex-1 p-6"
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
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-ink/40 p-4 pt-[15vh]">
          <div className="w-full max-w-lg rounded-card border border-border bg-surface shadow-lift">
            <div className="flex items-center gap-2 border-b border-border px-3 py-2">
              <Search className="h-4 w-4 text-ink-muted" />
              <input
                autoFocus
                className="h-10 flex-1 bg-transparent text-sm outline-none"
                placeholder={t('nav.commandPalettePlaceholder')}
                value={paletteQuery}
                onChange={(e) => setPaletteQuery(e.target.value)}
              />
            </div>
            <ul className="max-h-72 overflow-y-auto py-1">
              {paletteItems.map((item) => (
                <li key={item.to}>
                  <button
                    type="button"
                    className="flex w-full px-4 py-2.5 text-left text-sm hover:bg-surface-muted"
                    onClick={() => {
                      navigate(item.to);
                      setPaletteOpen(false);
                      setPaletteQuery('');
                    }}
                  >
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
