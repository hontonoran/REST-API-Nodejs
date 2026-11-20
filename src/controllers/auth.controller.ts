import type { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import createError from "http-errors";
import { randomUUID } from "node:crypto";
import prisma from "../../prisma/client.ts";

const publicUser = { id: true, username: true, email: true, name: true } as const;

async function issueTokens(user: { id: number; username: string }) {
  const secret = process.env.JWT_SECRET!;
  const accessToken = jwt.sign({ sub: user.id, username: user.username }, secret, {
    expiresIn: "15m",
  });
  const refreshToken = jwt.sign(
    { sub: user.id, username: user.username, type: "refresh", jti: randomUUID() },
    secret,
    { expiresIn: "7d" },
  );
  await prisma.refreshToken.create({ data: { token: refreshToken, userId: user.id } });
  return { accessToken, refreshToken };
}

export async function register(req: Request, res: Response) {
  const { username, email, password, name } = req.body;

  const existing = await prisma.user.findFirst({
    where: { OR: [{ username }, { email }] },
  });
  if (existing) throw createError(409, "Username or email already taken");

  const user = await prisma.user.create({
    data: { username, email, name, password: await bcrypt.hash(password, 10) },
    select: publicUser,
  });

  res.status(201).json({ user, ...(await issueTokens(user)) });
}

export async function login(req: Request, res: Response) {
  const { username, password } = req.body;

  const user = await prisma.user.findUnique({ where: { username } });
  if (!user || !(await bcrypt.compare(password, user.password))) {
    throw createError(401, "Invalid credentials");
  }

  await prisma.refreshToken.deleteMany({ where: { userId: user.id } });
  const { password: _password, createdAt: _createdAt, ...safeUser } = user;

  res.json({ user: safeUser, ...(await issueTokens(user)) });
}

export async function refresh(req: Request, res: Response) {
  const { refreshToken } = req.body;

  let payload: { type?: string };
  try {
    payload = jwt.verify(refreshToken, process.env.JWT_SECRET!) as { type?: string };
  } catch {
    throw createError(401, "Invalid refresh token");
  }
  if (payload.type !== "refresh") throw createError(401, "Invalid refresh token");

  const stored = await prisma.refreshToken.findUnique({
    where: { token: refreshToken },
    include: { user: true },
  });
  if (!stored) throw createError(401, "Invalid refresh token");

  // Token rotation: the old token can never be used again
  await prisma.refreshToken.delete({ where: { id: stored.id } });

  res.json(await issueTokens(stored.user));
}

export async function logout(req: Request, res: Response) {
  await prisma.refreshToken.deleteMany({ where: { userId: req.user!.sub } });
  res.status(204).end();
}

export async function me(req: Request, res: Response) {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.sub },
    select: { ...publicUser, createdAt: true },
  });
  if (!user) throw createError(404, "User not found");
  res.json(user);
}