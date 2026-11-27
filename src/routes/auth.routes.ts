import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import type { ZodType } from "zod";
import { registry } from "../openapi.ts";
import { authenticate } from "../middleware/authenticate.ts";
import { validateBody } from "../middleware/validate.ts";
import * as auth from "../controllers/auth.controller.ts";
import {
  authResponseSchema,
  errorSchema,
  exampleTokens,
  exampleUser,
  loginSchema,
  meResponseSchema,
  refreshSchema,
  registerSchema,
  tokensSchema,
} from "../validators/auth.validator.ts";

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later" },
});

router.use(authLimiter);

router.post("/register", validateBody(registerSchema), auth.register);
router.post("/login", validateBody(loginSchema), auth.login);
router.post("/refresh", validateBody(refreshSchema), auth.refresh);
router.post("/logout", authenticate, auth.logout);
router.get("/me", authenticate, auth.me);

export default router;

const json = (schema: ZodType, example?: unknown) => ({
  content: { "application/json": { schema, example } },
});
const error = (description: string) => ({
  description,
  ...json(errorSchema, { error: description }),
});

registry.registerPath({
  method: "post",
  path: "/auth/register",
  tags: ["Auth"],
  summary: "Register a new user",
  request: {
    body: json(registerSchema, {
      username: "ivan_petrenko",
      email: "ivan@example.com",
      password: "password",
      name: "Іван",
    }),
  },
  responses: {
    201: { description: "User created", ...json(authResponseSchema, { user: exampleUser, ...exampleTokens }) },
    400: { description: "Validation failed" },
    409: error("Username or email already taken"),
    429: error("Too many requests, please try again later"),
  },
});

registry.registerPath({
  method: "post",
  path: "/auth/login",
  tags: ["Auth"],
  summary: "Log in",
  request: { body: json(loginSchema, { username: "ivan_petrenko", password: "password" }) },
  responses: {
    200: { description: "Logged in", ...json(authResponseSchema, { user: exampleUser, ...exampleTokens }) },
    400: { description: "Validation failed" },
    401: error("Invalid credentials"),
    429: error("Too many requests, please try again later"),
  },
});

registry.registerPath({
  method: "post",
  path: "/auth/refresh",
  tags: ["Auth"],
  summary: "Get a new token pair (token rotation)",
  request: { body: json(refreshSchema, { refreshToken: "eyJhbGci..." }) },
  responses: {
    200: { description: "New token pair", ...json(tokensSchema, exampleTokens) },
    400: { description: "Validation failed" },
    401: error("Invalid refresh token"),
    429: error("Too many requests, please try again later"),
  },
});

registry.registerPath({
  method: "post",
  path: "/auth/logout",
  tags: ["Auth"],
  summary: "Log out (invalidate refresh token)",
  security: [{ bearerAuth: [] }],
  responses: {
    204: { description: "Logged out" },
    401: error("Unauthorized"),
  },
});

registry.registerPath({
  method: "get",
  path: "/auth/me",
  tags: ["Auth"],
  summary: "Current user profile",
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: "Current user",
      ...json(meResponseSchema, { ...exampleUser, createdAt: "2025-01-10T12:00:00.000Z" }),
    },
    401: error("Unauthorized"),
  },
});