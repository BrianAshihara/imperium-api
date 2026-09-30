import { Request, Response } from "express";

import { UnauthorizedError, ValidationError } from "../../errors";
import { normalizePagination } from "../../utils/pagination";
import { sendPaginated, sendSuccess } from "../../utils/response";

import { expenseService } from "./expense.service";
import {
  createExpenseSchema,
  expenseParamsSchema,
  listExpensesQuerySchema,
  updateExpenseSchema
} from "./expense.validation";

export const expenseController = {
  create: async (req: Request, res: Response): Promise<void> => {
    if (!req.userId) throw new UnauthorizedError();

    const parsed = createExpenseSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error);

    const data = await expenseService.createExpense(req.userId, parsed.data);
    sendSuccess(res, req, data, 201);
  },
  getById: async (req: Request, res: Response): Promise<void> => {
    if (!req.userId) throw new UnauthorizedError();

    const params = expenseParamsSchema.safeParse(req.params);
    if (!params.success) throw new ValidationError(params.error);

    const data = await expenseService.getExpense(params.data.id, req.userId);
    sendSuccess(res, req, data);
  },
  list: async (req: Request, res: Response): Promise<void> => {
    if (!req.userId) throw new UnauthorizedError();

    const query = listExpensesQuerySchema.safeParse(req.query);
    if (!query.success) throw new ValidationError(query.error);

    const pagination = normalizePagination(query.data.page, query.data.limit);
    const filters = {
      startDate: query.data.startDate,
      endDate: query.data.endDate,
      categoryId: query.data.categoryId
    };

    const result = await expenseService.listExpenses(req.userId, pagination, filters);
    sendPaginated(res, req, result);
  },
  update: async (req: Request, res: Response): Promise<void> => {
    if (!req.userId) throw new UnauthorizedError();

    const params = expenseParamsSchema.safeParse(req.params);
    if (!params.success) throw new ValidationError(params.error);

    const body = updateExpenseSchema.safeParse(req.body);
    if (!body.success) throw new ValidationError(body.error);

    const data = await expenseService.updateExpense(params.data.id, req.userId, body.data);
    sendSuccess(res, req, data);
  },
  remove: async (req: Request, res: Response): Promise<void> => {
    if (!req.userId) throw new UnauthorizedError();

    const params = expenseParamsSchema.safeParse(req.params);
    if (!params.success) throw new ValidationError(params.error);

    await expenseService.deleteExpense(params.data.id, req.userId);
    sendSuccess(res, req, { deleted: true });
  }
};
