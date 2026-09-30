import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8),
  name: z.string().trim().min(1).max(100).optional()
});

export const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8)
});
