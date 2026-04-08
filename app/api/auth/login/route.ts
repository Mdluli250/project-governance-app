import { query } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 },
      );
    }

    // Direct PostgreSQL query with pgcrypto password verification
    const result = await query(
      `SELECT id, name, email, role, cluster, impact_area
       FROM users
       WHERE email = $1 AND password_hash = crypt($2, password_hash)
       LIMIT 1`,
      [email.toLowerCase().trim(), password],
    );

    if (!result.rows || result.rows.length === 0) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 },
      );
    }

    const row = result.rows[0];
    const user = {
      id: row.id,
      name: row.name,
      email: row.email,
      role: row.role,
      cluster: row.cluster ?? undefined,
      impactArea: row.impact_area ?? undefined,
    };

    return NextResponse.json({ user });
  } catch (err) {
    console.error("Login error:", err);
    return NextResponse.json(
      { error: "Something went wrong." },
      { status: 500 },
    );
  }
}
