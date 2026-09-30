export type MonthlySummary = {
  month: number;
  year: number;
  totalIncomeCents: number;
  totalExpensesCents: number;
  netBalanceCents: number;
  /** Percentage of income kept, 0-100 */
  savingsRate: number;
};

export type CategorySummaryItem = {
  categoryId: string | null;
  /** null when the expenses have no category */
  categoryName: string | null;
  totalCents: number;
  percentage: number;
};

export type CategorySummary = {
  month: number;
  year: number;
  totalExpensesCents: number;
  categories: CategorySummaryItem[];
};

export type DateRangeReport = {
  startDate: string;
  endDate: string;
  totalIncomeCents: number;
  totalExpensesCents: number;
  netBalanceCents: number;
  savingsRate: number;
};

export type CommitmentItem = {
  description: string | null;
  categoryName: string | null;
  amountCents: number;
  isRecurring: boolean;
  recurrenceType: string | null;
  recurrenceEndDate: string | null;
};

/**
 * Quanto da receita do mes ja tem dono antes de qualquer gasto avulso:
 * despesas recorrentes projetadas mais as despesas fixas do proprio mes.
 */
export type CommitmentsReport = {
  month: number;
  year: number;
  totalIncomeCents: number;
  committedCents: number;
  variableCents: number;
  freeCents: number;
  /** Percentual da receita ja comprometido, 0-100 */
  committedShare: number;
  items: CommitmentItem[];
};

export type EvolutionPoint = {
  month: number;
  year: number;
  totalIncomeCents: number;
  totalExpensesCents: number;
  netBalanceCents: number;
};
