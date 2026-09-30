/**
 * Single source of truth for recurrence math.
 *
 * Counts how many times a recurring entry occurs inside [startDate, endDate],
 * inclusive. Nothing is ever written to the database: recurring entries are
 * stored once and projected on read.
 *
 * @param startDate          Range start (YYYY-MM-DD)
 * @param endDate            Range end (YYYY-MM-DD)
 * @param recurrenceType     "monthly" | "weekly" | "yearly"
 * @param eventDate          Date of the first occurrence (YYYY-MM-DD)
 * @param recurrenceEndDate  Optional date the recurrence stops (inclusive)
 */
export const calculateOccurrencesBetween = (
  startDate: string,
  endDate: string,
  recurrenceType: string,
  eventDate: string,
  recurrenceEndDate?: string | null
): number => {
  const rangeStart = new Date(`${startDate}T00:00:00Z`);
  let rangeEnd = new Date(`${endDate}T23:59:59Z`);
  const event = new Date(`${eventDate}T00:00:00Z`);

  if (
    Number.isNaN(rangeStart.getTime()) ||
    Number.isNaN(rangeEnd.getTime()) ||
    Number.isNaN(event.getTime())
  ) {
    return 0;
  }

  // A recurrence that already ended never reaches past its own end date
  if (recurrenceEndDate) {
    const recurrenceEnd = new Date(`${recurrenceEndDate}T23:59:59Z`);
    if (Number.isNaN(recurrenceEnd.getTime())) return 0;
    if (recurrenceEnd < rangeEnd) rangeEnd = recurrenceEnd;
  }

  if (event > rangeEnd || rangeStart > rangeEnd) {
    return 0;
  }

  switch (recurrenceType) {
    case "monthly":
      return countMonthlyOccurrences(rangeStart, rangeEnd, event);
    case "weekly":
      return countWeeklyOccurrences(rangeStart, rangeEnd, event);
    case "yearly":
      return countYearlyOccurrences(rangeStart, rangeEnd, event);
    default:
      return 0;
  }
};

const countMonthlyOccurrences = (rangeStart: Date, rangeEnd: Date, event: Date): number => {
  let count = 0;
  const eventDay = event.getUTCDate();

  let year = rangeStart.getUTCFullYear();
  let month = rangeStart.getUTCMonth();

  const endYear = rangeEnd.getUTCFullYear();
  const endMonth = rangeEnd.getUTCMonth();

  while (year < endYear || (year === endYear && month <= endMonth)) {
    // Clamp the day to the last day of the month (e.g. Jan 31 -> Feb 28)
    const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    const day = Math.min(eventDay, daysInMonth);
    const occurrence = new Date(Date.UTC(year, month, day));

    if (occurrence >= event && occurrence >= rangeStart && occurrence <= rangeEnd) {
      count++;
    }

    month++;
    if (month > 11) {
      month = 0;
      year++;
    }
  }

  return count;
};

const countWeeklyOccurrences = (rangeStart: Date, rangeEnd: Date, event: Date): number => {
  const WEEK_MS = 7 * 86400000;

  // First occurrence on or after the range start, aligned to the event weekday
  let daysUntilFirst = event.getUTCDay() - rangeStart.getUTCDay();
  if (daysUntilFirst < 0) daysUntilFirst += 7;

  const firstOccurrence = new Date(rangeStart.getTime() + daysUntilFirst * 86400000);

  // The recurrence cannot start before the event itself
  if (firstOccurrence < event) {
    const weeksToSkip = Math.ceil((event.getTime() - firstOccurrence.getTime()) / WEEK_MS);
    firstOccurrence.setTime(firstOccurrence.getTime() + weeksToSkip * WEEK_MS);
  }

  if (firstOccurrence > rangeEnd) return 0;

  return Math.floor((rangeEnd.getTime() - firstOccurrence.getTime()) / WEEK_MS) + 1;
};

const countYearlyOccurrences = (rangeStart: Date, rangeEnd: Date, event: Date): number => {
  let count = 0;
  const eventMonth = event.getUTCMonth();
  const eventDay = event.getUTCDate();

  for (let year = rangeStart.getUTCFullYear(); year <= rangeEnd.getUTCFullYear(); year++) {
    const daysInMonth = new Date(Date.UTC(year, eventMonth + 1, 0)).getUTCDate();
    const day = Math.min(eventDay, daysInMonth);
    const occurrence = new Date(Date.UTC(year, eventMonth, day));

    if (occurrence >= event && occurrence >= rangeStart && occurrence <= rangeEnd) {
      count++;
    }
  }

  return count;
};
