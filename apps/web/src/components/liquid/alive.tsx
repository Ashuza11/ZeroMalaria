import { AnimatePresence, motion, useReducedMotion, useScroll, useSpring } from 'framer-motion';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { cn } from '../../lib/cn';
import { bouncy, iosEase, spring } from '../../lib/motion';
import { LogoMark } from './index';

/* ---------------------------------------------------------------
   Orb: a living, morphing gradient sphere. Used instead of icons.
---------------------------------------------------------------- */
const ORB_PALETTES = {
  ocean: ['#0b3c5d', '#2bb3a6', '#125278', 'rgba(11,60,93,0.7)'],
  teal: ['#14807a', '#5eead4', '#0b3c5d', 'rgba(20,128,122,0.7)'],
  amber: ['#d97706', '#f5a524', '#b45309', 'rgba(217,119,6,0.7)'],
  dusk: ['#f5a524', '#14807a', '#0b3c5d', 'rgba(217,119,6,0.5)'],
  danger: ['#e5484d', '#f59e0b', '#be123c', 'rgba(229,72,77,0.7)'],
  sky: ['#7dd3fc', '#2bb3a6', '#125278', 'rgba(125,211,252,0.6)'],
} as const;
export type OrbTone = keyof typeof ORB_PALETTES;

export function Orb({
  tone = 'ocean',
  size = 44,
  className,
  children,
  delay = 0,
}: {
  tone?: OrbTone;
  size?: number;
  className?: string;
  children?: ReactNode;
  delay?: number;
}) {
  const [a, b, c, glow] = ORB_PALETTES[tone];
  return (
    <span className={cn('relative inline-flex shrink-0 items-center justify-center', className)} style={{ width: size, height: size }}>
      <span
        className="zm-orb absolute inset-0"
        style={
          {
            '--o1': a,
            '--o2': b,
            '--o3': c,
            '--o-glow': glow,
            animationDelay: `${-delay * 3}s, ${-delay * 4}s`,
          } as React.CSSProperties
        }
        aria-hidden
      />
      {children ? <span className="relative z-10 font-bold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)]">{children}</span> : null}
    </span>
  );
}

/* ---------------------------------------------------------------
   Sparkline: draws itself, then a glowing dot keeps travelling
---------------------------------------------------------------- */
export function Sparkline({
  seed = 1,
  color = 'var(--zm-teal-glow)',
  className,
  height = 36,
}: {
  seed?: number;
  color?: string;
  className?: string;
  height?: number;
}) {
  const reduce = useReducedMotion();
  const id = useMemo(() => `spark-${seed}-${Math.random().toString(36).slice(2, 7)}`, [seed]);
  const d = useMemo(() => {
    const pts = Array.from({ length: 14 }, (_, i) => {
      const y = 0.5 + 0.28 * Math.sin(i * 0.9 + seed) + 0.14 * Math.sin(i * 2.1 + seed * 3) - i * 0.018;
      return [i * (100 / 13), Math.max(0.08, Math.min(0.92, y)) * 40];
    });
    return pts.reduce((acc, [x, y], i) => {
      if (i === 0) return `M${x},${y}`;
      const [px, py] = pts[i - 1];
      const cx = (px + x) / 2;
      return `${acc} C${cx},${py} ${cx},${y} ${x},${y}`;
    }, '');
  }, [seed]);
  return (
    <svg viewBox="0 0 100 40" preserveAspectRatio="none" className={cn('w-full overflow-visible', className)} style={{ height }} aria-hidden>
      <defs>
        <linearGradient id={`${id}-f`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.35" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <motion.path
        d={`${d} L100,40 L0,40 Z`}
        fill={`url(#${id}-f)`}
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1.2, delay: 0.6 }}
      />
      <motion.path
        id={`${id}-p`}
        d={d}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
        initial={{ pathLength: reduce ? 1 : 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1.6, ease: iosEase }}
      />
      {!reduce ? (
        <circle r="2.6" fill="#fff" style={{ filter: `drop-shadow(0 0 4px ${color})` }}>
          <animateMotion dur={`${5 + (seed % 3)}s`} repeatCount="indefinite" begin="1.6s">
            <mpath href={`#${id}-p`} />
          </animateMotion>
        </circle>
      ) : null}
    </svg>
  );
}

