import db from "../../database/database";

import { BudgetRecord } from "./budget.types";

type BudgetRow = {
  id: string;
  user_id: string;
  category_id: string | null;
  month: number;
  year: number;
  limit_amount_cents: number;
  created_at: string;
  updated_at: string;
};

const mapRow = (row: BudgetRow): BudgetRecord => ({
  id: row.id,
  categoryId: row.category_id,
  month: row.month,
  year: row.year,
  limitAmountCents: row.limit_amount_cents,
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

export const budgetRepository = {
  create: async (input: {
    id: string;
    userId: string;
    categoryId: string | null;
    month: number;
    year: number;
    limitAmountCents: number;
  }): Promise<BudgetRecord> => {
    db.prepare(
      `
        INSERT INTO budgets (id, user_id, category_id, month, year, limit_amount_cents)
        VALUES (?, ?, ?, ?, ?, ?)
      `
    ).run(
      input.id,
      input.userId,
      input.categoryId,
      input.month,
      input.year,
      input.limitAmountCents
    );

    const created = await budgetRepository.findByIdAndUserId(input.id, input.userId);
    if (!created) throw new Error("Failed to load created budget");
    return created;
  },
  findByIdAndUserId: async (id: string, userId: string): Promise<BudgetRecord | null> => {
    const row = db
      .prepare(
        `
          SELECT id, user_id, category_id, month, year, limit_amount_cents, created_at, updated_at
          FROM budgets
          WHERE id = ? AND user_id = ?
        `
      )
      .get(id, userId) as BudgetRow | undefined;

    return row ? mapRow(row) : null;
  },
  findByUserPeriodCategory: async (
    userId: string,
    month: number,
    year: number,
    categoryId: string | null
  ): Promise<BudgetRecord | null> => {
    let query: string;
    let params: unknown[];

    if (categoryId) {
      query = `
        SELECT id, user_id, category_id, month, year, limit_amount_cents, created_at, updated_at
        FROM budgets
        WHERE user_id = ? AND month = ? AND year = ? AND category_id = ?
      `;
      params = [userId, month, year, categoryId];
    } else {
      query = `
        SELECT id, user_id, category_id, month, year, limit_amount_cents, created_at, updated_at
        FROM budgets
        WHERE user_id = ? AND month = ? AND year = ? AND category_id IS NULL
      `;
      params = [userId, month, year];
    }

    const row = db.prepare(query).get(...params) as BudgetRow | undefined;
    return row ? mapRow(row) : null;
  },
  listByUserAndPeriod: async (
    userId: string,
    month: number,
    year: number
  ): Promise<BudgetRecord[]> => {
    const rows = db
      .prepare(
        `
          SELECT id, user_id, category_id, month, year, limit_amount_cents, created_at, updated_at
          FROM budgets
          WHERE user_id = ? AND month = ? AND year = ?
          ORDER BY category_id IS NULL DESC, created_at ASC
        `
      )
      .all(userId, month, year) as BudgetRow[];

    return rows.map(mapRow);
  },
  updateLimitByIdAndUserId: async (
    id: string,
    userId: string,
    limitAmountCents: number
  ): Promise<BudgetRecord | null> => {
    db.prepare(
      `
        UPDATE budgets
        SET limit_amount_cents = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND user_id = ?
      `
    ).run(limitAmountCents, id, userId);

    return budgetRepository.findByIdAndUserId(id, userId);
  },
  deleteByIdAndUserId: async (id: string, userId: string): Promise<boolean> => {
    const result = db.prepare("DELETE FROM budgets WHERE id = ? AND user_id = ?").run(id, userId);
    return result.changes > 0;
  },
  /** One-off expenses inside a month, optionally restricted to one category. */
  sumExpensesInMonth: async (
    userId: string,
    startDate: string,
    endDate: string,
    categoryId: string | null
  ): Promise<number> => {
    const categoryClause = categoryId ? " AND category_id = ?" : "";
    const params: unknown[] = categoryId
      ? [userId, startDate, endDate, categoryId]
      : [userId, startDate, endDate];

    const row = db
      .prepare(
        "SELECT COALESCE(SUM(amount_cents), 0) AS total FROM expenses " +
          "WHERE user_id = ? AND date >= ? AND date <= ? AND is_recurring = 0" +
          categoryClause
      )
      .get(...params) as { total: number };

    return row.total;
  },
  /** Recurring expenses that may project into the budget period. */
  getRecurringExpenses: async (
    userId: string,
    categoryId: string | null
  ): Promise<
    Array<{
      amountCents: number;
      recurrenceType: string;
      date: string;
      recurrenceEndDate: string | null;
    }>
  > => {
    const categoryClause = categoryId ? " AND category_id = ?" : "";
    const params: unknown[] = categoryId ? [userId, categoryId] : [userId];

    const rows = db
      .prepare(
        "SELECT amount_cents, recurrence_type, date, recurrence_end_date FROM expenses " +
          "WHERE user_id = ? AND is_recurring = 1" +
          categoryClause
      )
      .all(...params) as Array<{
      amount_cents: number;
      recurrence_type: string;
      date: string;
      recurrence_end_date: string | null;
    }>;

    return rows.map((row) => ({
      amountCents: row.amount_cents,
      recurrenceType: row.recurrence_type,
      date: row.date,
      recurrenceEndDate: row.recurrence_end_date
    }));
  }
};
