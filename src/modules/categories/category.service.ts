import { randomUUID } from "crypto";

import { ConflictError, NotFoundError, ValidationFailedError } from "../../errors";

import { categoryRepository } from "./category.repository";
import { CategoryListItem, CategoryType } from "./category.types";

const DEFAULT_CATEGORIES: Array<{ name: string; type: CategoryType }> = [
  { name: "Salário", type: "income" },
  { name: "Freelance", type: "income" },
  { name: "Investimentos", type: "income" },
  { name: "Moradia", type: "expense" },
  { name: "Alimentação", type: "expense" },
  { name: "Transporte", type: "expense" },
  { name: "Saúde", type: "expense" },
  { name: "Educação", type: "expense" },
  { name: "Lazer", type: "expense" },
  { name: "Contas", type: "expense" }
];

const normalizeCategoryName = (value: string): string =>
  value
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();

export const categoryService = {
  seedDefaultCategoriesForUser: async (userId: string): Promise<void> => {
    const rows = DEFAULT_CATEGORIES.map((category) => ({
      id: randomUUID(),
      name: category.name,
      normalizedName: normalizeCategoryName(category.name),
      type: category.type
    }));

    await categoryRepository.createDefaultCategories(userId, rows);
  },
  createCustomCategory: async (
    userId: string,
    input: { name: string; type: CategoryType }
  ): Promise<CategoryListItem> => {
    const normalizedName = normalizeCategoryName(input.name);

    if (!normalizedName) {
      throw new ValidationFailedError("Category name is required");
    }

    const existing = await categoryRepository.findByNormalizedName(userId, normalizedName);
    if (existing) {
      throw new ConflictError("Category name already exists", "CATEGORY_ALREADY_EXISTS");
    }

    try {
      return await categoryRepository.createCustomCategory({
        id: randomUUID(),
        userId,
        name: input.name.trim().replace(/\s+/g, " "),
        normalizedName,
        type: input.type
      });
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.toLowerCase().includes("unique") &&
        error.message.toLowerCase().includes("categories.user_id")
      ) {
        throw new ConflictError("Category name already exists", "CATEGORY_ALREADY_EXISTS");
      }

      throw error;
    }
  },
  /**
   * Guards every link between an entry and a category: it has to exist, belong
   * to the user, and match the entry type. An income cannot be filed under an
   * expense category.
   */
  assertCategoryForType: async (
    userId: string,
    categoryId: string,
    type: CategoryType
  ): Promise<void> => {
    const category = await categoryRepository.findByIdAndUserId(categoryId, userId);

    if (!category) {
      throw new NotFoundError("Category", "CATEGORY_NOT_FOUND");
    }

    if (category.type !== type) {
      throw new ValidationFailedError(
        "Category must be of type " + type,
        "CATEGORY_TYPE_MISMATCH"
      );
    }
  },
  listCategories: async (userId: string): Promise<CategoryListItem[]> => {
    return categoryRepository.listByUserId(userId);
  },
  updateCategory: async (
    userId: string,
    categoryId: string,
    input: { name: string }
  ): Promise<CategoryListItem> => {
    const category = await categoryRepository.findByIdAndUserId(categoryId, userId);
    if (!category) {
      throw new NotFoundError("Category", "CATEGORY_NOT_FOUND");
    }

    if (category.isDefault) {
      throw new ConflictError("Default categories cannot be renamed", "DEFAULT_CATEGORY");
    }

    const normalizedName = normalizeCategoryName(input.name);

    if (!normalizedName) {
      throw new ValidationFailedError("Category name is required");
    }

    const existing = await categoryRepository.findByNormalizedName(userId, normalizedName);
    if (existing && existing.id !== categoryId) {
      throw new ConflictError("Category name already exists", "CATEGORY_ALREADY_EXISTS");
    }

    const updated = await categoryRepository.updateByIdAndUserId(categoryId, userId, {
      name: input.name.trim().replace(/\s+/g, " "),
      normalizedName
    });

    if (!updated) {
      throw new NotFoundError("Category", "CATEGORY_NOT_FOUND");
    }

    return updated;
  },
  deleteCategory: async (userId: string, categoryId: string): Promise<void> => {
    const category = await categoryRepository.findByIdAndUserId(categoryId, userId);
    if (!category) {
      throw new NotFoundError("Category", "CATEGORY_NOT_FOUND");
    }

    const linkedCount = await categoryRepository.countLinkedEntries(categoryId, userId);
    if (linkedCount > 0) {
      throw new ConflictError(
        "Category cannot be deleted because it is still in use",
        "CATEGORY_IN_USE"
      );
    }

    const deleted = await categoryRepository.deleteByIdAndUserId(categoryId, userId);
    if (!deleted) {
      throw new NotFoundError("Category", "CATEGORY_NOT_FOUND");
    }
  }
};
