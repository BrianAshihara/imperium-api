import { randomUUID } from "crypto";

import { ConflictError, NotFoundError } from "../../errors";
import { getMonthRange } from "../../utils/period";
import { calculateOccurrencesBetween } from "../../utils/recurrence";
import { categoryService } from "../categories/category.service";

import { budgetRepository } from "./budget.repository";
import { BudgetRecord, BudgetStatus } from "./budget.types";

const computeStatus = (budget: BudgetRecord, spentCents: number): BudgetStatus => ({
  id: budget.id,
  categoryId: budget.categoryId,
  month: budget.month,
  year: budget.year,
  limitAmountCents: budget.limitAmountCents,
  spentCents,
  percentageUsed:
    budget.limitAmountCents > 0
      ? Math.round((spentCents / budget.limitAmountCents) * 10000) / 100
      : 0,
  remainingCents: Math.max(budget.limitAmountCents - spentCents, 0),
  isOverLimit: spentCents > budget.limitAmountCents
});

/**
 * Everything spent in the budget period: one-off expenses plus the recurring
 * ones projected onto the month. Uses the same recurrence math as the reports,
 * so both screens always agree.
 */
const calculateSpent = async (
  userId: string,
  month: number,
  year: number,
  categoryId: string | null
): Promise<number> => {
  const { startDate, endDate } = getMonthRange(month, year);

  const [directSpent, recurringExpenses] = await Promise.all([
    budgetRepository.sumExpensesInMonth(userId, startDate, endDate, categoryId),
    budgetRepository.getRecurringExpenses(userId, categoryId)
  ]);

  return recurringExpenses.reduce((total, expense) => {
    const occurrences = calculateOccurrencesBetween(
      startDate,
      endDate,
      expense.recurrenceType,
      expense.date,
      expense.recurrenceEndDate
    );

    return total + expense.amountCents * occurrences;
  }, directSpent);
};

export const budgetService = {
  createBudget: async (
    userId: string,
    input: {
      categoryId?: string | null;
      month: number;
      year: number;
      limitAmountCents: number;
    }
  ): Promise<BudgetStatus> => {
    const categoryId = input.categoryId ?? null;

    if (categoryId) {
      await categoryService.assertCategoryForType(userId, categoryId, "expense");
    }

    const existing = await budgetRepository.findByUserPeriodCategory(
      userId,
      input.month,
      input.year,
      categoryId
    );

    if (existing) {
      throw new ConflictError(
        "Budget already exists for this period and category",
        "BUDGET_ALREADY_EXISTS"
      );
    }

    const budget = await budgetRepository.create({
      id: randomUUID(),
      userId,
      categoryId,
      month: input.month,
      year: input.year,
      limitAmountCents: input.limitAmountCents
    });

    const spentCents = await calculateSpent(userId, budget.month, budget.year, budget.categoryId);
    return computeStatus(budget, spentCents);
  },
  getBudget: async (id: string, userId: string): Promise<BudgetStatus> => {
    const budget = await budgetRepository.findByIdAndUserId(id, userId);

    if (!budget) {
      throw new NotFoundError("Budget", "BUDGET_NOT_FOUND");
    }

    const spentCents = await calculateSpent(userId, budget.month, budget.year, budget.categoryId);
    return computeStatus(budget, spentCents);
  },
  listBudgets: async (userId: string, month: number, year: number): Promise<BudgetStatus[]> => {
    const budgets = await budgetRepository.listByUserAndPeriod(userId, month, year);

    return Promise.all(
      budgets.map(async (budget) => {
        const spentCents = await calculateSpent(userId, month, year, budget.categoryId);
        return computeStatus(budget, spentCents);
      })
    );
  },
  updateBudget: async (
    id: string,
    userId: string,
    input: { limitAmountCents: number }
  ): Promise<BudgetStatus> => {
    const existing = await budgetRepository.findByIdAndUserId(id, userId);

    if (!existing) {
      throw new NotFoundError("Budget", "BUDGET_NOT_FOUND");
    }

    const budget = await budgetRepository.updateLimitByIdAndUserId(
      id,
      userId,
      input.limitAmountCents
    );

    if (!budget) {
      throw new NotFoundError("Budget", "BUDGET_NOT_FOUND");
    }

    const spentCents = await calculateSpent(userId, budget.month, budget.year, budget.categoryId);
    return computeStatus(budget, spentCents);
  },
  deleteBudget: async (id: string, userId: string): Promise<void> => {
    const deleted = await budgetRepository.deleteByIdAndUserId(id, userId);

    if (!deleted) {
      throw new NotFoundError("Budget", "BUDGET_NOT_FOUND");
    }
  }
};
