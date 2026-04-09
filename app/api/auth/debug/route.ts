import { query } from "@/lib/db";
import { comparePassword } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    console.log(`DEBUG: Email: ${email}`);
    console.log(`DEBUG: Password provided: ${password ? 'yes' : 'no'}`);

    const result = await query(
      `SELECT id, name, email, role, cluster, impact_area, password_hash
       FROM users
       WHERE email = $1
       LIMIT 1`,
      [email.toLowerCase().trim()],
    );

    console.log(`DEBUG: Query result rows: ${result.rows.length}`);

    if (!result.rows || result.rows.length === 0) {
      return NextResponse.json(
        { error: "User not found", debug: { email, found: false } },
        { status: 401 },
      );
    }

    const row = result.rows[0];
    console.log(`DEBUG: Password hash exists: ${row.password_hash ? 'yes' : 'no'}`);
    console.log(`DEBUG: Hash length: ${row.password_hash?.length}`);

    const isValid = await comparePassword(password, row.password_hash);
    console.log(`DEBUG: Password valid: ${isValid}`);

    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid password", debug: { email, valid: false } },
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

    return NextResponse.json({ user, success: true });
  } catch (err: any) {
    console.error("Login error:", err);
    return NextResponse.json(
      { error: err.message, debug: true },
      { status: 500 },
    );
  }
}
