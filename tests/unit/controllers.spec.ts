import { beforeEach, describe, expect, it, vi } from "vitest";

const authServiceMock = vi.hoisted(() => ({
  register: vi.fn(),
  login: vi.fn(),
  getProfile: vi.fn()
}));

const categoryServiceMock = vi.hoisted(() => ({
  listCategories: vi.fn(),
  createCustomCategory: vi.fn(),
  updateCategory: vi.fn(),
  deleteCategory: vi.fn()
}));

const incomeServiceMock = vi.hoisted(() => ({
  createIncome: vi.fn(),
  getIncome: vi.fn(),
  listIncomes: vi.fn(),
  updateIncome: vi.fn(),
  deleteIncome: vi.fn()
}));

const expenseServiceMock = vi.hoisted(() => ({
  createExpense: vi.fn(),
  getExpense: vi.fn(),
  listExpenses: vi.fn(),
  updateExpense: vi.fn(),
  deleteExpense: vi.fn()
}));

const budgetServiceMock = vi.hoisted(() => ({
  createBudget: vi.fn(),
  getBudget: vi.fn(),
  listBudgets: vi.fn(),
  updateBudget: vi.fn(),
  deleteBudget: vi.fn()
}));

const reportsServiceMock = vi.hoisted(() => ({
  getMonthlySummary: vi.fn(),
  getCategorySummary: vi.fn(),
  getDateRangeReport: vi.fn(),
  getEvolution: vi.fn()
}));

const healthServiceMock = vi.hoisted(() => ({
  getStatus: vi.fn()
}));

const sendSuccessMock = vi.hoisted(() => vi.fn());
const sendPaginatedMock = vi.hoisted(() => vi.fn());

vi.mock("../../src/modules/auth/auth.service", () => ({ authService: authServiceMock }));
vi.mock("../../src/modules/categories/category.service", () => ({ categoryService: categoryServiceMock }));
vi.mock("../../src/modules/incomes/income.service", () => ({ incomeService: incomeServiceMock }));
vi.mock("../../src/modules/expenses/expense.service", () => ({ expenseService: expenseServiceMock }));
vi.mock("../../src/modules/budgets/budget.service", () => ({ budgetService: budgetServiceMock }));
vi.mock("../../src/modules/reports/reports.service", () => ({ reportsService: reportsServiceMock }));
vi.mock("../../src/modules/health/health.service", () => ({ healthService: healthServiceMock }));
vi.mock("../../src/utils/response", () => ({ sendSuccess: sendSuccessMock, sendPaginated: sendPaginatedMock }));

import { authController } from "../../src/modules/auth/auth.controller";
import { budgetController } from "../../src/modules/budgets/budget.controller";
import { categoryController } from "../../src/modules/categories/category.controller";
import { expenseController } from "../../src/modules/expenses/expense.controller";
import { healthController } from "../../src/modules/health/health.controller";
import { incomeController } from "../../src/modules/incomes/income.controller";
import { reportsController } from "../../src/modules/reports/reports.controller";
import { createMockRequest, createMockResponse } from "./helpers/http";

