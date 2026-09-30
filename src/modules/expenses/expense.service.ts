import { randomUUID } from "crypto";

import { NotFoundError } from "../../errors";
import { PaginationParams } from "../../types/common.types";
import { assertRecurrenceIsCoherent } from "../../utils/entry-rules";
import { categoryService } from "../categories/category.service";

import { expenseRepository } from "./expense.repository";
import { ExpenseDetail, ExpenseType, PaginatedExpenses, RecurrenceType } from "./expense.types";

type ExpenseFilters = { startDate?: string; endDate?: string; categoryId?: string };

export const expenseService = {
  createExpense: async (
    userId: string,
    input: {
      categoryId?: string | null;
      amountCents: number;
      description?: string;
      date: string;
      expenseType: ExpenseType;
      isRecurring?: boolean;
      recurrenceType?: RecurrenceType | null;
      recurrenceEndDate?: string | null;
    }
  ): Promise<ExpenseDetail> => {
    if (input.categoryId) {
      await categoryService.assertCategoryForType(userId, input.categoryId, "expense");
    }

    assertRecurrenceIsCoherent({
      date: input.date,
      isRecurring: input.isRecurring ?? false,
      recurrenceType: input.recurrenceType ?? null,
      recurrenceEndDate: input.recurrenceEndDate ?? null
    });

    return expenseRepository.create({
      id: randomUUID(),
      userId,
      categoryId: input.categoryId ?? null,
      amountCents: input.amountCents,
      description: input.description ?? null,
      date: input.date,
      expenseType: input.expenseType,
      isRecurring: input.isRecurring ?? false,
      recurrenceType: input.recurrenceType ?? null,
      recurrenceEndDate: input.recurrenceEndDate ?? null
    });
  },
  getExpense: async (id: string, userId: string): Promise<ExpenseDetail> => {
    const expense = await expenseRepository.findByIdAndUserId(id, userId);

    if (!expense) {
      throw new NotFoundError("Expense", "EXPENSE_NOT_FOUND");
    }

    return expense;
  },
  listExpenses: async (
    userId: string,
    pagination: PaginationParams,
    filters?: ExpenseFilters
  ): Promise<PaginatedExpenses> => {
    const [total, items] = await Promise.all([
      expenseRepository.countByUserId(userId, filters),
      expenseRepository.listByUserId(userId, pagination, filters)
    ]);

    return {
      items,
      total,
      page: pagination.page,
      limit: pagination.limit,
      totalPages: Math.ceil(total / pagination.limit)
    };
  },
  updateExpense: async (
    id: string,
    userId: string,
    input: {
      categoryId?: string | null;
      amountCents?: number;
      description?: string;
      date?: string;
      expenseType?: ExpenseType;
      isRecurring?: boolean;
      recurrenceType?: RecurrenceType | null;
      recurrenceEndDate?: string | null;
    }
  ): Promise<ExpenseDetail> => {
    const existing = await expenseRepository.findByIdAndUserId(id, userId);

    if (!existing) {
      throw new NotFoundError("Expense", "EXPENSE_NOT_FOUND");
    }

    if (input.categoryId) {
      await categoryService.assertCategoryForType(userId, input.categoryId, "expense");
    }

    // Validate the entry as it will look once the patch is applied
    const merged = { ...existing, ...input };
    assertRecurrenceIsCoherent({
      date: merged.date,
      isRecurring: merged.isRecurring,
      recurrenceType: merged.recurrenceType,
      recurrenceEndDate: merged.recurrenceEndDate
    });

    const updated = await expenseRepository.updateByIdAndUserId(id, userId, input);

    if (!updated) {
      throw new NotFoundError("Expense", "EXPENSE_NOT_FOUND");
    }

    return updated;
  },
  deleteExpense: async (id: string, userId: string): Promise<void> => {
    const deleted = await expenseRepository.deleteByIdAndUserId(id, userId);

    if (!deleted) {
      throw new NotFoundError("Expense", "EXPENSE_NOT_FOUND");
    }
  }
};
