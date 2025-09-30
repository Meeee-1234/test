
import jwt from "jsonwebtoken";

const SECRET = process.env.JWT_SECRET || "dev-secret-change-me"; // ใส่ใน .env prod

export function signUser(user) {
  // เก็บเท่าที่จำเป็น
  const payload = { id: user.id, email: user.email, username: user.username, is_admin: !!user.is_admin };
  return jwt.sign(payload, SECRET, { expiresIn: "7d" });
}

export function verifyToken(token) {
  try { return jwt.verify(token, SECRET); }
  catch { return null; }
}
