import request from "supertest";
import { describe, expect, it, beforeAll } from "vitest";

import app from "../../src/app";

const uniqueEmail = (): string =>
  `bud-test-${Date.now()}-${Math.random().toString(36).slice(2)}@imperium.test`;

let token: string;
let token2: string;
let categoryId: string;

beforeAll(async () => {
  const res = await request(app)
    .post("/api/auth/register")
    .send({ email: uniqueEmail(), password: "securePass1" });
  token = res.body.data.accessToken;

  const res2 = await request(app)
    .post("/api/auth/register")
    .send({ email: uniqueEmail(), password: "securePass1" });
  token2 = res2.body.data.accessToken;

  const catRes = await request(app)
    .post("/api/categories")
    .set("Authorization", `Bearer ${token}`)
    .send({ name: "Groceries Budget", type: "expense" });
  categoryId = catRes.body.data.id;
});

const authReq = (method: "get" | "post" | "put" | "delete", path: string, t = token) =>
  request(app)[method](path).set("Authorization", `Bearer ${t}`);

describe("Budgets Module", () => {
  let budgetId: string;
  let globalBudgetId: string;

  describe("POST /api/budgets", () => {
    it("creates a category-scoped budget", async () => {
      const res = await authReq("post", "/api/budgets").send({
        categoryId,
        month: 3,
        year: 2026,
        limitAmountCents: 50000
      });

      expect(res.status).toBe(201);
      expect(res.body.data.categoryId).toBe(categoryId);
      expect(res.body.data.limitAmountCents).toBe(50000);
      expect(res.body.data.spentCents).toBeDefined();
      expect(res.body.data.percentageUsed).toBeDefined();
      expect(res.body.data.remainingCents).toBeDefined();
      expect(typeof res.body.data.isOverLimit).toBe("boolean");
      budgetId = res.body.data.id;
    });

    it("creates a global budget (null categoryId)", async () => {
      const res = await authReq("post", "/api/budgets").send({
        categoryId: null,
        month: 3,
        year: 2026,
        limitAmountCents: 200000
      });

      expect(res.status).toBe(201);
      expect(res.body.data.categoryId).toBeNull();
      globalBudgetId = res.body.data.id;
    });

    it("returns 409 for duplicate budget", async () => {
      const res = await authReq("post", "/api/budgets").send({
        categoryId,
        month: 3,
        year: 2026,
        limitAmountCents: 99999
      });

      expect(res.status).toBe(409);
      expect(res.body.code).toBe("BUDGET_ALREADY_EXISTS");
    });

    it("validates category ownership", async () => {
      const res = await authReq("post", "/api/budgets").send({
        categoryId: "nonexistent",
        month: 3,
        year: 2026,
        limitAmountCents: 10000
      });

      expect(res.status).toBe(404);
      expect(res.body.code).toBe("CATEGORY_NOT_FOUND");
    });
  });

  describe("GET /api/budgets/:id", () => {
    it("returns the budget with calculated status", async () => {
      const res = await authReq("get", `/api/budgets/${budgetId}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(budgetId);
      expect(res.body.data.spentCents).toBeGreaterThanOrEqual(0);
      expect(res.body.data.percentageUsed).toBeGreaterThanOrEqual(0);
    });

    it("prevents cross-user access", async () => {
      const res = await authReq("get", `/api/budgets/${budgetId}`, token2);
      expect(res.status).toBe(404);
    });
  });

  describe("Budget calculations with expenses", () => {
    it("reflects non-recurring expenses in spentCents", async () => {
      // Add a non-recurring expense in March for this category
      await authReq("post", "/api/expenses").send({
        amountCents: 12000,
        date: "2026-03-10",
        expenseType: "variable",
        categoryId
      });

      const res = await authReq("get", `/api/budgets/${budgetId}`);

      expect(res.status).toBe(200);
      expect(res.body.data.spentCents).toBeGreaterThanOrEqual(12000);
      expect(res.body.data.remainingCents).toBeLessThanOrEqual(38000);
    });

    it("includes recurring monthly expenses in budget calculation", async () => {
      // Add a recurring monthly expense for this category, starting in February
      await authReq("post", "/api/expenses").send({
        amountCents: 5000,
        date: "2026-02-01",
        expenseType: "fixed",
        isRecurring: true,
        recurrenceType: "monthly",
        categoryId
      });

      const res = await authReq("get", `/api/budgets/${budgetId}`);

      expect(res.status).toBe(200);
      // Should include 12000 non-recurring + 5000 recurring = 17000 minimum
      expect(res.body.data.spentCents).toBeGreaterThanOrEqual(17000);
    });

    it("shows over-limit flag correctly", async () => {
      // Create a small budget that will be over limit
      const smallBudget = await authReq("post", "/api/budgets").send({
        categoryId: null,
        month: 4,
        year: 2026,
        limitAmountCents: 1
      });

      // Add an expense for April
      await authReq("post", "/api/expenses").send({
        amountCents: 100,
        date: "2026-04-01",
        expenseType: "variable"
      });

      const res = await authReq("get", `/api/budgets/${smallBudget.body.data.id}`);

      expect(res.status).toBe(200);
      expect(res.body.data.isOverLimit).toBe(true);
      expect(res.body.data.percentageUsed).toBeGreaterThan(100);
    });
  });

  describe("GET /api/budgets (List)", () => {
    it("lists all budgets for a given month/year", async () => {
      const res = await authReq("get", "/api/budgets?month=3&year=2026");

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(2); // category + global
    });

    it("returns 400 for missing month/year", async () => {
      const res = await authReq("get", "/api/budgets");
      expect(res.status).toBe(400);
    });
  });

  describe("PUT /api/budgets/:id", () => {
    it("updates the budget limit", async () => {
      const res = await authReq("put", `/api/budgets/${budgetId}`).send({
        limitAmountCents: 80000
      });

      expect(res.status).toBe(200);
      expect(res.body.data.limitAmountCents).toBe(80000);
      // Should recalculate status with new limit
      expect(res.body.data.spentCents).toBeDefined();
    });

    it("prevents cross-user update", async () => {
      const res = await authReq("put", `/api/budgets/${budgetId}`, token2).send({
        limitAmountCents: 1
      });
      expect(res.status).toBe(404);
    });
  });

  describe("DELETE /api/budgets/:id", () => {
    it("deletes the budget", async () => {
      const res = await authReq("delete", `/api/budgets/${globalBudgetId}`);
      expect(res.status).toBe(200);

      const getRes = await authReq("get", `/api/budgets/${globalBudgetId}`);
      expect(getRes.status).toBe(404);
    });

    it("prevents cross-user delete", async () => {
      const res = await authReq("delete", `/api/budgets/${budgetId}`, token2);
      expect(res.status).toBe(404);
    });
  });
});
