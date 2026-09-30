import { beforeEach, describe, expect, it, vi } from "vitest";

const categoryRepositoryMock = vi.hoisted(() => ({
  findByIdAndUserId: vi.fn()
}));

const budgetRepositoryMock = vi.hoisted(() => ({
  findByUserPeriodCategory: vi.fn(),
  create: vi.fn(),
  sumExpensesInMonth: vi.fn(),
  getRecurringExpenses: vi.fn(),
  findByIdAndUserId: vi.fn(),
  listByUserAndPeriod: vi.fn(),
  updateLimitByIdAndUserId: vi.fn(),
  deleteByIdAndUserId: vi.fn()
}));

const reportsRepositoryMock = vi.hoisted(() => ({
  sumNonRecurringIncomes: vi.fn(),
  sumNonRecurringExpenses: vi.fn(),
  sumNonRecurringExpensesByType: vi.fn(),
  listNonRecurringFixedExpenses: vi.fn(),
  getRecurringIncomes: vi.fn(),
  getRecurringExpenses: vi.fn(),
  groupExpensesByCategory: vi.fn()
}));

const calculateOccurrencesBetweenMock = vi.hoisted(() => vi.fn());

vi.mock("../../src/modules/categories/category.repository", () => ({
  categoryRepository: categoryRepositoryMock
}));

vi.mock("../../src/modules/budgets/budget.repository", () => ({
  budgetRepository: budgetRepositoryMock
}));

vi.mock("../../src/modules/reports/reports.repository", () => ({
  reportsRepository: reportsRepositoryMock
}));

vi.mock("../../src/utils/recurrence", () => ({
  calculateOccurrencesBetween: calculateOccurrencesBetweenMock
}));

import { budgetService } from "../../src/modules/budgets/budget.service";
import { reportsService } from "../../src/modules/reports/reports.service";

