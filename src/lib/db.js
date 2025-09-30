// src/lib/db.js
import mysql from "mysql2/promise";

let pool;

export function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.DB_HOST,       // มาจาก Railway (MYSQLHOST)
      user: process.env.DB_USER,       // มาจาก Railway (MYSQLUSER)
      password: process.env.DB_PASSWORD, // มาจาก Railway (MYSQLPASSWORD)
      database: process.env.DB_NAME,   // มาจาก Railway (MYSQL_DATABASE)
      port: Number(process.env.DB_PORT || 3306), // มาจาก Railway (MYSQLPORT)
      waitForConnections: true,
      connectionLimit: 5,
      idleTimeout: 60000,
    });
  }
  return pool;
}
