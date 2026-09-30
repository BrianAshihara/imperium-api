import { Router } from "express";
import rateLimit from "express-rate-limit";

import { authMiddleware } from "../../middlewares/auth.middleware";
import { asyncHandler } from "../../utils/async-handler";

import { authController } from "./auth.controller";

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,                   // 20 attempts per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many requests, try again later", code: "RATE_LIMITED" }
});

const authRouter = Router();

authRouter.post("/register", authLimiter, asyncHandler(authController.register));
authRouter.post("/login", authLimiter, asyncHandler(authController.login));
authRouter.get("/me", authMiddleware, asyncHandler(authController.me));

export { authRouter };
