import type { VoiceLang } from './phrases';

export type VoiceIntents = {
  yes?: boolean;
  no?: boolean;
  positive?: boolean;
  negative?: boolean;
  invalid?: boolean;
  number?: number;
  ageUnit?: 'months' | 'years';
  female?: boolean;
  male?: boolean;
};

export function parseVoiceIntents(transcript: string, lang: VoiceLang): VoiceIntents {
  const t = transcript.toLowerCase().trim();
  const intents: VoiceIntents = {};
  const num = Number(t.replace(/[^\d.]/g, ''));
  if (!Number.isNaN(num) && t.match(/\d/)) intents.number = num;

  if (/\b(month|months|mo)\b|\bamezi\b/.test(t)) intents.ageUnit = 'months';
  if (/\b(year|years|yr|yrs)\b|\bimyaka\b/.test(t)) intents.ageUnit = 'years';

  if (lang === 'rw') {
    if (/\byego\b|yes|yeah|\by\b/.test(t)) intents.yes = true;
    if (/\boya\b|\bno\b|nta/.test(t)) intents.no = true;
    if (/cyiza|positive|pos|nabi\s+cyiza/.test(t)) intents.positive = true;
    if (/nabi|negative|neg/.test(t) && !intents.positive) intents.negative = true;
    if (/nticyemewe|invalid/.test(t)) intents.invalid = true;
    if (/umugore|gore|female/.test(t)) intents.female = true;
    if (/umugabo|gabo|male/.test(t)) intents.male = true;
  } else {
    if (/\byes\b|\by\b|yeah|yep/.test(t)) intents.yes = true;
    if (/\bno\b|\bn\b|nope/.test(t)) intents.no = true;
    if (/positive|pos/.test(t)) intents.positive = true;
    if (/negative|neg/.test(t)) intents.negative = true;
    if (/invalid/.test(t)) intents.invalid = true;
    if (/female|woman|girl/.test(t)) intents.female = true;
    if (/male|boy|man/.test(t)) intents.male = true;
  }
  return intents;
}
