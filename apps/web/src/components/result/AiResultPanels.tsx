import { Bot, ChevronDown, ChevronUp, Gauge, MessageSquare, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../../api/client';
import { Badge, Button, Card } from '../ui';
import { mlEscalateThreshold } from '../../lib/decisionGuard';
import type { DecisionResult, TriageInput } from '../../types';
import { VoiceControls } from '../voice/VoiceControls';
import { cn } from '../../lib/cn';

export type AiMode = 'rules' | 'rules_ai';

type ProviderInfo = {
  provider_used?: string;
  latency_ms?: number;
  fallback_reason?: string | null;
};

function ProvBadge({ info, t }: { info: ProviderInfo | null; t: (k: string) => string }) {
  if (!info?.provider_used) return null;
  const label =
    info.provider_used === 'local'
      ? t('ai.localRules')
      : info.provider_used.charAt(0).toUpperCase() + info.provider_used.slice(1);
  return (
    <span className="inline-flex flex-wrap items-center gap-1 text-[11px] text-ink-muted">
      <Badge tone="info">{label}</Badge>
      {typeof info.latency_ms === 'number' ? (
        <span>
          {t('ai.latency')}: {info.latency_ms}ms
        </span>
      ) : null}
      {info.fallback_reason ? (
        <span>
          {t('ai.fallback')}: {info.fallback_reason}
        </span>
      ) : null}
    </span>
  );
}

function ProvChips({
  rule,
  ml,
  ai,
  t,
}: {
  rule?: boolean;
  ml?: boolean;
  ai?: boolean;
  t: (k: string) => string;
}) {
  return (
    <span className="inline-flex flex-wrap gap-1">
      {rule ? <Badge tone="primary">{t('ai.provenanceRule')}</Badge> : null}
      {ml ? <Badge tone="info">{t('ai.provenanceMl')}</Badge> : null}
      {ai ? <Badge tone="accent">{t('ai.provenanceAi')}</Badge> : null}
    </span>
  );
}

export function AiInsightsCard({
  online,
  result,
  mode,
  summary,
  summaryMeta,
}: {
  online: boolean;
  result: DecisionResult;
  mode: AiMode;
  summary: string | null;
  summaryMeta: ProviderInfo | null;
}) {
  const { t } = useTranslation();
  const score = result.severe_risk;
  const pct = score != null ? Math.round(Math.min(1, Math.max(0, score)) * 100) : null;
  const factors = (result.shap_factors || []).slice(0, 3);

  if (!online) {
    return (
      <Card className="mt-4" aria-label={t('ai.insightsTitle')}>
        <p className="text-sm text-ink-muted">{t('ai.insightsOffline')}</p>
        <p className="mt-2 text-[11px] text-ink-muted">{t('ai.syntheticMetrics')}</p>
      </Card>
    );
  }

  if (mode === 'rules') return null;

  return (
    <Card className="mt-4 border-2 border-info/30" aria-label={t('ai.insightsTitle')}>
      <div className="flex flex-wrap items-center gap-2">
        <Gauge className="h-5 w-5 text-info" aria-hidden />
        <h3 className="font-semibold">{t('ai.insightsTitle')}</h3>
        <ProvChips rule ml={Boolean(result.ml_escalated || score != null)} ai t={t} />
      </div>
      <p className="mt-1 text-[11px] text-ink-muted">{t('ai.syntheticMetrics')}</p>
      <div className="mt-3">
        <div className="mb-1 flex justify-between text-xs">
          <span>
            {t('ai.riskScore')} <ProvChips ml t={t} />
          </span>
          <span className="font-mono">{pct != null ? `${pct}%` : '—'}</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-surface-muted" role="meter" aria-valuenow={pct ?? 0} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-full rounded-full bg-info transition-all" style={{ width: `${pct ?? 0}%` }} />
        </div>
      </div>
      {factors.length ? (
        <ul className="mt-3 space-y-1 text-sm">
          <li className="text-xs font-semibold uppercase text-ink-muted">
            {t('ai.topFactors')} <ProvChips ml t={t} />
          </li>
          {factors.map((f) => (
            <li key={f} className="flex items-start gap-2">
              <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-info" aria-hidden />
              <span>{f}</span>
            </li>
          ))}
        </ul>
      ) : null}
      {summary ? (
        <div className="mt-4 rounded-control bg-surface-muted p-3">
          <p className="text-xs font-semibold uppercase text-ink-muted">
            {t('ai.summaryTitle')} <ProvChips ai t={t} />
          </p>
          <p className="mt-1 text-sm leading-relaxed">{summary}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge tone="warning">{t('ai.summaryLabel')}</Badge>
            <Badge tone="warning">{t('ai.needsNativeReview')}</Badge>
          </div>
          <div className="mt-2">
            <ProvBadge info={summaryMeta} t={t} />
          </div>
        </div>
      ) : null}
      <div className="mt-3">
        <p className="text-xs font-semibold text-ink-muted">{t('ai.aiAdded')}</p>
        <ul className="mt-1 list-disc pl-5 text-sm text-ink-muted">
          {score != null ? <li>score={score.toFixed(2)}</li> : null}
          {factors.map((f) => (
            <li key={`a-${f}`}>{f}</li>
          ))}
          {summary ? <li>{t('ai.summaryTitle')}</li> : null}
          {result.ml_escalated ? <li>escalation</li> : null}
        </ul>
      </div>
    </Card>
  );
}

export function MlEscalateBanner({ result }: { result: DecisionResult }) {
  const { t } = useTranslation();
  if (!result.ml_escalated) return null;
  const thr = mlEscalateThreshold();
  const score = result.severe_risk != null ? result.severe_risk.toFixed(2) : '—';
  return (
    <div
      className="mt-3 rounded-card border border-warning/40 bg-warning-soft p-3 text-sm text-warning"
      role="status"
    >
      <p className="font-semibold">
        {t('ai.mlEscalateBanner', {
          rules: result.rules_decision.replace(/_/g, ' '),
          final: result.decision.replace(/_/g, ' '),
        })}
      </p>
      <p className="mt-1 text-xs">
        {t('ai.mlScoreThreshold', { score, threshold: thr })} · {t('ai.syntheticMetrics')}
      </p>
      <ProvChips rule ml t={t} />
    </div>
  );
}

export function AskAiPanel({
  online,
  input,
  result,
  language,
}: {
  online: boolean;
  input: TriageInput;
  result: DecisionResult;
  language: string;
}) {
  const { t } = useTranslation();
  const [q, setQ] = useState('');
  const [answer, setAnswer] = useState<string | null>(null);
  const [meta, setMeta] = useState<ProviderInfo | null>(null);
  const [busy, setBusy] = useState(false);

  const casePayload = {
    ...input,
    decision: result.decision,
    rules_decision: result.rules_decision,
    severe_risk: result.severe_risk,
    ml_score: result.severe_risk,
    ml_escalated: result.ml_escalated,
    shap_factors: result.shap_factors,
    top_factors: result.shap_factors?.slice(0, 3),
    triggered_rules: result.triggered_rules,
    language,
  };

  const ask = async (question: string) => {
    if (!online || !question.trim()) return;
    setBusy(true);
    setAnswer(null);
    try {
      const res = await api.aiAsk({ question, case: casePayload, language });
      const data = (res.data || {}) as { answer?: string };
      setAnswer(data.answer || '');
      setMeta({
        provider_used: String(res.provider_used || 'local'),
        latency_ms: Number(res.latency_ms || 0),
      });
    } catch {
      setAnswer(null);
    } finally {
      setBusy(false);
    }
  };

  if (!online) {
    return (
      <Card className="mt-4">
        <p className="text-sm text-ink-muted">{t('ai.askOffline')}</p>
      </Card>
    );
  }

  const chips = [
    { key: 'why', label: t('ai.askWhy') },
    { key: 'now', label: t('ai.askWhatNow') },
    { key: 'vomit', label: t('ai.askVomit') },
    { key: 'back', label: t('ai.askComeBack') },
  ];

  return (
    <Card className="mt-4" aria-label={t('ai.askTitle')}>
      <div className="flex items-center gap-2">
        <MessageSquare className="h-5 w-5 text-primary" aria-hidden />
        <h3 className="font-semibold">{t('ai.askTitle')}</h3>
        <ProvChips ai t={t} />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {chips.map((c) => (
          <Button key={c.key} size="sm" variant="outline" disabled={busy} onClick={() => void ask(c.label)}>
            {c.label}
          </Button>
        ))}
      </div>
      <div className="mt-3 flex gap-2">
        <input
          className="min-h-11 flex-1 rounded-control border border-border bg-surface px-3 text-sm"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t('ai.askPlaceholder')}
          aria-label={t('ai.askPlaceholder')}
        />
        <Button size="sm" disabled={busy || !q.trim()} onClick={() => void ask(q)}>
          {t('ai.askSubmit')}
        </Button>
      </div>
      <VoiceControls
        className="mt-2"
        phraseIds={['why_generic']}
        compact
        language={language.startsWith('rw') ? 'rw' : 'en'}
        onTranscriptConfirmed={({ transcript }) => {
          setQ(transcript);
          void ask(transcript);
        }}
      />
      {answer ? (
        <div className="mt-3 rounded-control bg-surface-muted p-3 text-sm">
          <p>{answer}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge tone="warning">{t('ai.verifyLabel')}</Badge>
            <ProvChips rule ai t={t} />
          </div>
          <div className="mt-1">
            <ProvBadge info={meta} t={t} />
          </div>
        </div>
      ) : null}
    </Card>
  );
}

