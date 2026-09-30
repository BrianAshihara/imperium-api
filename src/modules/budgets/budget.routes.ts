import { Router } from "express";

import { asyncHandler } from "../../utils/async-handler";

import { budgetController } from "./budget.controller";

const budgetRouter = Router();

budgetRouter.post("/", asyncHandler(budgetController.create));
budgetRouter.get("/", asyncHandler(budgetController.list));
budgetRouter.get("/:id", asyncHandler(budgetController.getById));
budgetRouter.put("/:id", asyncHandler(budgetController.update));
budgetRouter.delete("/:id", asyncHandler(budgetController.remove));

export { budgetRouter };
