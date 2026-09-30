import { CheckCircle2, CircleAlert, Home, Mic, Siren } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChwShell, WebShell } from '../components/shells';
import { VoiceControls } from '../components/voice/VoiceControls';
import { Badge, Button, Card, EmptyState, PageHeader, ProgressBar } from '../components/ui';
import type { DecisionResult, TriageInput } from '../types';
import { cn } from '../lib/cn';
import { useTheme } from '../theme/ThemeContext';
import {
  buildResultSequence,
  getPhrase,
  reasonPhraseIdForRuleOrSign,
  type PhraseId,
  type VoiceLang,
} from '../voice/phrases';
import { useVoice } from '../voice/VoiceContext';

type SavedTriage = {
  input: TriageInput;
  result: DecisionResult;
  demo?: string;
  ai_extract_used?: boolean;
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
  const online = !offlineSim && (typeof navigator !== 'undefined' ? navigator.onLine : true);
  const isApp = location.pathname.startsWith('/app');
  const triagePath = isApp ? '/app/triage' : '/m/triage';
  const handoverPath = isApp ? '/m/handover' : '/m/handover';

  const saved = useMemo(() => {
    const raw = sessionStorage.getItem('zm_last_triage');
    if (!raw) return null;
    return JSON.parse(raw) as SavedTriage;
  }, []);

  const mainSequence = useMemo(
    () => (saved ? buildResultSequence(saved.result.decision, saved.result.triggered_rules) : []),
    [saved],
  );

  const autoPlayed = useRef(false);

  useEffect(() => {
    if (!saved || !voice.unlocked || !mainSequence.length || autoPlayed.current) return;
    autoPlayed.current = true;
    void voice.play(mainSequence);
  }, [saved, voice.unlocked, mainSequence, voice]);

  if (!saved) {
    const empty = (
      <EmptyState
        icon={<CircleAlert className="h-8 w-8" />}
        title={t('common.empty')}
        action={<Button onClick={() => navigate(triagePath)}>{t('home.newPatient')}</Button>}
      />
    );
    return isApp ? (
      <WebShell title={t('result.title')} crumbs={[t('result.title')]}>
        {empty}
      </WebShell>
    ) : (
      <ChwShell title={t('result.title')}>{empty}</ChwShell>
    );
  }

  const { result, demo, ai_extract_used } = saved;
  const decision = result.decision;
  const conf =
    decision === 'urgent_refer'
      ? { tone: 'danger', label: t('result.urgent'), Icon: Siren, ring: true }
      : decision === 'refer'
        ? { tone: 'warning', label: t('result.refer'), Icon: CircleAlert, ring: false }
        : { tone: 'success', label: t('result.treat'), Icon: Home, ring: false };

  const banner =
    conf.tone === 'danger'
      ? 'bg-danger text-white'
      : conf.tone === 'warning'
        ? 'bg-warning text-white'
        : 'bg-success text-white';

  const showRule = result.decision === result.rules_decision && !result.ml_escalated;
  const showMl =
    result.ml_escalated || result.decision !== result.rules_decision || (result.shap_factors?.length ?? 0) > 0;
  const showAi = Boolean(ai_extract_used);

  const whySequence = (): PhraseId[] => {
    const ids: PhraseId[] = ['why_generic'];
    for (const rid of result.triggered_rules) {
      const pid = reasonPhraseIdForRuleOrSign(rid);
      if (pid) ids.push(pid);
    }
    return ids;
  };

  const whatNowSequence = (): PhraseId[] => {
    const ids: PhraseId[] = ['what_now_generic'];
    if (decision === 'treat_at_home') ids.push('next_treat_at_home');
    else if (decision === 'refer') ids.push('next_refer');
    else ids.push('next_urgent_refer');
    return ids;
  };

  const highlightId = voice.highlightId;

  const body = (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Badge tone={online ? 'success' : 'warning'}>
          {online ? t('result.onlineAssistant') : t('result.offlineGuide')}
        </Badge>
        {showRule ? <Badge tone="primary">{t('result.provenanceRule')}</Badge> : null}
        {showMl ? <Badge tone="info">{t('result.provenanceMl')}</Badge> : null}
        {showAi ? <Badge tone="accent">{t('result.provenanceAi')}</Badge> : null}
      </div>

      <motion.div
        initial={reduce ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn('rounded-card p-5 shadow-card', banner, conf.ring && 'animate-pulse-ring')}
      >
        <conf.Icon className="h-8 w-8" strokeWidth={1.75} />
        <p className="mt-3 text-xs uppercase tracking-wide opacity-90">{t('result.title')}</p>
        <h2 className="mt-1 text-2xl font-semibold">{conf.label}</h2>
      </motion.div>

      <Card className="mt-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-semibold">{t('result.readAloud')}</h3>
        </div>
        <VoiceControls
          className="mt-3"
          phraseIds={mainSequence}
          showLabels={isApp}
          compact={!isApp}
        />
        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => void voice.play(['repeat_hint', ...mainSequence])}>
            {t('result.repeat')}
          </Button>
          <Button size="sm" variant="outline" onClick={() => void voice.play(whySequence())}>
            {t('result.whyButton')}
          </Button>
          <Button size="sm" variant="outline" onClick={() => void voice.play(whatNowSequence())}>
            {t('result.whatNow')}
          </Button>
          <Button size="sm" variant="outline" onClick={() => voice.setSlower()}>
            {t('result.slower')}
          </Button>
        </div>
        {highlightId ? (
          <p className="mt-3 rounded-control bg-surface-muted p-3 text-sm leading-relaxed ring-2 ring-primary/30">
            <Mic className="mb-1 inline h-4 w-4 text-primary" strokeWidth={1.75} />{' '}
            {getPhrase(highlightId, lang)}
          </p>
        ) : null}
      </Card>

      <Card className="mt-4">
        <h3 className="font-semibold">{t('result.triggeredRules')}</h3>
        <ul className="mt-3 space-y-2">
          {result.triggered_rules.map((rid) => {
            const pid = reasonPhraseIdForRuleOrSign(rid);
            const label = pid ? getPhrase(pid, lang) : rid;
            return (
              <li key={rid} className="flex items-start gap-2 text-sm">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-accent" strokeWidth={1.75} />
                <span>
                  <span className="font-mono text-xs text-ink-muted">{rid}</span>
                  <span className="mt-0.5 block">{label}</span>
                </span>
              </li>
            );
          })}
        </ul>
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

      {result.shap_factors?.length ? (
        <Card className="mt-3">
          <h3 className="font-semibold">{t('result.factors')}</h3>
          <div className="mt-3 space-y-2">
            {result.shap_factors.slice(0, 3).map((f, i) => (
              <div key={f}>
                <p className="mb-1 text-xs text-ink-muted">{f}</p>
                <div className="h-2 rounded-full bg-surface-muted">
                  <div className="h-full rounded-full bg-info" style={{ width: `${90 - i * 18}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      <Card className="mt-3">
        <ProgressBar
          value={Math.round((result.confidence || 0.7) * 100)}
          label={`${t('result.confidence')}: ${Math.round((result.confidence || 0.7) * 100)}%`}
        />
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
        {decision === 'treat_at_home' ? (
          <Button
            className="w-full"
            disabled={!confirmed}
            onClick={() => navigate(demo === 'A' ? `${triagePath}?demo=B` : isApp ? '/app/home' : '/m/home')}
          >
            {demo === 'A' ? `${t('result.done')} → Case B` : t('result.done')}
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

  if (isApp) {
    return (
      <WebShell title={t('result.title')} crumbs={[t('nav.home'), t('result.title')]}>
        <PageHeader title={t('result.title')} subtitle={t('result.readAloud')} />
        <div className="mx-auto max-w-3xl">{body}</div>
      </WebShell>
    );
  }

  return <ChwShell title={t('result.title')}>{body}</ChwShell>;
}
