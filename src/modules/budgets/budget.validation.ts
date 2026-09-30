import { z } from "zod";

export const createBudgetSchema = z.object({
  categoryId: z.string().trim().min(1).nullable().optional(),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000),
  limitAmountCents: z.number().int().min(1)
});

export const updateBudgetSchema = z.object({
  limitAmountCents: z.number().int().min(1)
});

export const budgetParamsSchema = z.object({
  id: z.string().trim().min(1)
});

export const listBudgetsQuerySchema = z.object({
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2000)
});
