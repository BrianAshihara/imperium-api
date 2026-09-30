import { Router } from "express";

import { asyncHandler } from "../../utils/async-handler";

import { expenseController } from "./expense.controller";

const expenseRouter = Router();

expenseRouter.post("/", asyncHandler(expenseController.create));
expenseRouter.get("/", asyncHandler(expenseController.list));
expenseRouter.get("/:id", asyncHandler(expenseController.getById));
expenseRouter.put("/:id", asyncHandler(expenseController.update));
expenseRouter.delete("/:id", asyncHandler(expenseController.remove));

export { expenseRouter };
