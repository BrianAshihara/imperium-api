import jwt from "jsonwebtoken";
import { describe, expect, it } from "vitest";

import { createMockRequest, createMockResponse, createNext } from "./helpers/http";
import { env } from "../../src/config/env";
import { asyncHandler } from "../../src/utils/async-handler";
import { signAccessToken, verifyAccessToken } from "../../src/utils/jwt";
import { normalizePagination } from "../../src/utils/pagination";
import { getMonthRange } from "../../src/utils/period";
import { calculateOccurrencesBetween } from "../../src/utils/recurrence";
import { sendPaginated, sendSuccess } from "../../src/utils/response";

describe("utility helpers", () => {
  it("wraps async handlers and forwards rejections to next", async () => {
    const next = createNext();
    const handler = asyncHandler(async () => {
      throw new Error("boom");
    });

    handler(createMockRequest(), createMockResponse(), next);
    await Promise.resolve();

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: "boom" }));
  });

  it("builds the month range as inclusive date strings", () => {
    expect(getMonthRange(2, 2026)).toEqual({ startDate: "2026-02-01", endDate: "2026-02-28" });
    expect(getMonthRange(2, 2024)).toEqual({ startDate: "2024-02-01", endDate: "2024-02-29" });
    expect(getMonthRange(12, 2026)).toEqual({ startDate: "2026-12-01", endDate: "2026-12-31" });
  });

  it("normalizes pagination defaults and clamps the limit", () => {
    expect(normalizePagination()).toEqual({ page: 1, limit: 20 });
    expect(normalizePagination(-1, 1000)).toEqual({ page: 1, limit: 100 });
    expect(normalizePagination(3, 10)).toEqual({ page: 3, limit: 10 });
  });

  it("counts monthly, weekly, and yearly recurrences", () => {
    expect(calculateOccurrencesBetween("2026-01-01", "2026-03-31", "monthly", "2026-01-31")).toBe(3);
    expect(calculateOccurrencesBetween("2026-03-01", "2026-03-31", "weekly", "2026-02-24")).toBe(5);
    expect(calculateOccurrencesBetween("2026-01-01", "2028-12-31", "yearly", "2024-02-29")).toBe(3);
  });

  it("stops counting occurrences after the recurrence end date", () => {
    expect(
      calculateOccurrencesBetween("2026-01-01", "2026-06-30", "monthly", "2026-01-10", "2026-03-31")
    ).toBe(3);
    expect(
      calculateOccurrencesBetween("2026-05-01", "2026-05-31", "monthly", "2026-01-10", "2026-03-31")
    ).toBe(0);
  });

  it("returns zero occurrences for invalid or future recurrence inputs", () => {
    expect(calculateOccurrencesBetween("bad", "2026-03-31", "monthly", "2026-01-01")).toBe(0);
    expect(calculateOccurrencesBetween("2026-03-01", "2026-03-31", "unknown", "2026-01-01")).toBe(0);
    expect(calculateOccurrencesBetween("2026-03-01", "2026-03-31", "monthly", "2026-04-01")).toBe(0);
  });

  it("formats success responses", () => {
    const req = createMockRequest({ requestId: "req-1" });
    const res = createMockResponse();

    sendSuccess(res, req, { ok: true }, 201);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: { ok: true },
      requestId: "req-1"
    });
  });

  it("formats paginated responses", () => {
    const req = createMockRequest({ requestId: "req-2" });
    const res = createMockResponse();

    sendPaginated(res, req, {
      items: [{ id: "a" }],
      total: 5,
      page: 2,
      limit: 2,
      totalPages: 3
    });

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: [{ id: "a" }],
      pagination: {
        total: 5,
        page: 2,
        limit: 2,
        totalPages: 3,
        hasNextPage: true,
        hasPreviousPage: true
      },
      requestId: "req-2"
    });
  });

  it("signs and verifies access tokens", () => {
    const token = signAccessToken("user-123");
    const payload = verifyAccessToken(token);

    expect(payload.sub).toBe("user-123");
  });

  it("rejects tokens with an invalid payload shape", () => {
    const token = jwt.sign("bad-payload", env.JWT_SECRET);

    expect(() => verifyAccessToken(token)).toThrow("Invalid token payload");
  });
});
