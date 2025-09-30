// src/app/api/profile/route.js
import { NextResponse } from "next/server";
import { db } from "../../../lib/db";
import { verifyToken } from "../../../utils/auth";

function getUserId(req) {
  const cookie = req.headers.get("cookie") || "";
  const m = cookie.match(/(?:^|;\s*)auth=([^;]+)/);
  if (!m) return null;
  try { return verifyToken(decodeURIComponent(m[1]))?.id || null; } catch { return null; }
}

export async function GET(req) {
  const uid = getUserId(req);
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [rows] = await db.query(
    `SELECT u.id, u.username, u.email, u.phone, u.created_at, p.avatar_url
     FROM users u
     LEFT JOIN profiles p ON p.user_id = u.id
     WHERE u.id = ? LIMIT 1`,
    [uid]
  );
  if (!rows?.length) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const u = rows[0];
  return NextResponse.json({
    user: {
      id: u.id,
      username: u.username,
      email: u.email,
      phone: u.phone,
      created_at: u.created_at,
      avatar_url: u.avatar_url || null,
    },
  });
}

export async function PUT(req) {
  const uid = getUserId(req);
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { username, phone } = await req.json();
  if (!username || username.length < 3) {
    return NextResponse.json({ error: "Invalid username" }, { status: 422 });
  }
  if (!phone) {
    return NextResponse.json({ error: "Invalid phone" }, { status: 422 });
  }

  await db.query(`UPDATE users SET username=?, phone=? WHERE id=?`, [username, phone, uid]);
  await db.query(`INSERT IGNORE INTO profiles (user_id) VALUES (?)`, [uid]); // ensure แถว profiles

  const [rows] = await db.query(
    `SELECT u.id, u.username, u.email, u.phone, u.created_at, p.avatar_url
     FROM users u
     LEFT JOIN profiles p ON p.user_id = u.id
     WHERE u.id = ? LIMIT 1`,
    [uid]
  );
  const u = rows[0];
  return NextResponse.json({
    user: {
      id: u.id,
      username: u.username,
      email: u.email,
      phone: u.phone,
      created_at: u.created_at,
      avatar_url: u.avatar_url || null,
    },
  });
}
