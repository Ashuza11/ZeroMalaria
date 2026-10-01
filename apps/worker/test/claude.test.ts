import { afterEach, describe, expect, it, vi } from 'vitest';
import { generateClinicalBrief } from '../src/claude';
import type { Env } from '../src/types';

const input = {
  answers: { age_months: 18, sex: 'female', temperature_c: 39, fever_days: 2, tdr_result: 'positive' },
  rulesDecision: 'urgent_refer',
  reasons: ['Unable to drink'],
  triggeredRules: ['danger_unable_to_drink'],
  language: 'en',
};

afterEach(() => vi.unstubAllGlobals());

describe('Claude clinical brief', () => {
  it('falls back safely when no key is configured', async () => {
    const result = await generateClinicalBrief({} as Env, input);
    expect(result.provider).toBe('local-template');
    expect(result.summary).toContain('urgent_refer');
    expect(result.summary).toContain('nurse must verify');
  });

  it('calls the Messages API without allowing Claude to change RBC inputs', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ content: [{ type: 'text', text: 'Urgent RBC handoff. AI-generated; nurse must verify.' }] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);
    const result = await generateClinicalBrief({ CLAUDE_API_KEY: 'test-key' } as Env, input);
    expect(result.provider).toBe('claude');
    expect(result.summary).toContain('nurse must verify');
    const [, init] = fetchMock.mock.calls[0];
    const request = JSON.parse(String(init.body));
    expect(request.messages[0].content).toContain('"rules_decision_do_not_change":"urgent_refer"');
    expect(init.headers['anthropic-version']).toBe('2023-06-01');
  });
});
