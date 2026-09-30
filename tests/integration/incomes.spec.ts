import request from "supertest";
import { describe, expect, it, beforeAll } from "vitest";

import app from "../../src/app";

const uniqueEmail = (): string =>
  `inc-test-${Date.now()}-${Math.random().toString(36).slice(2)}@imperium.test`;

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
    .send({ name: "Side Hustle", type: "income" });
  categoryId = catRes.body.data.id;
});

const authReq = (method: "get" | "post" | "put" | "delete", path: string, t = token) =>
  request(app)[method](path).set("Authorization", `Bearer ${t}`);

describe("Incomes Module", () => {
  let incomeId: string;

  describe("POST /api/incomes", () => {
    it("creates an income record", async () => {
      const res = await authReq("post", "/api/incomes").send({
        amountCents: 500000,
        description: "Website project",
        date: "2026-03-15",
        categoryId
      });

      expect(res.status).toBe(201);
      expect(res.body.data.amountCents).toBe(500000);
      expect(res.body.data.description).toBe("Website project");
      expect(res.body.data.categoryId).toBe(categoryId);
      expect(res.body.data.isRecurring).toBe(false);
      incomeId = res.body.data.id;
    });

    it("creates a recurring income", async () => {
      const res = await authReq("post", "/api/incomes").send({
        amountCents: 1000000,
        description: "Salary",
        date: "2026-03-01",
        isRecurring: true,
        recurrenceType: "monthly"
      });

      expect(res.status).toBe(201);
      expect(res.body.data.isRecurring).toBe(true);
      expect(res.body.data.recurrenceType).toBe("monthly");
    });

    it("fails if recurring is true but recurrenceType is missing", async () => {
      const res = await authReq("post", "/api/incomes").send({
        amountCents: 1000,
        date: "2026-03-01",
        isRecurring: true
      });

      expect(res.status).toBe(400);
    });

    it("fails with invalid category", async () => {
      const res = await authReq("post", "/api/incomes").send({
        amountCents: 1000,
        date: "2026-03-01",
        categoryId: "invalid-id"
      });

      expect(res.status).toBe(404);
      expect(res.body.code).toBe("CATEGORY_NOT_FOUND");
    });
  });

  describe("GET /api/incomes/:id", () => {
    it("returns the income details", async () => {
      const res = await authReq("get", `/api/incomes/${incomeId}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(incomeId);
      expect(res.body.data.amountCents).toBe(500000);
      expect(res.body.data.updatedAt).toBeDefined();
    });

    it("prevents accessing another user's income", async () => {
      const res = await authReq("get", `/api/incomes/${incomeId}`, token2);

      expect(res.status).toBe(404); // Should be invisible
    });
  });

  describe("PUT /api/incomes/:id", () => {
    it("updates the income", async () => {
      const res = await authReq("put", `/api/incomes/${incomeId}`).send({
        amountCents: 600000,
        description: "Website project + Bonus"
      });

      expect(res.status).toBe(200);
      expect(res.body.data.amountCents).toBe(600000);
      expect(res.body.data.description).toContain("Bonus");
      expect(res.body.data.date).toBe("2026-03-15"); // Unchanged
    });

    it("prevents updating another user's income", async () => {
      const res = await authReq("put", `/api/incomes/${incomeId}`, token2).send({
        amountCents: 100
      });

      expect(res.status).toBe(404);
    });
  });

  describe("GET /api/incomes (List)", () => {
    it("lists incomes with pagination", async () => {
      const res = await authReq("get", "/api/incomes?page=1&limit=10");

      expect(res.status).toBe(200);
      expect(res.body.pagination.total).toBeGreaterThanOrEqual(2); // From earlier tests
      expect(res.body.data.length).toBeGreaterThanOrEqual(2);
      expect(res.body.pagination.page).toBe(1);
    });

    it("filters incomes by date range", async () => {
      await authReq("post", "/api/incomes").send({
        amountCents: 1000,
        date: "2026-01-15"
      });
      await authReq("post", "/api/incomes").send({
        amountCents: 2000,
        date: "2026-02-15"
      });

      const res = await authReq("get", "/api/incomes?startDate=2026-02-01&endDate=2026-02-28");

      expect(res.status).toBe(200);
      const items = res.body.data as Array<{ date: string }>;
      expect(items.length).toBe(1);
      expect(items[0].date).toBe("2026-02-15");
    });
  });

  describe("DELETE /api/incomes/:id", () => {
    it("deletes the income", async () => {
      const res = await authReq("delete", `/api/incomes/${incomeId}`);

      expect(res.status).toBe(200);

      const getRes = await authReq("get", `/api/incomes/${incomeId}`);
      expect(getRes.status).toBe(404);
    });

    it("prevents deleting another user's income", async () => {
      const createRes = await authReq("post", "/api/incomes").send({
        amountCents: 100,
        date: "2026-03-16"
      });
      const id = createRes.body.data.id;

      const delRes = await authReq("delete", `/api/incomes/${id}`, token2);

      expect(delRes.status).toBe(404);
    });
  });
});
