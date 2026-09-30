import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ZodError, z } from "zod";

const verifyAccessTokenMock = vi.hoisted(() => vi.fn());
const randomUuidMock = vi.hoisted(() => vi.fn(() => "req-fixed"));

vi.mock("../../src/utils/jwt", () => ({
  verifyAccessToken: verifyAccessTokenMock
}));

vi.mock("crypto", async () => {
  const actual = await vi.importActual<typeof import("crypto")>("crypto");
  return {
    ...actual,
    randomUUID: randomUuidMock
  };
});

import { env } from "../../src/config/env";
import { AppError, ValidationError } from "../../src/errors";
import { authMiddleware } from "../../src/middlewares/auth.middleware";
import { errorMiddleware, notFoundMiddleware } from "../../src/middlewares/error.middleware";
import { requestIdMiddleware } from "../../src/middlewares/request-id.middleware";
import { createMockRequest, createMockResponse, createNext } from "./helpers/http";

describe("middlewares", () => {
  const originalNodeEnv = env.NODE_ENV;

  beforeEach(() => {
    vi.clearAllMocks();
    env.NODE_ENV = originalNodeEnv;
  });

  afterEach(() => {
    env.NODE_ENV = originalNodeEnv;
  });

  it("authMiddleware attaches the authenticated user id", () => {
    verifyAccessTokenMock.mockReturnValue({ sub: "user-1" });
    const req = createMockRequest({
      headers: { authorization: "Bearer valid-token" }
    });
    const next = createNext();

    authMiddleware(req, createMockResponse(), next);

    expect(req.userId).toBe("user-1");
    expect(next).toHaveBeenCalledWith();
  });

  it("authMiddleware rejects missing tokens", () => {
    const next = createNext();

    authMiddleware(createMockRequest(), createMockResponse(), next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ code: "MISSING_TOKEN" }));
  });

  it("authMiddleware rejects invalid tokens", () => {
    verifyAccessTokenMock.mockImplementation(() => {
      throw new Error("bad token");
    });

    const next = createNext();
    authMiddleware(
      createMockRequest({ headers: { authorization: "Bearer invalid" } }),
      createMockResponse(),
      next
    );

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ code: "INVALID_TOKEN" }));
  });

  it("requestIdMiddleware assigns a request id", () => {
    const req = createMockRequest();
    const next = createNext();

    requestIdMiddleware(req, createMockResponse(), next);

    expect(req.requestId).toBe("req-fixed");
    expect(next).toHaveBeenCalledWith();
  });

  it("notFoundMiddleware forwards a route-not-found error", () => {
    const next = createNext();

    notFoundMiddleware(
      createMockRequest({ method: "GET", originalUrl: "/missing" }),
      createMockResponse(),
      next
    );

    expect(next).toHaveBeenCalledWith(expect.objectContaining({
      code: "ROUTE_NOT_FOUND",
      message: "Route GET /missing not found"
    }));
  });

  it("errorMiddleware formats validation errors", () => {
    const schema = z.object({ email: z.string().email() });
    const parsed = schema.safeParse({ email: "bad" });
    const error = new ValidationError((parsed as { success: false; error: ZodError }).error);
    const res = createMockResponse();

    errorMiddleware(error, createMockRequest({ requestId: "req-1" }), res, createNext());

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      code: "VALIDATION_ERROR",
      errors: { email: expect.any(Array) },
      requestId: "req-1"
    }));
  });

  it("errorMiddleware formats app errors", () => {
    const res = createMockResponse();

    errorMiddleware(
      new AppError("Nope", 409, "NOPE"),
      createMockRequest({ requestId: "req-2" }),
      res,
      createNext()
    );

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Nope",
      code: "NOPE",
      requestId: "req-2"
    });
  });

  it("errorMiddleware includes details outside production", () => {
    env.NODE_ENV = "development";
    const res = createMockResponse();

    errorMiddleware(
      new Error("kaboom"),
      createMockRequest({ requestId: "req-3" }),
      res,
      createNext()
    );

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      code: "INTERNAL_SERVER_ERROR",
      detail: "kaboom"
    }));
  });

  it("errorMiddleware hides details in production", () => {
    env.NODE_ENV = "production";
    const res = createMockResponse();

    errorMiddleware(
      new Error("kaboom"),
      createMockRequest({ requestId: "req-4" }),
      res,
      createNext()
    );

    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Internal server error",
      code: "INTERNAL_SERVER_ERROR",
      requestId: "req-4"
    });
  });
});
