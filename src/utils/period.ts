/**
 * Shared month-range helper.
 *
 * Returns the first and last day of a month as inclusive `YYYY-MM-DD` strings,
 * the format every date column in the database uses.
 */
export const getMonthRange = (
  month: number,
  year: number
): { startDate: string; endDate: string } => {
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const pad = (value: number): string => String(value).padStart(2, "0");

  return {
    startDate: `${year}-${pad(month)}-01`,
    endDate: `${year}-${pad(month)}-${pad(lastDay)}`
  };
};
