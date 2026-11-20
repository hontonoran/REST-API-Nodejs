import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import createError from "http-errors";

export interface AuthPayload {
  sub: number;
  username: string;
  type?: "refresh";
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const [scheme, token] = req.headers.authorization?.split(" ") ?? [];

  if (scheme !== "Bearer" || !token) {
    return next(createError(401, "Missing or invalid Authorization header"));
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!, {
      algorithms: ["HS256"],
    }) as unknown as AuthPayload;
    if (payload.type === "refresh") throw new Error("Wrong token type");
    req.user = payload;
    next();
  } catch {
    next(createError(401, "Invalid or expired token"));
  }
}