type ConsultTurn = {
  agent: string;
  role: string;
  text: string;
  provider: string;
  latency_ms: number;
  provenance?: string[];
  rejected?: boolean;
};

export function AiConsultPanel({
  online,
  input,
  result,
  language,
}: {
  online: boolean;
  input: TriageInput;
  result: DecisionResult;
  language: string;
}) {
  const { t } = useTranslation();
  const [finalAnswer, setFinal] = useState<string | null>(null);
  const [turns, setTurns] = useState<ConsultTurn[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [follow, setFollow] = useState('');
  const [sessionId, setSessionId] = useState<string | undefined>();

  const casePayload = {
    ...input,
    decision: result.decision,
    rules_decision: result.rules_decision,
    severe_risk: result.severe_risk,
    ml_score: result.severe_risk,
    ml_escalated: result.ml_escalated,
    shap_factors: result.shap_factors,
    top_factors: result.shap_factors?.slice(0, 3),
    triggered_rules: result.triggered_rules,
    language,
  };

  const run = async (followUp?: string) => {
    if (!online) return;
    setBusy(true);
    try {
      const res = await api.aiConsult({
        case: casePayload,
        language,
        follow_up: followUp,
        session_id: followUp ? sessionId : undefined,
      });
      setFinal(String(res.final_answer || ''));
      setTurns((res.turns as ConsultTurn[]) || []);
      setSessionId(String(res.session_id || ''));
      setOpen(false);
    } catch {
      setFinal(null);
    } finally {
      setBusy(false);
    }
  };

  if (!online) {
    return (
      <Card className="mt-4">
        <p className="text-sm text-ink-muted">{t('ai.consultOffline')}</p>
        <p className="mt-2 text-sm">
          {t('ai.verifyLabel')}: {result.decision.replace(/_/g, ' ')}
        </p>
      </Card>
    );
  }

  return (
    <Card className="mt-4 border border-accent/30" aria-label={t('ai.consultTitle')}>
      <Button
        className="w-full"
        variant="secondary"
        leftIcon={<Bot className="h-4 w-4" />}
        disabled={busy}
        onClick={() => void run()}
      >
        {busy ? t('ai.consultRunning') : t('ai.consultButton')}
      </Button>
      {finalAnswer ? (
        <div className="mt-3 rounded-card bg-[var(--color-accent-soft)] p-4 ring-2 ring-accent/40">
          <p className="text-xs font-semibold uppercase tracking-wide text-accent">{t('ai.consultFinal')}</p>
          <p className="mt-2 text-sm font-medium leading-relaxed">{finalAnswer}</p>
          <Badge tone="warning" className="mt-2">
            {t('ai.verifyLabel')}
          </Badge>
        </div>
      ) : null}
      {turns.length ? (
        <div className="mt-3">
          <button
            type="button"
            className="flex w-full items-center justify-between text-sm font-semibold"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
          >
            {open ? t('ai.consultCollapse') : t('ai.consultExpand')}
            {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          {open ? (
            <ul className="mt-2 space-y-2">
              {turns.map((turn, i) => (
                <li key={`${turn.agent}-${i}`} className="rounded-control border border-border p-3 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{turn.role}</span>
                    <ProvChips ai rule={turn.agent === 'guideline'} ml={turn.agent === 'triage'} t={t} />
                    <ProvBadge
                      info={{ provider_used: turn.provider, latency_ms: turn.latency_ms }}
                      t={t}
                    />
                  </div>
                  <p className="mt-1">{turn.text}</p>
                </li>
              ))}
            </ul>
          ) : null}
          <div className="mt-3 flex gap-2">
            <input
              className="min-h-11 flex-1 rounded-control border border-border px-3 text-sm"
              value={follow}
              onChange={(e) => setFollow(e.target.value)}
              placeholder={t('ai.consultFollowPlaceholder')}
              aria-label={t('ai.consultFollowUp')}
            />
            <Button
              size="sm"
              disabled={busy || !follow.trim()}
              onClick={() => {
                const f = follow;
                setFollow('');
                void run(f);
              }}
            >
              {t('ai.consultFollowUp')}
            </Button>
          </div>
        </div>
      ) : null}
    </Card>
  );
}

export function AiModeToggle({
  mode,
  onChange,
}: {
  mode: AiMode;
  onChange: (m: AiMode) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="mt-3 flex rounded-full bg-surface-muted p-1 text-sm" role="group" aria-label="AI mode">
      <button
        type="button"
        className={cn(
          'flex-1 rounded-full px-3 py-2 font-semibold',
          mode === 'rules' ? 'bg-surface shadow-card text-ink' : 'text-ink-muted',
        )}
        onClick={() => onChange('rules')}
      >
        {t('ai.modeRulesOnly')}
      </button>
      <button
        type="button"
        className={cn(
          'flex-1 rounded-full px-3 py-2 font-semibold',
          mode === 'rules_ai' ? 'bg-surface shadow-card text-ink' : 'text-ink-muted',
        )}
        onClick={() => onChange('rules_ai')}
      >
        {t('ai.modeRulesAi')}
      </button>
    </div>
  );
}

/** Prefetch visit summary when online. */
export function useVisitSummary(
  online: boolean,
  input: TriageInput | null,
  result: DecisionResult | null,
  language: string,
) {
  const [summary, setSummary] = useState<string | null>(null);
  const [meta, setMeta] = useState<ProviderInfo | null>(null);

  useEffect(() => {
    if (!online || !input || !result) return;
    let cancelled = false;
    void api
      .aiVisitSummary({
        answers: input as unknown as Record<string, unknown>,
        decision: result.decision,
        rules_decision: result.rules_decision,
        reasons: result.reasons,
        triggered_rules: result.triggered_rules,
        shap_factors: result.shap_factors,
        severe_risk: result.severe_risk,
        ml_escalated: result.ml_escalated,
        language,
      })
      .then((res) => {
        if (cancelled) return;
        const data = (res.data || {}) as { summary?: string };
        setSummary(data.summary || null);
        setMeta({
          provider_used: String(res.provider_used || 'local'),
          latency_ms: Number(res.latency_ms || 0),
          fallback_reason: res.fallback_reason ? String(res.fallback_reason) : null,
        });
        try {
          const raw = sessionStorage.getItem('zm_last_triage');
          if (!raw) return;
          const parsed = JSON.parse(raw);
          parsed.ai_visit_summary = data.summary;
          sessionStorage.setItem('zm_last_triage', JSON.stringify(parsed));
        } catch {
          /* ignore */
        }
      })
      .catch(() => {
        if (!cancelled) setSummary(null);
      });
    return () => {
      cancelled = true;
    };
  }, [online, input, result, language]);

  return { summary, meta };
}
