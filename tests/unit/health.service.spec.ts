import { describe, expect, it } from "vitest";

import { healthService } from "../../src/modules/health/health.service";

describe("healthService.getStatus", () => {
  it("returns service status payload", () => {
    const result = healthService.getStatus();

    expect(result.status).toBe("ok");
    expect(typeof result.timestamp).toBe("string");
  });
});
