import { NextResponse } from "next/server";
import { db } from "../../../lib/db";
import { verifyToken } from "../../../utils/auth";

export const runtime = "nodejs"; 

const OPEN_HOUR = 9, CLOSE_HOUR = 21;

function getUser(req) {
  const cookie = req.headers.get("cookie") || "";
  const m = cookie.match(/(?:^|;\s*)auth=([^;]+)/);
  if (!m) return null;
  try { return verifyToken(decodeURIComponent(m[1])); } catch { return null; }
}

export async function POST(req) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { date, court, hour } = await req.json();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || "")) {
    return NextResponse.json({ error: "invalid date" }, { status: 422 });
  }
  const c = Number(court), h = Number(hour);
  if (![1,2,3,4,5,6].includes(c)) {
    return NextResponse.json({ error: "court must be 1..6" }, { status: 422 });
  }
  if (h < OPEN_HOUR || h >= CLOSE_HOUR) {
    return NextResponse.json({ error: "hour must be 9..20" }, { status: 422 });
  }

  try {
    await db.query(
      "INSERT INTO bookings (user_id, booking_date, court, hour, status) VALUES (?, ?, ?, ?, 'booked')",
      [user.id, date, c, h]
    );
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e?.code === "ER_DUP_ENTRY") {
      return NextResponse.json({ error: "slot already taken" }, { status: 409 });
    }
    // fallback กันกรณี schema ไม่มี UNIQUE
    const [dup] = await db.query(
      "SELECT id FROM bookings WHERE booking_date=? AND court=? AND hour=? AND status IN ('booked','checked_in')",
      [date, c, h]
    );
    if (dup.length) return NextResponse.json({ error: "slot already taken" }, { status: 409 });
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}
