import { query } from "@/lib/db";
import { comparePassword } from "@/lib/auth";
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

    // Query user with password hash
    const result = await query(
      `SELECT id, name, email, role, cluster, impact_area, password_hash
       FROM users
       WHERE email = $1
       LIMIT 1`,
      [email.toLowerCase().trim()],
    );

    if (!result.rows || result.rows.length === 0) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 },
      );
    }

    const row = result.rows[0];
    
    // Verify password with bcrypt
    const isValid = await comparePassword(password, row.password_hash);
    
    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 },
      );
    }

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
