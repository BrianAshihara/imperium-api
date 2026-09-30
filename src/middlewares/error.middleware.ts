import { NextFunction, Request, Response } from "express";

import { env } from "../config/env";
import { AppError, ValidationError } from "../errors";

export const notFoundMiddleware = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  next(new AppError(`Route ${req.method} ${req.originalUrl} not found`, 404, "ROUTE_NOT_FOUND"));
};

export const errorMiddleware = (
  error: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  if (error instanceof ValidationError) {
    res.status(error.statusCode).json({
      success: false,
      message: error.message,
      code: error.code,
      errors: error.fieldErrors,
      requestId: req.requestId
    });
    return;
  }

  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      success: false,
      message: error.message,
      code: error.code,
      requestId: req.requestId
    });
    return;
  }

  const isProduction = env.NODE_ENV === "production";

  res.status(500).json({
    success: false,
    message: "Internal server error",
    code: "INTERNAL_SERVER_ERROR",
    requestId: req.requestId,
    ...(isProduction ? {} : { detail: error instanceof Error ? error.message : "Unknown error" })
  });
};
