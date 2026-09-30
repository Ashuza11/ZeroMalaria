import { AnimatePresence, motion, useAnimationControls } from 'framer-motion';
import { BlinkEye, DrawCheck } from '../../components/liquid/alive';
import { forwardRef, useEffect, useId, useImperativeHandle, useState, type InputHTMLAttributes, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { cn } from '../../lib/cn';
import { bouncy, iosEase, spring } from '../../lib/motion';

/** Floating-label field that lives inside an iOS inset-grouped container. */
export const Field = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { label: string; trailing?: ReactNode; invalid?: boolean }>(
  function Field({ label, trailing, invalid, className, id, ...rest }, ref) {
    const auto = useId();
    const fid = id ?? auto;
    return (
      <div className={cn('relative flex items-center', className)}>
        <input ref={ref} id={fid} placeholder=" " aria-invalid={invalid || undefined} className="zm-field-input peer" {...rest} />
        <label htmlFor={fid} className="zm-field-label">
          {label}
        </label>
        {trailing ? <div className="absolute right-2">{trailing}</div> : null}
        {invalid ? <span className="absolute left-0 top-0 h-full w-[3px] bg-[var(--zm-danger)]" aria-hidden /> : null}
      </div>
    );
  },
);

export const PasswordField = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { label: string; invalid?: boolean }>(
  function PasswordField(props, ref) {
    const { t } = useTranslation();
    const [show, setShow] = useState(false);
    return (
      <Field
        ref={ref}
        {...props}
        type={show ? 'text' : 'password'}
        className="pr-12"
        trailing={
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            className="flex h-10 w-10 items-center justify-center rounded-full text-[var(--zm-label-3)] transition hover:bg-black/5 hover:text-[var(--zm-label)] dark:hover:bg-white/10"
            aria-label={show ? t('login.hidePassword') : t('login.showPassword')}
          >
            <BlinkEye open={show} />
          </button>
        }
      />
    );
  },
);

export type ShakeHandle = { shake: () => void };

/** Inset group that shakes like the iOS passcode screen on error. */
export const FieldGroup = forwardRef<ShakeHandle, { children: ReactNode; className?: string }>(function FieldGroup({ children, className }, ref) {
  const controls = useAnimationControls();
  useImperativeHandle(ref, () => ({
    shake: () => void controls.start({ x: [0, -12, 10, -8, 6, -3, 0], transition: { duration: 0.5, ease: 'easeOut' } }),
  }));
  return (
    <motion.div animate={controls} className={cn('zm-group', className)}>
      {children}
    </motion.div>
  );
});

export function FieldHint({ children, tone = 'error' }: { children?: ReactNode; tone?: 'error' | 'muted' }) {
  return (
    <AnimatePresence initial={false}>
      {children ? (
        <motion.p
          initial={{ opacity: 0, height: 0, y: -4 }}
          animate={{ opacity: 1, height: 'auto', y: 0 }}
          exit={{ opacity: 0, height: 0 }}
          transition={spring}
          className={cn('overflow-hidden px-4 text-[13px]', tone === 'error' ? 'text-[var(--zm-danger)]' : 'text-[var(--zm-label-3)]')}
        >
          <span className="block pt-2">{children}</span>
        </motion.p>
      ) : null}
    </AnimatePresence>
  );
}

export function Banner({ children }: { children?: ReactNode }) {
  return (
    <AnimatePresence initial={false}>
      {children ? (
        <motion.div
          initial={{ opacity: 0, height: 0, scale: 0.98 }}
          animate={{ opacity: 1, height: 'auto', scale: 1 }}
          exit={{ opacity: 0, height: 0 }}
          transition={spring}
          className="overflow-hidden"
          role="alert"
        >
          <div className="mb-4 flex items-start gap-2.5 rounded-[18px] bg-[rgba(229,72,77,0.1)] px-4 py-3 text-[14px] font-medium text-[var(--zm-danger)]">
            <span className="relative mt-[5px] flex h-2.5 w-2.5 shrink-0">
              <span className="absolute inset-0 animate-ping rounded-full bg-[var(--zm-danger)] opacity-60" />
              <span className="relative h-2.5 w-2.5 rounded-full bg-[var(--zm-danger)]" />
            </span>
            <span>{children}</span>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

export function AuthHeading({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="mb-7">
      <h1 className="zm-title text-[32px] sm:text-[36px]">{title}</h1>
      <p className="mt-2 text-[16px] leading-relaxed text-[var(--zm-label-2)]">{sub}</p>
    </div>
  );
}

/** Animated success check: circle draws, then tick. */
export function SuccessMark() {
  return (
    <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={bouncy} className="relative mx-auto h-[88px] w-[88px]">
      <motion.span
        className="absolute inset-0 rounded-full bg-[rgba(20,128,122,0.14)]"
        animate={{ scale: [1, 1.35], opacity: [0.8, 0] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: 'easeOut', delay: 0.8 }}
      />
      <svg viewBox="0 0 88 88" className="relative h-full w-full">
        <motion.circle
          cx="44"
          cy="44"
          r="40"
          fill="none"
          stroke="var(--zm-teal)"
          strokeWidth="5"
          strokeLinecap="round"
          initial={{ pathLength: 0, rotate: -90 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.7, ease: iosEase }}
          style={{ originX: '50%', originY: '50%' }}
        />
        <motion.path
          d="M28 45.5 39.5 57 61 34"
          fill="none"
          stroke="var(--zm-teal)"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.45, delay: 0.55, ease: iosEase }}
        />
      </svg>
    </motion.div>
  );
}

/** Segmented control (iOS UISegmentedControl). */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T;
  onChange: (v: T) => void;
  options: Array<{ id: T; label: string; icon?: ReactNode }>;
  label: string;
}) {
  const uid = useId();
  return (
    <div role="radiogroup" aria-label={label} className="relative grid rounded-[14px] bg-[rgba(118,118,128,0.12)] p-[3px]" style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}>
      {options.map((o) => {
        const active = o.id === value;
        return (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.id)}
            className={cn('relative z-10 flex h-10 items-center justify-center gap-2 rounded-[11px] text-[14.5px] font-semibold transition-colors', active ? 'text-[var(--zm-label)]' : 'text-[var(--zm-label-2)]')}
          >
            {active ? <motion.span layoutId={`seg-${uid}`} transition={spring} className="absolute inset-0 -z-10 rounded-[11px] bg-white shadow-[0_3px_8px_rgba(0,0,0,0.12),0_3px_1px_rgba(0,0,0,0.04)] dark:bg-white/20" /> : null}
            {o.icon}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function Checkbox({ checked, onChange, children, invalid }: { checked: boolean; onChange: (v: boolean) => void; children: ReactNode; invalid?: boolean }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 text-[14px] leading-relaxed text-[var(--zm-label-2)]">
      <input type="checkbox" className="sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <motion.span
        animate={{ backgroundColor: checked ? 'var(--zm-teal)' : 'rgba(0,0,0,0)', scale: checked ? [1, 0.85, 1] : 1 }}
        transition={{ duration: 0.25 }}
        className={cn('mt-0.5 flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border-2', checked ? 'border-[var(--zm-teal)]' : invalid ? 'border-[var(--zm-danger)]' : 'border-[var(--zm-label-3)]')}
      >
        <DrawCheck on={checked} size={12} />
      </motion.span>
      <span>{children}</span>
    </label>
  );
}

/** Map API error text to a translation key. */
export function authErrorKey(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  const status = err instanceof Error && 'status' in err ? Number((err as Error & { status?: number }).status) : 0;
  if (/Failed to fetch|NetworkError|Load failed|ECONNREFUSED|proxy/i.test(msg)) return 'authx.network';
  if (/deactivated/i.test(msg)) return 'authx.inactive';
  if (status === 429 || /login_locked|Too many/i.test(msg)) return 'authx.tooMany';
  if (/Invalid username|Unauthorized|401/i.test(msg)) return 'authx.invalid';
  if (/^\s*$|5\d\d|Internal/i.test(msg)) return 'authx.network';
  return 'authx.invalid';
}

export function useAutoFocus(ref: React.RefObject<HTMLInputElement | null>) {
  useEffect(() => {
    const id = window.setTimeout(() => ref.current?.focus({ preventScroll: true }), 450);
    return () => window.clearTimeout(id);
  }, [ref]);
}

/** Success screen for frontend-only requests: shows the message, lets the user copy it or open SMS. */
export function ShareRequest({ title, body, message, onEdit }: { title: string; body: string; message: string; onEdit: () => void }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(message);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = message;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };
  return (
    <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="py-2 text-center">
      <SuccessMark />
      <h1 className="zm-title mt-6 text-[30px]">{title}</h1>
      <p className="mx-auto mt-3 max-w-[340px] text-[16px] leading-relaxed text-[var(--zm-label-2)]">{body}</p>
      <motion.pre
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...spring, delay: 0.5 }}
        className="mt-6 whitespace-pre-wrap rounded-[20px] bg-[rgba(118,118,128,0.1)] p-4 text-left font-sans text-[14.5px] leading-relaxed text-[var(--zm-label)] ring-1 ring-[var(--zm-separator)]"
      >
        {message}
      </motion.pre>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <motion.button
          type="button"
          whileTap={{ scale: 0.95 }}
          onClick={() => void copy()}
          className="relative h-12 overflow-hidden rounded-full bg-[rgba(20,128,122,0.12)] text-[15px] font-semibold text-[var(--zm-teal)]"
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.span key={copied ? 'c' : 'n'} initial={{ y: 14, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -14, opacity: 0 }} transition={spring} className="inline-flex items-center gap-2">
              {copied ? <DrawCheck size={14} color="var(--zm-teal)" /> : null}
              {copied ? t('authx.copied') : t('authx.copy')}
            </motion.span>
          </AnimatePresence>
        </motion.button>
        <motion.a
          whileTap={{ scale: 0.95 }}
          href={`sms:?&body=${encodeURIComponent(message)}`}
          className="flex h-12 items-center justify-center rounded-full bg-[linear-gradient(180deg,#135a85,#0b3c5d)] text-[15px] font-semibold text-white shadow-[0_10px_24px_-10px_rgba(11,60,93,0.7)]"
        >
          {t('authx.sendSms')}
        </motion.a>
      </div>
      <div className="mt-5 flex items-center justify-center gap-4 text-[15px] font-semibold">
        <button type="button" onClick={onEdit} className="rounded-full px-3 py-1.5 text-[var(--zm-label-2)] hover:bg-black/5 dark:hover:bg-white/10">
          {t('authx.edit')}
        </button>
        <Link to="/login" className="rounded-full px-3 py-1.5 text-[var(--zm-teal)] hover:bg-[rgba(20,128,122,0.08)]">
          {t('authx.backToSignIn')}
        </Link>
      </div>
    </motion.div>
  );
}
