import { Request, Response } from "express";

import { UnauthorizedError, ValidationError } from "../../errors";
import { sendSuccess } from "../../utils/response";

import { budgetService } from "./budget.service";
import {
  budgetParamsSchema,
  createBudgetSchema,
  listBudgetsQuerySchema,
  updateBudgetSchema
} from "./budget.validation";

export const budgetController = {
  create: async (req: Request, res: Response): Promise<void> => {
    if (!req.userId) throw new UnauthorizedError();

    const parsed = createBudgetSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error);

    const data = await budgetService.createBudget(req.userId, parsed.data);
    sendSuccess(res, req, data, 201);
  },
  getById: async (req: Request, res: Response): Promise<void> => {
    if (!req.userId) throw new UnauthorizedError();

    const params = budgetParamsSchema.safeParse(req.params);
    if (!params.success) throw new ValidationError(params.error);

    const data = await budgetService.getBudget(params.data.id, req.userId);
    sendSuccess(res, req, data);
  },
  list: async (req: Request, res: Response): Promise<void> => {
    if (!req.userId) throw new UnauthorizedError();

    const query = listBudgetsQuerySchema.safeParse(req.query);
    if (!query.success) throw new ValidationError(query.error);

    const data = await budgetService.listBudgets(req.userId, query.data.month, query.data.year);
    sendSuccess(res, req, data);
  },
  update: async (req: Request, res: Response): Promise<void> => {
    if (!req.userId) throw new UnauthorizedError();

    const params = budgetParamsSchema.safeParse(req.params);
    if (!params.success) throw new ValidationError(params.error);

    const body = updateBudgetSchema.safeParse(req.body);
    if (!body.success) throw new ValidationError(body.error);

    const data = await budgetService.updateBudget(params.data.id, req.userId, body.data);
    sendSuccess(res, req, data);
  },
  remove: async (req: Request, res: Response): Promise<void> => {
    if (!req.userId) throw new UnauthorizedError();

    const params = budgetParamsSchema.safeParse(req.params);
    if (!params.success) throw new ValidationError(params.error);

    await budgetService.deleteBudget(params.data.id, req.userId);
    sendSuccess(res, req, { deleted: true });
  }
};
