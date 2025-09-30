
// cookie clear

import { NextResponse } from "next/server";

export const runtime = "nodejs"; 

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set("auth", "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 0 });
  return res;
}
