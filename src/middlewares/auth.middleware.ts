import { NextFunction, Request, Response } from "express";

import { UnauthorizedError } from "../errors";
import { verifyAccessToken } from "../utils/jwt";

export const authMiddleware = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  const authorization = req.headers.authorization;

  if (!authorization || !authorization.startsWith("Bearer ")) {
    next(new UnauthorizedError("Missing token", "MISSING_TOKEN"));
    return;
  }

  const token = authorization.slice("Bearer ".length).trim();

  if (!token) {
    next(new UnauthorizedError("Missing token", "MISSING_TOKEN"));
    return;
  }

  try {
    const payload = verifyAccessToken(token);
    req.userId = payload.sub;
    next();
  } catch {
    next(new UnauthorizedError("Invalid token", "INVALID_TOKEN"));
  }
};
