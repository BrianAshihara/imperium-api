import { beforeEach, describe, expect, it, vi } from "vitest";

const bcryptMock = vi.hoisted(() => ({
  hash: vi.fn(),
  compare: vi.fn()
}));

const authRepositoryMock = vi.hoisted(() => ({
  findByEmail: vi.fn(),
  createUser: vi.fn(),
  findById: vi.fn()
}));

const categoryServiceMock = vi.hoisted(() => ({
  seedDefaultCategoriesForUser: vi.fn()
}));

const signAccessTokenMock = vi.hoisted(() => vi.fn());

vi.mock("bcrypt", () => ({
  default: bcryptMock
}));

vi.mock("../../src/modules/auth/auth.repository", () => ({
  authRepository: authRepositoryMock
}));

vi.mock("../../src/modules/categories/category.service", () => ({
  categoryService: categoryServiceMock
}));

vi.mock("../../src/utils/jwt", () => ({
  signAccessToken: signAccessTokenMock
}));

import { authService } from "../../src/modules/auth/auth.service";

describe("authService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    signAccessTokenMock.mockReturnValue("signed-token");
  });

  it("registers a user with normalized email and seeds default categories", async () => {
    authRepositoryMock.findByEmail.mockResolvedValue(null);
    bcryptMock.hash.mockResolvedValue("hashed-password");
    authRepositoryMock.createUser.mockResolvedValue({
      id: "user-1",
      email: "john@example.com",
      name: "John",
      createdAt: "2026-01-01T00:00:00.000Z"
    });

    const result = await authService.register("  JOHN@Example.COM ", "secret123", "John");

    expect(authRepositoryMock.findByEmail).toHaveBeenCalledWith("john@example.com");
    expect(bcryptMock.hash).toHaveBeenCalledWith("secret123", 12);
    expect(authRepositoryMock.createUser).toHaveBeenCalledWith(expect.objectContaining({
      email: "john@example.com",
      passwordHash: "hashed-password",
      name: "John"
    }));
    expect(categoryServiceMock.seedDefaultCategoriesForUser).toHaveBeenCalledWith("user-1");
    expect(signAccessTokenMock).toHaveBeenCalledWith("user-1");
    expect(result).toEqual({
      user: expect.objectContaining({ id: "user-1", email: "john@example.com" }),
      accessToken: "signed-token"
    });
  });

  it("rejects duplicate registrations", async () => {
    authRepositoryMock.findByEmail.mockResolvedValue({ id: "existing" });

    await expect(authService.register("john@example.com", "secret123")).rejects.toMatchObject({
      code: "EMAIL_ALREADY_IN_USE"
    });
  });

  it("maps unique constraint errors on register", async () => {
    authRepositoryMock.findByEmail.mockResolvedValue(null);
    bcryptMock.hash.mockResolvedValue("hashed-password");
    authRepositoryMock.createUser.mockRejectedValue(new Error("UNIQUE constraint failed: users.email"));

    await expect(authService.register("john@example.com", "secret123")).rejects.toMatchObject({
      code: "EMAIL_ALREADY_IN_USE"
    });
  });

  it("returns a token for valid credentials", async () => {
    authRepositoryMock.findByEmail.mockResolvedValue({
      id: "user-1",
      password_hash: "stored-hash"
    });
    bcryptMock.compare.mockResolvedValue(true);

    await expect(authService.login("  JOHN@example.com ", "secret123")).resolves.toEqual({
      accessToken: "signed-token"
    });

    expect(authRepositoryMock.findByEmail).toHaveBeenCalledWith("john@example.com");
    expect(bcryptMock.compare).toHaveBeenCalledWith("secret123", "stored-hash");
  });

  it("rejects invalid credentials", async () => {
    authRepositoryMock.findByEmail.mockResolvedValue({
      id: "user-1",
      password_hash: "stored-hash"
    });
    bcryptMock.compare.mockResolvedValue(false);

    await expect(authService.login("john@example.com", "wrongpass")).rejects.toMatchObject({
      code: "INVALID_CREDENTIALS"
    });
  });

  it("loads the current user profile", async () => {
    authRepositoryMock.findById.mockResolvedValue({
      id: "user-1",
      email: "john@example.com",
      name: null,
      createdAt: "2026-01-01T00:00:00.000Z"
    });

    await expect(authService.getProfile("user-1")).resolves.toEqual(expect.objectContaining({
      id: "user-1",
      email: "john@example.com"
    }));
  });

  it("fails when the user profile does not exist", async () => {
    authRepositoryMock.findById.mockResolvedValue(null);

    await expect(authService.getProfile("missing")).rejects.toMatchObject({
      code: "USER_NOT_FOUND"
    });
  });
});