/* ---------------------------------------------------------------
   Hand-drawn check (stroke animation)
---------------------------------------------------------------- */
export function DrawCheck({ on = true, size = 14, color = '#fff', width = 3 }: { on?: boolean; size?: number; color?: string; width?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden>
      <motion.path
        d="M3 8.5 6.5 12 13 4.5"
        stroke={color}
        strokeWidth={width}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={false}
        animate={{ pathLength: on ? 1 : 0, opacity: on ? 1 : 0 }}
        transition={{ duration: 0.35, ease: iosEase }}
      />
    </svg>
  );
}

/* Arrow that glides forward on hover (inherit group-hover) */
export function GlideArrow({ className }: { className?: string }) {
  return (
    <span className={cn('relative inline-flex h-[18px] w-[18px] items-center overflow-hidden', className)} aria-hidden>
      <svg viewBox="0 0 18 18" className="h-full w-full transition-transform duration-500 [transition-timing-function:cubic-bezier(.32,.72,0,1)] group-hover:translate-x-[3px]">
        <path d="M3 9h11M10 4.5 14.5 9 10 13.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

export function Chevron({ dir = 'left', className }: { dir?: 'left' | 'down'; className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={cn('h-4 w-4', className)} aria-hidden>
      <path d={dir === 'left' ? 'M10 3 5 8l5 5' : 'M3.5 6 8 10.5 12.5 6'} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ---------------------------------------------------------------
   Morphing menu button (hamburger ↔ close)
---------------------------------------------------------------- */
export function MenuGlyph({ open }: { open: boolean }) {
  return (
    <span className="relative block h-3.5 w-[18px]" aria-hidden>
      <motion.span
        className="absolute left-0 block h-[2px] w-full rounded-full bg-current"
        animate={open ? { top: '50%', rotate: 45, y: '-50%' } : { top: '15%', rotate: 0, y: '-50%' }}
        transition={bouncy}
      />
      <motion.span
        className="absolute left-0 block h-[2px] w-full rounded-full bg-current"
        animate={open ? { top: '50%', rotate: -45, y: '-50%' } : { top: '85%', rotate: 0, y: '-50%' }}
        transition={bouncy}
      />
    </span>
  );
}

/* ---------------------------------------------------------------
   Sun ↔ Moon morph
---------------------------------------------------------------- */
export function SunMoon({ dark }: { dark: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" aria-hidden>
      <mask id="zm-moon-mask">
        <rect width="24" height="24" fill="#fff" />
        <motion.circle r="7" fill="#000" initial={false} animate={dark ? { cx: 17, cy: 7 } : { cx: 30, cy: -6 }} transition={spring} />
      </mask>
      <motion.circle cx="12" cy="12" fill="currentColor" mask="url(#zm-moon-mask)" initial={false} animate={{ r: dark ? 8 : 4.5 }} transition={spring} />
      <motion.g initial={false} animate={{ opacity: dark ? 0 : 1, rotate: dark ? -45 : 0, scale: dark ? 0.5 : 1 }} transition={spring} style={{ originX: '12px', originY: '12px' }}>
        {Array.from({ length: 8 }).map((_, i) => {
          const a = (i * Math.PI) / 4;
          return (
            <line
              key={i}
              x1={12 + Math.cos(a) * 7.5}
              y1={12 + Math.sin(a) * 7.5}
              x2={12 + Math.cos(a) * 9.5}
              y2={12 + Math.sin(a) * 9.5}
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          );
        })}
      </motion.g>
    </svg>
  );
}

/* ---------------------------------------------------------------
   Eye that blinks closed when the password is hidden
---------------------------------------------------------------- */
export function BlinkEye({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-[19px] w-[19px]" fill="none" aria-hidden>
      <motion.path
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        initial={false}
        animate={{ d: open ? 'M2.5 12 C5.1 7.4 8.5 5 12 5 C15.5 5 18.9 7.4 21.5 12 C18.9 16.6 15.5 19 12 19 C8.5 19 5.1 16.6 2.5 12 Z' : 'M2.5 12 C5.1 15 8.5 16.5 12 16.5 C15.5 16.5 18.9 15 21.5 12 C18.9 15 15.5 16.5 12 16.5 C8.5 16.5 5.1 15 2.5 12 Z' }}
        transition={spring}
      />
      <motion.circle cx="12" cy="12" r="3" fill="currentColor" initial={false} animate={{ scale: open ? 1 : 0, opacity: open ? 1 : 0 }} transition={spring} />
      {!open
        ? [7, 12, 17].map((x, i) => (
            <motion.line key={x} x1={x} y1="16" x2={x + (i - 1) * 0.8} y2="18.6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" initial={{ opacity: 0 }} animate={{ opacity: 1 }} />
          ))
        : null}
    </svg>
  );
}

/* ---------------------------------------------------------------
   Signal bars (online ↔ offline)
---------------------------------------------------------------- */
export function SignalBars({ offline, className }: { offline: boolean; className?: string }) {
  return (
    <span className={cn('flex items-end gap-[2.5px]', className)} aria-hidden>
      {[5, 8, 11, 14].map((h, i) => (
        <motion.span
          key={h}
          className="w-[3px] rounded-sm bg-current"
          initial={false}
          animate={{ height: offline ? 3 : h, opacity: offline ? 0.35 : 1 }}
          transition={{ ...bouncy, delay: offline ? (3 - i) * 0.05 : i * 0.06 }}
        />
      ))}
    </span>
  );
}

/* iOS activity ring spinner (for syncing states) */
export function RingSpinner({ className }: { className?: string }) {
  return (
    <motion.svg viewBox="0 0 20 20" className={cn('h-4 w-4', className)} animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} aria-hidden>
      <circle cx="10" cy="10" r="7.5" stroke="currentColor" strokeOpacity="0.2" strokeWidth="2.5" fill="none" />
      <path d="M10 2.5a7.5 7.5 0 0 1 7.5 7.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" fill="none" />
    </motion.svg>
  );
}

function QRFinder({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <rect x={x + 0.5} y={y + 0.5} width="6" height="6" rx="1.6" fill="none" stroke="currentColor" strokeWidth="1" />
      <rect x={x + 2} y={y + 2} width="3" height="3" rx="0.8" fill="currentColor" />
    </g>
  );
}

/* Deterministic pseudo-QR pattern that assembles itself */
export function PseudoQR({ size = 112 }: { size?: number }) {
  const n = 21;
  const cells = useMemo(() => {
    const out: Array<[number, number]> = [];
    let s = 7;
    for (let y = 0; y < n; y++)
      for (let x = 0; x < n; x++) {
        const finder = (x < 7 && y < 7) || (x > n - 8 && y < 7) || (x < 7 && y > n - 8);
        if (finder) continue;
        s = (s * 9301 + 49297) % 233280;
        if (s / 233280 > 0.55) out.push([x, y]);
      }
    return out;
  }, []);
  return (
    <svg viewBox={`0 0 ${n} ${n}`} width={size} height={size} className="text-[var(--zm-ocean)]" aria-hidden>
      <QRFinder x={0} y={0} />
      <QRFinder x={n - 7} y={0} />
      <QRFinder x={0} y={n - 7} />
      {cells.map(([x, y], i) => (
        <motion.rect
          key={i}
          x={x + 0.12}
          y={y + 0.12}
          width="0.76"
          height="0.76"
          rx="0.22"
          fill="currentColor"
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15 + ((x + y) / (2 * n)) * 0.7, duration: 0.25 }}
          style={{ originX: `${x + 0.5}px`, originY: `${y + 0.5}px` }}
        />
      ))}
    </svg>
  );
}

/* ---------------------------------------------------------------
   iOS notification stack: banners slide in and stack
---------------------------------------------------------------- */
export type Notice = { title: string; body: string; time: string; tone?: OrbTone };

export function NotificationStack({ items, interval = 3200, className }: { items: Notice[]; interval?: number; className?: string }) {
  const reduce = useReducedMotion();
  const [head, setHead] = useState(0);
  useEffect(() => {
    if (reduce || items.length < 2) return;
    const id = window.setInterval(() => setHead((h) => (h + 1) % items.length), interval);
    return () => window.clearInterval(id);
  }, [reduce, items.length, interval]);
  const visible = [0, 1, 2].map((k) => ({ ...items[(head - k + items.length * 3) % items.length], k, key: head - k }));
  return (
    <div className={cn('relative h-[120px]', className)} aria-live="off">
      <AnimatePresence initial={false}>
        {visible.map((n) => (
          <motion.div
            key={n.key}
            initial={{ opacity: 0, y: -40, scale: 0.9, filter: 'blur(6px)' }}
            animate={{ opacity: n.k === 0 ? 1 : n.k === 1 ? 0.75 : 0.45, y: n.k * 12, scale: 1 - n.k * 0.06, filter: 'blur(0px)', zIndex: 10 - n.k }}
            exit={{ opacity: 0, y: 40, scale: 0.85 }}
            transition={spring}
            className="absolute inset-x-0 top-0 flex items-center gap-3 rounded-[22px] border border-white/15 bg-[rgba(10,52,78,0.92)] px-4 py-3 text-white shadow-[0_18px_40px_-18px_rgba(0,0,0,0.6)] backdrop-blur-xl"
          >
            <motion.div className="flex min-w-0 flex-1 items-center gap-3" animate={{ opacity: n.k === 0 ? 1 : 0 }} transition={{ duration: 0.25 }}>
            <LogoMark size={36} animated={false} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-[14px] font-semibold">{n.title}</p>
                <span className="shrink-0 text-[12px] text-white/50">{n.time}</span>
              </div>
              <p className="truncate text-[13px] text-white/70">{n.body}</p>
            </div>
            </motion.div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

/* Infinite marquee strip */
export function Marquee({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('zm-fade-x overflow-hidden', className)}>
      <div className="zm-marquee">
        <div className="flex shrink-0 items-center">{children}</div>
        <div className="flex shrink-0 items-center" aria-hidden>
          {children}
        </div>
      </div>
    </div>
  );
}

/* Page scroll progress (hairline at the very top) */
export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const x = useSpring(scrollYProgress, { stiffness: 120, damping: 24 });
  return <motion.div style={{ scaleX: x }} className="fixed inset-x-0 top-0 z-[60] h-[2px] origin-left bg-[linear-gradient(90deg,var(--zm-teal),var(--zm-amber))]" />;
}

/* Magnetic hover wrapper: content leans toward the cursor */
export function Magnetic({ children, strength = 0.25, className }: { children: ReactNode; strength?: number; className?: string }) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const reduce = useReducedMotion();
  const x = useSpring(0, { stiffness: 250, damping: 18 });
  const y = useSpring(0, { stiffness: 250, damping: 18 });
  return (
    <motion.span
      ref={ref}
      style={{ x, y }}
      className={cn('inline-flex', className)}
      onPointerMove={(e) => {
        if (reduce || !ref.current) return;
        const r = ref.current.getBoundingClientRect();
        x.set((e.clientX - (r.left + r.width / 2)) * strength);
        y.set((e.clientY - (r.top + r.height / 2)) * strength);
      }}
      onPointerLeave={() => {
        x.set(0);
        y.set(0);
      }}
    >
      {children}
    </motion.span>
  );
}

/* Big gradient numeral */
export function Numeral({ n, className }: { n: number; className?: string }) {
  return <span className={cn('zm-text-ocean zm-shimmer tabular font-bold tracking-[-0.04em]', className)}>{String(n).padStart(2, '0')}</span>;
}

/* Pulsing location / status ping */
export function Ping({ color = '#34d399', size = 10 }: { color?: string; size?: number }) {
  return <span className="zm-live-dot" style={{ background: color, width: size, height: size }} aria-hidden />;
}
