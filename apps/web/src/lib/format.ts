import type { TFunction } from 'i18next';

/** Age in months — e.g. "18 mo" / "amezi 18" */
export function formatAgeMonths(months: number, t: TFunction): string {
  return t('format.ageMonths', { count: months });
}

export function formatSex(sex: string, t: TFunction): string {
  if (sex === 'female') return t('format.sexFemale');
  if (sex === 'male') return t('format.sexMale');
  return sex;
}

export function formatPatientLine(ageMonths: number, sex: string, t: TFunction): string {
  return `${formatAgeMonths(ageMonths, t)} · ${formatSex(sex, t)}`;
}
