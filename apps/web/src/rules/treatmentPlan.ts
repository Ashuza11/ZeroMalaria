import type { TreatmentPlan, TriageInput } from '../types';

// Keep in lockstep with rules/bugesera_mft_2026_2027.yaml (reviewable clinical config).
const BUGESERA_PROTOCOL =
  'RBC Rwanda MFT Implementation Guide (2025), Block A, Year 2 (September 2026–August 2027)';

type AspyBand = {
  min: number;
  max: number;
  weightBand: string;
  dose: string;
  total: string;
};

const ASPY_BANDS: AspyBand[] = [
  { min: 5, max: 8, weightBand: '5–<8 kg', dose: '1 sachet (20 mg/60 mg)', total: '3 sachets' },
  { min: 8, max: 15, weightBand: '8–<15 kg', dose: '2 sachets (20 mg/60 mg each)', total: '6 sachets' },
  { min: 15, max: 20, weightBand: '15–<20 kg', dose: '3 sachets (20 mg/60 mg each)', total: '9 sachets' },
  { min: 20, max: 24, weightBand: '20–<24 kg', dose: '1 tablet (60 mg/180 mg)', total: '3 tablets' },
  { min: 24, max: 45, weightBand: '24–<45 kg', dose: '2 tablets (60 mg/180 mg each)', total: '6 tablets' },
  { min: 45, max: 65, weightBand: '45–<65 kg', dose: '3 tablets (60 mg/180 mg each)', total: '9 tablets' },
  { min: 65, max: Number.POSITIVE_INFINITY, weightBand: '≥65 kg', dose: '4 tablets (60 mg/180 mg each)', total: '12 tablets' },
];

export const TREATMENT_SAFETY_FIELDS = [
  'weight_kg',
  'aspy_allergy',
  'severe_liver_disease',
  'severe_renal_disease',
  'recent_malaria_treatment_failure',
  'aspy_in_stock',
] as const;

export function hasTreatmentContraindication(input: TriageInput): boolean {
  return Boolean(
    input.pregnant_first_trimester ||
      input.aspy_allergy ||
      input.severe_liver_disease ||
      input.severe_renal_disease ||
      input.recent_malaria_treatment_failure
  );
}

/**
 * Locked demo protocol for the authenticated Nyamata/Bugesera CHW.
 * Claude never selects or alters this plan.
 */
export function buildBugeseraTreatmentPlan(input: TriageInput, now = new Date()): TreatmentPlan | null {
  const rotationStart = Date.UTC(2026, 8, 1);
  const rotationEnd = Date.UTC(2027, 8, 1);
  if (
    now.getTime() < rotationStart ||
    now.getTime() >= rotationEnd ||
    input.tdr_result !== 'positive' ||
    !input.aspy_in_stock ||
    hasTreatmentContraindication(input)
  ) return null;
  const band = ASPY_BANDS.find(({ min, max }) => input.weight_kg >= min && input.weight_kg < max);
  if (!band) return null;
  return {
    source: 'deterministic_rbc_mft',
    district: 'Bugesera',
    mft_block: 'A',
    rotation_year: '2026-2027',
    medicine: 'Artesunate–Pyronaridine (ASPY)',
    weight_band: band.weightBand,
    dose_each_time: band.dose,
    frequency: 'once_daily',
    duration_days: 3,
    total_quantity: band.total,
    instructions_en: [
      'Give the dose once daily for 3 consecutive days.',
      'Confirm the medicine and quantity against the current CHW pack before giving it.',
      'Refer if the patient worsens, cannot keep the medicine down, or treatment failure is suspected.',
    ],
    instructions_rw: [
      'Tanga uyu muti rimwe ku munsi mu minsi 3 ikurikirana.',
      'Banza ugenzure izina n’ingano by’umuti uri mu bikoresho bya CHW mbere yo kuwutanga.',
      'Ohereza umurwayi niba arembye kurushaho, aruka umuti, cyangwa ukeka ko umuti utamuvura.',
    ],
    protocol_reference: BUGESERA_PROTOCOL,
  };
}
