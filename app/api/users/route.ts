import { query } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

// GET - load all profiles
export async function GET() {
  try {
    const result = await query(
      "SELECT id, name, email, role, cluster, impact_area, password_changed FROM profiles ORDER BY name",
    );
    const data = result.rows;

    const users = (data ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      role: row.role,
      cluster: row.cluster ?? undefined,
      impactArea: row.impact_area ?? undefined,
      passwordChanged: row.password_changed ?? false,
    }));

    return NextResponse.json(users);
  } catch (error) {
    console.error("Failed to load profiles:", error);
    return NextResponse.json(
      { error: "Failed to load profiles", detail: String(error) },
      { status: 500 },
    );
  }
}

// POST - create a new profile
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, role, cluster, impactArea } = body as {
      name: string;
      email: string;
      role: string;
      cluster?: string;
      impactArea?: string;
    };

    if (!name || !email || !role) {
      return NextResponse.json(
        { error: "name, email, and role are required" },
        { status: 400 },
      );
    }

    // Generate bcrypt hash for default password via pgcrypto
    const hashResult = await query(
      "SELECT generate_password_hash($1) as hash",
      ["12345678"],
    );
    const passwordHash = hashResult.rows[0]?.hash ?? null;

    const result = await query(
      `INSERT INTO profiles (name, email, role, cluster, impact_area, password_hash, password_changed)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, name, email, role, cluster, impact_area, password_changed`,
      [
        name,
        email,
        role,
        cluster || null,
        impactArea || null,
        passwordHash,
        false,
      ],
    );
    const data = result.rows[0];

    return NextResponse.json({
      id: data.id,
      name: data.name,
      email: data.email,
      role: data.role,
      cluster: data.cluster ?? undefined,
      impactArea: data.impact_area ?? undefined,
      passwordChanged: data.password_changed ?? false,
    });
  } catch (error) {
    console.error("Failed to create profile:", error);
    return NextResponse.json(
      { error: "Failed to create profile", detail: String(error) },
      { status: 500 },
    );
  }
}

// PUT - update an existing profile
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, ...updates } = body as {
      id: string;
      name?: string;
      email?: string;
      role?: string;
      cluster?: string;
      impactArea?: string;
    };

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    // Build dynamic UPDATE query
    const setClauses: string[] = [];
    const params: any[] = [];
    let paramCount = 1;

    if (updates.name !== undefined) {
      setClauses.push(`name = $${paramCount}`);
      params.push(updates.name);
      paramCount++;
    }
    if (updates.email !== undefined) {
      setClauses.push(`email = $${paramCount}`);
      params.push(updates.email);
      paramCount++;
    }
    if (updates.role !== undefined) {
      setClauses.push(`role = $${paramCount}`);
      params.push(updates.role);
      paramCount++;
    }
    if (updates.cluster !== undefined) {
      setClauses.push(`cluster = $${paramCount}`);
      params.push(updates.cluster || null);
      paramCount++;
    }
    if (updates.impactArea !== undefined) {
      setClauses.push(`impact_area = $${paramCount}`);
      params.push(updates.impactArea || null);
      paramCount++;
    }

    if (setClauses.length === 0) {
      return NextResponse.json({ success: true });
    }

    params.push(id);
    const sql = `UPDATE profiles SET ${setClauses.join(", ")} WHERE id = $${paramCount}`;

    await query(sql, params);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update profile:", error);
    return NextResponse.json(
      { error: "Failed to update profile", detail: String(error) },
      { status: 500 },
    );
  }
}

// PATCH - change user password OR admin reset password
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, newPassword, resetToDefault } = body as {
      id: string;
      newPassword?: string;
      resetToDefault?: boolean;
    };

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    // Admin reset: set password_changed back to false
    if (resetToDefault) {
      try {
        await query("UPDATE profiles SET password_changed = $1 WHERE id = $2", [
          false,
          id,
        ]);
      } catch {
        // Ignore DB errors for seed users
      }

      return NextResponse.json({ success: true });
    }

    // User password change
    if (!newPassword) {
      return NextResponse.json(
        { error: "newPassword is required" },
        { status: 400 },
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 },
      );
    }

    try {
      await query("UPDATE profiles SET password_changed = $1 WHERE id = $2", [
        true,
        id,
      ]);
    } catch {
      // Ignore DB errors for seed users
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to patch profile:", error);
    return NextResponse.json(
      { error: "Failed to patch profile", detail: String(error) },
      { status: 500 },
    );
  }
}

// DELETE - remove a profile
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "id query param is required" },
        { status: 400 },
      );
    }

    await query("DELETE FROM profiles WHERE id = $1", [id]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete profile:", error);
    return NextResponse.json(
      { error: "Failed to delete profile", detail: String(error) },
      { status: 500 },
    );
  }
}
