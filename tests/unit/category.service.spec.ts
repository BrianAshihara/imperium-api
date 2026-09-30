import { beforeEach, describe, expect, it, vi } from "vitest";

const categoryRepositoryMock = vi.hoisted(() => ({
  createDefaultCategories: vi.fn(),
  findByNormalizedName: vi.fn(),
  createCustomCategory: vi.fn(),
  listByUserId: vi.fn(),
  findByIdAndUserId: vi.fn(),
  updateByIdAndUserId: vi.fn(),
  countLinkedEntries: vi.fn(),
  deleteByIdAndUserId: vi.fn()
}));

vi.mock("../../src/modules/categories/category.repository", () => ({
  categoryRepository: categoryRepositoryMock
}));

import { categoryService } from "../../src/modules/categories/category.service";

describe("categoryService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("seeds the built-in default categories", async () => {
    await categoryService.seedDefaultCategoriesForUser("user-1");

    expect(categoryRepositoryMock.createDefaultCategories).toHaveBeenCalledTimes(1);
    const [, rows] = categoryRepositoryMock.createDefaultCategories.mock.calls[0];

    expect(rows).toHaveLength(10);
    expect(rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: "Salário", normalizedName: "salário", type: "income" }),
      expect.objectContaining({ name: "Alimentação", normalizedName: "alimentação", type: "expense" })
    ]));
  });

  it("creates custom categories with normalized names", async () => {
    categoryRepositoryMock.findByNormalizedName.mockResolvedValue(null);
    categoryRepositoryMock.createCustomCategory.mockResolvedValue({
      id: "cat-1",
      name: "Side Hustle",
      type: "income",
      isDefault: false,
      createdAt: "2026-01-01T00:00:00.000Z"
    });

    const result = await categoryService.createCustomCategory("user-1", {
      name: "  Side   Hustle  ",
      type: "income"
    });

    expect(categoryRepositoryMock.findByNormalizedName).toHaveBeenCalledWith("user-1", "side hustle");
    expect(categoryRepositoryMock.createCustomCategory).toHaveBeenCalledWith(expect.objectContaining({
      userId: "user-1",
      name: "Side Hustle",
      normalizedName: "side hustle",
      type: "income"
    }));
    expect(result.id).toBe("cat-1");
  });

  it("rejects duplicate category names", async () => {
    categoryRepositoryMock.findByNormalizedName.mockResolvedValue({ id: "cat-1" });

    await expect(categoryService.createCustomCategory("user-1", {
      name: "Salary",
      type: "income"
    })).rejects.toMatchObject({ code: "CATEGORY_ALREADY_EXISTS" });
  });

  it("updates a non-default category", async () => {
    categoryRepositoryMock.findByIdAndUserId.mockResolvedValue({
      id: "cat-1",
      isDefault: false
    });
    categoryRepositoryMock.findByNormalizedName.mockResolvedValue(null);
    categoryRepositoryMock.updateByIdAndUserId.mockResolvedValue({
      id: "cat-1",
      name: "New Name",
      type: "expense",
      isDefault: false,
      createdAt: "2026-01-01T00:00:00.000Z"
    });

    const result = await categoryService.updateCategory("user-1", "cat-1", {
      name: "  New   Name "
    });

    expect(categoryRepositoryMock.updateByIdAndUserId).toHaveBeenCalledWith("cat-1", "user-1", {
      name: "New Name",
      normalizedName: "new name"
    });
    expect(result.name).toBe("New Name");
  });

  it("blocks updates to default categories", async () => {
    categoryRepositoryMock.findByIdAndUserId.mockResolvedValue({
      id: "cat-1",
      isDefault: true
    });

    await expect(categoryService.updateCategory("user-1", "cat-1", { name: "Rename" })).rejects.toMatchObject({
      code: "DEFAULT_CATEGORY"
    });
  });

  it("deletes categories only when unused", async () => {
    categoryRepositoryMock.findByIdAndUserId.mockResolvedValue({
      id: "cat-1",
      isDefault: false
    });
    categoryRepositoryMock.countLinkedEntries.mockResolvedValue(0);
    categoryRepositoryMock.deleteByIdAndUserId.mockResolvedValue(true);

    await expect(categoryService.deleteCategory("user-1", "cat-1")).resolves.toBeUndefined();
    expect(categoryRepositoryMock.deleteByIdAndUserId).toHaveBeenCalledWith("cat-1", "user-1");
  });

  it("blocks deleting categories that are still in use", async () => {
    categoryRepositoryMock.findByIdAndUserId.mockResolvedValue({
      id: "cat-1",
      isDefault: false
    });
    categoryRepositoryMock.countLinkedEntries.mockResolvedValue(2);

    await expect(categoryService.deleteCategory("user-1", "cat-1")).rejects.toMatchObject({
      code: "CATEGORY_IN_USE"
    });
  });

  it("rejects an entry whose category has the wrong type", async () => {
    categoryRepositoryMock.findByIdAndUserId.mockResolvedValue({
      id: "cat-1",
      type: "expense",
      isDefault: true
    });

    await expect(
      categoryService.assertCategoryForType("user-1", "cat-1", "income")
    ).rejects.toMatchObject({ code: "CATEGORY_TYPE_MISMATCH" });

    categoryRepositoryMock.findByIdAndUserId.mockResolvedValue(null);

    await expect(
      categoryService.assertCategoryForType("user-1", "cat-9", "income")
    ).rejects.toMatchObject({ code: "CATEGORY_NOT_FOUND" });
  });

  it("accepts an entry whose category type matches", async () => {
    categoryRepositoryMock.findByIdAndUserId.mockResolvedValue({
      id: "cat-1",
      type: "income",
      isDefault: true
    });

    await expect(
      categoryService.assertCategoryForType("user-1", "cat-1", "income")
    ).resolves.toBeUndefined();
  });
});
