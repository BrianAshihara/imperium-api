import { z } from "zod";

import { dateString } from "../../utils/validation";

export const createIncomeSchema = z.object({
  categoryId: z.string().trim().min(1).nullable().optional(),
  amountCents: z.number().int().min(1),
  description: z.string().trim().max(255).optional(),
  date: dateString,
  isRecurring: z.boolean().optional().default(false),
  recurrenceType: z.enum(["monthly", "weekly", "yearly"]).nullable().optional(),
  recurrenceEndDate: dateString.nullable().optional()
});

export const updateIncomeSchema = z.object({
  categoryId: z.string().trim().min(1).nullable().optional(),
  amountCents: z.number().int().min(1).optional(),
  description: z.string().trim().max(255).optional(),
  date: dateString.optional(),
  isRecurring: z.boolean().optional(),
  recurrenceType: z.enum(["monthly", "weekly", "yearly"]).nullable().optional(),
  recurrenceEndDate: dateString.nullable().optional()
});

export const incomeParamsSchema = z.object({
  id: z.string().trim().min(1)
});

export const listIncomesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  startDate: dateString.optional(),
  endDate: dateString.optional(),
  categoryId: z.string().trim().min(1).optional()
});
