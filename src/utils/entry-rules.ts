import { ValidationFailedError } from "../errors";

/**
 * Recurrence rules shared by incomes and expenses.
 *
 * A recurring entry is stored once and projected on read, so its recurrence
 * fields have to stay coherent with each other.
 */
export const assertRecurrenceIsCoherent = (entry: {
  date: string;
  isRecurring: boolean;
  recurrenceType: string | null;
  recurrenceEndDate: string | null;
}): void => {
  if (entry.isRecurring && !entry.recurrenceType) {
    throw new ValidationFailedError("Recurrence type is required for recurring entries");
  }

  if (!entry.isRecurring && entry.recurrenceType) {
    throw new ValidationFailedError("Recurrence type is only allowed on recurring entries");
  }

  if (!entry.isRecurring && entry.recurrenceEndDate) {
    throw new ValidationFailedError("Recurrence end date is only allowed on recurring entries");
  }

  if (entry.recurrenceEndDate && entry.recurrenceEndDate < entry.date) {
    throw new ValidationFailedError("Recurrence end date cannot be before the entry date");
  }
};
