import { z } from "zod";

export const createCategorySchema = z.object({
    name: z.string().trim().min(2).max(60),
    type: z.enum(["income", "expense"])
});

export const updateCategorySchema = z.object({
    name: z.string().trim().min(2).max(60)
});

export const categoryParamsSchema = z.object({
    categoryId: z.string().trim().min(1)
});
