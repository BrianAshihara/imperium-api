import { Router } from "express";

import { asyncHandler } from "../../utils/async-handler";

import { categoryController } from "./category.controller";

const categoryRouter = Router();

categoryRouter.get("/", asyncHandler(categoryController.list));
categoryRouter.post("/", asyncHandler(categoryController.create));
categoryRouter.put("/:categoryId", asyncHandler(categoryController.update));
categoryRouter.delete("/:categoryId", asyncHandler(categoryController.remove));

export { categoryRouter };
