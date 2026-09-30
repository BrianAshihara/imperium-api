export type RecurrenceType = "monthly" | "weekly" | "yearly";

export type Income = {
  id: string;
  categoryId: string | null;
  amountCents: number;
  description: string | null;
  date: string;
  isRecurring: boolean;
  recurrenceType: RecurrenceType | null;
  recurrenceEndDate: string | null;
  createdAt: string;
  updatedAt: string;
};

export type IncomeListItem = Income;
export type IncomeDetail = Income;

export type PaginatedIncomes = {
  items: IncomeListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};
