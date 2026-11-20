import type { Request, Response } from "express";
import createError from "http-errors";
import prisma from "../../prisma/client.ts";

const PER_PAGE = 10;

const include = {
  user: { select: { id: true, username: true, email: true, name: true } },
} as const;

const omit = { userId: true } as const;

async function findOwned(req: Request) {
  const id = Number(req.params.id);
  const announcement = await prisma.announcement.findUnique({ where: { id } });
  if (!announcement) throw createError(404, "Announcement not found");
  if (announcement.userId !== req.user!.sub) throw createError(403, "Access denied");
  return id;
}

export async function list(req: Request, res: Response) {
  const { search, sort, page } = req.query as unknown as {
    search?: string;
    sort: "newest" | "oldest";
    page: number;
  };

  const where = search
    ? { title: { contains: search, mode: "insensitive" as const } }
    : {};

  const [data, total] = await Promise.all([
    prisma.announcement.findMany({
      where,
      include,
      omit,
      orderBy: { createdAt: sort === "oldest" ? "asc" : "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
    }),
    prisma.announcement.count({ where }),
  ]);

  res.json({
    data,
    pagination: { total, page, totalPages: Math.ceil(total / PER_PAGE), perPage: PER_PAGE },
  });
}

export async function getById(req: Request, res: Response) {
  const announcement = await prisma.announcement.findUnique({
    where: { id: Number(req.params.id) },
    include,
    omit,
  });
  if (!announcement) throw createError(404, "Announcement not found");
  res.json(announcement);
}