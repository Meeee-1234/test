// src/app/api/admin/bookings/status/route.js
import { NextResponse } from "next/server";
import { db } from "../../../../../lib/db";         // <- ปรับ path ให้ตรงโปรเจกต์ถ้าแตกต่าง
import { verifyToken } from "../../../../../utils/auth";

function getAdmin(req) {
  const cookie = req.headers.get("cookie") || "";
  const m = cookie.match(/(?:^|;\s*)auth=([^;]+)/);
  if (!m) return null;
  try {
    const payload = verifyToken(decodeURIComponent(m[1]));
    if (!payload || !payload.is_admin) return null;
    return payload; // { id, email, username, is_admin }
  } catch {
    return null;
  }
}

export async function PUT(req) {
  // ตรวจสิทธิ์
  const admin = getAdmin(req);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const { date, selections, status } = await req.json();

    // validate
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date) || "")) {
      return NextResponse.json({ error: "invalid date" }, { status: 422 });
    }
    const allowed = new Set(["booked", "checked_in", "cancelled", "no_show"]);
    if (!allowed.has(status)) {
      return NextResponse.json({ error: "invalid status" }, { status: 422 });
    }
    if (!Array.isArray(selections) || selections.length === 0) {
      return NextResponse.json({ error: "selections required" }, { status: 422 });
    }

    let updated = 0;
    for (const s of selections) {
      const court = Number(s.court);
      const hour = Number(s.hour);
      if (!Number.isInteger(court) || court < 1 || court > 6) continue;
      if (!Number.isInteger(hour) || hour < 9 || hour > 20) continue;

      // อัปเดตเฉพาะแถวที่มีอยู่ (ไม่สร้างรายการใหม่อัตโนมัติ)
      const [res] = await db.query(
        `UPDATE bookings
         SET status=?
         WHERE booking_date=? AND court=? AND hour=?
         LIMIT 1`,
        [status, date, court, hour]
      );
      if (res.affectedRows > 0) updated += 1;
    }

    return NextResponse.json({ ok: true, updated });
  } catch (err) {
    return NextResponse.json({ error: err.message || "server error" }, { status: 500 });
  }
}
