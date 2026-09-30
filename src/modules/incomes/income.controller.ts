import { Request, Response } from "express";

import { UnauthorizedError, ValidationError } from "../../errors";
import { normalizePagination } from "../../utils/pagination";
import { sendPaginated, sendSuccess } from "../../utils/response";

import { incomeService } from "./income.service";
import {
  createIncomeSchema,
  incomeParamsSchema,
  listIncomesQuerySchema,
  updateIncomeSchema
} from "./income.validation";

export const incomeController = {
  create: async (req: Request, res: Response): Promise<void> => {
    if (!req.userId) throw new UnauthorizedError();

    const parsed = createIncomeSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error);

    const data = await incomeService.createIncome(req.userId, parsed.data);
    sendSuccess(res, req, data, 201);
  },
  getById: async (req: Request, res: Response): Promise<void> => {
    if (!req.userId) throw new UnauthorizedError();

    const params = incomeParamsSchema.safeParse(req.params);
    if (!params.success) throw new ValidationError(params.error);

    const data = await incomeService.getIncome(params.data.id, req.userId);
    sendSuccess(res, req, data);
  },
  list: async (req: Request, res: Response): Promise<void> => {
    if (!req.userId) throw new UnauthorizedError();

    const query = listIncomesQuerySchema.safeParse(req.query);
    if (!query.success) throw new ValidationError(query.error);

    const pagination = normalizePagination(query.data.page, query.data.limit);
    const filters = {
      startDate: query.data.startDate,
      endDate: query.data.endDate,
      categoryId: query.data.categoryId
    };

    const result = await incomeService.listIncomes(req.userId, pagination, filters);
    sendPaginated(res, req, result);
  },
  update: async (req: Request, res: Response): Promise<void> => {
    if (!req.userId) throw new UnauthorizedError();

    const params = incomeParamsSchema.safeParse(req.params);
    if (!params.success) throw new ValidationError(params.error);

    const body = updateIncomeSchema.safeParse(req.body);
    if (!body.success) throw new ValidationError(body.error);

    const data = await incomeService.updateIncome(params.data.id, req.userId, body.data);
    sendSuccess(res, req, data);
  },
  remove: async (req: Request, res: Response): Promise<void> => {
    if (!req.userId) throw new UnauthorizedError();

    const params = incomeParamsSchema.safeParse(req.params);
    if (!params.success) throw new ValidationError(params.error);

    await incomeService.deleteIncome(params.data.id, req.userId);
    sendSuccess(res, req, { deleted: true });
  }
};
