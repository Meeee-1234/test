
// ดึงประวัติการจองสนามแบด

import { NextResponse } from "next/server";
import { db } from "../../../../lib/db";
import { verifyToken } from "../../../../utils/auth";

export const runtime = "nodejs"; 

function getUidFromCookie(req) {
  const cookie = req.headers.get("cookie") || "";
  const m = cookie.match(/(?:^|;\s*)auth=([^;]+)/);
  if (!m) return null;
  try { return verifyToken(decodeURIComponent(m[1]))?.id || null; } catch { return null; }
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get("email");

    let userId = null;
    if (email) {
      const [u] = await db.query("SELECT id FROM users WHERE email=? LIMIT 1", [email]);
      if (u?.length) userId = u[0].id;
    } else {
      userId = getUidFromCookie(req);
    }

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [rows] = await db.query(
      `SELECT id, booking_date, court, hour, status
       FROM bookings
       WHERE user_id = ?
       ORDER BY booking_date ASC, hour ASC`,
      [userId]
    );

    return NextResponse.json({ bookings: rows || [] });
  } catch (e) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
