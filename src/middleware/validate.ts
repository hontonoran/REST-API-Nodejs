import type { NextFunction, Request, Response } from "express";
import type { ZodType } from "zod";

type Location = "body" | "params" | "query";

function validate(location: Location, schema: ZodType) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[location]);

    if (!result.success) {
      return res.status(400).json({
        error: "Validation failed",
        details: {
          [location]: result.error.issues.map((issue) =>
            issue.path.length ? `${issue.path.join(".")}: ${issue.message}` : issue.message,
          ),
        },
      });
    }

    Object.defineProperty(req, location, { value: result.data, writable: true });
    next();
  };
}

export const validateBody = (schema: ZodType) => validate("body", schema);
export const validateParams = (schema: ZodType) => validate("params", schema);
export const validateQuery = (schema: ZodType) => validate("query", schema);