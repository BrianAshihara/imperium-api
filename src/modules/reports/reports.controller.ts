import { Request, Response } from "express";

import { UnauthorizedError, ValidationError } from "../../errors";
import { sendSuccess } from "../../utils/response";

import { reportsService } from "./reports.service";
import {
  categorySummaryQuerySchema,
  commitmentsQuerySchema,
  dateRangeQuerySchema,
  evolutionQuerySchema,
  monthlySummaryQuerySchema
} from "./reports.validation";

export const reportsController = {
  monthlySummary: async (req: Request, res: Response): Promise<void> => {
    if (!req.userId) throw new UnauthorizedError();

    const query = monthlySummaryQuerySchema.safeParse(req.query);
    if (!query.success) throw new ValidationError(query.error);

    const data = await reportsService.getMonthlySummary(
      req.userId,
      query.data.month,
      query.data.year
    );
    sendSuccess(res, req, data);
  },
  categorySummary: async (req: Request, res: Response): Promise<void> => {
    if (!req.userId) throw new UnauthorizedError();

    const query = categorySummaryQuerySchema.safeParse(req.query);
    if (!query.success) throw new ValidationError(query.error);

    const data = await reportsService.getCategorySummary(
      req.userId,
      query.data.month,
      query.data.year
    );
    sendSuccess(res, req, data);
  },
  dateRange: async (req: Request, res: Response): Promise<void> => {
    if (!req.userId) throw new UnauthorizedError();

    const query = dateRangeQuerySchema.safeParse(req.query);
    if (!query.success) throw new ValidationError(query.error);

    const data = await reportsService.getDateRangeReport(
      req.userId,
      query.data.startDate,
      query.data.endDate
    );
    sendSuccess(res, req, data);
  },
  commitments: async (req: Request, res: Response): Promise<void> => {
    if (!req.userId) throw new UnauthorizedError();

    const query = commitmentsQuerySchema.safeParse(req.query);
    if (!query.success) throw new ValidationError(query.error);

    const data = await reportsService.getCommitments(
      req.userId,
      query.data.month,
      query.data.year
    );
    sendSuccess(res, req, data);
  },
  evolution: async (req: Request, res: Response): Promise<void> => {
    if (!req.userId) throw new UnauthorizedError();

    const query = evolutionQuerySchema.safeParse(req.query);
    if (!query.success) throw new ValidationError(query.error);

    const data = await reportsService.getEvolution(
      req.userId,
      query.data.months,
      query.data.month,
      query.data.year
    );
    sendSuccess(res, req, data);
  }
};
