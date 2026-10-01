import { z } from "zod";

export const reviewSchema = z.object({
  rating: z
    .number()
    .min(0)
    .max(5)
    .refine(
      (v) => Math.abs(v * 100 - Math.round(v * 100)) < 1e-6,
      "At most 2 decimal places"
    ),
  body: z
    .string()
    .trim()
    .max(5000)
    .optional()
    .transform((v) => (v ? v : null)),
});