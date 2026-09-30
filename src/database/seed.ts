/**
 * Development seed.
 *
 * Creates (or resets) a demo user with Brazilian-Portuguese categories and six
 * months of realistic entries, so the dashboard has something to show.
 *
 * Only runs when NODE_ENV is development or test.
 *
 * Run with: npm run seed
 */
import { randomUUID } from "crypto";

import bcrypt from "bcrypt";

import { env } from "../config/env";

const SEED_EMAIL = (process.env.SEED_USER_EMAIL ?? "demo@imperium.local").toLowerCase();
const SEED_PASSWORD = process.env.SEED_USER_PASSWORD ?? "demo12345";
const MONTHS_OF_HISTORY = 6;

type CategoryRow = { id: string; name: string };

const today = new Date();
const referenceMonth = today.getUTCMonth() + 1;
const referenceYear = today.getUTCFullYear();

const pad = (value: number): string => String(value).padStart(2, "0");

/** A date inside the month `offset` months before the reference month. */
const dateInMonth = (offset: number, day: number): string => {
  const cursor = new Date(Date.UTC(referenceYear, referenceMonth - 1 - offset, 1));
  const year = cursor.getUTCFullYear();
  const month = cursor.getUTCMonth() + 1;
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();

  return `${year}-${pad(month)}-${pad(Math.min(day, lastDay))}`;
};

/** Deterministic pseudo-random so repeated seeds stay comparable. */
const vary = (base: number, spread: number, step: number): number =>
  base + Math.round(Math.sin(step * 1.7) * spread);

const LOCAL_ENVIRONMENTS = ["development", "test"];

/**
 * Fails closed: with NODE_ENV unset the seed refuses to run instead of
 * assuming the database is local. A host that never sets the variable does
 * not get a demo user whose password is published in the README.
 */
const assertLocalEnvironment = (): void => {
  if (LOCAL_ENVIRONMENTS.includes(env.NODE_ENV)) return;

  throw new Error(
    `Refusing to seed: NODE_ENV is "${env.NODE_ENV}". ` +
      `Run it only with ${LOCAL_ENVIRONMENTS.join(" or ")} (copy .env.example to .env).`
  );
};

const run = async (): Promise<void> => {
  assertLocalEnvironment();

  // Imported here on purpose: loading the database module already creates the
  // file and the tables, which must not happen before the guard above passes.
  const { default: db } = await import("./database");
  const { categoryService } = await import("../modules/categories/category.service");

  // Start from scratch: deleting the user cascades to all of their data
  db.prepare("DELETE FROM users WHERE email = ?").run(SEED_EMAIL);

  const userId = randomUUID();
  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 12);

  db.prepare("INSERT INTO users (id, name, email, password_hash) VALUES (?, ?, ?, ?)").run(
    userId,
    "Usuário Demo",
    SEED_EMAIL,
    passwordHash
  );

  await categoryService.seedDefaultCategoriesForUser(userId);

  const categories = db
    .prepare("SELECT id, name FROM categories WHERE user_id = ?")
    .all(userId) as CategoryRow[];

  const categoryId = (name: string): string => {
    const found = categories.find((category) => category.name === name);
    if (!found) throw new Error(`Seed category not found: ${name}`);
    return found.id;
  };

  const insertIncome = db.prepare(`
    INSERT INTO incomes (
      id, user_id, category_id, amount_cents, description, date,
      is_recurring, recurrence_type
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertExpense = db.prepare(`
    INSERT INTO expenses (
      id, user_id, category_id, amount_cents, description, date,
      expense_type, is_recurring, recurrence_type
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertBudget = db.prepare(`
    INSERT INTO budgets (id, user_id, category_id, month, year, limit_amount_cents)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const seedAll = db.transaction(() => {
    // Recurring backbone, projected across every month by the reports
    insertIncome.run(
      randomUUID(),
      userId,
      categoryId("Salário"),
      750000,
      "Salário mensal",
      dateInMonth(MONTHS_OF_HISTORY - 1, 5),
      1,
      "monthly"
    );

    insertExpense.run(
      randomUUID(),
      userId,
      categoryId("Moradia"),
      180000,
      "Aluguel",
      dateInMonth(MONTHS_OF_HISTORY - 1, 10),
      "fixed",
      1,
      "monthly"
    );

    insertExpense.run(
      randomUUID(),
      userId,
      categoryId("Contas"),
      12990,
      "Internet",
      dateInMonth(MONTHS_OF_HISTORY - 1, 15),
      "fixed",
      1,
      "monthly"
    );

    // One-off entries, month by month
    for (let offset = MONTHS_OF_HISTORY - 1; offset >= 0; offset--) {
      const step = MONTHS_OF_HISTORY - offset;

      if (step % 2 === 0) {
        insertIncome.run(
          randomUUID(),
          userId,
          categoryId("Freelance"),
          vary(120000, 40000, step),
          "Projeto freelance",
          dateInMonth(offset, 18),
          0,
          null
        );
      }

      const variableExpenses: Array<[string, number, number, string]> = [
        ["Alimentação", vary(95000, 15000, step), 7, "Supermercado"],
        ["Alimentação", vary(28000, 9000, step), 21, "Restaurantes"],
        ["Transporte", vary(42000, 12000, step), 12, "Combustível"],
        ["Lazer", vary(18000, 8000, step), 24, "Cinema e streaming"],
        ["Saúde", vary(22000, 10000, step), 16, "Farmácia"],
        ["Educação", vary(30000, 5000, step), 9, "Curso online"]
      ];

      for (const [category, amountCents, day, description] of variableExpenses) {
        insertExpense.run(
          randomUUID(),
          userId,
          categoryId(category),
          amountCents,
          description,
          dateInMonth(offset, day),
          "variable",
          0,
          null
        );
      }
    }

    // Budgets for the current month
    insertBudget.run(randomUUID(), userId, categoryId("Alimentação"), referenceMonth, referenceYear, 140000);
    insertBudget.run(randomUUID(), userId, categoryId("Transporte"), referenceMonth, referenceYear, 50000);
    insertBudget.run(randomUUID(), userId, categoryId("Lazer"), referenceMonth, referenceYear, 20000);
    insertBudget.run(randomUUID(), userId, null, referenceMonth, referenceYear, 450000);
  });

  seedAll();

  const counts = db
    .prepare(
      `
        SELECT
          (SELECT COUNT(1) FROM incomes WHERE user_id = ?) AS incomes,
          (SELECT COUNT(1) FROM expenses WHERE user_id = ?) AS expenses,
          (SELECT COUNT(1) FROM budgets WHERE user_id = ?) AS budgets
      `
    )
    .get(userId, userId, userId) as { incomes: number; expenses: number; budgets: number };

  console.log("Seed concluído.");
  console.log(`  e-mail: ${SEED_EMAIL}`);
  console.log(`  senha:  ${SEED_PASSWORD}`);
  console.log(
    `  dados:  ${counts.incomes} receitas, ${counts.expenses} despesas, ${counts.budgets} orçamentos`
  );
};

run()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error("Seed falhou:", error);
    process.exit(1);
  });
