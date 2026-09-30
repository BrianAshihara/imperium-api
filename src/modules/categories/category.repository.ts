import db from "../../database/database";

import { CategoryListItem, CategoryType } from "./category.types";

export const categoryRepository = {
  createDefaultCategories: async (
    userId: string,
    rows: Array<{ id: string; name: string; normalizedName: string; type: CategoryType }>
  ): Promise<void> => {
    const insertStatement = db.prepare(`
      INSERT OR IGNORE INTO categories (id, user_id, name, normalized_name, type, is_default)
      VALUES (?, ?, ?, ?, ?, 1)
    `);

    const batchInsert = db.transaction(() => {
      for (const row of rows) {
        insertStatement.run(row.id, userId, row.name, row.normalizedName, row.type);
      }
    });

    batchInsert();
  },
  createCustomCategory: async (input: {
    id: string;
    userId: string;
    name: string;
    normalizedName: string;
    type: CategoryType;
  }): Promise<CategoryListItem> => {
    db.prepare(
      `
        INSERT INTO categories (id, user_id, name, normalized_name, type, is_default)
        VALUES (?, ?, ?, ?, ?, 0)
      `
    ).run(input.id, input.userId, input.name, input.normalizedName, input.type);

    const row = db
      .prepare(
        `
          SELECT id, name, type, is_default, created_at
          FROM categories
          WHERE id = ? AND user_id = ?
        `
      )
      .get(input.id, input.userId) as
      | {
        id: string;
        name: string;
        type: CategoryType;
        is_default: number;
        created_at: string;
      }
      | undefined;

    if (!row) {
      throw new Error("Failed to load created category");
    }

    return {
      id: row.id,
      name: row.name,
      type: row.type,
      isDefault: row.is_default === 1,
      createdAt: row.created_at
    };
  },
  findByNormalizedName: async (
    userId: string,
    normalizedName: string
  ): Promise<{ id: string } | null> => {
    const row = db
      .prepare("SELECT id FROM categories WHERE user_id = ? AND normalized_name = ?")
      .get(userId, normalizedName) as { id: string } | undefined;

    return row ?? null;
  },
  listByUserId: async (userId: string): Promise<CategoryListItem[]> => {
    const rows = db
      .prepare(
        `
          SELECT id, name, type, is_default, created_at
          FROM categories
          WHERE user_id = ?
          ORDER BY type ASC, is_default DESC, name ASC
        `
      )
      .all(userId) as Array<{
        id: string;
        name: string;
        type: CategoryType;
        is_default: number;
        created_at: string;
      }>;

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      type: row.type,
      isDefault: row.is_default === 1,
      createdAt: row.created_at
    }));
  },
  findByIdAndUserId: async (
    categoryId: string,
    userId: string
  ): Promise<{ id: string; type: CategoryType; isDefault: boolean } | null> => {
    const row = db
      .prepare("SELECT id, type, is_default FROM categories WHERE id = ? AND user_id = ?")
      .get(categoryId, userId) as
      | { id: string; type: CategoryType; is_default: number }
      | undefined;

    if (!row) {
      return null;
    }

    return { id: row.id, type: row.type, isDefault: row.is_default === 1 };
  },
  /** Entries that would be orphaned by deleting this category. */
  countLinkedEntries: async (categoryId: string, userId: string): Promise<number> => {
    const row = db
      .prepare(
        `
          SELECT
            (SELECT COUNT(1) FROM incomes WHERE user_id = ? AND category_id = ?) +
            (SELECT COUNT(1) FROM expenses WHERE user_id = ? AND category_id = ?) +
            (SELECT COUNT(1) FROM budgets WHERE user_id = ? AND category_id = ?) AS total
        `
      )
      .get(userId, categoryId, userId, categoryId, userId, categoryId) as { total: number };

    return row.total;
  },
  updateByIdAndUserId: async (
    categoryId: string,
    userId: string,
    input: { name: string; normalizedName: string }
  ): Promise<CategoryListItem | null> => {
    const result = db
      .prepare(
        `
          UPDATE categories
          SET name = ?, normalized_name = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ? AND user_id = ?
        `
      )
      .run(input.name, input.normalizedName, categoryId, userId);

    if (result.changes === 0) {
      return null;
    }

    const row = db
      .prepare(
        `
          SELECT id, name, type, is_default, created_at
          FROM categories
          WHERE id = ? AND user_id = ?
        `
      )
      .get(categoryId, userId) as
      | {
        id: string;
        name: string;
        type: CategoryType;
        is_default: number;
        created_at: string;
      }
      | undefined;

    if (!row) {
      return null;
    }

    return {
      id: row.id,
      name: row.name,
      type: row.type,
      isDefault: row.is_default === 1,
      createdAt: row.created_at
    };
  },
  deleteByIdAndUserId: async (categoryId: string, userId: string): Promise<boolean> => {
    const result = db
      .prepare("DELETE FROM categories WHERE id = ? AND user_id = ?")
      .run(categoryId, userId);

    return result.changes > 0;
  }
};
