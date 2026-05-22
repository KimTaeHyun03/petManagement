import { z } from 'zod';

export const CreateVaccinationSchema = z.object({
  vaccineId: z.number().int().positive(),
  doseNo: z.number().int().min(1).max(10),
  vaccinatedAt: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'vaccinated_at_must_be_yyyy_mm_dd'),
  memo: z.string().trim().max(200).optional(),
});

export type CreateVaccinationInput = z.infer<typeof CreateVaccinationSchema>;
