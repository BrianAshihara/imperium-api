import request from "supertest";
import { describe, expect, it, beforeAll } from "vitest";

import app from "../../src/app";

const uniqueEmail = (): string =>
  `rpt-test-${Date.now()}-${Math.random().toString(36).slice(2)}@imperium.test`;

let token: string;
let token2: string;
let categoryId: string;

beforeAll(async () => {
  // User 1
  const res = await request(app)
    .post("/api/auth/register")
    .send({ email: uniqueEmail(), password: "securePass1" });
  token = res.body.data.accessToken;

  // User 2 (for isolation tests)
  const res2 = await request(app)
    .post("/api/auth/register")
    .send({ email: uniqueEmail(), password: "securePass1" });
  token2 = res2.body.data.accessToken;

  // Create a category for user 1
  const catRes = await request(app)
    .post("/api/categories")
    .set("Authorization", `Bearer ${token}`)
    .send({ name: "Groceries Report", type: "expense" });
  categoryId = catRes.body.data.id;

  // Seed data for March 2026
  const auth = (method: "post", path: string) =>
    request(app)[method](path).set("Authorization", `Bearer ${token}`);

  // Non-recurring income
  await auth("post", "/api/incomes").send({
    amountCents: 500000, date: "2026-03-15"
  });

  // Recurring monthly income (started Feb)
  await auth("post", "/api/incomes").send({
    amountCents: 100000, date: "2026-02-01",
    isRecurring: true, recurrenceType: "monthly"
  });

  // Non-recurring expense with category
  await auth("post", "/api/expenses").send({
    amountCents: 20000, date: "2026-03-10",
    expenseType: "variable", categoryId
  });

  // Non-recurring expense without category
  await auth("post", "/api/expenses").send({
    amountCents: 10000, date: "2026-03-20",
    expenseType: "variable"
  });

  // Recurring monthly expense (started Jan)
  await auth("post", "/api/expenses").send({
    amountCents: 50000, date: "2026-01-01",
    expenseType: "fixed", isRecurring: true, recurrenceType: "monthly",
    categoryId
  });

  // User 2 data (should not appear)
  await request(app)
    .post("/api/incomes")
    .set("Authorization", `Bearer ${token2}`)
    .send({ amountCents: 999999, date: "2026-03-15" });
});

const authReq = (path: string, t = token) =>
  request(app).get(path).set("Authorization", `Bearer ${t}`);

