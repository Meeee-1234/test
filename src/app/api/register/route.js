
// Register

import { NextResponse } from "next/server";
import { db } from "../../../lib/db"; 
import bcrypt from "bcrypt";

// validate แบบง่าย
function isEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }
function isPhone(v) { return /^[0-9]{8,15}$/.test(v); }

export async function POST(req) {
  try {
    let { username, email, phone, password, confirm } = await req.json();

    username = (username ?? "").trim();
    email = (email ?? "").trim().toLowerCase();
    phone = (phone ?? "").replace(/\D/g, "");

    // 1) Validate
    if (!username || username.length < 3 || username.length > 32) {
      return NextResponse.json({ error: "Invalid username" }, { status: 422 });
    }
    if (!email || !isEmail(email)) {
      return NextResponse.json({ error: "Invalid email" }, { status: 422 });
    }
    if (!phone || !isPhone(phone)) {
      return NextResponse.json({ error: "Invalid phone" }, { status: 422 });
    }
    if (!password || password.length < 8) {
      return NextResponse.json({ error: "Password too short" }, { status: 422 });
    }
    if (password !== confirm) {
      return NextResponse.json({ error: "Password and confirm do not match" }, { status: 422 });
    }

    // 2) ตรวจ email ซ้ำ
    const [existRows] = await db.query("SELECT id FROM users WHERE email = ?", [email]);
    if (Array.isArray(existRows) && existRows.length > 0) {
      return NextResponse.json({ error: "Email already exists" }, { status: 409 });
    }

    // 3) Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // 4) Insert
    const [result] = await db.query(
      "INSERT INTO users (username, email, phone, password) VALUES (?, ?, ?, ?)",
      [username, email, phone, hashedPassword]
    );

    return NextResponse.json(
      { message: "Registered", userId: result.insertId }, { status: 201 }
    );
  } catch (e) {
    console.error(e);

    // จับ duplicate จาก DB เผื่อกรณี race => gpt มันเพิ่มมาให้อะ
    if (e?.code === "ER_DUP_ENTRY") {
      return NextResponse.json({ error: "Email already exists" }, { status: 409 });
    }

    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
