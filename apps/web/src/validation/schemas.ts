import { z } from 'zod';

export const loginSchema = z.object({
  username: z.string().trim().min(3).max(50),
  password: z.string().min(8),
});

export const triageSchema = z.object({
  age_months: z.number().int().min(0).max(1200),
  sex: z.enum(['female', 'male']),
  temperature_c: z.number().min(30).max(45),
  fever_days: z.number().int().min(0).max(60),
  convulsions: z.boolean(),
  unable_to_drink: z.boolean(),
  vomiting_everything: z.boolean(),
  lethargy: z.boolean(),
  severe_breathing_difficulty: z.boolean(),
  tdr_result: z.enum(['positive', 'negative', 'invalid']),
  free_text: z.string().max(2000).optional(),
});

const rwandaPhone = z
  .string()
  .regex(/^(\+2507\d{8}|07\d{8})$/, 'Invalid Rwandan phone');

export const addUserSchema = z.object({
  display_name: z.string().trim().min(2).max(128),
  phone: rwandaPhone.or(z.literal('')),
  role: z
    .enum(['CHW', 'HEALTH_CENTER', 'RBC_ADMIN', 'SUPER_ADMIN'])
    .default('CHW'),

  facility_id: z.string().min(1).max(32),
  village: z.string().trim().min(1).max(128),
});

export const referralNotesSchema = z.object({
  notes: z.string().max(1000),
});
