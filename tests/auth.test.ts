import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import bcrypt from "bcrypt";
import app from "../app.ts";
import prisma from "../prisma/client.ts";

describe("Auth API", () => {
  describe("POST /auth/register", () => {
    it("registers a new user and returns tokens", async () => {
      const response = await request(app).post("/auth/register").send({
        username: "hontonoran",
        email: "hontonoran@example.com",
        password: "qwerty123",
        name: "Anastasiia",
      });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty("accessToken");
      expect(response.body).toHaveProperty("refreshToken");
      expect(response.body.user.username).toBe("hontonoran");
      expect(response.body.user).not.toHaveProperty("password");

      const saved = await prisma.user.findUnique({ where: { username: "hontonoran" } });
      expect(saved!.password).not.toBe("qwerty123");
      expect(await bcrypt.compare("qwerty123", saved!.password)).toBe(true);
    });

    it("returns 409 when the username is taken", async () => {
      await prisma.user.create({
        data: {
          username: "hontonoran",
          email: "different@example.com",
          password: await bcrypt.hash("qwerty123", 10),
          name: "Anastasiia",
        },
      });

      const response = await request(app).post("/auth/register").send({
        username: "hontonoran",
        email: "another@example.com",
        password: "qwerty123",
        name: "Another Anastasiia",
      });

      expect(response.status).toBe(409);
      expect(response.body).toHaveProperty("error");
    });

    it("returns 400 for invalid data", async () => {
      const response = await request(app).post("/auth/register").send({
        username: "ok",
        email: "invalid-email",
        password: "123",
        name: "",
      });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
      expect(response.body).toHaveProperty("details");
    });
  });

  describe("POST /auth/login", () => {
    beforeEach(async () => {
      await prisma.user.create({
        data: {
          username: "hontonoran",
          email: "hontonoran@example.com",
          password: await bcrypt.hash("qwerty123", 10),
          name: "Anastasiia",
        },
      });
    });

    it("returns tokens for valid credentials", async () => {
      const response = await request(app)
        .post("/auth/login")
        .send({ username: "hontonoran", password: "qwerty123" });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("accessToken");
      expect(response.body).toHaveProperty("refreshToken");
      expect(response.body.user.username).toBe("hontonoran");
    });

    it("returns 401 for a wrong password", async () => {
      const response = await request(app)
        .post("/auth/login")
        .send({ username: "hontonoran", password: "wrong_password" });

      expect(response.status).toBe(401);
    });

    it("returns 401 for a non-existent user", async () => {
      const response = await request(app)
        .post("/auth/login")
        .send({ username: "nonexistent", password: "qwerty123" });

      expect(response.status).toBe(401);
    });
  });

  describe("Rate limiting", () => {
    it("returns 429 after 10 requests from one IP within 15 minutes", async () => {
      let response!: request.Response;
      for (let i = 0; i < 11; i++) {
        response = await request(app).post("/auth/login").send({ username: "x", password: "y" });
      }

      expect(response.status).toBe(429);
      expect(response.body.error).toBe("Too many requests, please try again later");
    });

    it("does not limit announcement routes", async () => {
      const response = await request(app).get("/announcements");

      expect(response.status).toBe(200);
    });
  });
});