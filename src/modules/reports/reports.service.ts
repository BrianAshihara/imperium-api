import { getMonthRange } from "../../utils/period";
import { calculateOccurrencesBetween } from "../../utils/recurrence";

import { RecurringRow, reportsRepository } from "./reports.repository";
import {
  CategorySummary,
  CategorySummaryItem,
  CommitmentItem,
  CommitmentsReport,
  DateRangeReport,
  EvolutionPoint,
  MonthlySummary
} from "./reports.types";

const UNCATEGORIZED = "__uncategorized__";

const computeSavingsRate = (incomeCents: number, expenseCents: number): number => {
  if (incomeCents <= 0) return 0;
  return Math.round(((incomeCents - expenseCents) / incomeCents) * 10000) / 100;
};

/** Total a recurring row contributes to a date range. */
const projectRecurring = (row: RecurringRow, startDate: string, endDate: string): number => {
  const occurrences = calculateOccurrencesBetween(
    startDate,
    endDate,
    row.recurrence_type,
    row.date,
    row.recurrence_end_date
  );

  return row.amount_cents * occurrences;
};

const sumInRange = async (
  userId: string,
  startDate: string,
  endDate: string,
  type: "income" | "expense"
): Promise<number> => {
  const [nonRecurring, recurringRows] = await Promise.all([
    type === "income"
      ? reportsRepository.sumNonRecurringIncomes(userId, startDate, endDate)
      : reportsRepository.sumNonRecurringExpenses(userId, startDate, endDate),
    type === "income"
      ? reportsRepository.getRecurringIncomes(userId)
      : reportsRepository.getRecurringExpenses(userId)
  ]);

  return recurringRows.reduce(
    (total, row) => total + projectRecurring(row, startDate, endDate),
    nonRecurring
  );
};

const buildSummary = (
  totalIncomeCents: number,
  totalExpensesCents: number
): { netBalanceCents: number; savingsRate: number } => ({
  netBalanceCents: totalIncomeCents - totalExpensesCents,
  savingsRate: computeSavingsRate(totalIncomeCents, totalExpensesCents)
});

