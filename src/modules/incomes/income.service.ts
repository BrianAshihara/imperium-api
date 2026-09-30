import { randomUUID } from "crypto";

import { NotFoundError } from "../../errors";
import { PaginationParams } from "../../types/common.types";
import { assertRecurrenceIsCoherent } from "../../utils/entry-rules";
import { categoryService } from "../categories/category.service";

import { incomeRepository } from "./income.repository";
import { IncomeDetail, PaginatedIncomes, RecurrenceType } from "./income.types";

type IncomeFilters = { startDate?: string; endDate?: string; categoryId?: string };

export const incomeService = {
  createIncome: async (
    userId: string,
    input: {
      categoryId?: string | null;
      amountCents: number;
      description?: string;
      date: string;
      isRecurring?: boolean;
      recurrenceType?: RecurrenceType | null;
      recurrenceEndDate?: string | null;
    }
  ): Promise<IncomeDetail> => {
    if (input.categoryId) {
      await categoryService.assertCategoryForType(userId, input.categoryId, "income");
    }

    assertRecurrenceIsCoherent({
      date: input.date,
      isRecurring: input.isRecurring ?? false,
      recurrenceType: input.recurrenceType ?? null,
      recurrenceEndDate: input.recurrenceEndDate ?? null
    });

    return incomeRepository.create({
      id: randomUUID(),
      userId,
      categoryId: input.categoryId ?? null,
      amountCents: input.amountCents,
      description: input.description ?? null,
      date: input.date,
      isRecurring: input.isRecurring ?? false,
      recurrenceType: input.recurrenceType ?? null,
      recurrenceEndDate: input.recurrenceEndDate ?? null
    });
  },
  getIncome: async (id: string, userId: string): Promise<IncomeDetail> => {
    const income = await incomeRepository.findByIdAndUserId(id, userId);

    if (!income) {
      throw new NotFoundError("Income", "INCOME_NOT_FOUND");
    }

    return income;
  },
  listIncomes: async (
    userId: string,
    pagination: PaginationParams,
    filters?: IncomeFilters
  ): Promise<PaginatedIncomes> => {
    const [total, items] = await Promise.all([
      incomeRepository.countByUserId(userId, filters),
      incomeRepository.listByUserId(userId, pagination, filters)
    ]);

    return {
      items,
      total,
      page: pagination.page,
      limit: pagination.limit,
      totalPages: Math.ceil(total / pagination.limit)
    };
  },
  updateIncome: async (
    id: string,
    userId: string,
    input: {
      categoryId?: string | null;
      amountCents?: number;
      description?: string;
      date?: string;
      isRecurring?: boolean;
      recurrenceType?: RecurrenceType | null;
      recurrenceEndDate?: string | null;
    }
  ): Promise<IncomeDetail> => {
    const existing = await incomeRepository.findByIdAndUserId(id, userId);

    if (!existing) {
      throw new NotFoundError("Income", "INCOME_NOT_FOUND");
    }

    if (input.categoryId) {
      await categoryService.assertCategoryForType(userId, input.categoryId, "income");
    }

    // Validate the entry as it will look once the patch is applied
    const merged = { ...existing, ...input };
    assertRecurrenceIsCoherent({
      date: merged.date,
      isRecurring: merged.isRecurring,
      recurrenceType: merged.recurrenceType,
      recurrenceEndDate: merged.recurrenceEndDate
    });

    const updated = await incomeRepository.updateByIdAndUserId(id, userId, input);

    if (!updated) {
      throw new NotFoundError("Income", "INCOME_NOT_FOUND");
    }

    return updated;
  },
  deleteIncome: async (id: string, userId: string): Promise<void> => {
    const deleted = await incomeRepository.deleteByIdAndUserId(id, userId);

    if (!deleted) {
      throw new NotFoundError("Income", "INCOME_NOT_FOUND");
    }
  }
};
