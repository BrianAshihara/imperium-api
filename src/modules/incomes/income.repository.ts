import db from "../../database/database";
import { PaginationParams } from "../../types/common.types";

import { IncomeDetail, IncomeListItem, RecurrenceType } from "./income.types";

type IncomeRow = {
  id: string;
  category_id: string | null;
  amount_cents: number;
  description: string | null;
  date: string;
  is_recurring: number;
  recurrence_type: RecurrenceType | null;
  recurrence_end_date: string | null;
  created_at: string;
  updated_at: string;
};

const mapRow = (row: IncomeRow): IncomeDetail => ({
  id: row.id,
  categoryId: row.category_id,
  amountCents: row.amount_cents,
  description: row.description,
  date: row.date,
  isRecurring: row.is_recurring === 1,
  recurrenceType: row.recurrence_type,
  recurrenceEndDate: row.recurrence_end_date,
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

const buildFilters = (
  filters?: { startDate?: string; endDate?: string; categoryId?: string }
): { clause: string; params: unknown[] } => {
  let clause = "";
  const params: unknown[] = [];

  if (filters?.startDate) {
    clause += " AND date >= ?";
    params.push(filters.startDate);
  }
  if (filters?.endDate) {
    clause += " AND date <= ?";
    params.push(filters.endDate);
  }
  if (filters?.categoryId) {
    clause += " AND category_id = ?";
    params.push(filters.categoryId);
  }

  return { clause, params };
};

export const incomeRepository = {
  create: async (input: {
    id: string;
    userId: string;
    categoryId: string | null;
    amountCents: number;
    description: string | null;
    date: string;
    isRecurring: boolean;
    recurrenceType: RecurrenceType | null;
    recurrenceEndDate: string | null;
  }): Promise<IncomeDetail> => {
    db.prepare(
      `
        INSERT INTO incomes (
          id, user_id, category_id, amount_cents, description, date,
          is_recurring, recurrence_type, recurrence_end_date
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
    ).run(
      input.id,
      input.userId,
      input.categoryId,
      input.amountCents,
      input.description,
      input.date,
      input.isRecurring ? 1 : 0,
      input.recurrenceType,
      input.recurrenceEndDate
    );

    const created = await incomeRepository.findByIdAndUserId(input.id, input.userId);
    if (!created) {
      throw new Error("Failed to load created income");
    }

    return created;
  },
  findByIdAndUserId: async (id: string, userId: string): Promise<IncomeDetail | null> => {
    const row = db
      .prepare(
        `
          SELECT
            id, category_id, amount_cents, description, date,
            is_recurring, recurrence_type, recurrence_end_date,
            created_at, updated_at
          FROM incomes
          WHERE id = ? AND user_id = ?
        `
      )
      .get(id, userId) as IncomeRow | undefined;

    return row ? mapRow(row) : null;
  },
  countByUserId: async (
    userId: string,
    filters?: { startDate?: string; endDate?: string; categoryId?: string }
  ): Promise<number> => {
    const { clause, params } = buildFilters(filters);

    const row = db
      .prepare(`SELECT COUNT(1) AS total FROM incomes WHERE user_id = ?${clause}`)
      .get(userId, ...params) as { total: number };

    return row.total;
  },
  listByUserId: async (
    userId: string,
    pagination: PaginationParams,
    filters?: { startDate?: string; endDate?: string; categoryId?: string }
  ): Promise<IncomeListItem[]> => {
    const { clause, params } = buildFilters(filters);

    const rows = db
      .prepare(
        `
          SELECT
            id, category_id, amount_cents, description, date,
            is_recurring, recurrence_type, recurrence_end_date,
            created_at, updated_at
          FROM incomes
          WHERE user_id = ?${clause}
          ORDER BY date DESC, created_at DESC
          LIMIT ? OFFSET ?
        `
      )
      .all(userId, ...params, pagination.limit, (pagination.page - 1) * pagination.limit) as IncomeRow[];

    return rows.map(mapRow);
  },
  updateByIdAndUserId: async (
    id: string,
    userId: string,
    input: {
      categoryId?: string | null;
      amountCents?: number;
      description?: string | null;
      date?: string;
      isRecurring?: boolean;
      recurrenceType?: RecurrenceType | null;
      recurrenceEndDate?: string | null;
    }
  ): Promise<IncomeDetail | null> => {
    const updates: string[] = ["updated_at = CURRENT_TIMESTAMP"];
    const params: unknown[] = [];

    const setIfDefined = (column: string, value: unknown): void => {
      if (value === undefined) return;
      updates.push(`${column} = ?`);
      params.push(value);
    };

    setIfDefined("category_id", input.categoryId);
    setIfDefined("amount_cents", input.amountCents);
    setIfDefined("description", input.description);
    setIfDefined("date", input.date);
    setIfDefined("is_recurring", input.isRecurring === undefined ? undefined : input.isRecurring ? 1 : 0);
    setIfDefined("recurrence_type", input.recurrenceType);
    setIfDefined("recurrence_end_date", input.recurrenceEndDate);

    if (updates.length === 1) {
      // Nothing but updated_at would change
      return incomeRepository.findByIdAndUserId(id, userId);
    }

    params.push(id, userId);
    db.prepare(`UPDATE incomes SET ${updates.join(", ")} WHERE id = ? AND user_id = ?`).run(...params);

    return incomeRepository.findByIdAndUserId(id, userId);
  },
  deleteByIdAndUserId: async (id: string, userId: string): Promise<boolean> => {
    const result = db.prepare("DELETE FROM incomes WHERE id = ? AND user_id = ?").run(id, userId);
    return result.changes > 0;
  },
  countByCategoryId: async (categoryId: string, userId: string): Promise<number> => {
    const row = db
      .prepare("SELECT COUNT(1) AS total FROM incomes WHERE user_id = ? AND category_id = ?")
      .get(userId, categoryId) as { total: number };

    return row.total;
  }
};
