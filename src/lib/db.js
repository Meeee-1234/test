// src/lib/db.js
import mysql from "mysql2/promise";

let pool;

function must(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}

export function getPool() {
  if (!pool) {
    const isProd = process.env.NODE_ENV === "production";

    // prod (Vercel): บังคับใช้ ENV จาก Railway; dev: อนุโลม fallback
    const host = isProd ? must("DB_HOST") : (process.env.DB_HOST || "localhost");
    const user = isProd ? must("DB_USER") : (process.env.DB_USER || "root");
    const password = isProd ? (process.env.DB_PASSWORD || "") : (process.env.DB_PASSWORD || "");
    const database = isProd ? must("DB_NAME") : (process.env.DB_NAME || "badminton");
    const port = Number(process.env.DB_PORT || 3306);

    // ถ้า Railway บังคับ SSL ค่อยตั้ง DB_SSL=true ใน Vercel
    const ssl = process.env.DB_SSL === "true" ? { rejectUnauthorized: true } : undefined;

    pool = mysql.createPool({
      host,
      user,
      password,
      database,
      port,
      ssl,
      waitForConnections: true,
      connectionLimit: 5,
      maxIdle: 5,
      idleTimeout: 60_000,
      queueLimit: 0,
    });
  }
  return pool;
}

// ให้ไฟล์เก่าที่ยัง import { db } ใช้งานต่อได้
export const db = getPool();
