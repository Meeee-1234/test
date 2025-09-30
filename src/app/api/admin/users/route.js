
// 

import { NextResponse } from "next/server";
import { db } from "../../../../lib/db";           
import { verifyToken } from "../../../../utils/auth";

function getAdmin(req) {
  const cookie = req.headers.get("cookie") || "";
  const m = cookie.match(/(?:^|;\s*)auth=([^;]+)/);
  if (!m) return null;
  try { return verifyToken(decodeURIComponent(m[1])); } catch { return null; }
}

export async function GET(req) {
  try {
    const me = getAdmin(req);
    if (!me?.is_admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const [rows] = await db.query(
      `SELECT id, username, email, phone, created_at
       FROM users
       WHERE COALESCE(is_deleted, 0) = 0
       ORDER BY id ASC`
    );
    return NextResponse.json({ users: rows });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
