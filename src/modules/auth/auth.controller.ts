import { Request, Response } from "express";

import { UnauthorizedError, ValidationError } from "../../errors";
import { sendSuccess } from "../../utils/response";

import { authService } from "./auth.service";
import { loginSchema, registerSchema } from "./auth.validation";

export const authController = {
  register: async (req: Request, res: Response): Promise<void> => {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error);

    const data = await authService.register(
      parsed.data.email,
      parsed.data.password,
      parsed.data.name
    );
    sendSuccess(res, req, data, 201);
  },
  login: async (req: Request, res: Response): Promise<void> => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error);

    const data = await authService.login(parsed.data.email, parsed.data.password);
    sendSuccess(res, req, data);
  },
  me: async (req: Request, res: Response): Promise<void> => {
    if (!req.userId) throw new UnauthorizedError();

    const data = await authService.getProfile(req.userId);
    sendSuccess(res, req, data);
  }
};
