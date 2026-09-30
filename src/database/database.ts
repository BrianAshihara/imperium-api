import { mkdirSync } from "fs";
import path from "path";

import Database from "better-sqlite3";

import { env } from "../config/env";

const resolveDatabasePath = (): string => {
  const value = env.DATABASE_URL;
  const normalized = value.startsWith("file:") ? value.replace("file:", "") : value;
  return path.resolve(process.cwd(), normalized);
};

const databasePath = resolveDatabasePath();
mkdirSync(path.dirname(databasePath), { recursive: true });

const db = new Database(databasePath);

db.pragma("foreign_keys = ON");
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    normalized_name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
    is_default INTEGER NOT NULL DEFAULT 0 CHECK (is_default IN (0, 1)),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, normalized_name)
  );

  CREATE INDEX IF NOT EXISTS idx_categories_user_type_name
    ON categories(user_id, type, name);

  CREATE TABLE IF NOT EXISTS incomes (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
    amount_cents INTEGER NOT NULL CHECK (amount_cents >= 0),
    description TEXT,
    date TEXT NOT NULL,
    is_recurring INTEGER NOT NULL DEFAULT 0 CHECK (is_recurring IN (0, 1)),
    recurrence_type TEXT CHECK (recurrence_type IN ('monthly', 'weekly', 'yearly')),
    recurrence_end_date TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_incomes_user_date
    ON incomes(user_id, date);

  CREATE INDEX IF NOT EXISTS idx_incomes_user_category
    ON incomes(user_id, category_id);

  CREATE INDEX IF NOT EXISTS idx_incomes_user_recurring
    ON incomes(user_id, is_recurring) WHERE is_recurring = 1;

  CREATE TABLE IF NOT EXISTS expenses (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
    amount_cents INTEGER NOT NULL CHECK (amount_cents >= 0),
    description TEXT,
    date TEXT NOT NULL,
    expense_type TEXT NOT NULL CHECK (expense_type IN ('fixed', 'variable')),
    is_recurring INTEGER NOT NULL DEFAULT 0 CHECK (is_recurring IN (0, 1)),
    recurrence_type TEXT CHECK (recurrence_type IN ('monthly', 'weekly', 'yearly')),
    recurrence_end_date TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_expenses_user_date
    ON expenses(user_id, date);

  CREATE INDEX IF NOT EXISTS idx_expenses_user_category
    ON expenses(user_id, category_id);

  CREATE INDEX IF NOT EXISTS idx_expenses_user_recurring
    ON expenses(user_id, is_recurring) WHERE is_recurring = 1;

  CREATE TABLE IF NOT EXISTS budgets (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id TEXT REFERENCES categories(id) ON DELETE CASCADE,
    month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
    year INTEGER NOT NULL CHECK (year >= 2000),
    limit_amount_cents INTEGER NOT NULL CHECK (limit_amount_cents > 0),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE UNIQUE INDEX IF NOT EXISTS idx_budgets_user_category_period
    ON budgets(user_id, COALESCE(category_id, '__global__'), month, year);

  CREATE INDEX IF NOT EXISTS idx_budgets_user_period
    ON budgets(user_id, year, month);
`);

export { databasePath, db };
export default db;
