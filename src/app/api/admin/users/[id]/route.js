
// ลบ Account ของผู้ใช้งาน

import { NextResponse } from "next/server";
import { db } from "../../../../../lib/db";     
import { verifyToken } from "../../../../../utils/auth";

export const runtime = "nodejs"; 

function getAdmin(req) {
  const cookie = req.headers.get("cookie") || "";
  const m = cookie.match(/(?:^|;\s*)auth=([^;]+)/);
  if (!m) return null;
  try { return verifyToken(decodeURIComponent(m[1])); } catch { return null; }
}

export async function DELETE(req, { params }) {
  try {
    const me = getAdmin(req);
    if (!me?.is_admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const id = Number(params.id);
    if (!id) return NextResponse.json({ error: "Invalid user id" }, { status: 400 });

    const [result] = await db.query(
      `UPDATE users SET is_deleted = 1 WHERE id = ?`,
      [id]
    );
    if (result.affectedRows === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
