import { Router } from "express";

import { asyncHandler } from "../../utils/async-handler";

import { incomeController } from "./income.controller";

const incomeRouter = Router();

incomeRouter.post("/", asyncHandler(incomeController.create));
incomeRouter.get("/", asyncHandler(incomeController.list));
incomeRouter.get("/:id", asyncHandler(incomeController.getById));
incomeRouter.put("/:id", asyncHandler(incomeController.update));
incomeRouter.delete("/:id", asyncHandler(incomeController.remove));

export { incomeRouter };
