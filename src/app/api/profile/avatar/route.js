
// Update รูปหน้า Profile 

import { NextResponse } from "next/server";
import { db } from "../../../../lib/db";
import { verifyToken } from "../../../../utils/auth";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

function getUserId(req) {
  const cookie = req.headers.get("cookie") || "";
  const m = cookie.match(/(?:^|;\s*)auth=([^;]+)/);
  if (!m) return null;
  try { return verifyToken(decodeURIComponent(m[1]))?.id || null; } catch { return null; }
}

export async function POST(req) {
  const uid = getUserId(req);
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("avatar");
  if (!file || typeof file === "string") {
    return NextResponse.json({ error: "No file" }, { status: 400 });
  }

  const type = file.type || "";
  if (!/^image\/(png|jpeg|jpg|webp)$/.test(type)) {
    return NextResponse.json({ error: "Only PNG/JPG/WebP allowed" }, { status: 415 });
  }
  const bytes = await file.arrayBuffer();
  if (bytes.byteLength > 2 * 1024 * 1024) { // 2MB
    return NextResponse.json({ error: "Max 2MB" }, { status: 413 });
  }

  const ext = type === "image/png" ? "png" : type === "image/webp" ? "webp" : "jpg";
  const dir = path.join(process.cwd(), "public", "uploads", "avatars");
  await mkdir(dir, { recursive: true });
  const filename = `${uid}_${Date.now()}.${ext}`;
  await writeFile(path.join(dir, filename), Buffer.from(bytes));

  const publicUrl = `/uploads/avatars/${filename}`;

  await db.query(
    `INSERT INTO profiles (user_id, avatar_url)
     VALUES (?, ?)
     ON DUPLICATE KEY UPDATE avatar_url = VALUES(avatar_url), updated_at = CURRENT_TIMESTAMP`,
    [uid, publicUrl]
  );

  return NextResponse.json({ avatar_url: publicUrl });
}
