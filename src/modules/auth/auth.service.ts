import { randomUUID } from "crypto";

import bcrypt from "bcrypt";

import { ConflictError, NotFoundError, UnauthorizedError } from "../../errors";
import { categoryService } from "../categories/category.service";
import { signAccessToken } from "../../utils/jwt";

import { AuthTokenResponse, AuthUserPublic, RegisterResponse } from "./auth.types";
import { authRepository } from "./auth.repository";

const SALT_ROUNDS = 12;

const normalizeEmail = (value: string): string => value.trim().toLowerCase();

export const authService = {
  register: async (
    email: string,
    password: string,
    name?: string
  ): Promise<RegisterResponse> => {
    const normalizedEmail = normalizeEmail(email);
    const existingUser = await authRepository.findByEmail(normalizedEmail);

    if (existingUser) {
      throw new ConflictError("Email already in use", "EMAIL_ALREADY_IN_USE");
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    try {
      const user = await authRepository.createUser({
        id: randomUUID(),
        email: normalizedEmail,
        passwordHash,
        name
      });
      await categoryService.seedDefaultCategoriesForUser(user.id);

      return {
        user,
        accessToken: signAccessToken(user.id)
      };
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.toLowerCase().includes("unique") &&
        error.message.toLowerCase().includes("users.email")
      ) {
        throw new ConflictError("Email already in use", "EMAIL_ALREADY_IN_USE");
      }

      throw error;
    }
  },
  login: async (email: string, password: string): Promise<AuthTokenResponse> => {
    const normalizedEmail = normalizeEmail(email);
    const user = await authRepository.findByEmail(normalizedEmail);

    if (!user) {
      throw new UnauthorizedError("Invalid credentials", "INVALID_CREDENTIALS");
    }

    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      throw new UnauthorizedError("Invalid credentials", "INVALID_CREDENTIALS");
    }

    return { accessToken: signAccessToken(user.id) };
  },
  getProfile: async (userId: string): Promise<AuthUserPublic> => {
    const user = await authRepository.findById(userId);

    if (!user) {
      throw new NotFoundError("User", "USER_NOT_FOUND");
    }

    return user;
  }
};
