import request from "supertest";
import { describe, expect, it } from "vitest";

import app from "../../src/app";

describe("GET /api/health", () => {
  it("returns 200 and status ok", async () => {
    const response = await request(app).get("/api/health");

    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe("ok");
    expect(typeof response.body.data.timestamp).toBe("string");
  });
});
