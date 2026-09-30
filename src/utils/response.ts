import { Request, Response } from "express";

/**
 * Standardized success response.
 */
export const sendSuccess = <T>(
  res: Response,
  req: Request,
  data: T,
  statusCode = 200
): void => {
  res.status(statusCode).json({
    success: true,
    data,
    requestId: req.requestId
  });
};

/**
 * Standardized paginated response.
 */
export const sendPaginated = <T>(
  res: Response,
  req: Request,
  payload: {
    items: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }
): void => {
  res.status(200).json({
    success: true,
    data: payload.items,
    pagination: {
      total: payload.total,
      page: payload.page,
      limit: payload.limit,
      totalPages: payload.totalPages,
      hasNextPage: payload.page < payload.totalPages,
      hasPreviousPage: payload.page > 1
    },
    requestId: req.requestId
  });
};
