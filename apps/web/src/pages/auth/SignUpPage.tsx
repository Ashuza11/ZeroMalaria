import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import { PillButton } from '../../components/liquid';
import { Chevron, GlideArrow } from '../../components/liquid/alive';
import { AuthHeading, Field, FieldGroup, FieldHint, Segmented, ShareRequest, useAutoFocus, type ShakeHandle } from './fields';

type Facility = { facility_id: string; name: string; district: string };

const PHONE_RE = /^(\+2507\d{8}|07\d{8})$/;

/**
 * Request an account (route: /signup).
 * Frontend only: the app has no public sign-up, so this prepares a request
 * the health worker sends to their supervisor, who creates the account.
 */
export function SignUpPage() {
  const { t } = useTranslation();
  const [form, setForm] = useState({ display_name: '', phone: '', role: 'chw' as 'chw' | 'nurse', facility_id: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [done, setDone] = useState(false);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const group = useRef<ShakeHandle | null>(null);
  const first = useRef<HTMLInputElement | null>(null);
  useAutoFocus(first);

  useEffect(() => {
    api
      .facilities()
      .then((rows) => setFacilities(rows as Facility[]))
      .catch(() => setFacilities([]));
  }, []);

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (form.display_name.trim().length < 2) next.display_name = t('authx.vName');
    if (!PHONE_RE.test(form.phone.trim())) next.phone = t('authx.vPhone');
    setErrors(next);
    if (Object.keys(next).length) {
      group.current?.shake();
      return;
    }
    setDone(true);
  };

  const facility = facilities.find((f) => f.facility_id === form.facility_id);
  const message = t('authx.requestTemplate', {
    name: form.display_name.trim(),
    role: form.role === 'chw' ? t('auth.roleChw') : t('auth.roleNurse'),
    facility: facility ? `${facility.name} (${facility.facility_id})` : '·',
    phone: form.phone.trim(),
  });

  return (
    <AnimatePresence mode="wait" initial={false}>
      {done ? (
        <motion.div key="done" exit={{ opacity: 0, scale: 0.98 }}>
          <ShareRequest title={t('authx.requestSentT')} body={t('authx.requestSentB')} message={message} onEdit={() => setDone(false)} />
        </motion.div>
      ) : (
        <motion.div key="form" exit={{ opacity: 0, scale: 0.98, filter: 'blur(6px)' }}>
          <AuthHeading title={t('authx.signUpTitle')} sub={t('authx.signUpSub')} />

          <form onSubmit={submit} noValidate className="space-y-4">
            <div>
              <p className="mb-2 px-1 text-[13px] font-medium text-[var(--zm-label-2)]">{t('authx.role')}</p>
              <Segmented
                label={t('authx.role')}
                value={form.role}
                onChange={(v) => set('role', v)}
                options={[
                  { id: 'chw', label: t('authx.roleChw') },
                  { id: 'nurse', label: t('authx.roleNurse') },
                ]}
              />
            </div>

            <div>
              <FieldGroup ref={group}>
                <Field ref={first} label={t('authx.fullName')} value={form.display_name} onChange={(e) => set('display_name', e.target.value)} autoComplete="name" invalid={!!errors.display_name} />
                <Field label={t('authx.phone')} type="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)} autoComplete="tel" inputMode="tel" invalid={!!errors.phone} />
                <div className="relative">
                  <select value={form.facility_id} onChange={(e) => set('facility_id', e.target.value)} className="zm-field-input appearance-none pr-10" aria-label={t('authx.facility')}>
                    <option value="">{t('authx.facilityPick')}</option>
                    {facilities.map((f) => (
                      <option key={f.facility_id} value={f.facility_id}>
                        {f.name} · {f.district}
                      </option>
                    ))}
                  </select>
                  <span className="zm-field-label" data-float="true">
                    {t('authx.facility')}
                  </span>
                  <Chevron dir="down" className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[var(--zm-label-3)]" />
                </div>
              </FieldGroup>
              <FieldHint>{errors.display_name || errors.phone}</FieldHint>
            </div>

            <PillButton type="submit" size="lg" className="!mt-6 w-full">
              {t('authx.submitRequest')}
              <GlideArrow />
            </PillButton>
          </form>

          <p className="mt-7 text-center text-[15px] text-[var(--zm-label-2)]">
            {t('authx.haveAccount')}{' '}
            <Link to="/login" className="font-semibold text-[var(--zm-teal)] hover:underline">
              {t('authx.signIn')}
            </Link>
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
