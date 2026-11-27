import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../app.ts";

describe("Security middleware", () => {
  it("sets helmet security headers and removes X-Powered-By", async () => {
    const response = await request(app).get("/announcements");

    expect(response.headers["x-content-type-options"]).toBe("nosniff");
    expect(response.headers["x-frame-options"]).toBe("SAMEORIGIN");
    expect(response.headers).toHaveProperty("content-security-policy");
    expect(response.headers).not.toHaveProperty("x-powered-by");
  });

  it("allows an origin listed in ALLOWED_ORIGINS", async () => {
    const response = await request(app)
      .get("/announcements")
      .set("Origin", "http://localhost:5173");

    expect(response.status).toBe(200);
    expect(response.headers["access-control-allow-origin"]).toBe("http://localhost:5173");
  });

  it("returns 403 for a disallowed origin", async () => {
    const response = await request(app)
      .get("/announcements")
      .set("Origin", "https://evil.example.com");

    expect(response.status).toBe(403);
    expect(response.body.error).toBe("Not allowed by CORS");
    expect(response.headers).not.toHaveProperty("access-control-allow-origin");
  });
});