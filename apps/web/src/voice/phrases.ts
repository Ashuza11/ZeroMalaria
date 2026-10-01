import { MALARIA_RULES } from '../rules/malariaRules.generated';
import type { Decision } from '../types';

export type VoiceLang = 'en' | 'rw';

export type PhraseEntry = { id: string; en: string; rw: string };

function p(id: string, en: string, rw: string): PhraseEntry {
  return { id, en, rw };
}

/** Fixed read-aloud catalog  -  not LLM-generated. */
export const PHRASES = {
  age: p('age', 'How old is the patient?', 'Umurwayi afite imyaka ingahe?'),
  sex: p('sex', 'Is the patient female or male?', 'Umurwayi ni umugore cyangwa umugabo?'),
  fever: p('fever', 'Does the patient have fever?', 'Umurwayi afite ubushyuhe?'),
  fever_days: p(
    'fever_days',
    'How many days has the fever lasted?',
    'Ubushyuhe bwamaze iminsi ingahe?',
  ),
  temperature: p(
    'temperature',
    'What is the body temperature in degrees Celsius?',
    'Ubushyuhe bw\'umubiri ni bungana iki mu Celsius?',
  ),
  convulsions: p(
    'convulsions',
    'Convulsions or fits, yes or no?',
    'Gusetsa cyangwa fits, yego cyangwa oya?',
  ),
  unable_to_drink: p(
    'unable_to_drink',
    'Unable to drink or feed, yes or no?',
    'Ntashobora kunywa cyangwa kurya, yego cyangwa oya?',
  ),
  vomiting_everything: p(
    'vomiting_everything',
    'Vomiting everything, yes or no?',
    'Araruka byose, yego cyangwa oya?',
  ),
  lethargy: p(
    'lethargy',
    'Lethargy or unconsciousness, yes or no?',
    'Yacitse intege cyangwa ntabona, yego cyangwa oya?',
  ),
  severe_breathing_difficulty: p(
    'severe_breathing_difficulty',
    'Severe breathing difficulty, yes or no?',
    'Agorwa cyane n\'uruhuha, yego cyangwa oya?',
  ),
  tdr: p(
    'tdr',
    'What is the malaria rapid test result: positive, negative, or invalid?',
    'Ikizamini cy\'uburozi cy\'umusaraba: cyiza, cyangwa nabi, cyangwa nticyemewe?',
  ),
  weight: p('weight', 'What is the patient’s weight in kilograms?', 'Umurwayi apima ibiro bingahe?'),
  pregnant_first_trimester: p(
    'pregnant_first_trimester',
    'Is the patient pregnant in the first three months, yes or no?',
    'Umurwayi atwite inda iri munsi y’amezi atatu, yego cyangwa oya?',
  ),
  aspy_allergy: p(
    'aspy_allergy',
    'Has the patient had an allergy to ASPY, artesunate, or pyronaridine, yes or no?',
    'Umurwayi yigeze agira allergie kuri ASPY, artesunate cyangwa pyronaridine, yego cyangwa oya?',
  ),
  severe_liver_disease: p(
    'severe_liver_disease',
    'Does the patient have severe liver disease or yellow eyes, yes or no?',
    'Umurwayi afite indwara ikomeye y’umwijima cyangwa amaso y’umuhondo, yego cyangwa oya?',
  ),
  severe_renal_disease: p(
    'severe_renal_disease',
    'Does the patient have severe kidney disease, yes or no?',
    'Umurwayi afite indwara ikomeye y’impyiko, yego cyangwa oya?',
  ),
  recent_malaria_treatment_failure: p(
    'recent_malaria_treatment_failure',
    'Did a recent malaria treatment fail, yes or no?',
    'Umuti wa malaria aherutse gufata waranze, yego cyangwa oya?',
  ),
  aspy_in_stock: p(
    'aspy_in_stock',
    'Is the correct ASPY treatment pack available now, yes or no?',
    'Agapaki ka ASPY gakwiye karahari ubu, yego cyangwa oya?',
  ),
  other_symptoms: p(
    'other_symptoms',
    'Are there any other symptoms or important details? You can record or type them.',
    'Hari ibindi bimenyetso cyangwa amakuru y\'ingenzi? Ushobora kubivuga cyangwa kubyandika.',
  ),

  result_treat_at_home: p(
    'result_treat_at_home',
    'Recommendation: treat at home with community follow-up.',
    'Icyifuzo: kuvura mu rugo hamwe no gukurikirana mu mudugudu.',
  ),
  result_no_antimalarial: p(
    'result_no_antimalarial',
    'Do not give malaria medicine. Assess other causes of fever and follow up.',
    'Ntutange umuti wa malaria. Shakisha izindi mpamvu z’ubushyuhe kandi ukurikirane umurwayi.',
  ),
  result_refer: p(
    'result_refer',
    'Recommendation: refer the patient to a health center.',
    'Icyifuzo: ohereza umurwayi ku kigo nderabuzima.',
  ),
  result_urgent_refer: p(
    'result_urgent_refer',
    'Urgent recommendation: refer immediately to a health center.',
    'Icyifuzo cyihutirwa: ohereze vuba ku kigo nderabuzima.',
  ),

  reason_convulsions: p(
    'reason_convulsions',
    MALARIA_RULES.danger_signs.find((s) => s.id === 'convulsions')!.reason_en,
    MALARIA_RULES.danger_signs.find((s) => s.id === 'convulsions')!.reason_rw,
  ),
  reason_unable_to_drink: p(
    'reason_unable_to_drink',
    MALARIA_RULES.danger_signs.find((s) => s.id === 'unable_to_drink')!.reason_en,
    MALARIA_RULES.danger_signs.find((s) => s.id === 'unable_to_drink')!.reason_rw,
  ),
  reason_vomiting_everything: p(
    'reason_vomiting_everything',
    MALARIA_RULES.danger_signs.find((s) => s.id === 'vomiting_everything')!.reason_en,
    MALARIA_RULES.danger_signs.find((s) => s.id === 'vomiting_everything')!.reason_rw,
  ),
  reason_lethargy: p(
    'reason_lethargy',
    MALARIA_RULES.danger_signs.find((s) => s.id === 'lethargy')!.reason_en,
    MALARIA_RULES.danger_signs.find((s) => s.id === 'lethargy')!.reason_rw,
  ),
  reason_severe_breathing_difficulty: p(
    'reason_severe_breathing_difficulty',
    MALARIA_RULES.danger_signs.find((s) => s.id === 'severe_breathing_difficulty')!.reason_en,
    MALARIA_RULES.danger_signs.find((s) => s.id === 'severe_breathing_difficulty')!.reason_rw,
  ),

  reason_infant_age_referral: p(
    'reason_infant_age_referral',
    MALARIA_RULES.rules.find((r) => r.id === 'infant_age_referral')!.reason_en,
    MALARIA_RULES.rules.find((r) => r.id === 'infant_age_referral')!.reason_rw,
  ),
  reason_invalid_tdr_refer: p(
    'reason_invalid_tdr_refer',
    MALARIA_RULES.rules.find((r) => r.id === 'invalid_tdr_refer')!.reason_en,
    MALARIA_RULES.rules.find((r) => r.id === 'invalid_tdr_refer')!.reason_rw,
  ),
  reason_persistent_fever_negative_tdr: p(
    'reason_persistent_fever_negative_tdr',
    MALARIA_RULES.rules.find((r) => r.id === 'persistent_fever_negative_tdr')!.reason_en,
    MALARIA_RULES.rules.find((r) => r.id === 'persistent_fever_negative_tdr')!.reason_rw,
  ),
  reason_incomplete_assessment: p(
    'reason_incomplete_assessment',
    MALARIA_RULES.rules.find((r) => r.id === 'incomplete_assessment')!.reason_en,
    MALARIA_RULES.rules.find((r) => r.id === 'incomplete_assessment')!.reason_rw,
  ),
  reason_default_treat_at_home: p(
    'reason_default_treat_at_home',
    MALARIA_RULES.rules.find((r) => r.id === 'default_treat_at_home')!.reason_en,
    MALARIA_RULES.rules.find((r) => r.id === 'default_treat_at_home')!.reason_rw,
  ),
  reason_negative_rdt_no_antimalarial: p(
    'reason_negative_rdt_no_antimalarial',
    'The malaria rapid test is negative.',
    'Ikizamini cya malaria ni negative.',
  ),
  reason_confirmed_uncomplicated_malaria: p(
    'reason_confirmed_uncomplicated_malaria',
    'The malaria test is positive and no danger sign or treatment contraindication was recorded.',
    'Ikizamini cya malaria ni positive kandi nta kimenyetso cy’akaga cyangwa ikibuza umuti cyanditswe.',
  ),

  next_treat_at_home: p(
    'next_treat_at_home',
    'Give home care advice, schedule follow-up, and confirm the decision before closing.',
    'Tanga inama zo kwita mu rugo, teganya gukurikirana, wemeze icyemezo mbere yo gufunga.',
  ),
  next_no_antimalarial: p(
    'next_no_antimalarial',
    'Assess other causes, give appropriate supportive care, and tell the patient when to return.',
    'Shakisha izindi mpamvu, utange ubufasha bukwiye, kandi ubwire umurwayi igihe cyo kugaruka.',
  ),
  next_refer: p(
    'next_refer',
    'Prepare a referral handover and help the patient reach the health center.',
    'Tegeka kohereza umurwayi kandi umufashe kugera ku kigo nderabuzima.',
  ),
  next_urgent_refer: p(
    'next_urgent_refer',
    'Refer urgently now. Stay with the patient if possible and call for transport help.',
    'Ohereza vuba. Guma hafi y\'umurwayi niba bishoboka kandi hamagara ubufasha bwo gutwara.',
  ),

  confirm_reminder: p(
    'confirm_reminder',
    'Please confirm this recommendation on screen before you finish.',
    'Nyamuneka wemeze icyo cyifuzo kuri ekrani mbere yo kurangiza.',
  ),
  disclaimer: p(
    'disclaimer',
    MALARIA_RULES.meta.disclaimer,
    'Iyi ni igikoresho cy\'ubufasha mu gufata icyemezo. Si ahantu ho gusimbura ubuvuzi.',
  ),

  prevention_nets: p(
    'prevention_nets',
    'Sleep under an insecticide-treated bed net every night.',
    'Rya munsi y\'urutoki rw\'ibisabwa buri joro.',
  ),
  prevention_exposure: p(
    'prevention_exposure',
    'Reduce mosquito bites: cover arms and legs in the evening, clear standing water near homes.',
    'Gabanya ibitotsi by\'inzige: ukinge intoki n\'amaguru nimugoroba, kuraho amazi ahagaze hafi y\'urugo.',
  ),
  prevention_early_test: p(
    'prevention_early_test',
    'Test early when fever starts, do not wait many days.',
    'Kora ikizamini vuba ubushyuhe buhera, ntugere ute iminsi myinshi.',
  ),
  prevention_early_care: p(
    'prevention_early_care',
    'Seek care quickly if danger signs appear or the child worsens.',
    'Shakira ubuvuzi vuba niba ibimenyetso by\'akaga bihagaze cyangwa umwana agenda ababaye.',
  ),

  why_generic: p(
    'why_generic',
    'Here is why this recommendation was made, based on the rules that were triggered.',
    'Dore impamvu icyifuzo cyakozwe, hashingiwe ku mategeko yabonetse.',
  ),
  what_now_generic: p(
    'what_now_generic',
    'Here is what to do next for this recommendation.',
    'Dore icyo ugomba gukora ubu kuri iyi recommendation.',
  ),
  slower_hint: p(
    'slower_hint',
    'I will speak more slowly.',
    'Nzavuga buhoro.',
  ),
  repeat_hint: p(
    'repeat_hint',
    'I will repeat the recommendation.',
    'Nzongera gusubiramo icyifuzo.',
  ),

  help_age: p(
    'help_age',
    'Age in months drives infant referral rules. Use months for children under five.',
    'Imyaka mu mezi igena amategeko yo kohereza abana bato. Koresha amezi ku bana bari munsi y\'imyaka itanu.',
  ),
  help_sex: p(
    'help_sex',
    'Sex is recorded for the patient record; it does not change the malaria decision alone.',
    'Igitsina cyandikwa mu dosiye; nticyihindura icyemezo cya malaria cyonyine.',
  ),
  help_temperature: p(
    'help_temperature',
    'Measure axillary or rectal temperature. Very high fever with danger signs needs urgent referral.',
    'Pima ubushyuhe bw\'umubiri. Ubushyuhe bwinshi hamwe n\'ibimenyetso by\'akaga bisaba kohereza vuba.',
  ),
  help_fever_days: p(
    'help_fever_days',
    'Long fever with a negative test may still need referral per national rules.',
    'Ubushyuhe bw\'iminsi myinshi n\'ikizamini cyiza bishobora gusaba kohereza ukurikije amategeko.',
  ),
  help_convulsions: p(
    'help_convulsions',
    'Convulsions are a danger sign, answer yes if the patient had fits or seizures.',
    'Gusetsa ni ikimenyetso cy\'akaga, subiza yego niba umurwayi yagize fits cyangwa seizures.',
  ),
  help_unable_to_drink: p(
    'help_unable_to_drink',
    'Yes if the patient cannot drink or breastfeed at all.',
    'Subiza yego niba umurwayi ntashobora kunywa cyangwa kuronsa na gato.',
  ),
  help_vomiting_everything: p(
    'help_vomiting_everything',
    'Yes if the patient vomits all food or fluids and cannot keep anything down.',
    'Subiza yego niba araruka byose kandi ntashobora kubika ibyo yariye cyangwa yanyoye.',
  ),
  help_lethargy: p(
    'help_lethargy',
    'Yes if the patient is very weak, difficult to wake, or unconscious.',
    'Subiza yego niba umurwayi afite intege nke cyane, agorwa gukanguka, cyangwa ntabona.',
  ),
  help_severe_breathing_difficulty: p(
    'help_severe_breathing_difficulty',
    'Yes if breathing is fast, noisy, or the chest pulls in with each breath.',
    'Subiza yego niba aruhuka vuba, ijwi ryo guhumeka, cyangwa igifu kinjira mu guhumeka.',
  ),
  help_tdr: p(
    'help_tdr',
    'Record the rapid diagnostic test result from the cassette. Invalid means the test failed, do not treat on that result alone.',
    'Andika igisubizo cy\'ikizamini cy\'umusaraba. Nticyemewe bisobanuye ko ikizamini cyanze, ntuvure ukurikije gusa icyo.',
  ),
  help_weight: p(
    'help_weight',
    'Use a scale. The treatment dose is selected from the measured weight, never from age alone.',
    'Koresha umunzani. Ingano y’umuti igenwa n’ibiro byapimwe, si imyaka yonyine.',
  ),
  help_pregnant_first_trimester: p(
    'help_pregnant_first_trimester',
    'ASPY is not used in the first trimester. Refer for an alternative treatment.',
    'ASPY ntitangwa mu mezi atatu ya mbere y’inda. Ohereza umurwayi guhabwa undi muti.',
  ),
  help_aspy_allergy: p(
    'help_aspy_allergy',
    'A known allergy to ASPY, artesunate, or pyronaridine requires an alternative treatment.',
    'Allergie kuri ASPY, artesunate cyangwa pyronaridine isaba undi muti.',
  ),
  help_severe_liver_disease: p(
    'help_severe_liver_disease',
    'Severe liver disease or signs of liver injury require facility assessment.',
    'Indwara ikomeye y’umwijima cyangwa ibimenyetso byayo bisaba gusuzumwa ku kigo nderabuzima.',
  ),
  help_severe_renal_disease: p(
    'help_severe_renal_disease',
    'Severe kidney disease requires facility assessment before treatment.',
    'Indwara ikomeye y’impyiko isaba gusuzumwa ku kigo nderabuzima mbere y’umuti.',
  ),
  help_recent_malaria_treatment_failure: p(
    'help_recent_malaria_treatment_failure',
    'Suspected treatment failure must be referred to a health facility.',
    'Iyo ukeka ko umuti waranze, umurwayi agomba koherezwa ku kigo nderabuzima.',
  ),
  help_aspy_in_stock: p(
    'help_aspy_in_stock',
    'Only confirm yes after checking the medicine name, formulation, quantity, and expiry date.',
    'Emeza yego ari uko ugenzuye izina ry’umuti, ubwoko bwawo, umubare n’itariki uzarangiriraho.',
  ),
  help_freetext: p(
    'help_freetext',
    'Optional notes in Kinyarwanda or English. AI may suggest fields, you must verify before applying.',
    'Inyandiko z\'ubushobozi mu Kinyarwanda cyangwa Icyongereza. AI ishobora gusaba ibice, ugomba kubigenzura mbere yo kubikoresha.',
  ),
  guided_greeting: p(
    'guided_greeting',
    'Voice guided triage. I will ask each question. Answer clearly, then confirm what I heard.',
    'Gupima mu ijwi. Nzakubaza ibibazo. Subiza neza, hanyuma wemeze ibyo numvise.',
  ),
  confirm_danger_sign: p(
    'confirm_danger_sign',
    'This is a danger sign. Please say yes to confirm, or no if I misunderstood.',
    'Iki ni ikimenyetso cy\'akaga. Vuga yego niba ari ukuri, cyangwa oya niba nabitumvise nabi.',
  ),
} as const satisfies Record<string, PhraseEntry>;