describe("controllers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("authController.register validates input and sends a 201 response", async () => {
    authServiceMock.register.mockResolvedValue({ accessToken: "token" });
    const req = createMockRequest({
      body: { email: "john@example.com", password: "secret123", name: "John" },
      requestId: "req-1"
    });

    await authController.register(req, createMockResponse());

    expect(authServiceMock.register).toHaveBeenCalledWith("john@example.com", "secret123", "John");
    expect(sendSuccessMock).toHaveBeenCalledWith(expect.anything(), req, { accessToken: "token" }, 201);
  });

  it("authController.login rejects invalid input", async () => {
    await expect(authController.login(
      createMockRequest({ body: { email: "bad", password: "short" } }),
      createMockResponse()
    )).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("authController.me requires authentication", async () => {
    await expect(authController.me(createMockRequest(), createMockResponse())).rejects.toMatchObject({
      code: "UNAUTHORIZED"
    });
  });

  it("categoryController.create validates input and returns a created response", async () => {
    categoryServiceMock.createCustomCategory.mockResolvedValue({ id: "cat-1" });
    const req = createMockRequest({ userId: "user-1", body: { name: "Food", type: "expense" } });

    await categoryController.create(req, createMockResponse());

    expect(categoryServiceMock.createCustomCategory).toHaveBeenCalledWith("user-1", { name: "Food", type: "expense" });
    expect(sendSuccessMock).toHaveBeenCalledWith(expect.anything(), req, { id: "cat-1" }, 201);
  });

  it("categoryController.update validates params and body", async () => {
    categoryServiceMock.updateCategory.mockResolvedValue({ id: "cat-1" });
    const req = createMockRequest({ userId: "user-1", params: { categoryId: "cat-1" }, body: { name: "Bills" } });

    await categoryController.update(req, createMockResponse());

    expect(categoryServiceMock.updateCategory).toHaveBeenCalledWith("user-1", "cat-1", { name: "Bills" });
  });

  it("categoryController.remove deletes a category", async () => {
    const req = createMockRequest({ userId: "user-1", params: { categoryId: "cat-1" } });

    await categoryController.remove(req, createMockResponse());

    expect(categoryServiceMock.deleteCategory).toHaveBeenCalledWith("user-1", "cat-1");
    expect(sendSuccessMock).toHaveBeenCalledWith(expect.anything(), req, { deleted: true });
  });

  it("incomeController.create validates body and delegates to the service", async () => {
    incomeServiceMock.createIncome.mockResolvedValue({ id: "inc-1" });
    const req = createMockRequest({ userId: "user-1", body: { amountCents: 100, date: "2026-03-01" } });

    await incomeController.create(req, createMockResponse());

    expect(incomeServiceMock.createIncome).toHaveBeenCalledWith("user-1", expect.objectContaining({ amountCents: 100 }));
  });

  it("incomeController.getById validates params", async () => {
    incomeServiceMock.getIncome.mockResolvedValue({ id: "inc-1" });
    const req = createMockRequest({ userId: "user-1", params: { id: "inc-1" } });

    await incomeController.getById(req, createMockResponse());

    expect(incomeServiceMock.getIncome).toHaveBeenCalledWith("inc-1", "user-1");
  });

  it("incomeController.list normalizes pagination and uses paginated responses", async () => {
    incomeServiceMock.listIncomes.mockResolvedValue({ items: [], total: 0, page: 2, limit: 5, totalPages: 0 });
    const req = createMockRequest({ userId: "user-1", query: { page: "2", limit: "5", startDate: "2026-03-01" } });

    await incomeController.list(req, createMockResponse());

    expect(incomeServiceMock.listIncomes).toHaveBeenCalledWith("user-1", { page: 2, limit: 5 }, {
      startDate: "2026-03-01",
      endDate: undefined,
      categoryId: undefined
    });
    expect(sendPaginatedMock).toHaveBeenCalled();
  });

  it("incomeController.update validates params and body", async () => {
    incomeServiceMock.updateIncome.mockResolvedValue({ id: "inc-1" });
    const req = createMockRequest({ userId: "user-1", params: { id: "inc-1" }, body: { amountCents: 200 } });

    await incomeController.update(req, createMockResponse());

    expect(incomeServiceMock.updateIncome).toHaveBeenCalledWith("inc-1", "user-1", { amountCents: 200 });
  });

  it("incomeController.remove deletes an income", async () => {
    const req = createMockRequest({ userId: "user-1", params: { id: "inc-1" } });

    await incomeController.remove(req, createMockResponse());

    expect(incomeServiceMock.deleteIncome).toHaveBeenCalledWith("inc-1", "user-1");
  });

  it("expenseController.create validates body and delegates to the service", async () => {
    expenseServiceMock.createExpense.mockResolvedValue({ id: "exp-1" });
    const req = createMockRequest({ userId: "user-1", body: { amountCents: 100, date: "2026-03-01", expenseType: "fixed" } });

    await expenseController.create(req, createMockResponse());

    expect(expenseServiceMock.createExpense).toHaveBeenCalledWith("user-1", expect.objectContaining({ amountCents: 100 }));
  });

  it("expenseController.getById validates params", async () => {
    expenseServiceMock.getExpense.mockResolvedValue({ id: "exp-1" });
    const req = createMockRequest({ userId: "user-1", params: { id: "exp-1" } });

    await expenseController.getById(req, createMockResponse());

    expect(expenseServiceMock.getExpense).toHaveBeenCalledWith("exp-1", "user-1");
  });

  it("expenseController.list normalizes pagination and category filters", async () => {
    expenseServiceMock.listExpenses.mockResolvedValue({ items: [], total: 0, page: 1, limit: 10, totalPages: 0 });
    const req = createMockRequest({
      userId: "user-1",
      query: { page: "1", limit: "10", startDate: "2026-03-01", categoryId: "cat-1" }
    });

    await expenseController.list(req, createMockResponse());

    expect(expenseServiceMock.listExpenses).toHaveBeenCalledWith("user-1", { page: 1, limit: 10 }, {
      startDate: "2026-03-01",
      endDate: undefined,
      categoryId: "cat-1"
    });
    expect(sendPaginatedMock).toHaveBeenCalled();
  });

  it("expenseController.update validates params and body", async () => {
    expenseServiceMock.updateExpense.mockResolvedValue({ id: "exp-1" });
    const req = createMockRequest({ userId: "user-1", params: { id: "exp-1" }, body: { amountCents: 200 } });

    await expenseController.update(req, createMockResponse());

    expect(expenseServiceMock.updateExpense).toHaveBeenCalledWith("exp-1", "user-1", { amountCents: 200 });
  });

  it("expenseController.remove deletes an expense", async () => {
    const req = createMockRequest({ userId: "user-1", params: { id: "exp-1" } });

    await expenseController.remove(req, createMockResponse());

    expect(expenseServiceMock.deleteExpense).toHaveBeenCalledWith("exp-1", "user-1");
  });

  it("budgetController.create validates body and delegates to the service", async () => {
    budgetServiceMock.createBudget.mockResolvedValue({ id: "budget-1" });
    const req = createMockRequest({ userId: "user-1", body: { month: 3, year: 2026, limitAmountCents: 1000 } });

    await budgetController.create(req, createMockResponse());

    expect(budgetServiceMock.createBudget).toHaveBeenCalledWith("user-1", { month: 3, year: 2026, limitAmountCents: 1000 });
  });

  it("budgetController.getById validates params", async () => {
    budgetServiceMock.getBudget.mockResolvedValue({ id: "budget-1" });
    const req = createMockRequest({ userId: "user-1", params: { id: "budget-1" } });

    await budgetController.getById(req, createMockResponse());

    expect(budgetServiceMock.getBudget).toHaveBeenCalledWith("budget-1", "user-1");
  });

  it("budgetController.list validates query", async () => {
    budgetServiceMock.listBudgets.mockResolvedValue([{ id: "budget-1" }]);
    const req = createMockRequest({ userId: "user-1", query: { month: "3", year: "2026" } });

    await budgetController.list(req, createMockResponse());

    expect(budgetServiceMock.listBudgets).toHaveBeenCalledWith("user-1", 3, 2026);
  });

  it("budgetController.update validates params and body", async () => {
    budgetServiceMock.updateBudget.mockResolvedValue({ id: "budget-1" });
    const req = createMockRequest({ userId: "user-1", params: { id: "budget-1" }, body: { limitAmountCents: 2000 } });

    await budgetController.update(req, createMockResponse());

    expect(budgetServiceMock.updateBudget).toHaveBeenCalledWith("budget-1", "user-1", { limitAmountCents: 2000 });
  });

  it("budgetController.remove deletes a budget", async () => {
    const req = createMockRequest({ userId: "user-1", params: { id: "budget-1" } });

    await budgetController.remove(req, createMockResponse());

    expect(budgetServiceMock.deleteBudget).toHaveBeenCalledWith("budget-1", "user-1");
  });

  it("reportsController.monthlySummary validates query", async () => {
    reportsServiceMock.getMonthlySummary.mockResolvedValue({ month: 3, year: 2026 });
    const req = createMockRequest({ userId: "user-1", query: { month: "3", year: "2026" } });

    await reportsController.monthlySummary(req, createMockResponse());

    expect(reportsServiceMock.getMonthlySummary).toHaveBeenCalledWith("user-1", 3, 2026);
  });

  it("reportsController.categorySummary validates query", async () => {
    reportsServiceMock.getCategorySummary.mockResolvedValue({ month: 3, year: 2026 });
    const req = createMockRequest({ userId: "user-1", query: { month: "3", year: "2026" } });

    await reportsController.categorySummary(req, createMockResponse());

    expect(reportsServiceMock.getCategorySummary).toHaveBeenCalledWith("user-1", 3, 2026);
  });

  it("reportsController.dateRange validates query", async () => {
    reportsServiceMock.getDateRangeReport.mockResolvedValue({ startDate: "2026-03-01", endDate: "2026-03-31" });
    const req = createMockRequest({ userId: "user-1", query: { startDate: "2026-03-01", endDate: "2026-03-31" } });

    await reportsController.dateRange(req, createMockResponse());

    expect(reportsServiceMock.getDateRangeReport).toHaveBeenCalledWith("user-1", "2026-03-01", "2026-03-31");
  });

  it("reportsController.evolution applies the default window", async () => {
    const req = createMockRequest({ userId: "user-1", query: { month: "3", year: "2026" } });

    await reportsController.evolution(req, createMockResponse());

    expect(reportsServiceMock.getEvolution).toHaveBeenCalledWith("user-1", 6, 3, 2026);
  });

  it("healthController.check returns a standard success payload", async () => {
    const status = { status: "ok", timestamp: "2026-03-31T00:00:00.000Z" };
    healthServiceMock.getStatus.mockReturnValue(status);
    const req = createMockRequest();

    await healthController.check(req, createMockResponse());

    expect(sendSuccessMock).toHaveBeenCalledWith(expect.anything(), req, status);
  });
});
