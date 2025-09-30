
// adminCourt

import { NextResponse } from "next/server";
import { db } from "../../../lib/db"; // ปรับ path ให้ตรงโปรเจกต์จริงของคุณ

// บังคับให้รันบน Node.js runtime (เพื่อให้ใช้ mysql2/promise ได้สบายใจ)
export const runtime = "nodejs";

// GET /api/availability?date=YYYY-MM-DD
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");

    if (!date) {
      return NextResponse.json({ error: "missing date" }, { status: 400 });
    }

    // ป้องกันรูปแบบวันที่ผิด (เบื้องต้น)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: "invalid date format (YYYY-MM-DD)" }, { status: 400 });
    }

    // ดึงช่องที่ถือผังว่า "ไม่ว่าง" (จองแล้ว/มาแล้ว)
    const sql = `
      SELECT 
        b.id           AS booking_id,
        b.court        AS court,
        b.hour         AS hour,
        b.status       AS status,
        u.id           AS user_id,
        u.username     AS username,
        u.phone        AS phone,
        u.email        AS email
      FROM bookings b
      JOIN users u ON u.id = b.user_id
      WHERE b.booking_date = ?
        AND b.status IN ('booked', 'checked_in')
      ORDER BY b.court, b.hour
    `;

    // mysql2/promise -> [rows, fields]
    const [rows] = await db.query(sql, [date]);

    // สร้าง payload: items + taken
    const items = rows.map((r) => ({
      bookingId: r.booking_id,
      court: r.court,
      hour: r.hour,
      status: r.status, // 'booked' | 'checked_in' | ...
      user: {
        id: r.user_id,
        username: r.username,
        phone: r.phone,
        email: r.email,
      },
    }));

    const taken = items.map((it) => `${it.court}:${it.hour}`);

    // ปิด cache ฝั่ง edge/CDN
    const res = NextResponse.json({ date, items, taken }, { status: 200 });
    res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    return res;
  } catch (e) {
    console.error("[availability] error:", e);
    return NextResponse.json({ error: e?.message || "server error" }, { status: 500 });
  }
}
