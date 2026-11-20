import { Router } from "express";
import type { ZodType } from "zod";
import { registry } from "../openapi.ts";
import { authenticate } from "../middleware/authenticate.ts";
import { validateBody } from "../middleware/validate.ts";
import * as auth from "../controllers/auth.controller.ts";
import {
  authResponseSchema,
  errorSchema,
  loginSchema,
  meResponseSchema,
  refreshSchema,
  registerSchema,
  tokensSchema,
} from "../validators/auth.validator.ts";

const router = Router();

router.post("/register", validateBody(registerSchema), auth.register);
router.post("/login", validateBody(loginSchema), auth.login);
router.post("/refresh", validateBody(refreshSchema), auth.refresh);
router.post("/logout", authenticate, auth.logout);
router.get("/me", authenticate, auth.me);

export default router;

const json = (schema: ZodType) => ({
  content: { "application/json": { schema } },
});
const error = (description: string) => ({ description, ...json(errorSchema) });

registry.registerPath({
  method: "post",
  path: "/auth/register",
  tags: ["Auth"],
  summary: "Register a new user",
  request: { body: json(registerSchema) },
  responses: {
    201: { description: "User created", ...json(authResponseSchema) },
    400: { description: "Validation failed" },
    409: error("Username or email already taken"),
  },
});

registry.registerPath({
  method: "post",
  path: "/auth/login",
  tags: ["Auth"],
  summary: "Log in",
  request: { body: json(loginSchema) },
  responses: {
    200: { description: "Logged in", ...json(authResponseSchema) },
    400: { description: "Validation failed" },
    401: error("Invalid credentials"),
  },
});

registry.registerPath({
  method: "post",
  path: "/auth/refresh",
  tags: ["Auth"],
  summary: "Get a new token pair (token rotation)",
  request: { body: json(refreshSchema) },
  responses: {
    200: { description: "New token pair", ...json(tokensSchema) },
    400: { description: "Validation failed" },
    401: error("Invalid refresh token"),
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
    200: { description: "Current user", ...json(meResponseSchema) },
    401: error("Unauthorized"),
  },
});