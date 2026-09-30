import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useEffect, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { DrawCheck, Orb, Ping } from '../../components/liquid/alive';
import { cn } from '../../lib/cn';
import { bouncy, iosEase, spring } from '../../lib/motion';

const STAGES = 6; // 0 temp · 1 danger · 2 rdt · 3 decision · 4 received · 5 arrived
const STAGE_MS = 2600;

/**
 * A live clinical triage card: plays through one malaria assessment,
 * from fever to danger sign, RDT, decision and referral tracking.
 */
export function HealthCard({ className }: { className?: string }) {
  const { t } = useTranslation();
  const reduce = useReducedMotion();
  const [stage, setStage] = useState(reduce ? 5 : 0);

  useEffect(() => {
    if (reduce) return;
    const id = window.setInterval(() => setStage((s) => (s + 1) % (STAGES + 1)), STAGE_MS);
    return () => window.clearInterval(id);
  }, [reduce]);

  const s = Math.min(stage, STAGES - 1);

  return (
    <div className={cn('zm-glass zm-rim w-[340px] rounded-[32px] !bg-[rgba(250,252,253,0.93)] p-5 text-[var(--zm-label)] dark:!bg-[rgba(16,30,44,0.93)]', className)}>
      {/* header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Orb size={40} tone="teal" />
          <div>
            <p className="text-[15px] font-semibold tracking-[-0.01em]">{t('landing.hcTitle')}</p>
            <p className="text-[12.5px] text-[var(--zm-label-2)]">{t('landing.hcPatient')}</p>
          </div>
        </div>
        <span className="flex items-center gap-1.5 rounded-full bg-[rgba(52,211,153,0.14)] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-[#0f9f6e]">
          <Ping size={6} />
          {t('landing.liveTag')}
        </span>
      </div>

      {/* vitals */}
      <div className="mt-4 overflow-hidden rounded-[20px] bg-white/70 ring-1 ring-[var(--zm-separator)] dark:bg-white/5">
        <Row active={s >= 0} label={t('landing.phFever')}>
          <div className="flex items-center gap-3">
            <div className="relative h-1.5 w-20 overflow-hidden rounded-full bg-[linear-gradient(90deg,#2bb3a6,#f5a524,#e5484d)]">
              <motion.span
                className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-[var(--zm-amber)] shadow"
                initial={false}
                animate={{ left: s >= 0 ? '74%' : '10%' }}
                transition={{ duration: 1.1, ease: iosEase }}
              />
            </div>
            <span className="tabular text-[15px] font-bold">39.2°</span>
          </div>
        </Row>
        <Row active={s >= 1} label={t('landing.phDanger')}>
          <motion.span
            initial={false}
            animate={s >= 1 ? { opacity: 1, scale: 1 } : { opacity: 0.25, scale: 0.9 }}
            transition={bouncy}
            className="rounded-full bg-[rgba(229,72,77,0.12)] px-2.5 py-1 text-[12.5px] font-semibold text-[var(--zm-danger)]"
          >
            {t('landing.phConvulsions')}
          </motion.span>
        </Row>
        <Row active={s >= 2} label={t('landing.hcRdt')}>
          <div className="flex items-center gap-2.5">
            <RdtCassette positive={s >= 2} />
            <motion.span initial={false} animate={{ opacity: s >= 2 ? 1 : 0.25 }} className="text-[12.5px] font-semibold text-[var(--zm-danger)]">
              {t('landing.hcRdtPos')}
            </motion.span>
          </div>
        </Row>
      </div>

      {/* decision */}
      <div className="relative mt-3 h-[76px]">
        <AnimatePresence mode="wait" initial={false}>
          {s >= 3 ? (
            <motion.div
              key="urgent"
              initial={{ opacity: 0, y: 12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8 }}
              transition={spring}
              className="absolute inset-0 flex items-center gap-3 overflow-hidden rounded-[20px] bg-[linear-gradient(135deg,#f0555a,#c53035)] px-4 text-white shadow-[0_16px_32px_-14px_rgba(229,72,77,0.8)]"
            >
              <span className="absolute -right-6 -top-8 h-24 w-24 rounded-full bg-white/15 blur-xl" />
              <motion.span animate={{ scale: [1, 1.15, 1] }} transition={{ repeat: Infinity, duration: 1.6 }} className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/20 text-[18px] font-bold">
                !
              </motion.span>
              <div className="relative min-w-0">
                <p className="text-[17px] font-bold leading-tight tracking-[-0.01em]">{t('landing.phUrgent')}</p>
                <p className="truncate text-[12.5px] text-white/85">{t('landing.phUrgentWhy')}</p>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="pending"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center gap-3 rounded-[20px] border border-dashed border-[var(--zm-separator)] px-4"
            >
              <span className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <motion.span
                    key={i}
                    className="h-2 w-2 rounded-full bg-[var(--zm-teal)]"
                    animate={reduce ? undefined : { opacity: [0.2, 1, 0.2], y: [0, -3, 0] }}
                    transition={{ repeat: Infinity, duration: 1.1, delay: i * 0.16 }}
                  />
                ))}
              </span>
              <span className="text-[14px] font-medium text-[var(--zm-label-2)]">{t('landing.hcAssessing')}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* referral tracking */}
      <div className="mt-4 px-1">
        <div className="flex items-center justify-between text-[12px] font-medium text-[var(--zm-label-2)]">
          <span>{t('landing.phHandoverTo')}</span>
        </div>
        <div className="mt-3 flex items-center">
          {[t('landing.hcSent'), t('landing.hcReceived'), t('landing.hcArrived')].map((label, i) => {
            const done = s >= 3 + i;
            return (
              <div key={label} className="flex flex-1 items-center last:flex-none">
                <div className="flex flex-col items-center gap-1.5">
                  <motion.span
                    initial={false}
                    animate={{ scale: done ? 1 : 0.8, backgroundColor: done ? (i === 2 ? '#14807a' : '#0b3c5d') : 'rgba(120,120,128,0.2)' }}
                    transition={bouncy}
                    className="flex h-6 w-6 items-center justify-center rounded-full"
                  >
                    <DrawCheck on={done} size={12} />
                  </motion.span>
                  <span className={cn('text-[11.5px] font-semibold transition-colors duration-500', done ? '' : 'text-[var(--zm-label-3)]')}>{label}</span>
                </div>
                {i < 2 ? (
                  <div className="mx-1.5 mb-5 h-[3px] flex-1 overflow-hidden rounded-full bg-[rgba(120,120,128,0.18)]">
                    <motion.div
                      className="h-full rounded-full bg-[linear-gradient(90deg,var(--zm-ocean),var(--zm-teal))]"
                      initial={false}
                      animate={{ width: s >= 4 + i ? '100%' : '0%' }}
                      transition={{ duration: 0.9, ease: iosEase }}
                    />
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Row({ active, label, children }: { active: boolean; label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-[var(--zm-separator)] px-4 py-3 first:border-t-0">
      <span className="flex items-center gap-2.5">
        <motion.span
          initial={false}
          animate={{ scale: active ? 1 : 0.6, backgroundColor: active ? '#14807a' : 'rgba(120,120,128,0.25)' }}
          transition={bouncy}
          className="flex h-5 w-5 items-center justify-center rounded-full"
        >
          <DrawCheck on={active} size={11} />
        </motion.span>
        <span className={cn('text-[14px] font-medium transition-colors duration-500', !active && 'text-[var(--zm-label-3)]')}>{label}</span>
      </span>
      {children}
    </div>
  );
}

/** Malaria rapid diagnostic test cassette: control (C) and test (T) lines appear. */
function RdtCassette({ positive }: { positive: boolean }) {
  return (
    <svg width="54" height="22" viewBox="0 0 54 22" aria-hidden>
      <rect x="0.5" y="0.5" width="53" height="21" rx="6" fill="#fff" stroke="rgba(11,27,43,0.18)" />
      <circle cx="9" cy="11" r="3.4" fill="none" stroke="rgba(11,27,43,0.3)" />
      <rect x="18" y="6" width="26" height="10" rx="2.5" fill="#f3efe9" stroke="rgba(11,27,43,0.12)" />
      <motion.rect x="25" y="7" width="2" height="8" rx="1" fill="#c53035" initial={false} animate={{ opacity: positive ? 1 : 0, scaleY: positive ? 1 : 0 }} transition={{ duration: 0.5 }} style={{ originY: '11px' }} />
      <motion.rect x="35" y="7" width="2" height="8" rx="1" fill="#c53035" initial={false} animate={{ opacity: positive ? 1 : 0, scaleY: positive ? 1 : 0 }} transition={{ duration: 0.5, delay: 0.45 }} style={{ originY: '11px' }} />
    </svg>
  );
}
