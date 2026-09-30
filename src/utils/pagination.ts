import { PaginationParams } from "../types/common.types";

export const normalizePagination = (
  page?: number,
  limit?: number
): PaginationParams => {
  const safePage = Number.isFinite(page) && page && page > 0 ? page : 1;
  const safeLimit = Number.isFinite(limit) && limit && limit > 0 ? limit : 20;
  return { page: safePage, limit: Math.min(safeLimit, 100) };
};
