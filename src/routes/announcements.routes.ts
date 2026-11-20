import { Router } from "express";
import type { ZodType } from "zod";
import { registry } from "../openapi.ts";
import { authenticate } from "../middleware/authenticate.ts";
import { validateBody, validateParams, validateQuery } from "../middleware/validate.ts";
import * as announcements from "../controllers/announcements.controller.ts";
import {
  announcementListSchema,
  announcementSchema,
  createAnnouncementSchema,
  exampleAnnouncement,
  idParamsSchema,
  listQuerySchema,
  updateAnnouncementSchema,
} from "../validators/announcements.validator.ts";
import { errorSchema } from "../validators/auth.validator.ts";

const router = Router();

router.get("/", validateQuery(listQuerySchema), announcements.list);
router.get("/:id", validateParams(idParamsSchema), announcements.getById);
router.post("/", authenticate, validateBody(createAnnouncementSchema), announcements.create);
router.patch(
  "/:id",
  authenticate,
  validateParams(idParamsSchema),
  validateBody(updateAnnouncementSchema),
  announcements.update,
);
router.delete("/:id", authenticate, validateParams(idParamsSchema), announcements.remove);

export default router;

const json = (schema: ZodType, example?: unknown) => ({
  content: { "application/json": { schema, example } },
});
const error = (description: string) => ({
  description,
  ...json(errorSchema, { error: description }),
});
const laptop = {
  ...exampleAnnouncement,
  id: 5,
  title: "Продам ноутбук ASUS",
  description: "Відмінний стан, 16GB RAM",
  price: 18000,
  createdAt: "2025-01-10T12:00:00.000Z",
  updatedAt: "2025-01-10T12:00:00.000Z",
};
const secured = { security: [{ bearerAuth: [] }] };

registry.registerPath({
  method: "get",
  path: "/announcements",
  tags: ["Announcements"],
  summary: "List announcements (pagination, search, sort)",
  request: { query: listQuerySchema },
  responses: {
    200: {
      description: "Page of announcements",
      ...json(announcementListSchema, {
        data: [laptop],
        pagination: { total: 23, page: 2, totalPages: 3, perPage: 10 },
      }),
    },
    400: { description: "Validation failed" },
  },
});

registry.registerPath({
  method: "get",
  path: "/announcements/{id}",
  tags: ["Announcements"],
  summary: "Get one announcement",
  request: { params: idParamsSchema },
  responses: {
    200: { description: "Announcement", ...json(announcementSchema, laptop) },
    404: error("Announcement not found"),
  },
});

registry.registerPath({
  method: "post",
  path: "/announcements",
  tags: ["Announcements"],
  summary: "Create an announcement",
  ...secured,
  request: {
    body: json(createAnnouncementSchema, {
      title: "Продам велосипед",
      description: "Гірський велосипед, 21 швидкість",
      price: 8000,
      category: "sale",
    }),
  },
  responses: {
    201: { description: "Created", ...json(announcementSchema, exampleAnnouncement) },
    400: { description: "Validation failed" },
    401: error("Unauthorized"),
  },
});

registry.registerPath({
  method: "patch",
  path: "/announcements/{id}",
  tags: ["Announcements"],
  summary: "Update own announcement (partial)",
  ...secured,
  request: {
    params: idParamsSchema,
    body: json(updateAnnouncementSchema, { title: "Продам велосипед терміново", price: 6500 }),
  },
  responses: {
    200: {
      description: "Updated",
      ...json(announcementSchema, {
        ...exampleAnnouncement,
        title: "Продам велосипед терміново",
        price: 6500,
        updatedAt: "2025-01-12T14:30:00.000Z",
      }),
    },
    400: { description: "Validation failed" },
    401: error("Unauthorized"),
    403: error("Access denied"),
    404: error("Announcement not found"),
  },
});

registry.registerPath({
  method: "delete",
  path: "/announcements/{id}",
  tags: ["Announcements"],
  summary: "Delete own announcement",
  ...secured,
  request: { params: idParamsSchema },
  responses: {
    204: { description: "Deleted" },
    401: error("Unauthorized"),
    403: error("Access denied"),
    404: error("Announcement not found"),
  },
});