describe("budgetService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Budgets project recurring expenses through the shared helper
    calculateOccurrencesBetweenMock.mockImplementation((_start: string, _end: string, type: string) => {
      if (type === "monthly") return 1;
      if (type === "weekly") return 4;
      return 0;
    });
  });

  it("creates a budget and computes its status from direct and recurring spend", async () => {
    categoryRepositoryMock.findByIdAndUserId.mockResolvedValue({ id: "cat-1", type: "expense" });
    budgetRepositoryMock.findByUserPeriodCategory.mockResolvedValue(null);
    budgetRepositoryMock.create.mockResolvedValue({
      id: "budget-1",
      categoryId: "cat-1",
      month: 3,
      year: 2026,
      limitAmountCents: 10000,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z"
    });
    budgetRepositoryMock.sumExpensesInMonth.mockResolvedValue(2500);
    budgetRepositoryMock.getRecurringExpenses.mockResolvedValue([
      { amountCents: 1000, recurrenceType: "monthly", date: "2026-01-01" },
      { amountCents: 700, recurrenceType: "weekly", date: "2026-02-15" }
    ]);

    const result = await budgetService.createBudget("user-1", {
      categoryId: "cat-1",
      month: 3,
      year: 2026,
      limitAmountCents: 10000
    });

    expect(result).toEqual({
      id: "budget-1",
      categoryId: "cat-1",
      month: 3,
      year: 2026,
      limitAmountCents: 10000,
      spentCents: 6300,
      percentageUsed: 63,
      remainingCents: 3700,
      isOverLimit: false
    });
  });

  it("rejects duplicate budgets", async () => {
    budgetRepositoryMock.findByUserPeriodCategory.mockResolvedValue({ id: "existing" });

    await expect(budgetService.createBudget("user-1", {
      month: 3,
      year: 2026,
      limitAmountCents: 1000
    })).rejects.toMatchObject({ code: "BUDGET_ALREADY_EXISTS" });
  });

  it("lists budgets with calculated status", async () => {
    budgetRepositoryMock.listByUserAndPeriod.mockResolvedValue([
      {
        id: "budget-1",
        categoryId: null,
        month: 4,
        year: 2026,
        limitAmountCents: 5000,
        createdAt: "",
        updatedAt: ""
      },
      {
        id: "budget-2",
        categoryId: "cat-1",
        month: 4,
        year: 2026,
        limitAmountCents: 10000,
        createdAt: "",
        updatedAt: ""
      }
    ]);
    budgetRepositoryMock.sumExpensesInMonth.mockResolvedValueOnce(3000).mockResolvedValueOnce(2000);
    budgetRepositoryMock.getRecurringExpenses.mockResolvedValueOnce([]).mockResolvedValueOnce([
      { amountCents: 1000, recurrenceType: "monthly", date: "2026-01-01" }
    ]);

    await expect(budgetService.listBudgets("user-1", 4, 2026)).resolves.toEqual([
      expect.objectContaining({ id: "budget-1", spentCents: 3000, isOverLimit: false }),
      expect.objectContaining({ id: "budget-2", spentCents: 3000, isOverLimit: false })
    ]);
  });

  it("updates an existing budget", async () => {
    budgetRepositoryMock.findByIdAndUserId.mockResolvedValue({ id: "budget-1" });
    budgetRepositoryMock.updateLimitByIdAndUserId.mockResolvedValue({
      id: "budget-1",
      categoryId: null,
      month: 4,
      year: 2026,
      limitAmountCents: 2000,
      createdAt: "",
      updatedAt: ""
    });
    budgetRepositoryMock.sumExpensesInMonth.mockResolvedValue(2500);
    budgetRepositoryMock.getRecurringExpenses.mockResolvedValue([]);

    await expect(budgetService.updateBudget("budget-1", "user-1", { limitAmountCents: 2000 })).resolves.toEqual(
      expect.objectContaining({
        spentCents: 2500,
        remainingCents: 0,
        isOverLimit: true,
        percentageUsed: 125
      })
    );
  });

  it("fails when deleting a missing budget", async () => {
    budgetRepositoryMock.deleteByIdAndUserId.mockResolvedValue(false);

    await expect(budgetService.deleteBudget("missing", "user-1")).rejects.toMatchObject({
      code: "BUDGET_NOT_FOUND"
    });
  });
});

