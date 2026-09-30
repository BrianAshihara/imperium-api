import { beforeEach, describe, expect, it, vi } from "vitest";

const categoryRepositoryMock = vi.hoisted(() => ({
  findByIdAndUserId: vi.fn()
}));

const incomeRepositoryMock = vi.hoisted(() => ({
  create: vi.fn(),
  findByIdAndUserId: vi.fn(),
  countByUserId: vi.fn(),
  listByUserId: vi.fn(),
  updateByIdAndUserId: vi.fn(),
  deleteByIdAndUserId: vi.fn()
}));

const expenseRepositoryMock = vi.hoisted(() => ({
  create: vi.fn(),
  findByIdAndUserId: vi.fn(),
  countByUserId: vi.fn(),
  listByUserId: vi.fn(),
  updateByIdAndUserId: vi.fn(),
  deleteByIdAndUserId: vi.fn()
}));

vi.mock("../../src/modules/categories/category.repository", () => ({
  categoryRepository: categoryRepositoryMock
}));

vi.mock("../../src/modules/incomes/income.repository", () => ({
  incomeRepository: incomeRepositoryMock
}));

vi.mock("../../src/modules/expenses/expense.repository", () => ({
  expenseRepository: expenseRepositoryMock
}));

import { expenseService } from "../../src/modules/expenses/expense.service";
import { incomeService } from "../../src/modules/incomes/income.service";

describe("incomeService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates incomes with normalized defaults", async () => {
    categoryRepositoryMock.findByIdAndUserId.mockResolvedValue({ id: "cat-1", type: "income" });
    incomeRepositoryMock.create.mockResolvedValue({ id: "inc-1" });

    await expect(incomeService.createIncome("user-1", {
      amountCents: 15000,
      date: "2026-03-10",
      categoryId: "cat-1"
    })).resolves.toEqual({ id: "inc-1" });

    expect(incomeRepositoryMock.create).toHaveBeenCalledWith(expect.objectContaining({
      userId: "user-1",
      amountCents: 15000,
      description: null,
      isRecurring: false,
      recurrenceType: null,
      categoryId: "cat-1"
    }));
  });

  it("requires a recurrence type for recurring incomes", async () => {
    await expect(incomeService.createIncome("user-1", {
      amountCents: 100,
      date: "2026-03-10",
      isRecurring: true
    })).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("rejects non-recurring incomes that still provide recurrence metadata", async () => {
    await expect(incomeService.createIncome("user-1", {
      amountCents: 100,
      date: "2026-03-10",
      recurrenceType: "monthly"
    })).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("lists incomes with pagination metadata", async () => {
    incomeRepositoryMock.countByUserId.mockResolvedValue(3);
    incomeRepositoryMock.listByUserId.mockResolvedValue([{ id: "inc-1" }, { id: "inc-2" }]);

    await expect(incomeService.listIncomes("user-1", { page: 2, limit: 2 }, { startDate: "2026-01-01" })).resolves.toEqual({
      items: [{ id: "inc-1" }, { id: "inc-2" }],
      total: 3,
      page: 2,
      limit: 2,
      totalPages: 2
    });
  });

  it("updates incomes after validating the category and recurrence shape", async () => {
    incomeRepositoryMock.findByIdAndUserId.mockResolvedValue({
      id: "inc-1",
      isRecurring: false,
      recurrenceType: null
    });
    categoryRepositoryMock.findByIdAndUserId.mockResolvedValue({ id: "cat-2", type: "income" });
    incomeRepositoryMock.updateByIdAndUserId.mockResolvedValue({ id: "inc-1", categoryId: "cat-2" });

    await expect(incomeService.updateIncome("inc-1", "user-1", {
      categoryId: "cat-2",
      isRecurring: true,
      recurrenceType: "monthly"
    })).resolves.toEqual({ id: "inc-1", categoryId: "cat-2" });
  });

  it("fails when deleting a missing income", async () => {
    incomeRepositoryMock.deleteByIdAndUserId.mockResolvedValue(false);

    await expect(incomeService.deleteIncome("missing", "user-1")).rejects.toMatchObject({
      code: "INCOME_NOT_FOUND"
    });
  });
});

describe("expenseService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates expenses with normalized defaults", async () => {
    categoryRepositoryMock.findByIdAndUserId.mockResolvedValue({ id: "cat-1", type: "expense" });
    expenseRepositoryMock.create.mockResolvedValue({ id: "exp-1" });

    await expect(expenseService.createExpense("user-1", {
      amountCents: 5000,
      date: "2026-03-10",
      expenseType: "fixed",
      categoryId: "cat-1"
    })).resolves.toEqual({ id: "exp-1" });

    expect(expenseRepositoryMock.create).toHaveBeenCalledWith(expect.objectContaining({
      userId: "user-1",
      categoryId: "cat-1",
      amountCents: 5000,
      description: null,
      isRecurring: false,
      recurrenceType: null,
      expenseType: "fixed"
    }));
  });

  it("requires a recurrence type for recurring expenses", async () => {
    await expect(expenseService.createExpense("user-1", {
      amountCents: 100,
      date: "2026-03-10",
      expenseType: "variable",
      isRecurring: true
    })).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("rejects non-recurring expenses that still provide recurrence metadata", async () => {
    await expect(expenseService.createExpense("user-1", {
      amountCents: 100,
      date: "2026-03-10",
      expenseType: "variable",
      recurrenceType: "monthly"
    })).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("lists expenses with pagination metadata", async () => {
    expenseRepositoryMock.countByUserId.mockResolvedValue(4);
    expenseRepositoryMock.listByUserId.mockResolvedValue([{ id: "exp-1" }, { id: "exp-2" }]);

    await expect(expenseService.listExpenses("user-1", { page: 1, limit: 3 }, { categoryId: "cat-1" })).resolves.toEqual({
      items: [{ id: "exp-1" }, { id: "exp-2" }],
      total: 4,
      page: 1,
      limit: 3,
      totalPages: 2
    });
  });

  it("updates expenses after validating the category and recurrence shape", async () => {
    expenseRepositoryMock.findByIdAndUserId.mockResolvedValue({
      id: "exp-1",
      isRecurring: false,
      recurrenceType: null
    });
    categoryRepositoryMock.findByIdAndUserId.mockResolvedValue({ id: "cat-2", type: "expense" });
    expenseRepositoryMock.updateByIdAndUserId.mockResolvedValue({ id: "exp-1", categoryId: "cat-2" });

    await expect(expenseService.updateExpense("exp-1", "user-1", {
      categoryId: "cat-2",
      isRecurring: true,
      recurrenceType: "weekly"
    })).resolves.toEqual({ id: "exp-1", categoryId: "cat-2" });
  });

  it("fails when deleting a missing expense", async () => {
    expenseRepositoryMock.deleteByIdAndUserId.mockResolvedValue(false);

    await expect(expenseService.deleteExpense("missing", "user-1")).rejects.toMatchObject({
      code: "EXPENSE_NOT_FOUND"
    });
  });
});
