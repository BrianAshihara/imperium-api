import request from "supertest";
import { describe, expect, it, beforeAll } from "vitest";

import app from "../../src/app";

const uniqueEmail = (): string =>
  `exp-test-${Date.now()}-${Math.random().toString(36).slice(2)}@imperium.test`;

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
    .send({ name: "Groceries", type: "expense" });
  categoryId = catRes.body.data.id;
});

const authReq = (method: "get" | "post" | "put" | "delete", path: string, t = token) =>
  request(app)[method](path).set("Authorization", `Bearer ${t}`);

describe("Expenses Module", () => {
  let expenseId: string;

  describe("POST /api/expenses", () => {
    it("creates an expense record", async () => {
      const res = await authReq("post", "/api/expenses").send({
        amountCents: 15000,
        description: "Weekly groceries",
        date: "2026-03-20",
        expenseType: "variable",
        categoryId
      });

      expect(res.status).toBe(201);
      expect(res.body.data.amountCents).toBe(15000);
      expect(res.body.data.description).toBe("Weekly groceries");
      expect(res.body.data.expenseType).toBe("variable");
      expect(res.body.data.categoryId).toBe(categoryId);
      expect(res.body.data.isRecurring).toBe(false);
      expenseId = res.body.data.id;
    });

    it("creates a recurring fixed expense", async () => {
      const res = await authReq("post", "/api/expenses").send({
        amountCents: 120000,
        description: "Rent",
        date: "2026-03-01",
        expenseType: "fixed",
        isRecurring: true,
        recurrenceType: "monthly"
      });

      expect(res.status).toBe(201);
      expect(res.body.data.isRecurring).toBe(true);
      expect(res.body.data.recurrenceType).toBe("monthly");
      expect(res.body.data.expenseType).toBe("fixed");
    });

    it("fails if recurring without recurrenceType", async () => {
      const res = await authReq("post", "/api/expenses").send({
        amountCents: 5000,
        date: "2026-03-01",
        expenseType: "variable",
        isRecurring: true
      });

      expect(res.status).toBe(400);
    });

    it("validates category ownership", async () => {
      const res = await authReq("post", "/api/expenses").send({
        amountCents: 1000,
        date: "2026-03-01",
        expenseType: "variable",
        categoryId: "nonexistent-id"
      });

      expect(res.status).toBe(404);
      expect(res.body.code).toBe("CATEGORY_NOT_FOUND");
    });

    it("rejects missing expenseType", async () => {
      const res = await authReq("post", "/api/expenses").send({
        amountCents: 1000,
        date: "2026-03-01"
      });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("GET /api/expenses/:id", () => {
    it("returns the expense details", async () => {
      const res = await authReq("get", `/api/expenses/${expenseId}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(expenseId);
      expect(res.body.data.updatedAt).toBeDefined();
    });

    it("prevents cross-user access", async () => {
      const res = await authReq("get", `/api/expenses/${expenseId}`, token2);

      expect(res.status).toBe(404);
    });
  });

  describe("PUT /api/expenses/:id", () => {
    it("updates the expense", async () => {
      const res = await authReq("put", `/api/expenses/${expenseId}`).send({
        amountCents: 18000,
        description: "Weekly groceries + extras"
      });

      expect(res.status).toBe(200);
      expect(res.body.data.amountCents).toBe(18000);
      expect(res.body.data.description).toContain("extras");
      expect(res.body.data.expenseType).toBe("variable");
    });

    it("prevents cross-user update", async () => {
      const res = await authReq("put", `/api/expenses/${expenseId}`, token2).send({
        amountCents: 100
      });

      expect(res.status).toBe(404);
    });
  });

  describe("GET /api/expenses (List)", () => {
    it("lists expenses with pagination", async () => {
      const res = await authReq("get", "/api/expenses?page=1&limit=10");

      expect(res.status).toBe(200);
      expect(res.body.pagination.total).toBeGreaterThanOrEqual(2);
      expect(res.body.data.length).toBeGreaterThanOrEqual(2);
      expect(res.body.pagination.page).toBe(1);
    });

    it("filters by date range", async () => {
      await authReq("post", "/api/expenses").send({
        amountCents: 3000,
        date: "2026-01-10",
        expenseType: "variable"
      });

      const res = await authReq("get", "/api/expenses?startDate=2026-01-01&endDate=2026-01-31");

      expect(res.status).toBe(200);
      const items = res.body.data as Array<{ date: string }>;
      expect(items.length).toBe(1);
      expect(items[0].date).toBe("2026-01-10");
    });

    it("filters by categoryId", async () => {
      const res = await authReq("get", `/api/expenses?categoryId=${categoryId}`);

      expect(res.status).toBe(200);
      const items = res.body.data as Array<{ categoryId: string }>;
      for (const item of items) {
        expect(item.categoryId).toBe(categoryId);
      }
    });
  });

  describe("DELETE /api/expenses/:id", () => {
    it("deletes the expense", async () => {
      const res = await authReq("delete", `/api/expenses/${expenseId}`);

      expect(res.status).toBe(200);

      const getRes = await authReq("get", `/api/expenses/${expenseId}`);
      expect(getRes.status).toBe(404);
    });

    it("prevents cross-user delete", async () => {
      const createRes = await authReq("post", "/api/expenses").send({
        amountCents: 100,
        date: "2026-03-25",
        expenseType: "variable"
      });
      const id = createRes.body.data.id;

      const delRes = await authReq("delete", `/api/expenses/${id}`, token2);
      expect(delRes.status).toBe(404);
    });
  });
});
