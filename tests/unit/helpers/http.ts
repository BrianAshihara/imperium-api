import { Request, Response } from "express";
import { Mock, vi } from "vitest";

export const createMockRequest = (overrides: Partial<Request> = {}): Request => {
  return {
    body: {},
    params: {},
    query: {},
    headers: {},
    ...overrides
  } as Request;
};

export const createMockResponse = (): Response & {
  status: Mock;
  json: Mock;
} => {
  const res = {} as Response & {
    status: Mock;
    json: Mock;
  };

  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);

  return res;
};

export const createNext = (): Mock => vi.fn();