export const reportsService = {
  getMonthlySummary: async (
    userId: string,
    month: number,
    year: number
  ): Promise<MonthlySummary> => {
    const { startDate, endDate } = getMonthRange(month, year);

    const [totalIncomeCents, totalExpensesCents] = await Promise.all([
      sumInRange(userId, startDate, endDate, "income"),
      sumInRange(userId, startDate, endDate, "expense")
    ]);

    return {
      month,
      year,
      totalIncomeCents,
      totalExpensesCents,
      ...buildSummary(totalIncomeCents, totalExpensesCents)
    };
  },
  getCategorySummary: async (
    userId: string,
    month: number,
    year: number
  ): Promise<CategorySummary> => {
    const { startDate, endDate } = getMonthRange(month, year);

    const [groupedRows, recurringExpenses] = await Promise.all([
      reportsRepository.groupExpensesByCategory(userId, startDate, endDate),
      reportsRepository.getRecurringExpenses(userId)
    ]);

    const totals = new Map<string, { name: string | null; totalCents: number }>();

    const addToCategory = (
      categoryId: string | null,
      categoryName: string | null,
      amountCents: number
    ): void => {
      const key = categoryId ?? UNCATEGORIZED;
      const current = totals.get(key);

      if (current) {
        current.totalCents += amountCents;
        return;
      }

      totals.set(key, { name: categoryName, totalCents: amountCents });
    };

    for (const row of groupedRows) {
      addToCategory(row.category_id, row.category_name, row.total_cents);
    }

    for (const row of recurringExpenses) {
      const projected = projectRecurring(row, startDate, endDate);
      if (projected > 0) {
        addToCategory(row.category_id, row.category_name, projected);
      }
    }

    let totalExpensesCents = 0;
    for (const entry of totals.values()) {
      totalExpensesCents += entry.totalCents;
    }

    const categories: CategorySummaryItem[] = [...totals.entries()]
      .map(([key, entry]) => ({
        categoryId: key === UNCATEGORIZED ? null : key,
        categoryName: entry.name,
        totalCents: entry.totalCents,
        percentage:
          totalExpensesCents > 0
            ? Math.round((entry.totalCents / totalExpensesCents) * 10000) / 100
            : 0
      }))
      .sort((a, b) => b.totalCents - a.totalCents);

    return { month, year, totalExpensesCents, categories };
  },
  getDateRangeReport: async (
    userId: string,
    startDate: string,
    endDate: string
  ): Promise<DateRangeReport> => {
    const [totalIncomeCents, totalExpensesCents] = await Promise.all([
      sumInRange(userId, startDate, endDate, "income"),
      sumInRange(userId, startDate, endDate, "expense")
    ]);

    return {
      startDate,
      endDate,
      totalIncomeCents,
      totalExpensesCents,
      ...buildSummary(totalIncomeCents, totalExpensesCents)
    };
  },
  /**
   * Splits the month income into what is already committed (recurring plus
   * fixed expenses) and what is still free. Recurring entries are projected
   * by the same helper the other reports use.
   */
  getCommitments: async (
    userId: string,
    month: number,
    year: number
  ): Promise<CommitmentsReport> => {
    const { startDate, endDate } = getMonthRange(month, year);

    const [totalIncomeCents, byType, fixedRows, recurringRows] = await Promise.all([
      sumInRange(userId, startDate, endDate, "income"),
      reportsRepository.sumNonRecurringExpensesByType(userId, startDate, endDate),
      reportsRepository.listNonRecurringFixedExpenses(userId, startDate, endDate),
      reportsRepository.getRecurringExpenses(userId),
    ]);

    const projected = recurringRows
      .map((row) => ({ row, amountCents: projectRecurring(row, startDate, endDate) }))
      .filter((entry) => entry.amountCents > 0);

    const recurringCents = projected.reduce((total, entry) => total + entry.amountCents, 0);
    const committedCents = recurringCents + byType.fixed_cents;
    const variableCents = byType.variable_cents;

    const items: CommitmentItem[] = [
      ...projected.map((entry) => ({
        description: entry.row.description,
        categoryName: entry.row.category_name,
        amountCents: entry.amountCents,
        isRecurring: true,
        recurrenceType: entry.row.recurrence_type,
        recurrenceEndDate: entry.row.recurrence_end_date,
      })),
      ...fixedRows.map((row) => ({
        description: row.description,
        categoryName: row.category_name,
        amountCents: row.amount_cents,
        isRecurring: false,
        recurrenceType: null,
        recurrenceEndDate: null,
      })),
    ].sort((a, b) => b.amountCents - a.amountCents);

    return {
      month,
      year,
      totalIncomeCents,
      committedCents,
      variableCents,
      freeCents: totalIncomeCents - committedCents - variableCents,
      committedShare:
        totalIncomeCents > 0
          ? Math.round((committedCents / totalIncomeCents) * 10000) / 100
          : 0,
      items,
    };
  },
  /**
   * Month-by-month totals ending on the reference month, oldest first.
   * Feeds the dashboard evolution chart in a single request.
   */
  getEvolution: async (
    userId: string,
    months: number,
    referenceMonth: number,
    referenceYear: number
  ): Promise<EvolutionPoint[]> => {
    const points: EvolutionPoint[] = [];

    for (let offset = months - 1; offset >= 0; offset--) {
      const cursor = new Date(Date.UTC(referenceYear, referenceMonth - 1 - offset, 1));
      const month = cursor.getUTCMonth() + 1;
      const year = cursor.getUTCFullYear();
      const { startDate, endDate } = getMonthRange(month, year);

      const [totalIncomeCents, totalExpensesCents] = await Promise.all([
        sumInRange(userId, startDate, endDate, "income"),
        sumInRange(userId, startDate, endDate, "expense")
      ]);

      points.push({
        month,
        year,
        totalIncomeCents,
        totalExpensesCents,
        netBalanceCents: totalIncomeCents - totalExpensesCents
      });
    }

    return points;
  }
};
