
import { NextResponse } from "next/server";
import { db } from "../../../lib/db";   
import bcrypt from "bcryptjs";
import { signUser } from "../../../utils/auth";

// POST /api/login
export async function POST(req) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password required" }, { status: 400 } );
    }

    // หา user
    const [rows] = await db.query(
      "SELECT id, username, email, password, is_admin FROM users WHERE email=? LIMIT 1", [email]
    );

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const user = rows[0];

    // ตรวจสอบรหัสผ่าน
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return NextResponse.json({ error: "Invalid password" }, { status: 401 });
    }

    // ออก JWT + เซ็ตคุกกี้แบบ HttpOnly
    const token = signUser(user);
    const res = NextResponse.json({ ok: true }); // ไม่ต้องส่ง user กลับฝั่ง client แล้ว

    res.cookies.set("auth", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // โปรดักชันเปิด HTTPS เท่านั้น
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 วัน
    });

    return res;
  } catch (err) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
