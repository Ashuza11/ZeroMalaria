import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Minus, Plus } from 'lucide-react';
import { Orb } from '../components/liquid/alive';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { z } from 'zod';
import { api } from '../api/client';
import { ChwShell, WebShell } from '../components/shells';
import { ConversationBar } from '../components/voice/ConversationBar';
import { VoiceControls } from '../components/voice/VoiceControls';
import { Badge, Button, Card, Input, ProgressBar, SegmentedControl, StepperLayout } from '../components/ui';
import { type PhraseId, type VoiceLang, getPhrase } from '../voice/phrases';
import { dialogueStepIndex } from '../voice/dialogue';
import { useConversation } from '../voice/ConversationContext';
import { useVoice, type VoiceIntents } from '../voice/VoiceContext';
import { DEMO_CASE_A, DEMO_CASE_B } from '../demo/scenario';
import { localDecide } from '../rules/engine';
import type { TriageInput } from '../types';
import { cn } from '../lib/cn';
import { easeOut, slideInRight } from '../lib/motion';

const empty: TriageInput = {
  age_months: 36,
  sex: 'female',
  temperature_c: 38.5,
  fever_days: 2,
  convulsions: false,
  unable_to_drink: false,
  vomiting_everything: false,
  lethargy: false,
  severe_breathing_difficulty: false,
  tdr_result: 'positive',
};

type Step =
  | 'age'
  | 'sex'
  | 'temperature'
  | 'feverDays'
  | 'convulsions'
  | 'unable_to_drink'
  | 'vomiting_everything'
  | 'lethargy'
  | 'breathing'
  | 'tdr'
  | 'freetext';

const STEPS: Step[] = [
  'age',
  'sex',
  'temperature',
  'feverDays',
  'convulsions',
  'unable_to_drink',
  'vomiting_everything',
  'lethargy',
  'breathing',
  'tdr',
  'freetext',
];

const STEP_PHRASE: Partial<Record<Step, PhraseId>> = {
  age: 'age',
  sex: 'sex',
  temperature: 'temperature',
  feverDays: 'fever_days',
  convulsions: 'convulsions',
  unable_to_drink: 'unable_to_drink',
  vomiting_everything: 'vomiting_everything',
  lethargy: 'lethargy',
  breathing: 'severe_breathing_difficulty',
  tdr: 'tdr',
};

const STEP_HELP: Partial<Record<Step, PhraseId>> = {
  age: 'help_age',
  sex: 'help_sex',
  temperature: 'help_temperature',
  feverDays: 'help_fever_days',
  convulsions: 'help_convulsions',
  unable_to_drink: 'help_unable_to_drink',
  vomiting_everything: 'help_vomiting_everything',
  lethargy: 'help_lethargy',
  breathing: 'help_severe_breathing_difficulty',
  tdr: 'help_tdr',
  freetext: 'help_freetext',
};

const tempSchema = z.number().min(30).max(45);

const AGE_CHIPS = [6, 12, 24, 36, 48, 59] as const;

