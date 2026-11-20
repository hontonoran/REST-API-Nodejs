import { z } from "zod";

export const registerSchema = z.object({
  username: z.string().trim().min(3).max(30),
  email: z.string().trim().toLowerCase().pipe(z.email()),
  password: z.string().min(6).max(72),
  name: z.string().trim().min(2),
});

export const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

// Schemas for the OpenAPI docs
export const publicUserSchema = z.object({
  id: z.number().int(),
  username: z.string(),
  email: z.string(),
  name: z.string(),
});

export const tokensSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
});

export const authResponseSchema = tokensSchema.extend({ user: publicUserSchema });

export const meResponseSchema = publicUserSchema.extend({ createdAt: z.string() });

export const errorSchema = z.object({ error: z.string() });

export const exampleUser = {
  id: 1,
  username: "ivan_petrenko",
  email: "ivan@example.com",
  name: "Іван",
};
export const exampleTokens = { accessToken: "eyJhbGci...", refreshToken: "eyJhbGci..." };