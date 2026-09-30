export type ExpenseType = "fixed" | "variable";
export type RecurrenceType = "monthly" | "weekly" | "yearly";

export type Expense = {
  id: string;
  categoryId: string | null;
  amountCents: number;
  description: string | null;
  date: string;
  expenseType: ExpenseType;
  isRecurring: boolean;
  recurrenceType: RecurrenceType | null;
  recurrenceEndDate: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ExpenseListItem = Expense;
export type ExpenseDetail = Expense;

export type PaginatedExpenses = {
  items: ExpenseListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};
