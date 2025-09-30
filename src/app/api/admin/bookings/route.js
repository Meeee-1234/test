
// ดึงสถานะประวัติการจองทั้งหมดของผู้ใช้งาน

import { NextResponse } from "next/server";
import { db } from "../../../../lib/db";
import { verifyToken } from "../../../../utils/auth";

export const runtime = "nodejs"; 

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
        `SELECT
            b.id, b.booking_date, b.court, b.hour, b.status, b.created_at,
            u.username, u.email
        FROM bookings b
        JOIN users u ON u.id = b.user_id
        ORDER BY b.id ASC`
    );

    return NextResponse.json({ bookings: rows });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
