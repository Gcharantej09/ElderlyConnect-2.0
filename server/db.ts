import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error(
    "DATABASE_URL is not set. Add it to your .env file, e.g.\n" +
      "  DATABASE_URL=mysql://elderly_app:elderly2026@localhost:3306/elderlyconnect",
  );
}

export const pool = mysql.createPool({
  uri: url,
  connectionLimit: 10,
  waitForConnections: true,
  dateStrings: false,
});

export const db = drizzle(pool);
export const hasDb = true;
