import { AnimatePresence, motion } from 'framer-motion';
import { useRef, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { PillButton } from '../../components/liquid';
import { Chevron, Orb } from '../../components/liquid/alive';
import { bouncy } from '../../lib/motion';
import { AuthHeading, Field, FieldGroup, FieldHint, ShareRequest, useAutoFocus, type ShakeHandle } from './fields';

/**
 * Forgot password (route: /forgot-password).
 * Frontend only: passwords are reset by a supervisor / RBC admin, so this
 * prepares the request for the user to send them.
 */
export function ForgotPasswordPage() {
  const { t } = useTranslation();
  const [identifier, setIdentifier] = useState('');
  const [hint, setHint] = useState('');
  const [done, setDone] = useState(false);
  const group = useRef<ShakeHandle | null>(null);
  const first = useRef<HTMLInputElement | null>(null);
  useAutoFocus(first);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (identifier.trim().length < 3) {
      setHint(t('authx.vIdentifier'));
      group.current?.shake();
      return;
    }
    setHint('');
    setDone(true);
  };

  return (
    <AnimatePresence mode="wait" initial={false}>
      {done ? (
        <motion.div key="done" exit={{ opacity: 0, scale: 0.98 }}>
          <ShareRequest
            title={t('authx.resetSentT')}
            body={t('authx.resetSentB')}
            message={t('authx.resetTemplate', { user: identifier.trim() })}
            onEdit={() => setDone(false)}
          />
        </motion.div>
      ) : (
        <motion.div key="form" exit={{ opacity: 0, scale: 0.98 }}>
          <motion.span initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ ...bouncy, delay: 0.1 }} className="mb-6 inline-flex">
            <Orb size={64} tone="ocean" />
          </motion.span>
          <AuthHeading title={t('authx.forgotTitle')} sub={t('authx.forgotSub')} />
          <form onSubmit={submit} noValidate>
            <FieldGroup ref={group}>
              <Field
                ref={first}
                label={t('authx.identifier')}
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                invalid={!!hint}
              />
            </FieldGroup>
            <FieldHint>{hint}</FieldHint>
            <PillButton type="submit" size="lg" className="mt-6 w-full">
              {t('authx.sendReset')}
            </PillButton>
          </form>
          <div className="mt-7 flex justify-center">
            <Link to="/login" className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[15px] font-semibold text-[var(--zm-teal)] hover:bg-[rgba(20,128,122,0.08)]">
              <Chevron />
              {t('authx.backToSignIn')}
            </Link>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
