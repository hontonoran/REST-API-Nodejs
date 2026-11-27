import "../openapi.ts";
import { z } from "zod";
import { exampleUser, publicUserSchema } from "./auth.validator.ts";

export const CATEGORIES = ["sale", "service", "job", "other"] as const;

export const createAnnouncementSchema = z.object({
  title: z.string().trim().min(5).max(50),
  description: z.string().trim().min(10),
  price: z.coerce.number().positive(),
  category: z.enum(CATEGORIES),
});

export const updateAnnouncementSchema = createAnnouncementSchema.partial();

const imageField = z.string().openapi({ type: "string", format: "binary" }).optional();
export const createAnnouncementFormSchema = createAnnouncementSchema.extend({ image: imageField });
export const updateAnnouncementFormSchema = updateAnnouncementSchema.extend({ image: imageField });

export const idParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const listQuerySchema = z.object({
  search: z.string().trim().optional(),
  sort: z.enum(["newest", "oldest"]).default("newest"),
  page: z.coerce.number().int().positive().default(1),
});

// Schemas for the OpenAPI docs
export const announcementSchema = createAnnouncementSchema.extend({
  id: z.number().int(),
  imageUrl: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  user: publicUserSchema,
});

export const announcementListSchema = z.object({
  data: z.array(announcementSchema),
  pagination: z.object({
    total: z.number().int(),
    page: z.number().int(),
    totalPages: z.number().int(),
    perPage: z.number().int(),
  }),
});

export const exampleAnnouncement = {
  id: 6,
  title: "Продам велосипед",
  description: "Гірський велосипед, 21 швидкість",
  price: 8000,
  category: "sale",
  imageUrl: "https://res.cloudinary.com/demo/image/upload/v1/announcements/abc123.jpg",
  createdAt: "2025-01-11T10:00:00.000Z",
  updatedAt: "2025-01-11T10:00:00.000Z",
  user: exampleUser,
};