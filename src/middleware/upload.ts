import fs from "node:fs/promises";
import type { NextFunction, Request, Response } from "express";
import multer from "multer";
import createError from "http-errors";
import { v2 as cloudinary } from "cloudinary";

export const upload = multer({
  dest: "uploads/",
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) return cb(null, true);
    cb(createError(400, "Only image files are allowed"));
  },
});

function cleanupTempFile(req: Request, res: Response, next: NextFunction) {
  res.on("finish", () => {
    if (req.file) fs.unlink(req.file.path).catch(() => {});
  });
  next();
}

export const uploadImage = [upload.single("image"), cleanupTempFile];

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function uploadToCloudinary(filePath: string) {
  try {
    const result = await cloudinary.uploader.upload(filePath, { folder: "announcements" });
    return result.secure_url;
  } finally {
    await fs.unlink(filePath);
  }
}