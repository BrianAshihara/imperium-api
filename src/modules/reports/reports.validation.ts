import { z } from "zod";

import { dateString } from "../../utils/validation";

const periodSchema = z.object({
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2000).max(3000)
});

export const monthlySummaryQuerySchema = periodSchema;
export const commitmentsQuerySchema = periodSchema;
export const categorySummaryQuerySchema = periodSchema;

export const dateRangeQuerySchema = z
  .object({
    startDate: dateString,
    endDate: dateString
  })
  .refine((query) => query.startDate <= query.endDate, {
    message: "startDate must not be after endDate",
    path: ["startDate"]
  });

export const evolutionQuerySchema = periodSchema.extend({
  months: z.coerce.number().int().min(1).max(24).optional().default(6)
});