describe("Reports Module", () => {
  describe("GET /api/reports/monthly", () => {
    it("returns monthly summary with recurring projections", async () => {
      const res = await authReq("/api/reports/monthly?month=3&year=2026");

      expect(res.status).toBe(200);
      const d = res.body.data;

      // Income: 500000 non-recurring + 100000 recurring monthly = 600000
      expect(d.totalIncomeCents).toBe(600000);

      // Expenses: 20000 + 10000 non-recurring + 50000 recurring = 80000
      expect(d.totalExpensesCents).toBe(80000);

      // Net = 600000 - 80000 = 520000
      expect(d.netBalanceCents).toBe(520000);

      // Savings rate = (520000 / 600000) * 100 = 86.67% (aprox)
      expect(d.savingsRate).toBeCloseTo(86.67, 1);

      expect(d.month).toBe(3);
      expect(d.year).toBe(2026);
    });

    it("rejects missing params", async () => {
      const res = await authReq("/api/reports/monthly");
      expect(res.status).toBe(400);
    });

    it("does not leak cross-user data", async () => {
      const res = await authReq("/api/reports/monthly?month=3&year=2026", token2);

      expect(res.status).toBe(200);
      // User 2 only has 999999 income, no expenses
      expect(res.body.data.totalIncomeCents).toBe(999999);
      expect(res.body.data.totalExpensesCents).toBe(0);
    });
  });

  describe("GET /api/reports/categories", () => {
    it("returns expense breakdown by category", async () => {
      const res = await authReq("/api/reports/categories?month=3&year=2026");

      expect(res.status).toBe(200);
      const d = res.body.data;

      expect(d.totalExpensesCents).toBe(80000);
      expect(d.categories.length).toBeGreaterThanOrEqual(2);

      // Groceries: 20000 non-recurring + 50000 recurring = 70000
      const groceries = d.categories.find(
        (c: any) => c.categoryId === categoryId
      );
      expect(groceries).toBeDefined();
      expect(groceries.totalCents).toBe(70000);

      // Percentages should sum to ~100
      const totalPct = d.categories.reduce(
        (sum: number, c: any) => sum + c.percentage, 0
      );
      expect(totalPct).toBeCloseTo(100, 0);
    });
  });

  describe("GET /api/reports/range", () => {
    it("returns report for a custom date range", async () => {
      const res = await authReq(
        "/api/reports/range?startDate=2026-03-01&endDate=2026-03-31"
      );

      expect(res.status).toBe(200);
      const d = res.body.data;

      expect(d.startDate).toBe("2026-03-01");
      expect(d.endDate).toBe("2026-03-31");
      expect(d.totalIncomeCents).toBe(600000);
      expect(d.totalExpensesCents).toBe(80000);
      expect(d.netBalanceCents).toBe(520000);
    });

    it("handles multi-month ranges with recurring", async () => {
      // Jan-Mar: recurring monthly income (100000 x 2 in range: Feb, Mar) + 500000 March direct
      // recurring expense: 50000 x 3 months (Jan, Feb, Mar) + 20000 + 10000 direct
      const res = await authReq(
        "/api/reports/range?startDate=2026-01-01&endDate=2026-03-31"
      );

      expect(res.status).toBe(200);
      const d = res.body.data;

      // Income: 500000 direct + 100000 x 2 recurring (Feb, Mar starts from Feb-01)
      expect(d.totalIncomeCents).toBe(700000);

      // Expenses: 20000 + 10000 direct + 50000 x 3 recurring (Jan, Feb, Mar)
      expect(d.totalExpensesCents).toBe(180000);
    });

    it("rejects missing params", async () => {
      const res = await authReq("/api/reports/range?startDate=2026-03-01");
      expect(res.status).toBe(400);
    });
  });

  describe("GET /api/reports/commitments", () => {
    it("splits the month income into committed and free", async () => {
      const res = await authReq("/api/reports/commitments?month=3&year=2026");

      expect(res.status).toBe(200);
      const d = res.body.data;

      // Income: 500000 direct + 100000 recurring
      expect(d.totalIncomeCents).toBe(600000);
      // Committed: 50000 recurring fixed expense projected into March
      expect(d.committedCents).toBe(50000);
      // Variable: 20000 + 10000 one-off
      expect(d.variableCents).toBe(30000);
      expect(d.freeCents).toBe(520000);
      expect(d.committedShare).toBeCloseTo(8.33, 1);
    });

    it("lists the commitments biggest first, flagging the recurring ones", async () => {
      const res = await authReq("/api/reports/commitments?month=3&year=2026");
      const items = res.body.data.items;

      expect(items).toHaveLength(1);
      expect(items[0]).toMatchObject({
        amountCents: 50000,
        isRecurring: true,
        recurrenceType: "monthly",
      });
    });

    it("keeps the split consistent with the monthly report", async () => {
      const [commitments, monthly] = await Promise.all([
        authReq("/api/reports/commitments?month=3&year=2026"),
        authReq("/api/reports/monthly?month=3&year=2026"),
      ]);

      const c = commitments.body.data;
      const m = monthly.body.data;

      expect(c.committedCents + c.variableCents).toBe(m.totalExpensesCents);
      expect(c.freeCents).toBe(m.netBalanceCents);
    });

    it("does not leak another user's data", async () => {
      const res = await authReq("/api/reports/commitments?month=3&year=2026", token2);

      expect(res.status).toBe(200);
      expect(res.body.data.committedCents).toBe(0);
      expect(res.body.data.items).toEqual([]);
    });

    it("rejects an invalid period", async () => {
      const res = await authReq("/api/reports/commitments?month=13&year=2026");
      expect(res.status).toBe(400);
    });
  });
});
