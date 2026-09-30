import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Check, Minus, Plus } from 'lucide-react';
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
import { clearTriageDraft, loadTriageDraft, saveTriageDraft } from '../db';
import { localDecide } from '../rules/engine';
import type { TriageInput } from '../types';
import { cn } from '../lib/cn';
import { slideInRight, stepCardTransition } from '../lib/motion';

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
const AGE_CHIPS_MONTHS = [6, 12, 24, 36, 48, 59] as const;
const AGE_CHIPS_YEARS = [1, 2, 3, 4, 5] as const;
const TEMP_CHIPS = [36.5, 37.0, 37.5, 38.0, 38.5, 39.0, 40.0] as const;
const FEVER_CHIPS = [1, 2, 3, 5, 7] as const;

const ADVANCE_MS = 250;
const STEPPER_DEBOUNCE_MS = 800;

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

function formatElapsed(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function allAnsweredExceptFreeText(): Set<Step> {
  return new Set(STEPS.filter((s) => s !== 'freetext'));
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
  const cardRef = useRef<HTMLDivElement | null>(null);
  const advanceTimer = useRef<number | null>(null);
  const debounceTimer = useRef<number | null>(null);
  const hydrated = useRef(false);

  const [form, setForm] = useState<TriageInput>(displayDefaults);
  const [answered, setAnswered] = useState<Set<Step>>(new Set());
  const [stepIndex, setStepIndex] = useState(0);
  const [freeText, setFreeText] = useState('');
  const [aiSuggested, setAiSuggested] = useState<Partial<TriageInput> | null>(null);
  const [aiExtractUsed, setAiExtractUsed] = useState(false);
  const [ageUnit, setAgeUnit] = useState<'months' | 'years'>('months');
  const [tempError, setTempError] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState(() => new Date().toISOString());
  const [stepAnsweredAt, setStepAnsweredAt] = useState<Record<string, string>>({});
  const [elapsedMs, setElapsedMs] = useState(0);
  const [draftReady, setDraftReady] = useState(false);
  const spokeStep = useRef<number>(-1);

  const lang: VoiceLang = i18n.language.startsWith('rw') ? 'rw' : 'en';
  const step = STEPS[stepIndex];
  const progress = ((stepIndex + 1) / STEPS.length) * 100;
  const resultPath = location.pathname.startsWith('/app') ? '/app/result' : '/m/result';
  const phraseId = STEP_PHRASE[step];
  const helpId = STEP_HELP[step];
  const showContinue = STEPPER_STEPS.includes(step) || step === 'freetext';

  // Hydrate draft or demo seed once
  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;
    void (async () => {
      if (demo === 'A' || demo === 'B') {
        const seed = demo === 'A' ? DEMO_CASE_A : DEMO_CASE_B;
        setForm({ ...seed });
        setAnswered(allAnsweredExceptFreeText());
        setStartedAt(new Date().toISOString());
        setDraftReady(true);
        return;
      }
      try {
        const draft = await loadTriageDraft();
        if (draft) {
          setForm(draft.form);
          setAnswered(new Set(draft.answered as Step[]));
          setStepIndex(Math.min(Math.max(0, draft.stepIndex), STEPS.length - 1));
          setAgeUnit(draft.ageUnit);
          setFreeText(draft.freeText || '');
          setStartedAt(draft.startedAt);
          setStepAnsweredAt(draft.stepAnsweredAt || {});
        }
      } catch {
        /* ignore corrupt draft */
      }
      setDraftReady(true);
    })();
  }, [demo]);

  // Elapsed timer
  useEffect(() => {
    const id = window.setInterval(() => {
      setElapsedMs(Date.now() - new Date(startedAt).getTime());
    }, 1000);
    return () => window.clearInterval(id);
  }, [startedAt]);

  // Persist draft after every change
  useEffect(() => {
    if (!draftReady || demo) return;
    void saveTriageDraft({
      form,
      answered: Array.from(answered),
      stepIndex,
      ageUnit,
      freeText,
      startedAt,
      stepAnsweredAt,
    });
  }, [answered, ageUnit, demo, draftReady, form, freeText, startedAt, stepAnsweredAt, stepIndex]);

  useEffect(() => {
    if (conversation.active || !voice.unlocked || !phraseId || step === 'freetext' || spokeStep.current === stepIndex)
      return;
    spokeStep.current = stepIndex;
    void voice.play([phraseId]);
  }, [step, stepIndex, phraseId, voice, voice.unlocked, conversation.active]);

  // Focus new question card after step change
  useEffect(() => {
    const id = window.setTimeout(() => {
      cardRef.current?.focus({ preventScroll: true });
    }, ADVANCE_MS + 40);
    return () => window.clearTimeout(id);
  }, [stepIndex]);

  useEffect(
    () => () => {
      if (advanceTimer.current) window.clearTimeout(advanceTimer.current);
      if (debounceTimer.current) window.clearTimeout(debounceTimer.current);
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
    setStepIndex((i) => {
      if (i < STEPS.length - 1) return i + 1;
      return i;
    });
  }, []);

  const selectChoice = useCallback(
    (s: Step, patch: Partial<TriageInput>, flashKey?: string) => {
      if (locked) return;
      setLocked(true);
      setFlash(flashKey || 'ok');
      markAnswered(s, patch);
      if (advanceTimer.current) window.clearTimeout(advanceTimer.current);
      advanceTimer.current = window.setTimeout(() => {
        if (s === STEPS[STEPS.length - 1]) {
          setLocked(false);
          setFlash(null);
          return;
        }
        goNext();
      }, ADVANCE_MS);
    },
    [goNext, locked, markAnswered],
  );

  const bumpStepper = useCallback(
    (s: Step, patch: Partial<TriageInput>) => {
      setForm((f) => ({ ...f, ...patch }));
      if (debounceTimer.current) window.clearTimeout(debounceTimer.current);
      debounceTimer.current = window.setTimeout(() => {
        markAnswered(s, patch);
      }, STEPPER_DEBOUNCE_MS);
    },
    [markAnswered],
  );

  const finish = useCallback(async () => {
    if (aiSuggested) return;
    const answeredFields = Array.from(answered).flatMap((s) => {
      if (s === 'feverDays') return ['fever_days'];
      if (s === 'breathing') return ['severe_breathing_difficulty'];
      if (s === 'tdr') return ['tdr_result'];
      if (s === 'temperature') return ['temperature_c'];
      if (s === 'age') return ['age_months'];
      if (s === 'freetext') return [];
      return [s];
    });
    const result = localDecide(form, lang, answeredFields);
    const endedAt = new Date().toISOString();
    const durationMs = Date.now() - new Date(startedAt).getTime();
    // Timing kept local: TriageRequest schema has no started_at / answered_at / duration.
    sessionStorage.setItem(
      'zm_last_triage',
      JSON.stringify({
        input: form,
        result,
        demo,
        ai_extract_used: aiExtractUsed,
        answered_fields: answeredFields,
        timing: { started_at: startedAt, ended_at: endedAt, duration_ms: durationMs, step_answered_at: stepAnsweredAt },
      }),
    );
    await clearTriageDraft();
    navigate(resultPath);
  }, [aiExtractUsed, aiSuggested, demo, form, lang, navigate, resultPath, startedAt, stepAnsweredAt]);

  const runGuidedTriage = useCallback(() => {
    voice.unlock();
    void conversation.startGuidedTriage(form, {
      onNode: (nodeId) => {
        const idx = dialogueStepIndex(nodeId);
        if (idx >= 0) setStepIndex(idx);
      },
      onPatch: (patch) => {
        setForm((f) => ({ ...f, ...patch }));
        const keys = Object.keys(patch) as (keyof TriageInput)[];
        for (const k of keys) {
          if (k === 'severe_breathing_difficulty') markAnswered('breathing');
          else if (k === 'fever_days') markAnswered('feverDays');
          else if (k === 'tdr_result') markAnswered('tdr');
          else if (k === 'age_months') markAnswered('age');
          else if (k === 'temperature_c') markAnswered('temperature');
          else if (k === 'sex') markAnswered('sex');
          else if ((STEPS as string[]).includes(k)) markAnswered(k as Step);
        }
      },
      onComplete: (completed) => {
        setForm(completed);
        const answeredFields = [
          'age_months',
          'sex',
          'temperature_c',
          'fever_days',
          'convulsions',
          'unable_to_drink',
          'vomiting_everything',
          'lethargy',
          'severe_breathing_difficulty',
          'tdr_result',
        ];
        const result = localDecide(completed, lang, answeredFields);
        const endedAt = new Date().toISOString();
        const durationMs = Date.now() - new Date(startedAt).getTime();
        sessionStorage.setItem(
          'zm_last_triage',
          JSON.stringify({
            input: completed,
            result,
            demo,
            ai_extract_used: aiExtractUsed,
            answered_fields: answeredFields,
            timing: { started_at: startedAt, ended_at: endedAt, duration_ms: durationMs, step_answered_at: stepAnsweredAt },
          }),
        );
        void clearTriageDraft();
        navigate(resultPath);
      },
    });
  }, [aiExtractUsed, conversation, demo, form, lang, markAnswered, navigate, resultPath, startedAt, stepAnsweredAt, voice]);

  useEffect(() => {
    if (!voiceGuide || voiceGuideStarted.current) return;
    voiceGuideStarted.current = true;
    runGuidedTriage();
  }, [voiceGuide, runGuidedTriage]);

  const applyVoiceIntents = useCallback(
    (intents: VoiceIntents) => {
      if (step === 'age' && intents.number !== undefined) {
        const months = ageUnit === 'years' ? Math.round(intents.number * 12) : Math.round(intents.number);
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
      window.setTimeout(() => {
        goNext();
      }, reduce ? 0 : 120);
    } else {
      await finish();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finish, goNext, locked, markAnswered, reduce, step, stepIndex, form.temperature_c, t]);

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

  const dash = t('triage.notAnswered');

  const summaryRows = useMemo(() => {
    const row = (label: string, value: string) => ({ label, value });
    return [
      row(
        t('triage.age'),
        answered.has('age') ? `${form.age_months} ${t('triage.monthsShort')}` : dash,
      ),
      row(t('triage.sex'), answered.has('sex') ? (form.sex === 'female' ? t('triage.female') : t('triage.male')) : dash),
      row(t('triage.temperature'), answered.has('temperature') ? `${form.temperature_c}°C` : dash),
      row(t('triage.feverDays'), answered.has('feverDays') ? String(form.fever_days) : dash),
      row(t('triage.convulsions'), answered.has('convulsions') ? (form.convulsions ? t('triage.yes') : t('triage.no')) : dash),
      row(
        t('triage.unableToDrink'),
        answered.has('unable_to_drink') ? (form.unable_to_drink ? t('triage.yes') : t('triage.no')) : dash,
      ),
      row(
        t('triage.vomitingEverything'),
        answered.has('vomiting_everything') ? (form.vomiting_everything ? t('triage.yes') : t('triage.no')) : dash,
      ),
      row(t('triage.lethargy'), answered.has('lethargy') ? (form.lethargy ? t('triage.yes') : t('triage.no')) : dash),
      row(
        t('triage.breathing'),
        answered.has('breathing') ? (form.severe_breathing_difficulty ? t('triage.yes') : t('triage.no')) : dash,
      ),
      row(t('triage.tdr'), answered.has('tdr') ? t(`triage.${form.tdr_result}`) : dash),
    ];
  }, [answered, dash, form, t]);

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
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {stepLabel(step, t)}
      </div>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={step}
          variants={reduce ? undefined : slideInRight}
          initial={reduce ? false : 'initial'}
          animate="animate"
          exit={reduce ? undefined : 'exit'}
          transition={stepCardTransition}
          className="relative mt-4"
          style={{ filter: 'none' }}
        >
          <Card className={cn('relative p-5', desktop ? 'min-h-[360px]' : 'min-h-[300px]')}>
            <div
              ref={cardRef}
              tabIndex={-1}
              className="outline-none"
              role="group"
              aria-label={stepLabel(step, t)}
            >
              {selectionFlash}
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
                      disabled={locked}
                      onClick={() =>
                        bumpStepper('age', {
                          age_months: Math.max(0, form.age_months - (ageUnit === 'years' ? 12 : 1)),
                        })
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
                      disabled={locked}
                      onClick={() =>
                        bumpStepper('age', {
                          age_months: form.age_months + (ageUnit === 'years' ? 12 : 1),
                        })
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
                    {ageUnit === 'months'
                      ? AGE_CHIPS_MONTHS.map((m) => (
                          <Button
                            key={m}
                            size="sm"
                            variant={answered.has('age') && form.age_months === m ? 'primary' : 'outline'}
                            disabled={locked}
                            onClick={() => selectChoice('age', { age_months: m }, String(m))}
                          >
                            {t('triage.chipMonths', { n: m })}
                          </Button>
                        ))
                      : AGE_CHIPS_YEARS.map((y) => (
                          <Button
                            key={y}
                            size="sm"
                            variant={
                              answered.has('age') && Math.round(form.age_months / 12) === y ? 'primary' : 'outline'
                            }
                            disabled={locked}
                            onClick={() => selectChoice('age', { age_months: y * 12 }, String(y))}
                          >
                            {t('triage.chipYears', { n: y })}
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
                  <div className="mt-4 flex items-center justify-center gap-4">
                    <Button
                      size="lg"
                      variant="secondary"
                      disabled={locked}
                      aria-label={t('triage.decrease')}
                      onClick={() =>
                        bumpStepper('temperature', {
                          temperature_c: Math.round((form.temperature_c - 0.1) * 10) / 10,
                        })
                      }
                    >
                      <Minus className="h-6 w-6" />
                    </Button>
                    <span className="text-3xl font-bold tabular-nums">{form.temperature_c.toFixed(1)}</span>
                    <Button
                      size="lg"
                      variant="secondary"
                      disabled={locked}
                      aria-label={t('triage.increase')}
                      onClick={() =>
                        bumpStepper('temperature', {
                          temperature_c: Math.round((form.temperature_c + 0.1) * 10) / 10,
                        })
                      }
                    >
                      <Plus className="h-6 w-6" />
                    </Button>
                  </div>
                  {tempError ? <p className="mt-2 text-sm text-danger">{tempError}</p> : null}
                  <div className="mt-4 flex flex-wrap justify-center gap-2">
                    {TEMP_CHIPS.map((c) => (
                      <Button
                        key={c}
                        size="sm"
                        variant={answered.has('temperature') && form.temperature_c === c ? 'primary' : 'outline'}
                        disabled={locked}
                        onClick={() => selectChoice('temperature', { temperature_c: c }, String(c))}
                      >
                        {c.toFixed(1)}
                      </Button>
                    ))}
                  </div>
                </>
              )}

              {step === 'feverDays' && (
                <>
                  <label className="text-xl font-semibold">{t('triage.feverDays')}</label>
                  <div className="mt-4 flex items-center justify-center gap-4">
                    <Button
                      size="lg"
                      variant="secondary"
                      disabled={locked}
                      aria-label={t('triage.decrease')}
                      onClick={() => bumpStepper('feverDays', { fever_days: Math.max(0, form.fever_days - 1) })}
                    >
                      <Minus className="h-6 w-6" />
                    </Button>
                    <span className="min-w-[3rem] text-center text-3xl font-bold tabular-nums">{form.fever_days}</span>
                    <Button
                      size="lg"
                      variant="secondary"
                      disabled={locked}
                      aria-label={t('triage.increase')}
                      onClick={() => bumpStepper('feverDays', { fever_days: form.fever_days + 1 })}
                    >
                      <Plus className="h-6 w-6" />
                    </Button>
                  </div>
                  <Input
                    type="number"
                    min={0}
                    className="mt-4 text-2xl"
                    value={form.fever_days}
                    disabled={locked}
                    onChange={(e) => bumpStepper('feverDays', { fever_days: Number(e.target.value) || 0 })}
                  />
                  <div className="mt-4 flex flex-wrap justify-center gap-2">
                    {FEVER_CHIPS.map((d) => (
                      <Button
                        key={d}
                        size="sm"
                        variant={answered.has('feverDays') && form.fever_days === d ? 'primary' : 'outline'}
                        disabled={locked}
                        onClick={() => selectChoice('feverDays', { fever_days: d }, String(d))}
                      >
                        {d}
                      </Button>
                    ))}
                  </div>
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
                    desktop={desktop}
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
                    desktop={desktop}
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
                    onChange={(e) => {
                      setFreeText(e.target.value);
                      markAnswered('freetext');
                    }}
                  />
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <Button variant="secondary" onClick={() => void extract()}>
                      {t('triage.extract')}
                    </Button>
                  </div>
                </>
              )}
            </div>
          </Card>
        </motion.div>
      </AnimatePresence>

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
            disabled={locked || (step === 'freetext' && Boolean(aiSuggested))}
          >
            {stepIndex === STEPS.length - 1 ? t('common.confirm') : t('common.continue')}
          </Button>
        ) : (
          <div className="flex-[2]" aria-hidden />
        )}
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
    <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
      <div className="min-w-0 flex-1">
        <ProgressBar
          value={progress}
          label={t('triage.progress', { current: stepIndex + 1, total: STEPS.length })}
        />
      </div>
      <p className="shrink-0 font-mono text-xs tabular-nums text-ink-muted" aria-label={t('triage.elapsed')}>
        {formatElapsed(elapsedMs)}
      </p>
    </div>
  );

  if (desktop) {
    return (
      <WebShell title={t('triage.title')} crumbs={[t('nav.home'), t('triage.title')]}>
        <div className="relative mx-auto max-w-[1440px] pb-4">
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
      <div className="relative pb-4">
        {progressBar}
        {questionBody}
        <ConversationBar onStart={runGuidedTriage} />
      </div>
    </ChwShell>
  );
}

function YesNoCards({
  value,
  onChange,
  yesLabel,
  noLabel,
  desktop,
  disabled,
}: {
  value: 'yes' | 'no' | null;
  onChange: (v: 'yes' | 'no') => void;
  yesLabel: string;
  noLabel: string;
  desktop: boolean;
  disabled?: boolean;
}) {
  return (
    <div className={cn('mt-4 grid grid-cols-2 gap-3', desktop && 'gap-4')}>
      {(['yes', 'no'] as const).map((v) => (
        <button
          key={v}
          type="button"
          disabled={disabled}
          className={cn(
            'rounded-card border-2 font-semibold transition',
            desktop ? 'min-h-[120px] text-xl' : 'min-h-[80px] text-lg',
            value === v ? 'border-primary bg-primary-soft' : 'border-border bg-surface',
          )}
          onClick={() => onChange(v)}
        >
          {v === 'yes' ? yesLabel : noLabel}
          {desktop ? (
            <span className="mt-1 block text-xs font-normal text-ink-muted">{v === 'yes' ? 'Y' : 'N'}</span>
          ) : null}
        </button>
      ))}
    </div>
  );
}
