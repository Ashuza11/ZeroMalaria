import { CheckCircle2, CircleAlert, Home, Mic, Siren, Sparkles } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { ChwShell, WebShell } from '../components/shells';
import { VoiceControls } from '../components/voice/VoiceControls';
import { Badge, Button, Card, EmptyState, PageHeader, ProgressBar } from '../components/ui';
import type { AiAdvisory, DecisionResult, TriageInput } from '../types';
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

function persistAdvisory(advisory: AiAdvisory | null) {
  const raw = sessionStorage.getItem('zm_last_triage');
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw) as SavedTriage;
    parsed.result = { ...parsed.result, ai_advisory: advisory };
    sessionStorage.setItem('zm_last_triage', JSON.stringify(parsed));
  } catch {
    /* ignore */
  }
}

export function ResultPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const reduce = useReducedMotion();
  const { offlineSim } = useTheme();
  const voice = useVoice();
  const [confirmed, setConfirmed] = useState(false);
  const [advisory, setAdvisory] = useState<AiAdvisory | null>(null);
  const [chwFeedback, setChwFeedback] = useState<'followed' | 'overrode' | null>(null);

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
  const advisoryFetched = useRef(false);

  useEffect(() => {
    if (!saved || !voice.unlocked || !mainSequence.length || autoPlayed.current) return;
    autoPlayed.current = true;
    void voice.play(mainSequence);
  }, [saved, voice.unlocked, mainSequence, voice]);

  useEffect(() => {
    if (!saved || !online || advisoryFetched.current) return;
    advisoryFetched.current = true;
    const { input, result } = saved;
    void api
      .aiAdvisory({
        answers: input as unknown as Record<string, unknown>,
        rules_decision: result.rules_decision || result.decision,
        public_decision: result.public_decision,
        reasons: result.reasons,
        triggered_rules: result.triggered_rules,
        reason_details: result.reason_details,
        missing_info: result.missing_info,
        protocol_reference: result.protocol_reference,
        language: lang,
      })
      .then((res) => {
        if (!res?.ok || !res.data || typeof res.data !== 'object') return;
        const d = res.data as Record<string, unknown>;
        if (typeof d.explanation_rw !== 'string' || typeof d.explanation_en !== 'string') return;
        const next: AiAdvisory = {
          explanation_rw: String(d.explanation_rw),
          explanation_en: String(d.explanation_en),
          inconsistencies: Array.isArray(d.inconsistencies) ? d.inconsistencies.map(String) : [],
          caregiver_advice_rw: String(d.caregiver_advice_rw || ''),
          handover_summary: String(d.handover_summary || ''),
          suggested_escalation: Boolean(d.suggested_escalation),
          citations: Array.isArray(d.citations) ? d.citations.map(String) : [],
          needs_native_review: d.needs_native_review !== false,
          chw_followed: null,
        };
        setAdvisory(next);
        persistAdvisory(next);
      })
      .catch(() => {
        /* silent: rules result alone */
      });
  }, [saved, online, lang]);

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

  const onChwFeedback = (followed: boolean) => {
    const next = advisory
      ? { ...advisory, chw_followed: followed }
      : null;
    setAdvisory(next);
    persistAdvisory(next);
    setChwFeedback(followed ? 'followed' : 'overrode');
    void api
      .aiAdvisoryFeedback({
        rules_decision: result.rules_decision || result.decision,
        chw_followed: followed,
        suggested_escalation: Boolean(advisory?.suggested_escalation),
      })
      .catch(() => {
        /* offline: feedback stays local in session */
      });
  };

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

      {advisory ? (
        <Card className="mt-4 border-2 border-info/40" aria-label={t('result.aiSuggestion')}>
          <div className="flex flex-wrap items-center gap-2">
            <Sparkles className="h-5 w-5 text-info" strokeWidth={1.75} aria-hidden />
            <h3 className="font-semibold">{t('result.aiSuggestion')}</h3>
            {advisory.needs_native_review ? (
              <Badge tone="warning">{t('result.aiNeedsReview')}</Badge>
            ) : null}
          </div>
          <p className="mt-3 text-sm leading-relaxed">{advisory.explanation_rw}</p>
          <p className="mt-2 text-sm text-ink-muted leading-relaxed">{advisory.explanation_en}</p>
          {advisory.suggested_escalation ? (
            <p className="mt-3 rounded-control bg-warning-soft p-3 text-sm font-medium text-warning">
              {t('result.aiEscalateHint')}
            </p>
          ) : null}
          {advisory.citations.length ? (
            <div className="mt-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                {t('result.aiCitations')}
              </p>
              <ul className="mt-1 flex flex-wrap gap-2">
                {advisory.citations.map((c) => (
                  <li key={c}>
                    <Badge tone="neutral">{c}</Badge>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {advisory.inconsistencies.length ? (
            <div className="mt-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                {t('result.aiInconsistencies')}
              </p>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">
                {advisory.inconsistencies.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {advisory.caregiver_advice_rw ? (
            <div className="mt-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                {t('result.aiCaregiverAdvice')}
              </p>
              <p className="mt-1 text-sm">{advisory.caregiver_advice_rw}</p>
            </div>
          ) : null}
          {advisory.handover_summary ? (
            <div className="mt-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                {t('result.aiHandoverPreview')}
              </p>
              <p className="mt-1 rounded-control bg-surface-muted p-2 text-xs leading-relaxed">
                {advisory.handover_summary}
              </p>
            </div>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="secondary"
              disabled={chwFeedback !== null}
              onClick={() => onChwFeedback(true)}
            >
              {t('result.chwFollowAi')}
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={chwFeedback !== null}
              onClick={() => onChwFeedback(false)}
            >
              {t('result.chwOverrideAi')}
            </Button>
          </div>
          {chwFeedback ? (
            <p className="mt-2 text-xs text-ink-muted" role="status">
              {t('result.chwFeedbackLogged')}
            </p>
          ) : null}
        </Card>
      ) : null}

      <Card className="mt-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-semibold">{t('result.readAloud')}</h3>
        </div>
        <VoiceControls
          className="mt-3"
          phraseIds={mainSequence}
          showLabels={isApp}
          compact={!isApp}
          language={lang}
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
