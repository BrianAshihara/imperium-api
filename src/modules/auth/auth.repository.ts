import db from "../../database/database";

import { AuthUserPublic } from "./auth.types";

type AuthUserRow = {
  id: string;
  email: string;
  name: string | null;
  password_hash: string;
  created_at: string;
};

export const authRepository = {
  findByEmail: async (email: string): Promise<AuthUserRow | null> => {
    const row = db
      .prepare("SELECT id, email, name, password_hash, created_at FROM users WHERE email = ?")
      .get(email) as AuthUserRow | undefined;

    return row ?? null;
  },
  findById: async (id: string): Promise<AuthUserPublic | null> => {
    const row = db
      .prepare("SELECT id, email, name, created_at FROM users WHERE id = ?")
      .get(id) as { id: string; email: string; name: string | null; created_at: string } | undefined;

    if (!row) {
      return null;
    }

    return {
      id: row.id,
      email: row.email,
      name: row.name,
      createdAt: row.created_at
    };
  },
  createUser: async (input: {
    id: string;
    email: string;
    passwordHash: string;
    name?: string;
  }): Promise<AuthUserPublic> => {
    db.prepare("INSERT INTO users (id, email, password_hash, name) VALUES (?, ?, ?, ?)").run(
      input.id,
      input.email,
      input.passwordHash,
      input.name ?? null
    );

    const row = db
      .prepare("SELECT id, email, name, created_at FROM users WHERE id = ?")
      .get(input.id) as { id: string; email: string; name: string | null; created_at: string } | undefined;

    if (!row) {
      throw new Error("Failed to load created user");
    }

    return {
      id: row.id,
      email: row.email,
      name: row.name,
      createdAt: row.created_at
    };
  }
};
