import { describe, expect, it } from "vitest";

import { loginSchema, registerSchema } from "../../src/modules/auth/auth.validation";
import {
  budgetParamsSchema,
  createBudgetSchema,
  listBudgetsQuerySchema,
  updateBudgetSchema
} from "../../src/modules/budgets/budget.validation";
import {
  categoryParamsSchema,
  createCategorySchema,
  updateCategorySchema
} from "../../src/modules/categories/category.validation";
import {
  createExpenseSchema,
  expenseParamsSchema,
  listExpensesQuerySchema,
  updateExpenseSchema
} from "../../src/modules/expenses/expense.validation";
import {
  createIncomeSchema,
  incomeParamsSchema,
  listIncomesQuerySchema,
  updateIncomeSchema
} from "../../src/modules/incomes/income.validation";
import {
  categorySummaryQuerySchema,
  dateRangeQuerySchema,
  evolutionQuerySchema,
  monthlySummaryQuerySchema
} from "../../src/modules/reports/reports.validation";

describe("validation schemas", () => {
  it("validates auth payloads", () => {
    expect(registerSchema.safeParse({ email: "john@example.com", password: "secret123", name: "John" }).success).toBe(true);
    expect(registerSchema.safeParse({ email: "bad", password: "short" }).success).toBe(false);
    expect(loginSchema.safeParse({ email: "john@example.com", password: "secret123" }).success).toBe(true);
    expect(loginSchema.safeParse({ email: "bad", password: "short" }).success).toBe(false);
  });

  it("validates budget payloads", () => {
    expect(createBudgetSchema.safeParse({ month: 3, year: 2026, limitAmountCents: 1000 }).success).toBe(true);
    expect(updateBudgetSchema.safeParse({ limitAmountCents: 1000 }).success).toBe(true);
    expect(budgetParamsSchema.safeParse({ id: "budget-1" }).success).toBe(true);
    expect(listBudgetsQuerySchema.safeParse({ month: "3", year: "2026" }).success).toBe(true);
    expect(createBudgetSchema.safeParse({ month: 13, year: 1999, limitAmountCents: 0 }).success).toBe(false);
  });

  it("validates category payloads", () => {
    expect(createCategorySchema.safeParse({ name: "Food", type: "expense" }).success).toBe(true);
    expect(updateCategorySchema.safeParse({ name: "Bills" }).success).toBe(true);
    expect(categoryParamsSchema.safeParse({ categoryId: "cat-1" }).success).toBe(true);
    expect(createCategorySchema.safeParse({ name: "A", type: "other" }).success).toBe(false);
  });

  it("validates income payloads", () => {
    expect(createIncomeSchema.safeParse({ amountCents: 100, date: "2026-03-01" }).success).toBe(true);
    expect(updateIncomeSchema.safeParse({ recurrenceType: null }).success).toBe(true);
    expect(incomeParamsSchema.safeParse({ id: "inc-1" }).success).toBe(true);
    expect(listIncomesQuerySchema.safeParse({ page: "2", limit: "10", startDate: "2026-03-01" }).success).toBe(true);
    expect(createIncomeSchema.safeParse({ amountCents: -1, date: "03/01/2026" }).success).toBe(false);
    expect(createIncomeSchema.safeParse({ amountCents: 0, date: "2026-03-01" }).success).toBe(false);
  });

  it("rejects dates that match the format but do not exist", () => {
    expect(createIncomeSchema.safeParse({ amountCents: 100, date: "2026-02-31" }).success).toBe(false);
    expect(createIncomeSchema.safeParse({ amountCents: 100, date: "2026-13-01" }).success).toBe(false);
    expect(createIncomeSchema.safeParse({ amountCents: 100, date: "2024-02-29" }).success).toBe(true);
  });

  it("accepts a recurrence end date on both entry types", () => {
    expect(
      createIncomeSchema.safeParse({
        amountCents: 100,
        date: "2026-03-01",
        isRecurring: true,
        recurrenceType: "monthly",
        recurrenceEndDate: "2026-12-01"
      }).success
    ).toBe(true);
    expect(updateExpenseSchema.safeParse({ recurrenceEndDate: null }).success).toBe(true);
  });

  it("validates expense payloads", () => {
    expect(createExpenseSchema.safeParse({ amountCents: 100, date: "2026-03-01", expenseType: "fixed" }).success).toBe(true);
    expect(updateExpenseSchema.safeParse({ recurrenceType: null }).success).toBe(true);
    expect(expenseParamsSchema.safeParse({ id: "exp-1" }).success).toBe(true);
    expect(listExpensesQuerySchema.safeParse({ page: "2", limit: "10", categoryId: "cat-1" }).success).toBe(true);
    expect(createExpenseSchema.safeParse({ amountCents: -1, date: "03/01/2026", expenseType: "bad" }).success).toBe(false);
  });

  it("validates reports payloads", () => {
    expect(monthlySummaryQuerySchema.safeParse({ month: "3", year: "2026" }).success).toBe(true);
    expect(categorySummaryQuerySchema.safeParse({ month: "3", year: "2026" }).success).toBe(true);
    expect(dateRangeQuerySchema.safeParse({ startDate: "2026-03-01", endDate: "2026-03-31" }).success).toBe(true);
    expect(monthlySummaryQuerySchema.safeParse({ month: "0", year: "1999" }).success).toBe(false);
    expect(dateRangeQuerySchema.safeParse({ startDate: "03/01/2026", endDate: "03/31/2026" }).success).toBe(false);
  });

  it("rejects an inverted date range", () => {
    expect(
      dateRangeQuerySchema.safeParse({ startDate: "2026-03-31", endDate: "2026-03-01" }).success
    ).toBe(false);
  });

  it("validates the evolution query with its default window", () => {
    const parsed = evolutionQuerySchema.safeParse({ month: "3", year: "2026" });

    expect(parsed.success && parsed.data.months).toBe(6);
    expect(evolutionQuerySchema.safeParse({ month: "3", year: "2026", months: "12" }).success).toBe(true);
    expect(evolutionQuerySchema.safeParse({ month: "3", year: "2026", months: "0" }).success).toBe(false);
  });

});