export type PhraseId = keyof typeof PHRASES;

function applyTemplate(text: string): string {
  return text
    .replaceAll('{infant_refer_months}', String(MALARIA_RULES.infant_refer_months))
    .replaceAll('{persistent_fever_days}', String(MALARIA_RULES.persistent_fever_days));
}

export function getPhrase(id: PhraseId, lang: VoiceLang): string {
  const entry = PHRASES[id];
  const raw = lang === 'rw' ? entry.rw : entry.en;
  return applyTemplate(raw);
}

export function reasonPhraseIdForRuleOrSign(ruleOrSignId: string): PhraseId | null {
  const key = `reason_${ruleOrSignId}` as PhraseId;
  return key in PHRASES ? key : null;
}

export function buildResultSequence(decision: Decision, triggered_rules: string[]): PhraseId[] {
  const seq: PhraseId[] = [];
  if (decision === 'no_antimalarial') seq.push('result_no_antimalarial');
  else if (decision === 'treat_at_home') seq.push('result_treat_at_home');
  else if (decision === 'refer') seq.push('result_refer');
  else seq.push('result_urgent_refer');

  for (const id of triggered_rules) {
    const reasonId = reasonPhraseIdForRuleOrSign(id);
    if (reasonId) seq.push(reasonId);
  }

  if (decision === 'no_antimalarial') seq.push('next_no_antimalarial');
  else if (decision === 'treat_at_home') seq.push('next_treat_at_home');
  else if (decision === 'refer') seq.push('next_refer');
  else seq.push('next_urgent_refer');

  seq.push('disclaimer', 'confirm_reminder');
  return seq;
}

export const PREVENTION_PHRASE_IDS: PhraseId[] = [
  'prevention_nets',
  'prevention_exposure',
  'prevention_early_test',
  'prevention_early_care',
];
