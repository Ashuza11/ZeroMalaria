import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Check, Minus, Plus } from 'lucide-react';
import { Orb } from '../components/liquid/alive';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { ChwShell } from '../components/shells';
import { VoiceControls } from '../components/voice/VoiceControls';
import { Button, Card, Input, ProgressBar, SegmentedControl } from '../components/ui';
import { type PhraseId, type VoiceLang } from '../voice/phrases';
import { useVoice, type VoiceIntents } from '../voice/VoiceContext';
import { clearTriageDraft, loadTriageDraft, saveTriageDraft } from '../db';
import { localDecide } from '../rules/engine';
import type { TriageInput } from '../types';
import { cn } from '../lib/cn';
import { stepCardTransition } from '../lib/motion';

/** Display defaults only. Not treated as answers until the user acts. */
const displayDefaults: TriageInput = {
  age_months: 12,
  sex: 'female',
  temperature_c: 37.0,
  fever_days: 1,
  convulsions: false,
  unable_to_drink: false,
  vomiting_everything: false,
  lethargy: false,
  severe_breathing_difficulty: false,
  tdr_result: 'negative',
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

const CHOICE_STEPS: Step[] = [
  'sex',
  'convulsions',
  'unable_to_drink',
  'vomiting_everything',
  'lethargy',
  'breathing',
  'tdr',
];

const STEPPER_STEPS: Step[] = ['age', 'temperature', 'feverDays'];

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
  freetext: 'other_symptoms',
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
const ADVANCE_MS = 250;

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
  const reduce = useReducedMotion();
  const voice = useVoice();
  const spokenStep = useRef<string | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const advanceTimer = useRef<number | null>(null);
  const hydrated = useRef(false);

  const [form, setForm] = useState<TriageInput>(displayDefaults);
  const [answered, setAnswered] = useState<Set<Step>>(new Set());
  const [stepIndex, setStepIndex] = useState(0);
  const [freeText, setFreeText] = useState('');
  const [ageUnit, setAgeUnit] = useState<'months' | 'years'>('months');
  const [tempError, setTempError] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState(() => new Date().toISOString());
  const [stepAnsweredAt, setStepAnsweredAt] = useState<Record<string, string>>({});
  const [draftReady, setDraftReady] = useState(false);

  const lang: VoiceLang = i18n.language.startsWith('rw') ? 'rw' : 'en';
  const step = STEPS[stepIndex];
  const progress = ((stepIndex + 1) / STEPS.length) * 100;
  const resultPath = location.pathname.startsWith('/app') ? '/app/result' : '/m/result';
  const phraseId = STEP_PHRASE[step];
  const helpId = STEP_HELP[step];
  const showContinue = STEPPER_STEPS.includes(step) || step === 'freetext';

  // Hydrate an unfinished assessment once.
  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;
    void (async () => {
      try {
        const draft = await loadTriageDraft();
        if (draft) {
          setForm(draft.form);
          setAnswered(new Set(draft.answered as Step[]));
          setStepIndex(Math.min(Math.max(0, draft.stepIndex), STEPS.length - 1));
          setAgeUnit(draft.ageUnit || 'months');
          setFreeText(draft.freeText || '');
          setStartedAt(draft.startedAt);
          setStepAnsweredAt(draft.stepAnsweredAt || {});
        }
      } catch {
        /* ignore corrupt draft */
      }
      setDraftReady(true);
    })();
  }, []);

  // Persist draft off the render path (fire-and-forget).
  useEffect(() => {
    if (!draftReady) return;
    const handle = window.setTimeout(() => {
      void saveTriageDraft({
        form,
        answered: Array.from(answered),
        stepIndex,
        ageUnit,
        freeText,
        startedAt,
        stepAnsweredAt,
      }).catch((err) => {
        if (import.meta.env.DEV) console.warn('[triage] draft save failed', err);
      });
    }, 0);
    return () => window.clearTimeout(handle);
  }, [answered, ageUnit, draftReady, form, freeText, startedAt, stepAnsweredAt, stepIndex]);

  // Once the CHW starts the assessment, Pindo reads every question automatically.
  useEffect(() => {
    if (!phraseId || !voice.unlocked || lang !== 'rw') return;
    const key = `${stepIndex}:${phraseId}:${lang}`;
    if (spokenStep.current === key) return;
    spokenStep.current = key;
    void voice.play([phraseId]);
  }, [lang, phraseId, stepIndex, voice]);

  // Perf log: step change → choices visible
  useEffect(() => {
    const label = `triage-step-${stepIndex}-choices`;
    console.time(label);
    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        console.timeEnd(label);
        cardRef.current?.setAttribute('data-choices-ready', '1');
        cardRef.current?.setAttribute('data-step', step);
      });
    });
    return () => cancelAnimationFrame(raf);
  }, [step, stepIndex]);

  useEffect(
    () => () => {
      if (advanceTimer.current) window.clearTimeout(advanceTimer.current);
    },
    [],
  );

  const markAnswered = useCallback((s: Step, patch?: Partial<TriageInput>) => {
    const at = new Date().toISOString();
    setAnswered((prev) => {
      const next = new Set(prev);
      next.add(s);
      // Invalidate later steps when an earlier answer changes
      const idx = STEPS.indexOf(s);
      for (let i = idx + 1; i < STEPS.length; i++) next.delete(STEPS[i]);
      return next;
    });
    setStepAnsweredAt((prev) => {
      const next = { ...prev, [s]: at };
      const idx = STEPS.indexOf(s);
      for (let i = idx + 1; i < STEPS.length; i++) delete next[STEPS[i]];
      return next;
    });
    if (patch) setForm((f) => ({ ...f, ...patch }));
  }, []);

  const goNext = useCallback(() => {
    setFlash(null);
    setLocked(false);
    // Stop any in-flight speech so it cannot re-render mid step swap.
    voice.stop();
    setStepIndex((i) => {
      if (i < STEPS.length - 1) return i + 1;
      return i;
    });
  }, [voice]);

  const selectChoice = useCallback(
    (s: Step, patch: Partial<TriageInput>, flashKey?: string) => {
      if (locked) return;
      // Gesture unlock only — never auto-play speech on step change.
      voice.unlock();
      setLocked(true);
      setFlash(flashKey || 'ok');
      markAnswered(s, patch);
      if (advanceTimer.current) window.clearTimeout(advanceTimer.current);
      // Advance immediately for choice steps so sex/yes-no appear without waiting on audio.
      const delay = CHOICE_STEPS.includes(s) || s === 'age' ? 0 : ADVANCE_MS;
      advanceTimer.current = window.setTimeout(() => {
        if (s === STEPS[STEPS.length - 1]) {
          setLocked(false);
          setFlash(null);
          return;
        }
        goNext();
      }, delay);
    },
    [goNext, locked, markAnswered, voice],
  );

  const finish = useCallback(async () => {
    const answeredFields = Array.from(answered).flatMap((s) => {
      if (s === 'feverDays') return ['fever_days'];
      if (s === 'breathing') return ['severe_breathing_difficulty'];
      if (s === 'tdr') return ['tdr_result'];
      if (s === 'temperature') return ['temperature_c'];
      if (s === 'age') return ['age_months'];
      if (s === 'freetext') return [];
      return [s];
    });
    // Deterministic RBC rules are the only source of the clinical decision.
    const result = localDecide(form, lang, answeredFields);
    const endedAt = new Date().toISOString();
    const durationMs = Date.now() - new Date(startedAt).getTime();
    // Timing kept local: TriageRequest schema has no started_at / answered_at / duration.
    sessionStorage.setItem(
      'zm_last_triage',
      JSON.stringify({
        input: form,
        result,
        free_text: freeText.trim(),
        answered_fields: answeredFields,
        timing: { started_at: startedAt, ended_at: endedAt, duration_ms: durationMs, step_answered_at: stepAnsweredAt },
      }),
    );
    await clearTriageDraft();
    navigate(resultPath);
  }, [answered, form, freeText, lang, navigate, resultPath, startedAt, stepAnsweredAt]);

  const applyVoiceIntents = useCallback(
    (intents: VoiceIntents) => {
      if (step === 'age' && intents.number !== undefined) {
        const unit = intents.ageUnit || ageUnit;
        const wholeAge = Math.max(0, Math.round(intents.number));
        const months = unit === 'years' ? wholeAge * 12 : wholeAge;
        setAgeUnit(unit);
        selectChoice('age', { age_months: Math.max(0, months) }, String(months));
      }
      if (step === 'temperature' && intents.number !== undefined) {
        selectChoice('temperature', { temperature_c: intents.number }, String(intents.number));
      }
      if (step === 'feverDays' && intents.number !== undefined) {
        selectChoice('feverDays', { fever_days: Math.max(0, Math.round(intents.number)) }, String(intents.number));
      }
      if (step === 'sex') {
        if (intents.yes && !intents.no) selectChoice('sex', { sex: 'female' }, 'female');
        if (intents.no && !intents.yes) selectChoice('sex', { sex: 'male' }, 'male');
      }
      const boolSteps = ['convulsions', 'unable_to_drink', 'vomiting_everything', 'lethargy'] as const;
      if ((boolSteps as readonly string[]).includes(step)) {
        if (intents.yes) selectChoice(step, { [step]: true } as Partial<TriageInput>, 'yes');
        if (intents.no) selectChoice(step, { [step]: false } as Partial<TriageInput>, 'no');
      }
      if (step === 'breathing') {
        if (intents.yes) selectChoice('breathing', { severe_breathing_difficulty: true }, 'yes');
        if (intents.no) selectChoice('breathing', { severe_breathing_difficulty: false }, 'no');
      }
      if (step === 'tdr') {
        if (intents.positive) selectChoice('tdr', { tdr_result: 'positive' }, 'positive');
        if (intents.negative) selectChoice('tdr', { tdr_result: 'negative' }, 'negative');
        if (intents.invalid) selectChoice('tdr', { tdr_result: 'invalid' }, 'invalid');
      }
    },
    [ageUnit, selectChoice, step],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (locked) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;

      if (CHOICE_STEPS.includes(step)) {
        if (step === 'sex') {
          if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'f') {
            e.preventDefault();
            selectChoice('sex', { sex: 'female' }, 'female');
          }
          if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'm') {
            e.preventDefault();
            selectChoice('sex', { sex: 'male' }, 'male');
          }
          return;
        }
        if (step === 'tdr') {
          if (e.key === '1' || e.key.toLowerCase() === 'p') {
            e.preventDefault();
            selectChoice('tdr', { tdr_result: 'positive' }, 'positive');
          }
          if (e.key === '2' || e.key.toLowerCase() === 'n') {
            e.preventDefault();
            selectChoice('tdr', { tdr_result: 'negative' }, 'negative');
          }
          if (e.key === '3' || e.key.toLowerCase() === 'i') {
            e.preventDefault();
            selectChoice('tdr', { tdr_result: 'invalid' }, 'invalid');
          }
          return;
        }
        const k = e.key.toLowerCase();
        if (k === 'y' || k === 'arrowleft') {
          e.preventDefault();
          if (step === 'breathing') selectChoice('breathing', { severe_breathing_difficulty: true }, 'yes');
          else selectChoice(step, { [step]: true } as Partial<TriageInput>, 'yes');
        }
        if (k === 'n' || k === 'arrowright') {
          e.preventDefault();
          if (step === 'breathing') selectChoice('breathing', { severe_breathing_difficulty: false }, 'no');
          else selectChoice(step, { [step]: false } as Partial<TriageInput>, 'no');
        }
      }

    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [locked, selectChoice, step]);

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

  const onContinue = useCallback(async () => {
    if (locked || !validateStep()) return;
    if (STEPPER_STEPS.includes(step)) {
      markAnswered(step);
    }
    if (stepIndex < STEPS.length - 1) {
      setLocked(true);
      goNext();
    } else {
      await finish();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finish, goNext, locked, markAnswered, step, stepIndex, form.temperature_c, t]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!showContinue || locked || e.key !== 'Enter') return;
      const target = e.target as HTMLElement | null;
      if (target && target.tagName === 'TEXTAREA') return;
      e.preventDefault();
      void onContinue();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [locked, onContinue, showContinue]);

  const voiceBar = phraseId ? (
    <VoiceControls
      phraseIds={[phraseId]}
      helpPhraseId={helpId}
      showLabels
      allowMic={step === 'freetext'}
      onTranscriptConfirmed={({ transcript, intents }) => {
        if (step === 'freetext') {
          setFreeText(transcript);
          markAnswered('freetext');
          return;
        }
        applyVoiceIntents(intents);
      }}
    />
  ) : null;

  const iconFor = (s: Step) => {
    const danger: Step[] = ['convulsions', 'unable_to_drink', 'vomiting_everything', 'lethargy', 'breathing'];
    const tone = danger.includes(s)
      ? 'danger'
      : s === 'temperature' || s === 'feverDays'
        ? 'amber'
        : s === 'tdr'
          ? 'teal'
          : 'ocean';
    return <Orb size={52} tone={tone} delay={STEPS.indexOf(s)} />;
  };

  const selectionFlash = (
    <AnimatePresence>
      {flash ? (
        <motion.span
          key={flash}
          initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="pointer-events-none absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full bg-success text-white shadow-card"
          aria-hidden
        >
          <Check className="h-5 w-5" strokeWidth={2.5} />
        </motion.span>
      ) : null}
    </AnimatePresence>
  );

  const questionBody = (
    <>
      {voiceBar}
      {/* No mode="wait": wait+exit left step 2 blank and threw deferred DOM Node errors. */}
      <motion.div
        key={step}
        initial={reduce ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={stepCardTransition}
        className="relative mt-4"
        style={{ filter: 'none' }}
      >
          <Card className="relative min-h-[300px] p-5">
            <div
              ref={cardRef}
              tabIndex={-1}
              className="outline-none"
              role="group"
              aria-label={stepLabel(step, t)}
              data-testid={`triage-step-${step}`}
            >
              {selectionFlash}
              <div className="mb-4">{iconFor(step)}</div>

              {step === 'age' && (
                <>
                  <label className="text-xl font-semibold">{t('triage.age')}</label>
                  <SegmentedControl
                    className="mt-3"
                    value={ageUnit}
                    onChange={(value) => {
                      const unit = value as 'months' | 'years';
                      if (unit === 'years') {
                        setForm((current) => ({
                          ...current,
                          age_months: Math.max(0, Math.round(current.age_months / 12)) * 12,
                        }));
                      }
                      setAgeUnit(unit);
                    }}
                    options={[
                      { value: 'months', label: t('triage.monthsToggle') },
                      { value: 'years', label: t('triage.yearsToggle') },
                    ]}
                  />
                  <div className="mt-5 grid grid-cols-[72px_1fr_72px] items-stretch gap-3">
                    <button
                      type="button"
                      aria-label={t('triage.decrease')}
                      disabled={locked || form.age_months === 0}
                      className="flex min-h-20 items-center justify-center rounded-card border-2 border-border bg-surface text-primary shadow-sm transition active:scale-95 disabled:opacity-40"
                      onClick={() =>
                        setForm((current) => ({
                          ...current,
                          age_months: Math.max(0, current.age_months - (ageUnit === 'years' ? 12 : 1)),
                        }))
                      }
                    >
                      <Minus aria-hidden className="h-9 w-9" strokeWidth={3} />
                    </button>
                    <div className="rounded-card border-2 border-primary bg-primary-soft px-2 py-2 text-center">
                      <Input
                        type="number"
                        min={0}
                        step={1}
                        inputMode="numeric"
                        aria-label={t('triage.age')}
                        className="min-h-12 border-0 bg-transparent p-0 text-center text-4xl font-bold shadow-none focus:ring-0"
                        value={ageUnit === 'years' ? Math.round(form.age_months / 12) : form.age_months}
                        disabled={locked}
                        onChange={(e) => {
                          const value = Math.max(0, Math.round(Number(e.target.value) || 0));
                          setForm((current) => ({
                            ...current,
                            age_months: ageUnit === 'years' ? Math.round(value * 12) : Math.round(value),
                          }));
                        }}
                      />
                      <span className="text-sm font-semibold text-ink-muted">
                        {ageUnit === 'years' ? t('triage.yearsToggle') : t('triage.monthsShort')}
                      </span>
                    </div>
                    <button
                      type="button"
                      aria-label={t('triage.increase')}
                      disabled={locked}
                      className="flex min-h-20 items-center justify-center rounded-card border-2 border-border bg-surface text-primary shadow-sm transition active:scale-95 disabled:opacity-40"
                      onClick={() =>
                        setForm((current) => ({
                          ...current,
                          age_months: current.age_months + (ageUnit === 'years' ? 12 : 1),
                        }))
                      }
                    >
                      <Plus aria-hidden className="h-9 w-9" strokeWidth={3} />
                    </button>
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
                        disabled={locked}
                        className={cn(
                          'rounded-card border-2 p-6 text-lg font-semibold transition',
                          answered.has('sex') && form.sex === s
                            ? 'border-primary bg-primary-soft'
                            : 'border-border bg-surface',
                        )}
                        onClick={() => selectChoice('sex', { sex: s }, s)}
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
                  <Input
                    type="number"
                    min={30}
                    max={45}
                    step={0.1}
                    inputMode="decimal"
                    className="mt-4 min-h-16 text-center text-3xl font-bold"
                    value={form.temperature_c}
                    disabled={locked}
                    onChange={(e) => setForm((current) => ({ ...current, temperature_c: Number(e.target.value) }))}
                  />
                  {tempError ? <p className="mt-2 text-sm text-danger">{tempError}</p> : null}
                </>
              )}

              {step === 'feverDays' && (
                <>
                  <label className="text-xl font-semibold">{t('triage.feverDays')}</label>
                  <Input
                    type="number"
                    min={0}
                    inputMode="numeric"
                    className="mt-4 min-h-16 text-center text-3xl font-bold"
                    value={form.fever_days}
                    disabled={locked}
                    onChange={(e) => setForm((current) => ({
                      ...current,
                      fever_days: Math.max(0, Math.round(Number(e.target.value) || 0)),
                    }))}
                  />
                </>
              )}

              {(['convulsions', 'unable_to_drink', 'vomiting_everything', 'lethargy'] as const).includes(
                step as 'convulsions',
              ) && (
                <>
                  <p className="text-xl font-semibold">
                    {step === 'convulsions' && t('triage.convulsions')}
                    {step === 'unable_to_drink' && t('triage.unableToDrink')}
                    {step === 'vomiting_everything' && t('triage.vomitingEverything')}
                    {step === 'lethargy' && t('triage.lethargy')}
                  </p>
                  <YesNoCards
                    value={answered.has(step) ? (form[step as 'convulsions'] ? 'yes' : 'no') : null}
                    disabled={locked}
                    onChange={(v) =>
                      selectChoice(step, { [step]: v === 'yes' } as Partial<TriageInput>, v)
                    }
                    yesLabel={t('triage.yes')}
                    noLabel={t('triage.no')}
                  />
                </>
              )}

              {step === 'breathing' && (
                <>
                  <p className="text-xl font-semibold">{t('triage.breathing')}</p>
                  <YesNoCards
                    value={
                      answered.has('breathing') ? (form.severe_breathing_difficulty ? 'yes' : 'no') : null
                    }
                    disabled={locked}
                    onChange={(v) =>
                      selectChoice('breathing', { severe_breathing_difficulty: v === 'yes' }, v)
                    }
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
                        disabled={locked}
                        className={cn(
                          'rounded-card border-2 p-5 text-base font-semibold',
                          answered.has('tdr') && form.tdr_result === v
                            ? 'border-primary bg-primary-soft'
                            : 'border-border',
                        )}
                        onClick={() => selectChoice('tdr', { tdr_result: v }, v)}
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
                  <textarea
                    className="mt-3 min-h-28 w-full rounded-control border border-border bg-surface p-3 text-base"
                    value={freeText}
                    onChange={(e) => {
                      setFreeText(e.target.value);
                      markAnswered('freetext');
                    }}
                  />
                </>
              )}
            </div>
          </Card>
        </motion.div>

      <div className="mt-4 flex gap-3">
        <Button
          variant="secondary"
          className="flex-1"
          disabled={locked}
          onClick={() =>
            stepIndex === 0
              ? navigate(location.pathname.startsWith('/app') ? '/app/home' : '/m/home')
              : setStepIndex((i) => i - 1)
          }
        >
          {t('common.back')}
        </Button>
        {showContinue ? (
          <Button
            className="flex-[2]"
            onClick={() => void onContinue()}
            disabled={locked}
          >
            {stepIndex === STEPS.length - 1 ? t('common.confirm') : t('common.continue')}
          </Button>
        ) : (
          <div className="flex-[2]" aria-hidden />
        )}
      </div>
    </>
  );

  const progressBar = (
    <div className="mb-3">
      <ProgressBar
        value={progress}
        label={t('triage.progress', { current: stepIndex + 1, total: STEPS.length })}
      />
    </div>
  );

  return (
    <ChwShell>
      <div className="relative mx-auto w-full max-w-2xl pb-4">
        {progressBar}
        {questionBody}
      </div>
    </ChwShell>
  );
}

function YesNoCards({
  value,
  onChange,
  yesLabel,
  noLabel,
  disabled,
}: {
  value: 'yes' | 'no' | null;
  onChange: (v: 'yes' | 'no') => void;
  yesLabel: string;
  noLabel: string;
  disabled?: boolean;
}) {
  return (
    <div className="mt-4 grid grid-cols-2 gap-3">
      {(['yes', 'no'] as const).map((v) => (
        <button
          key={v}
          type="button"
          disabled={disabled}
          className={cn(
            'min-h-[88px] rounded-card border-2 text-lg font-semibold transition',
            value === v ? 'border-primary bg-primary-soft' : 'border-border bg-surface',
          )}
          onClick={() => onChange(v)}
        >
          {v === 'yes' ? yesLabel : noLabel}
        </button>
      ))}
    </div>
  );
}
