import { describe, it, expect } from "vitest";

describe("Vitest environment", () => {
  it("uses the test DATABASE_URL", () => {
    expect(process.env.DATABASE_URL).toBe(process.env.TEST_DATABASE_URL);
  });
});