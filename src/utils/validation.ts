import { z } from "zod";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const isRealDate = (value: string): boolean => {
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));

  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
};

/**
 * `YYYY-MM-DD` string that is also a date that actually exists.
 * The plain regex alone accepts impossible values such as `2026-02-31`.
 */
export const dateString = z
  .string()
  .regex(DATE_PATTERN, "Date must be YYYY-MM-DD")
  .refine(isRealDate, "Date does not exist");
