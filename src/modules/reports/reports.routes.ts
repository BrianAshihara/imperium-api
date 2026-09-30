import { Router } from "express";

import { asyncHandler } from "../../utils/async-handler";

import { reportsController } from "./reports.controller";

const reportsRouter = Router();

reportsRouter.get("/monthly", asyncHandler(reportsController.monthlySummary));
reportsRouter.get("/categories", asyncHandler(reportsController.categorySummary));
reportsRouter.get("/commitments", asyncHandler(reportsController.commitments));
reportsRouter.get("/evolution", asyncHandler(reportsController.evolution));
reportsRouter.get("/range", asyncHandler(reportsController.dateRange));

export { reportsRouter };
