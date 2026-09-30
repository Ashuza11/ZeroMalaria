/** ~30s offline demo dialogue  -  fixed phrase catalog, no network. */

import { buildResultSequence, type PhraseId, type VoiceLang } from '../voice/phrases';
import { speakSequence, stopSpeaking } from '../voice/speak';
import { localDecide } from '../rules/engine';
import { DEMO_CASE_A, DEMO_CASE_B } from './scenario';

export type DemoLine = { atMs: number; phraseId: PhraseId; note?: string };

export const SCRIPTED_DEMO_LINES: DemoLine[] = [
  { atMs: 0, phraseId: 'age', note: 'Start triage' },
  { atMs: 3000, phraseId: 'temperature' },
  { atMs: 6000, phraseId: 'tdr' },
  { atMs: 9000, phraseId: 'result_treat_at_home' },
  { atMs: 12000, phraseId: 'reason_default_treat_at_home' },
  { atMs: 15000, phraseId: 'next_treat_at_home' },
  { atMs: 18000, phraseId: 'prevention_nets' },
  { atMs: 21000, phraseId: 'prevention_early_test' },
  { atMs: 24000, phraseId: 'disclaimer' },
  { atMs: 27000, phraseId: 'confirm_reminder' },
];

/** Mock STT transcripts for Case B (convulsions → urgent refer). */
export const CASE_B_MOCK_STT_SEQUENCE = [
  '28',
  'male',
  '39.4',
  '2',
  'yes',
  'yes',
  'no',
  'no',
  'no',
  'no',
  'positive',
] as const;

let demoAbort: (() => void) | null = null;

export function cancelScriptedDemo(): void {
  demoAbort?.();
  demoAbort = null;
  stopSpeaking();
}

/** Play timed lines; resolves when finished or cancelled. */
export function runScriptedDemo(
  lang: VoiceLang,
  onHighlight?: (id: PhraseId) => void,
): Promise<void> {
  cancelScriptedDemo();
  return new Promise((resolve) => {
    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];
    demoAbort = () => {
      cancelled = true;
      timers.forEach(clearTimeout);
      resolve();
    };

    for (const line of SCRIPTED_DEMO_LINES) {
      timers.push(
        setTimeout(() => {
          if (cancelled) return;
          void speakSequence([line.phraseId], lang, onHighlight);
        }, line.atMs),
      );
    }

    timers.push(
      setTimeout(() => {
        if (!cancelled) {
          demoAbort = null;
          resolve();
        }
      }, 30000),
    );
  });
}

export type VoiceTriageRunner = {
  startGuidedTriage: (
    base: typeof DEMO_CASE_B,
    handlers: {
      onNode?: (nodeId: string) => void;
      onPatch?: (patch: Partial<typeof DEMO_CASE_B>) => void;
      onComplete?: (form: typeof DEMO_CASE_B) => void;
    },
    options?: { mockTranscripts?: string[] },
  ) => Promise<void>;
};

/** Scripted voice triage: mocked STT for convulsions case → URGENT result phrases. */
export async function runScriptedVoiceTriageDemo(
  lang: VoiceLang,
  runner: VoiceTriageRunner,
  onHighlight?: (id: PhraseId) => void,
): Promise<void> {
  cancelScriptedDemo();
  const base = { ...DEMO_CASE_B };
  await runner.startGuidedTriage(
    base,
    {
      onComplete: async (form) => {
        const result = localDecide(form, lang);
        const seq = buildResultSequence(result.decision, result.triggered_rules);
        await speakSequence(seq, lang, onHighlight);
      },
    },
    { mockTranscripts: [...CASE_B_MOCK_STT_SEQUENCE] },
  );
}

/** Phrase ids for Case A result read-aloud (full sequence). */
export function demoCaseAResultSequence(lang: VoiceLang = 'en'): PhraseId[] {
  const result = localDecide(DEMO_CASE_A, lang);
  return buildResultSequence(result.decision, result.triggered_rules);
}
