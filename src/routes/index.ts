import { Router } from "express";

import { authMiddleware } from "../middlewares/auth.middleware";
import { authRouter } from "../modules/auth/auth.routes";
import { budgetRouter } from "../modules/budgets/budget.routes";
import { categoryRouter } from "../modules/categories/category.routes";
import { expenseRouter } from "../modules/expenses/expense.routes";
import { healthRouter } from "../modules/health/health.routes";
import { incomeRouter } from "../modules/incomes/income.routes";
import { reportsRouter } from "../modules/reports/reports.routes";

const router = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/incomes", authMiddleware, incomeRouter);
router.use("/expenses", authMiddleware, expenseRouter);
router.use("/budgets", authMiddleware, budgetRouter);
router.use("/categories", authMiddleware, categoryRouter);
router.use("/reports", authMiddleware, reportsRouter);

export { router };
