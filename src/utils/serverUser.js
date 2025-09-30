// src/utils/serverUser.js
import { cookies } from "next/headers";
import { verifyToken } from "./auth";    // ← เปลี่ยนจาก "@/utils/auth"
import { db } from "../lib/db";

export async function getServerUser() {
  const jar = await cookies();                 // Next รุ่นใหม่ต้อง await
  const token = jar.get("auth")?.value;
  if (!token) return null;

  const payload = verifyToken(token);
  if (!payload) return null;

  // เช็กซ้ำกับ DB ว่ายังมี user และไม่โดนลบ (กันเคสลบแล้วแต่ cookie ค้าง)
  const [rows] = await db.query(
    "SELECT id, username, email, is_admin, COALESCE(is_deleted,0) AS is_deleted FROM users WHERE id=? LIMIT 1",
    [payload.id]
  );
  if (!rows.length || rows[0].is_deleted) return null;

  const u = rows[0];
  return { id: u.id, username: u.username, email: u.email, is_admin: !!u.is_admin };
}
