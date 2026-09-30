import { Request, Response } from "express";

import { UnauthorizedError, ValidationError } from "../../errors";
import { sendSuccess } from "../../utils/response";

import { categoryService } from "./category.service";
import {
  categoryParamsSchema,
  createCategorySchema,
  updateCategorySchema
} from "./category.validation";

export const categoryController = {
  list: async (req: Request, res: Response): Promise<void> => {
    if (!req.userId) throw new UnauthorizedError();

    const data = await categoryService.listCategories(req.userId);
    sendSuccess(res, req, data);
  },
  create: async (req: Request, res: Response): Promise<void> => {
    if (!req.userId) throw new UnauthorizedError();

    const parsed = createCategorySchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error);

    const data = await categoryService.createCustomCategory(req.userId, parsed.data);
    sendSuccess(res, req, data, 201);
  },
  update: async (req: Request, res: Response): Promise<void> => {
    if (!req.userId) throw new UnauthorizedError();

    const params = categoryParamsSchema.safeParse(req.params);
    if (!params.success) throw new ValidationError(params.error);

    const body = updateCategorySchema.safeParse(req.body);
    if (!body.success) throw new ValidationError(body.error);

    const data = await categoryService.updateCategory(
      req.userId,
      params.data.categoryId,
      body.data
    );
    sendSuccess(res, req, data);
  },
  remove: async (req: Request, res: Response): Promise<void> => {
    if (!req.userId) throw new UnauthorizedError();

    const parsed = categoryParamsSchema.safeParse(req.params);
    if (!parsed.success) throw new ValidationError(parsed.error);

    await categoryService.deleteCategory(req.userId, parsed.data.categoryId);
    sendSuccess(res, req, { deleted: true });
  }
};
