export type BudgetRecord = {
  id: string;
  categoryId: string | null;
  month: number;
  year: number;
  limitAmountCents: number;
  createdAt: string;
  updatedAt: string;
};

export type BudgetStatus = {
  id: string;
  categoryId: string | null;
  month: number;
  year: number;
  limitAmountCents: number;
  spentCents: number;
  percentageUsed: number;
  remainingCents: number;
  isOverLimit: boolean;
};

export type BudgetListItem = BudgetStatus;
