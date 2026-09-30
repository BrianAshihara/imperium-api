import db from "../../database/database";

export type RecurringRow = {
  amount_cents: number;
  recurrence_type: string;
  date: string;
  recurrence_end_date: string | null;
  category_id: string | null;
  category_name: string | null;
  description: string | null;
};

export type ExpenseTypeTotals = {
  fixed_cents: number;
  variable_cents: number;
};

export type FixedExpenseRow = {
  description: string | null;
  amount_cents: number;
  category_name: string | null;
};

type CategoryExpenseRow = {
  category_id: string | null;
  category_name: string | null;
  total_cents: number;
};

export const reportsRepository = {
  /** Sum of one-off incomes inside a date range */
  sumNonRecurringIncomes: async (
    userId: string,
    startDate: string,
    endDate: string
  ): Promise<number> => {
    const row = db
      .prepare(
        `
          SELECT COALESCE(SUM(amount_cents), 0) AS total
          FROM incomes
          WHERE user_id = ? AND date >= ? AND date <= ? AND is_recurring = 0
        `
      )
      .get(userId, startDate, endDate) as { total: number };

    return row.total;
  },
  /** Sum of one-off expenses inside a date range */
  sumNonRecurringExpenses: async (
    userId: string,
    startDate: string,
    endDate: string
  ): Promise<number> => {
    const row = db
      .prepare(
        `
          SELECT COALESCE(SUM(amount_cents), 0) AS total
          FROM expenses
          WHERE user_id = ? AND date >= ? AND date <= ? AND is_recurring = 0
        `
      )
      .get(userId, startDate, endDate) as { total: number };

    return row.total;
  },
  /** Recurring incomes, with the category name resolved for reporting */
  getRecurringIncomes: async (userId: string): Promise<RecurringRow[]> => {
    return db
      .prepare(
        `
          SELECT
            i.amount_cents, i.recurrence_type, i.date, i.recurrence_end_date,
            i.category_id, c.name AS category_name, i.description
          FROM incomes i
          LEFT JOIN categories c ON c.id = i.category_id
          WHERE i.user_id = ? AND i.is_recurring = 1
        `
      )
      .all(userId) as RecurringRow[];
  },
  /** Recurring expenses, with the category name resolved for reporting */
  getRecurringExpenses: async (userId: string): Promise<RecurringRow[]> => {
    return db
      .prepare(
        `
          SELECT
            e.amount_cents, e.recurrence_type, e.date, e.recurrence_end_date,
            e.category_id, c.name AS category_name, e.description
          FROM expenses e
          LEFT JOIN categories c ON c.id = e.category_id
          WHERE e.user_id = ? AND e.is_recurring = 1
        `
      )
      .all(userId) as RecurringRow[];
  },
  /** One-off expenses split by expense type inside a date range */
  sumNonRecurringExpensesByType: async (
    userId: string,
    startDate: string,
    endDate: string
  ): Promise<ExpenseTypeTotals> => {
    return db
      .prepare(
        `
          SELECT
            COALESCE(SUM(CASE WHEN expense_type = 'fixed' THEN amount_cents END), 0) AS fixed_cents,
            COALESCE(SUM(CASE WHEN expense_type = 'variable' THEN amount_cents END), 0) AS variable_cents
          FROM expenses
          WHERE user_id = ? AND date >= ? AND date <= ? AND is_recurring = 0
        `
      )
      .get(userId, startDate, endDate) as ExpenseTypeTotals;
  },
  /** One-off fixed expenses inside a date range, biggest first */
  listNonRecurringFixedExpenses: async (
    userId: string,
    startDate: string,
    endDate: string
  ): Promise<FixedExpenseRow[]> => {
    return db
      .prepare(
        `
          SELECT e.description, e.amount_cents, c.name AS category_name
          FROM expenses e
          LEFT JOIN categories c ON c.id = e.category_id
          WHERE e.user_id = ? AND e.date >= ? AND e.date <= ?
            AND e.is_recurring = 0 AND e.expense_type = 'fixed'
          ORDER BY e.amount_cents DESC
        `
      )
      .all(userId, startDate, endDate) as FixedExpenseRow[];
  },
  /** One-off expenses grouped by category inside a date range */
  groupExpensesByCategory: async (
    userId: string,
    startDate: string,
    endDate: string
  ): Promise<CategoryExpenseRow[]> => {
    return db
      .prepare(
        `
          SELECT
            e.category_id,
            c.name AS category_name,
            SUM(e.amount_cents) AS total_cents
          FROM expenses e
          LEFT JOIN categories c ON c.id = e.category_id
          WHERE e.user_id = ? AND e.date >= ? AND e.date <= ? AND e.is_recurring = 0
          GROUP BY e.category_id
        `
      )
      .all(userId, startDate, endDate) as CategoryExpenseRow[];
  }
};
