import { CheckCircle2, CircleAlert, Home, Mic, Pill, ShieldCheck, Siren, Sparkles } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { useVisitSummary } from '../components/result/AiResultPanels';
import { ChwShell } from '../components/shells';
import { VoiceControls } from '../components/voice/VoiceControls';
import { Badge, Button, Card, EmptyState } from '../components/ui';
import type { DecisionResult, TriageInput } from '../types';
import { cn } from '../lib/cn';
import { useTheme } from '../theme/ThemeContext';
import {
  buildResultSequence,
  getPhrase,
  type VoiceLang,
} from '../voice/phrases';
import { useVoice } from '../voice/VoiceContext';

type SavedTriage = {
  input: TriageInput;
  result: DecisionResult;
  free_text?: string;
};

export function ResultPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const reduce = useReducedMotion();
  const { offlineSim } = useTheme();
  const voice = useVoice();
  const [confirmed, setConfirmed] = useState(false);

  const lang: VoiceLang = i18n.language.startsWith('rw') ? 'rw' : 'en';
  const uiLang = i18n.language.startsWith('rw') ? 'rw' : i18n.language.startsWith('fr') ? 'fr' : 'en';
  const online = !offlineSim && (typeof navigator !== 'undefined' ? navigator.onLine : true);
  const isApp = location.pathname.startsWith('/app');
  const triagePath = isApp ? '/app/triage' : '/m/triage';
  const handoverPath = isApp ? '/app/handover' : '/m/handover';

  const saved = useMemo(() => {
    const raw = sessionStorage.getItem('zm_last_triage');
    if (!raw) return null;
    return JSON.parse(raw) as SavedTriage;
  }, []);

  const mainSequence = useMemo(
    () =>
      saved
        ? buildResultSequence(
            saved.result.rules_decision || saved.result.decision,
            saved.result.triggered_rules,
          )
        : [],
    [saved],
  );

  const autoPlayed = useRef(false);
  useEffect(() => {
    if (!saved || !voice.unlocked || !mainSequence.length || autoPlayed.current) return;
    autoPlayed.current = true;
    void voice.play(mainSequence);
  }, [saved, voice.unlocked, mainSequence, voice]);

  const guardedResult = useMemo(() => {
    if (!saved) return null;
    const raw = saved.result;
    return {
      ...raw,
      // The RBC rules decision is authoritative. AI creates the handoff only.
      decision: (raw.rules_decision || raw.decision) as DecisionResult['decision'],
    };
  }, [saved]);

  const { summary: visitSummary, loading: briefLoading } = useVisitSummary(
    online,
    saved?.input ?? null,
    guardedResult,
    uiLang,
    saved?.free_text,
  );

  if (!saved || !guardedResult) {
    const empty = (
      <EmptyState
        icon={<CircleAlert className="h-8 w-8" />}
        title={t('common.empty')}
        action={<Button onClick={() => navigate(triagePath)}>{t('home.newPatient')}</Button>}
      />
    );
    return <ChwShell title={t('result.title')}>{empty}</ChwShell>;
  }

  const result = guardedResult;
  const decision = result.decision;
  const conf =
    decision === 'urgent_refer'
      ? { tone: 'danger', label: t('result.urgent'), Icon: Siren, ring: true }
      : decision === 'refer'
        ? { tone: 'warning', label: t('result.refer'), Icon: CircleAlert, ring: false }
        : decision === 'treat_at_home'
          ? { tone: 'success', label: t('result.treat'), Icon: Home, ring: false }
          : { tone: 'warning', label: t('result.noAntimalarial'), Icon: ShieldCheck, ring: false };

  const banner =
    conf.tone === 'danger'
      ? 'bg-danger text-white'
      : conf.tone === 'warning'
        ? 'bg-warning text-white'
        : 'bg-success text-white';

  const highlightId = voice.highlightId;

  const body = (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Badge tone="primary">{t('result.provenanceRule')}</Badge>
      </div>

      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">
        {t('result.rulesDecision')}
      </p>
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn('rounded-card p-5 shadow-card', banner, conf.ring && 'animate-pulse-ring')}
      >
        <conf.Icon className="h-8 w-8" strokeWidth={1.75} />
        <p className="mt-3 text-xs uppercase tracking-wide opacity-90">{t('result.title')}</p>
        <h2 className="mt-1 text-2xl font-semibold">{conf.label}</h2>
        {result.protocol_reference ? (
          <p className="mt-2 text-xs opacity-90">
            {t('result.protocolRef')}: {result.protocol_reference}
          </p>
        ) : null}
      </motion.div>

      {decision === 'treat_at_home' && result.treatment_plan ? (
        <Card className="mt-4 border-2 border-success/40" aria-label={t('result.treatmentPlan')}>
          <div className="flex items-center gap-2">
            <Pill className="h-6 w-6 text-success" strokeWidth={1.75} aria-hidden />
            <h3 className="text-lg font-semibold">{t('result.treatmentPlan')}</h3>
          </div>
          <p className="mt-3 text-lg font-bold">{result.treatment_plan.medicine}</p>
          <dl className="mt-3 grid grid-cols-2 gap-3 rounded-control bg-success-soft p-4 text-sm">
            <div>
              <dt className="text-ink-muted">{t('result.measuredWeight')}</dt>
              <dd className="font-semibold">{saved.input.weight_kg} kg</dd>
            </div>
            <div>
              <dt className="text-ink-muted">{t('result.weightBand')}</dt>
              <dd className="font-semibold">{result.treatment_plan.weight_band}</dd>
            </div>
            <div className="col-span-2">
              <dt className="text-ink-muted">{t('result.dose')}</dt>
              <dd className="text-lg font-bold">{result.treatment_plan.dose_each_time}</dd>
            </div>
            <div>
              <dt className="text-ink-muted">{t('result.frequency')}</dt>
              <dd className="font-semibold">{t('result.onceDailyThreeDays')}</dd>
            </div>
            <div>
              <dt className="text-ink-muted">{t('result.totalQuantity')}</dt>
              <dd className="font-semibold">{result.treatment_plan.total_quantity}</dd>
            </div>
          </dl>
          <ul className="mt-3 space-y-2 text-sm">
            {(lang === 'rw'
              ? result.treatment_plan.instructions_rw
              : result.treatment_plan.instructions_en
            ).map((instruction) => (
              <li key={instruction} className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />
                <span>{instruction}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-ink-muted">{result.treatment_plan.protocol_reference}</p>
        </Card>
      ) : null}

      {decision !== 'no_antimalarial' ? (
        <Card className="mt-4 border-2 border-info/40" aria-label={t('result.nurseHandoffTitle')}>
          <div className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-info" strokeWidth={1.75} aria-hidden />
            <h3 className="text-lg font-semibold">
              {decision === 'treat_at_home' ? t('result.aiTreatmentBriefTitle') : t('result.nurseHandoffTitle')}
            </h3>
          </div>
          {briefLoading ? (
            <AiBriefProcessing label={t('result.aiProcessing')} />
          ) : (
            <p className="mt-3 rounded-control bg-surface-muted p-3 text-sm leading-relaxed">
              {visitSummary || t('result.handoffOffline')}
            </p>
          )}
        </Card>
      ) : null}

      <Card className="mt-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-semibold">{t('result.readAloud')}</h3>
        </div>
        <VoiceControls
          className="mt-3"
          phraseIds={mainSequence}
          showLabels
          compact
          language={lang}
          allowMic={false}
        />
        {highlightId ? (
          <p className="mt-3 rounded-control bg-surface-muted p-3 text-sm leading-relaxed ring-2 ring-primary/30">
            <Mic className="mb-1 inline h-4 w-4 text-primary" strokeWidth={1.75} />{' '}
            {getPhrase(highlightId, lang)}
          </p>
        ) : null}
      </Card>

      <Card className="mt-3">
        <h3 className="font-semibold">{t('result.why')}</h3>
        <ul className="mt-3 space-y-2">
          {result.reasons.map((r) => (
            <li key={r} className="flex items-start gap-2 text-sm">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-accent" strokeWidth={1.75} />
              <span>{r}</span>
            </li>
          ))}
        </ul>
      </Card>

      <label className="mt-4 flex items-center gap-3 rounded-card border border-border bg-surface p-4">
        <input
          type="checkbox"
          className="h-5 w-5 accent-primary"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
        />
        <span className="text-sm font-semibold">{t('result.confirm')}</span>
      </label>

      <div className="sticky bottom-4 mt-4 space-y-2 rounded-card border border-border bg-surface/95 p-3 shadow-lift backdrop-blur">
        {decision === 'treat_at_home' || decision === 'no_antimalarial' ? (
          <Button
            className="w-full"
            disabled={!confirmed}
            onClick={() => navigate(isApp ? '/app/home' : '/m/home')}
          >
            {t('result.done')}
          </Button>
        ) : (
          <Button
            className="w-full"
            variant={decision === 'urgent_refer' ? 'danger' : 'primary'}
            disabled={!confirmed}
            onClick={() => navigate(handoverPath)}
          >
            {t('result.createHandover')}
          </Button>
        )}
        <Button variant="ghost" className="w-full" onClick={() => navigate(triagePath)}>
          {t('common.change')}
        </Button>
      </div>
    </>
  );

  return <ChwShell title={t('result.title')}>{body}</ChwShell>;
}

function AiBriefProcessing({ label }: { label: string }) {
  const reduce = useReducedMotion();
  return (
    <div className="mt-3 flex min-h-24 flex-col items-center justify-center rounded-control bg-surface-muted p-4 text-center" role="status">
      <Sparkles className="h-6 w-6 text-info" aria-hidden />
      <p className="mt-2 text-sm font-semibold">{label}</p>
      <div className="mt-3 flex h-3 items-center gap-1.5" aria-hidden>
        {[0, 1, 2].map((index) => (
          <motion.span
            key={index}
            className="h-2.5 w-2.5 rounded-full bg-info"
            animate={reduce ? undefined : { y: [0, -5, 0], opacity: [0.35, 1, 0.35] }}
            transition={{ duration: 0.8, repeat: Infinity, delay: index * 0.14 }}
          />
        ))}
      </div>
    </div>
  );
}