function useDesktopTriageLayout() {
  const location = useLocation();
  const [wide, setWide] = useState(() => typeof window !== 'undefined' && window.innerWidth >= 1024);
  useEffect(() => {
    const onResize = () => setWide(window.innerWidth >= 1024);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return wide || location.pathname.startsWith('/app');
}

function stepLabel(step: Step, t: (k: string) => string): string {
  const map: Record<Step, string> = {
    age: t('triage.age'),
    sex: t('triage.sex'),
    temperature: t('triage.temperature'),
    feverDays: t('triage.feverDays'),
    convulsions: t('triage.convulsions'),
    unable_to_drink: t('triage.unableToDrink'),
    vomiting_everything: t('triage.vomitingEverything'),
    lethargy: t('triage.lethargy'),
    breathing: t('triage.breathing'),
    tdr: t('triage.tdr'),
    freetext: t('triage.freeText'),
  };
  return map[step];
}

export function TriagePage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const demo = params.get('demo');
  const reduce = useReducedMotion();
  const desktop = useDesktopTriageLayout();
  const voice = useVoice();
  const conversation = useConversation();
  const voiceGuide = params.get('voiceGuide') === '1';
  const voiceGuideStarted = useRef(false);

  const initial = useMemo(() => {
    if (demo === 'A') return { ...DEMO_CASE_A };
    if (demo === 'B') return { ...DEMO_CASE_B };
    return { ...empty };
  }, [demo]);

  const [form, setForm] = useState<TriageInput>(initial);
  const [stepIndex, setStepIndex] = useState(0);
  const [freeText, setFreeText] = useState('');
  const [aiSuggested, setAiSuggested] = useState<Partial<TriageInput> | null>(null);
  const [aiExtractUsed, setAiExtractUsed] = useState(false);
  const [ageUnit, setAgeUnit] = useState<'months' | 'years'>('months');
  const [tempError, setTempError] = useState<string | null>(null);
  const spokeStep = useRef<number>(-1);

  const lang: VoiceLang = i18n.language.startsWith('rw') ? 'rw' : 'en';
  const step = STEPS[stepIndex];
  const progress = ((stepIndex + 1) / STEPS.length) * 100;
  const resultPath = location.pathname.startsWith('/app') ? '/app/result' : '/m/result';
  const phraseId = STEP_PHRASE[step];
  const helpId = STEP_HELP[step];

  useEffect(() => {
    if (conversation.active || !voice.unlocked || !phraseId || step === 'freetext' || spokeStep.current === stepIndex)
      return;
    spokeStep.current = stepIndex;
    void voice.play([phraseId]);
  }, [step, stepIndex, phraseId, voice, voice.unlocked, conversation.active]);

  const runGuidedTriage = useCallback(() => {
    voice.unlock();
    void conversation.startGuidedTriage(form, {
      onNode: (nodeId) => {
        const idx = dialogueStepIndex(nodeId);
        if (idx >= 0) setStepIndex(idx);
      },
      onPatch: (patch) => setForm((f) => ({ ...f, ...patch })),
      onComplete: (completed) => {
        setForm(completed);
        const result = localDecide(completed, lang);
        sessionStorage.setItem(
          'zm_last_triage',
          JSON.stringify({ input: completed, result, demo, ai_extract_used: aiExtractUsed }),
        );
        navigate(resultPath);
      },
    });
  }, [aiExtractUsed, conversation, demo, form, lang, navigate, resultPath, voice]);

  useEffect(() => {
    if (!voiceGuide || voiceGuideStarted.current) return;
    voiceGuideStarted.current = true;
    runGuidedTriage();
  }, [voiceGuide, runGuidedTriage]);

  const applyVoiceIntents = useCallback(
    (intents: VoiceIntents) => {
      if (step === 'age' && intents.number !== undefined) {
        const months = ageUnit === 'years' ? Math.round(intents.number * 12) : Math.round(intents.number);
        setForm((f) => ({ ...f, age_months: Math.max(0, months) }));
      }
      if (step === 'temperature' && intents.number !== undefined) {
        setForm((f) => ({ ...f, temperature_c: intents.number! }));
      }
      if (step === 'feverDays' && intents.number !== undefined) {
        setForm((f) => ({ ...f, fever_days: Math.max(0, Math.round(intents.number!)) }));
      }
      if (step === 'sex') {
        if (intents.yes && !intents.no) setForm((f) => ({ ...f, sex: 'female' }));
      }
      const boolSteps = ['convulsions', 'unable_to_drink', 'vomiting_everything', 'lethargy', 'breathing'] as const;
      if ((boolSteps as readonly string[]).includes(step)) {
        if (intents.yes) setForm((f) => ({ ...f, [step]: true }));
        if (intents.no) setForm((f) => ({ ...f, [step]: false }));
      }
      if (step === 'breathing') {
        if (intents.yes) setForm((f) => ({ ...f, severe_breathing_difficulty: true }));
        if (intents.no) setForm((f) => ({ ...f, severe_breathing_difficulty: false }));
      }
      if (step === 'tdr') {
        if (intents.positive) setForm((f) => ({ ...f, tdr_result: 'positive' }));
        if (intents.negative) setForm((f) => ({ ...f, tdr_result: 'negative' }));
        if (intents.invalid) setForm((f) => ({ ...f, tdr_result: 'invalid' }));
      }
    },
    [ageUnit, step],
  );

  useEffect(() => {
    if (!desktop) return;
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k !== 'y' && k !== 'n') return;
      const boolSteps = ['convulsions', 'unable_to_drink', 'vomiting_everything', 'lethargy', 'breathing'] as const;
      if (!(boolSteps as readonly string[]).includes(step as (typeof boolSteps)[number])) return;
      e.preventDefault();
      if (step === 'breathing') {
        setForm((f) => ({ ...f, severe_breathing_difficulty: k === 'y' }));
      } else {
        setForm((f) => ({ ...f, [step]: k === 'y' }));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [desktop, step]);

  const finish = () => {
    if (aiSuggested) return;
    const result = localDecide(form, lang);
    sessionStorage.setItem(
      'zm_last_triage',
      JSON.stringify({ input: form, result, demo, ai_extract_used: aiExtractUsed }),
    );
    navigate(resultPath);
  };

  const validateStep = (): boolean => {
    if (step === 'temperature') {
      const parsed = tempSchema.safeParse(form.temperature_c);
      if (!parsed.success) {
        setTempError(t('triage.tempInvalid'));
        return false;
      }
      setTempError(null);
    }
    return true;
  };

  const next = () => {
    if (!validateStep()) return;
    if (stepIndex < STEPS.length - 1) setStepIndex((i) => i + 1);
    else finish();
  };

  const buildSuggestion = (s: Record<string, unknown>): Partial<TriageInput> => {
    const out: Partial<TriageInput> = {};
    if ('convulsions' in s) out.convulsions = Boolean(s.convulsions);
    if ('unable_to_drink' in s) out.unable_to_drink = Boolean(s.unable_to_drink);
    if ('vomiting_everything' in s) out.vomiting_everything = Boolean(s.vomiting_everything);
    if ('lethargy' in s) out.lethargy = Boolean(s.lethargy);
    if ('severe_breathing_difficulty' in s) {
      out.severe_breathing_difficulty = Boolean(s.severe_breathing_difficulty);
    }
    if (typeof s.temperature_c === 'number') out.temperature_c = s.temperature_c;
    if (typeof s.age_months === 'number') out.age_months = s.age_months;
    return out;
  };

  const extract = async () => {
    try {
      const data = (await api.extract(freeText, i18n.language)) as {
        suggested_fields?: Record<string, unknown>;
      };
      const s = data.suggested_fields || {};
      const suggestion = buildSuggestion(s);
      if (Object.keys(suggestion).length) {
        setAiSuggested(suggestion);
        setAiExtractUsed(true);
      }
    } catch {
      const lower = freeText.toLowerCase();
      const suggestion: Partial<TriageInput> = {};
      if (/gusetsa|convuls|fits/.test(lower)) suggestion.convulsions = true;
      if (/kunywa|drink/.test(lower)) suggestion.unable_to_drink = true;
      if (/araruka|vomit/.test(lower)) suggestion.vomiting_everything = true;
      if (/intege|letharg|unconscious/.test(lower)) suggestion.lethargy = true;
      if (/uruhuha|breath/.test(lower)) suggestion.severe_breathing_difficulty = true;
      if (Object.keys(suggestion).length) {
        setAiSuggested(suggestion);
        setAiExtractUsed(true);
      }
    }
  };

  const applyAiSuggestion = () => {
    if (!aiSuggested) return;
    setForm((f) => ({ ...f, ...aiSuggested }));
    setAiSuggested(null);
  };

  const summaryRows = useMemo(
    () => [
      { label: t('triage.age'), value: `${form.age_months} ${t('triage.monthsShort')}` },
      { label: t('triage.sex'), value: form.sex === 'female' ? t('triage.female') : t('triage.male') },
      { label: t('triage.temperature'), value: `${form.temperature_c}°C` },
      { label: t('triage.feverDays'), value: String(form.fever_days) },
      { label: t('triage.convulsions'), value: form.convulsions ? t('triage.yes') : t('triage.no') },
      { label: t('triage.unableToDrink'), value: form.unable_to_drink ? t('triage.yes') : t('triage.no') },
      {
        label: t('triage.vomitingEverything'),
        value: form.vomiting_everything ? t('triage.yes') : t('triage.no'),
      },
      { label: t('triage.lethargy'), value: form.lethargy ? t('triage.yes') : t('triage.no') },
      { label: t('triage.breathing'), value: form.severe_breathing_difficulty ? t('triage.yes') : t('triage.no') },
      { label: t('triage.tdr'), value: t(`triage.${form.tdr_result}`) },
    ],
    [form, t],
  );

  const stepperItems = STEPS.map((s) => ({ id: s, label: stepLabel(s, t) }));

  const voiceBar = phraseId ? (
    <VoiceControls
      phraseIds={[phraseId]}
      helpPhraseId={helpId}
      showLabels={desktop}
      onTranscriptConfirmed={({ intents }) => applyVoiceIntents(intents)}
    />
  ) : null;

  const iconFor = (s: Step) => {
    // Living orb marker per question: danger signs glow red, fever amber, others ocean/teal.
    const danger: Step[] = ['convulsions', 'unable_to_drink', 'vomiting_everything', 'lethargy', 'breathing'];
    const tone = danger.includes(s) ? 'danger' : s === 'temperature' || s === 'feverDays' ? 'amber' : s === 'tdr' ? 'teal' : 'ocean';
    return <Orb size={52} tone={tone} delay={STEPS.indexOf(s)} />;
  };

  const questionBody = (
    <>
      {voiceBar}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          variants={reduce ? undefined : slideInRight}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={easeOut}
          className="mt-4"
        >
          <Card className={cn('p-5', desktop ? 'min-h-[360px]' : 'min-h-[300px]')}>
            <div className="mb-4">{iconFor(step)}</div>

            {step === 'age' && (
              <>
                <label className="text-xl font-semibold">{t('triage.age')}</label>
                <SegmentedControl
                  className="mt-3"
                  value={ageUnit}
                  onChange={(v) => setAgeUnit(v as 'months' | 'years')}
                  options={[
                    { value: 'months', label: t('triage.monthsToggle') },
                    { value: 'years', label: t('triage.yearsToggle') },
                  ]}
                />
                <div className="mt-4 flex items-center justify-center gap-4">
                  <Button
                    size="lg"
                    variant="secondary"
                    aria-label={t('triage.decrease')}
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        age_months: Math.max(0, f.age_months - (ageUnit === 'years' ? 12 : 1)),
                      }))
                    }
                  >
                    <Minus className="h-6 w-6" />
                  </Button>
                  <span className="min-w-[4rem] text-center text-3xl font-bold tabular-nums">
                    {ageUnit === 'years' ? (form.age_months / 12).toFixed(1) : form.age_months}
                  </span>
                  <Button
                    size="lg"
                    variant="secondary"
                    aria-label={t('triage.increase')}
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        age_months: f.age_months + (ageUnit === 'years' ? 12 : 1),
                      }))
                    }
                  >
                    <Plus className="h-6 w-6" />
                  </Button>
                </div>
                <p className="mt-2 text-center text-sm text-ink-muted">
                  {t('triage.ageYearsMonths', {
                    years: (form.age_months / 12).toFixed(1),
                    months: form.age_months,
                  })}
                </p>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  {AGE_CHIPS.map((m) => (
                    <Button
                      key={m}
                      size="sm"
                      variant={form.age_months === m ? 'primary' : 'outline'}
                      onClick={() => setForm((f) => ({ ...f, age_months: m }))}
                    >
                      {m}
                    </Button>
                  ))}
                </div>
              </>
            )}
            {step === 'sex' && (
              <>
                <p className="text-xl font-semibold">{t('triage.sex')}</p>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  {(['female', 'male'] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      className={cn(
                        'rounded-card border-2 p-6 text-lg font-semibold transition',
                        form.sex === s ? 'border-primary bg-primary-soft' : 'border-border bg-surface',
                      )}
                      onClick={() => setForm({ ...form, sex: s })}
                    >
                      {s === 'female' ? t('triage.female') : t('triage.male')}
                    </button>
                  ))}
                </div>
              </>
            )}
            {step === 'temperature' && (
              <>
                <label className="text-xl font-semibold">{t('triage.temperature')}</label>
                <div className="mt-4 flex items-center justify-center gap-4">
                  <Button
                    size="lg"
                    variant="secondary"
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        temperature_c: Math.round((f.temperature_c - 0.1) * 10) / 10,
                      }))
                    }
                  >
                    <Minus className="h-6 w-6" />
                  </Button>
                  <span className="text-3xl font-bold tabular-nums">{form.temperature_c.toFixed(1)}</span>
                  <Button
                    size="lg"
                    variant="secondary"
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        temperature_c: Math.round((f.temperature_c + 0.1) * 10) / 10,
                      }))
                    }
                  >
                    <Plus className="h-6 w-6" />
                  </Button>
                </div>
                {tempError ? <p className="mt-2 text-sm text-danger">{tempError}</p> : null}
              </>
            )}
            {step === 'feverDays' && (
              <>
                <label className="text-xl font-semibold">{t('triage.feverDays')}</label>
                <Input
                  type="number"
                  min={0}
                  className="mt-4 text-2xl"
                  value={form.fever_days}
                  onChange={(e) => setForm({ ...form, fever_days: Number(e.target.value) })}
                />
              </>
            )}
            {(['convulsions', 'unable_to_drink', 'vomiting_everything', 'lethargy'] as const).includes(step as any) && (
              <>
                <p className="text-xl font-semibold">
                  {step === 'convulsions' && t('triage.convulsions')}
                  {step === 'unable_to_drink' && t('triage.unableToDrink')}
                  {step === 'vomiting_everything' && t('triage.vomitingEverything')}
                  {step === 'lethargy' && t('triage.lethargy')}
                </p>
                <YesNoCards
                  desktop={desktop}
                  value={form[step] ? 'yes' : 'no'}
                  onChange={(v) => setForm({ ...form, [step]: v === 'yes' })}
                  yesLabel={t('triage.yes')}
                  noLabel={t('triage.no')}
                />
              </>
            )}
            {step === 'breathing' && (
              <>
                <p className="text-xl font-semibold">{t('triage.breathing')}</p>
                <YesNoCards
                  desktop={desktop}
                  value={form.severe_breathing_difficulty ? 'yes' : 'no'}
                  onChange={(v) => setForm({ ...form, severe_breathing_difficulty: v === 'yes' })}
                  yesLabel={t('triage.yes')}
                  noLabel={t('triage.no')}
                />
              </>
            )}
            {step === 'tdr' && (
              <>
                <p className="text-xl font-semibold">{t('triage.tdr')}</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  {(['positive', 'negative', 'invalid'] as const).map((v) => (
                    <button
                      key={v}
                      type="button"
                      className={cn(
                        'rounded-card border-2 p-5 text-base font-semibold',
                        form.tdr_result === v ? 'border-primary bg-primary-soft' : 'border-border',
                      )}
                      onClick={() => setForm({ ...form, tdr_result: v })}
                    >
                      {t(`triage.${v}`)}
                    </button>
                  ))}
                </div>
              </>
            )}
            {step === 'freetext' && (
              <>
                <p className="text-xl font-semibold">{t('triage.freeText')}</p>
                <p className="mt-1 text-sm text-ink-muted">{t('triage.freeTextHint')}</p>
                {aiSuggested ? (
                  <div className="mt-3 rounded-control border border-warning/40 bg-warning-soft p-3">
                    <Badge tone="warning">{t('triage.aiVerifyBadge')}</Badge>
                    <ul className="mt-2 space-y-1 text-sm">
                      {Object.entries(aiSuggested).map(([k, v]) => (
                        <li key={k}>
                          <span className="font-mono text-xs text-ink-muted">{k}</span>:{' '}
                          <span className="font-semibold">{String(v)}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <Button variant="secondary" onClick={applyAiSuggestion}>
                        {t('triage.aiApply')}
                      </Button>
                      <Button variant="ghost" onClick={() => setAiSuggested(null)}>
                        {t('common.cancel')}
                      </Button>
                    </div>
                  </div>
                ) : null}
                <textarea
                  className="mt-3 min-h-28 w-full rounded-control border border-border bg-surface p-3 text-base"
                  value={freeText}
                  onChange={(e) => setFreeText(e.target.value)}
                />
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Button variant="secondary" onClick={() => void extract()}>
                    {t('triage.extract')}
                  </Button>
                </div>
              </>
            )}
          </Card>
        </motion.div>
      </AnimatePresence>

      <div className="mt-4 flex gap-3">
        <Button
          variant="secondary"
          className="flex-1"
          onClick={() =>
            stepIndex === 0
              ? navigate(location.pathname.startsWith('/app') ? '/app/home' : '/m/home')
              : setStepIndex((i) => i - 1)
          }
        >
          {t('common.back')}
        </Button>
        <Button className="flex-[2]" onClick={next} disabled={step === 'freetext' && Boolean(aiSuggested)}>
          {stepIndex === STEPS.length - 1 ? t('common.confirm') : t('common.continue')}
        </Button>
      </div>
    </>
  );

  const helpPanel = helpId ? (
    <Card className="p-4">
      <h3 className="text-sm font-semibold">{t('triage.whyMatters')}</h3>
      <p className="mt-2 text-sm leading-relaxed text-ink-muted">{getPhrase(helpId, lang)}</p>
    </Card>
  ) : null;

  const summaryPanel = (
    <Card className="p-4">
      <h3 className="text-sm font-semibold">{t('triage.liveSummary')}</h3>
      <ul className="mt-2 space-y-1 text-xs">
        {summaryRows.map((row) => (
          <li key={row.label} className="flex justify-between gap-2">
            <span className="text-ink-muted">{row.label}</span>
            <span className="font-semibold">{row.value}</span>
          </li>
        ))}
      </ul>
    </Card>
  );

  const progressBar = (
    <ProgressBar value={progress} label={t('triage.progress', { current: stepIndex + 1, total: STEPS.length })} />
  );

  if (desktop) {
    return (
      <WebShell title={t('triage.title')} crumbs={[t('nav.home'), t('triage.title')]}>
        <div className="mx-auto max-w-[1440px]">
          {progressBar}
          <StepperLayout
            steps={stepperItems}
            currentId={step}
            question={questionBody}
            help={helpPanel}
            summary={summaryPanel}
          />
          <ConversationBar onStart={runGuidedTriage} />
        </div>
      </WebShell>
    );
  }

  return (
    <ChwShell title={t('triage.title')}>
      {progressBar}
      {questionBody}
      <ConversationBar onStart={runGuidedTriage} />
    </ChwShell>
  );
}

function YesNoCards({
  value,
  onChange,
  yesLabel,
  noLabel,
  desktop,
}: {
  value: 'yes' | 'no';
  onChange: (v: 'yes' | 'no') => void;
  yesLabel: string;
  noLabel: string;
  desktop: boolean;
}) {
  return (
    <div className={cn('mt-4 grid grid-cols-2 gap-3', desktop && 'gap-4')}>
      {(['yes', 'no'] as const).map((v) => (
        <button
          key={v}
          type="button"
          className={cn(
            'rounded-card border-2 font-semibold transition',
            desktop ? 'min-h-[120px] text-xl' : 'min-h-[80px] text-lg',
            value === v ? 'border-primary bg-primary-soft' : 'border-border bg-surface',
          )}
          onClick={() => onChange(v)}
        >
          {v === 'yes' ? yesLabel : noLabel}
          {desktop ? <span className="mt-1 block text-xs font-normal text-ink-muted">{v === 'yes' ? 'Y' : 'N'}</span> : null}
        </button>
      ))}
    </div>
  );
}
