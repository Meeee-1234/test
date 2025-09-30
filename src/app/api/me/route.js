

import { NextResponse } from "next/server";
import { verifyToken } from "../../../utils/auth";

export const runtime = "nodejs"; 

export async function GET(req) {
  const cookie = req.headers.get("cookie") || "";
  const m = cookie.match(/(?:^|;\s*)auth=([^;]+)/);
  if (!m) return NextResponse.json({ user: null }, { status: 200 });

  const token = decodeURIComponent(m[1]);
  const payload = verifyToken(token);
  if (!payload) return NextResponse.json({ user: null }, { status: 200 });

  const { id, email, username, is_admin } = payload;
  return NextResponse.json({ user: { id, email, username, is_admin } }, { status: 200 });
}


/*

4) (แถม) ทำ /api/me ไว้อ่านข้อมูลจากคุกกี้

src/app/api/me/route.js

import { NextResponse } from "next/server";
import { verifyToken } from "../../../utils/auth";

export async function GET(req) {
  const cookie = req.headers.get("cookie") || "";
  const m = cookie.match(/(?:^|;\s*)auth=([^;]+)/);
  if (!m) return NextResponse.json({ user: null }, { status: 200 });

  const token = decodeURIComponent(m[1]);
  const payload = verifyToken(token);
  if (!payload) return NextResponse.json({ user: null }, { status: 200 });

  // ส่งเฉพาะที่จำเป็นกลับไปให้ client ใช้แสดงผล
  const { id, email, username, is_admin } = payload;
  return NextResponse.json({ user: { id, email, username, is_admin } }, { status: 200 });
}


ฝั่ง React (เช่นใน Navbar) ก็ fetch("/api/me") เพื่อรู้ว่าใครล็อกอินอยู่

*/