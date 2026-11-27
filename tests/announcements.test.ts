import { describe, it, expect, beforeEach, afterAll, vi } from "vitest";
import fs from "node:fs/promises";
import request from "supertest";
import jwt from "jsonwebtoken";
import { v2 as cloudinary } from "cloudinary";
import app from "../app.ts";
import prisma from "../prisma/client.ts";

const { FAKE_URL } = vi.hoisted(() => ({
  FAKE_URL: "https://res.cloudinary.com/demo/image/upload/v1/announcements/test.jpg",
}));
vi.mock("cloudinary", () => ({
  v2: {
    config: vi.fn(),
    uploader: { upload: vi.fn(async () => ({ secure_url: FAKE_URL })) },
  },
}));

let token: string;

beforeEach(async () => {
  vi.clearAllMocks();
  await prisma.user.deleteMany();
  const user = await prisma.user.create({
    data: { username: "hontonoran", email: "hontonoran@example.com", password: "hash", name: "Anastasiia" },
  });
  token = jwt.sign({ sub: user.id, username: user.username }, process.env.JWT_SECRET!);
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("POST /announcements (multipart/form-data)", () => {
  const fields = {
    title: "Selling a bike",
    description: "Trek in excellent condition, frame size L",
    price: "8500",
    category: "sale",
  };

  it("uploads the photo to Cloudinary, saves the URL and deletes the temp file", async () => {
    const response = await request(app)
      .post("/announcements")
      .set("Authorization", `Bearer ${token}`)
      .field(fields)
      .attach("image", Buffer.from("fake image bytes"), "mybike.jpg");

    expect(response.status).toBe(201);
    expect(response.body.imageUrl).toBe(FAKE_URL);
    expect(response.body.price).toBe(8500);

    const saved = await prisma.announcement.findUnique({ where: { id: response.body.id } });
    expect(saved!.imageUrl).toBe(FAKE_URL);

    expect(cloudinary.uploader.upload).toHaveBeenCalledOnce();
    const tempPath = vi.mocked(cloudinary.uploader.upload).mock.calls[0][0];
    expect(tempPath).toMatch(/^uploads\//);
    await expect(fs.access(tempPath)).rejects.toThrow();
  });

  it("creates an announcement without a photo (imageUrl is null)", async () => {
    const response = await request(app)
      .post("/announcements")
      .set("Authorization", `Bearer ${token}`)
      .field(fields);

    expect(response.status).toBe(201);
    expect(response.body.imageUrl).toBeNull();
    expect(cloudinary.uploader.upload).not.toHaveBeenCalled();
  });

  it("deletes the temp file when validation fails", async () => {
    const before = await fs.readdir("uploads");

    const response = await request(app)
      .post("/announcements")
      .set("Authorization", `Bearer ${token}`)
      .field({ ...fields, title: "Bike" })
      .attach("image", Buffer.from("fake image bytes"), "bike.jpg");

    expect(response.status).toBe(400);
    expect(cloudinary.uploader.upload).not.toHaveBeenCalled();
    await vi.waitFor(async () => expect(await fs.readdir("uploads")).toEqual(before));
  });
});