describe("reportsService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("builds a monthly summary including recurring entries", async () => {
    reportsRepositoryMock.sumNonRecurringIncomes.mockResolvedValue(5000);
    reportsRepositoryMock.sumNonRecurringExpenses.mockResolvedValue(2200);
    reportsRepositoryMock.getRecurringIncomes.mockResolvedValue([
      { amount_cents: 1000, recurrence_type: "monthly", date: "2026-01-01" }
    ]);
    reportsRepositoryMock.getRecurringExpenses.mockResolvedValue([
      { amount_cents: 300, recurrence_type: "weekly", date: "2026-02-01" }
    ]);
    calculateOccurrencesBetweenMock.mockImplementation((_start: string, _end: string, type: string) => {
      if (type === "monthly") return 1;
      if (type === "weekly") return 4;
      return 0;
    });

    await expect(reportsService.getMonthlySummary("user-1", 3, 2026)).resolves.toEqual({
      month: 3,
      year: 2026,
      totalIncomeCents: 6000,
      totalExpensesCents: 3400,
      netBalanceCents: 2600,
      savingsRate: 43.33
    });
  });

  it("builds a category summary and merges recurring uncategorized expenses", async () => {
    reportsRepositoryMock.groupExpensesByCategory.mockResolvedValue([
      {
        category_id: "cat-1",
        category_name: "Food",
        total_cents: 2000
      }
    ]);
    reportsRepositoryMock.getRecurringExpenses.mockResolvedValue([
      {
        category_id: null,
        category_name: null,
        amount_cents: 500,
        recurrence_type: "monthly",
        date: "2026-01-01",
        recurrence_end_date: null
      },
      {
        category_id: "cat-1",
        category_name: "Food",
        amount_cents: 300,
        recurrence_type: "monthly",
        date: "2026-01-01",
        recurrence_end_date: null
      }
    ]);
    calculateOccurrencesBetweenMock.mockReturnValue(1);

    const result = await reportsService.getCategorySummary("user-1", 3, 2026);

    expect(result.totalExpensesCents).toBe(2800);
    expect(result.categories).toEqual([
      {
        categoryId: "cat-1",
        categoryName: "Food",
        totalCents: 2300,
        percentage: 82.14
      },
      {
        categoryId: null,
        categoryName: null,
        totalCents: 500,
        percentage: 17.86
      }
    ]);
  });

  it("builds the evolution series oldest first", async () => {
    reportsRepositoryMock.sumNonRecurringIncomes.mockResolvedValue(1000);
    reportsRepositoryMock.sumNonRecurringExpenses.mockResolvedValue(400);
    reportsRepositoryMock.getRecurringIncomes.mockResolvedValue([]);
    reportsRepositoryMock.getRecurringExpenses.mockResolvedValue([]);

    const result = await reportsService.getEvolution("user-1", 3, 2, 2026);

    expect(result).toEqual([
      { month: 12, year: 2025, totalIncomeCents: 1000, totalExpensesCents: 400, netBalanceCents: 600 },
      { month: 1, year: 2026, totalIncomeCents: 1000, totalExpensesCents: 400, netBalanceCents: 600 },
      { month: 2, year: 2026, totalIncomeCents: 1000, totalExpensesCents: 400, netBalanceCents: 600 }
    ]);
  });

  it("separates committed money from what is still free", async () => {
    reportsRepositoryMock.sumNonRecurringIncomes.mockResolvedValue(600000);
    reportsRepositoryMock.getRecurringIncomes.mockResolvedValue([]);
    reportsRepositoryMock.sumNonRecurringExpensesByType.mockResolvedValue({
      fixed_cents: 80000,
      variable_cents: 120000,
    });
    reportsRepositoryMock.listNonRecurringFixedExpenses.mockResolvedValue([
      { description: "IPTU", amount_cents: 80000, category_name: "Moradia" },
    ]);
    reportsRepositoryMock.getRecurringExpenses.mockResolvedValue([
      {
        description: "Aluguel",
        category_name: "Moradia",
        amount_cents: 180000,
        recurrence_type: "monthly",
        date: "2026-01-10",
        recurrence_end_date: null,
      },
    ]);
    calculateOccurrencesBetweenMock.mockReturnValue(1);

    const result = await reportsService.getCommitments("user-1", 3, 2026);

    expect(result.committedCents).toBe(260000);
    expect(result.variableCents).toBe(120000);
    expect(result.freeCents).toBe(220000);
    expect(result.committedShare).toBeCloseTo(43.33, 1);
    expect(result.items.map((item) => item.description)).toEqual(["Aluguel", "IPTU"]);
    expect(result.items[0].isRecurring).toBe(true);
  });

  it("builds a date-range report and guards savings rate when income is zero", async () => {
    reportsRepositoryMock.sumNonRecurringIncomes.mockResolvedValue(0);
    reportsRepositoryMock.sumNonRecurringExpenses.mockResolvedValue(500);
    reportsRepositoryMock.getRecurringIncomes.mockResolvedValue([]);
    reportsRepositoryMock.getRecurringExpenses.mockResolvedValue([]);

    await expect(reportsService.getDateRangeReport("user-1", "2026-03-01", "2026-03-31")).resolves.toEqual({
      startDate: "2026-03-01",
      endDate: "2026-03-31",
      totalIncomeCents: 0,
      totalExpensesCents: 500,
      netBalanceCents: -500,
      savingsRate: 0
    });
  });
});
