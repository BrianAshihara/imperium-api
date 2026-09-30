import { Router } from "express";

import { asyncHandler } from "../../utils/async-handler";

import { healthController } from "./health.controller";

const healthRouter = Router();

healthRouter.get("/health", asyncHandler(healthController.check));

export { healthRouter };
