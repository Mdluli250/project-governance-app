import { prisma } from "@/lib/prisma";
import { mapProfile } from "@/lib/prisma-mappers";
import { hashPassword } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

// GET - load all profiles
export async function GET() {
  try {
    const profiles = await prisma.profile.findMany({
      orderBy: { name: "asc" },
    });

    const users = profiles.map(mapProfile);
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

    // Generate bcrypt hash for default password
    const passwordHash = await hashPassword("12345678");

    const created = await prisma.profile.create({
      data: {
        id: `u${Date.now()}`,
        name,
        email: email.toLowerCase().trim(),
        role: role,
        cluster: cluster || null,
        impactArea: impactArea || null,
        passwordHash,
        passwordChanged: false,
      },
    });

    return NextResponse.json(mapProfile(created));
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

    const data: Record<string, unknown> = {};

    if (updates.name !== undefined) {
      data.name = updates.name;
    }
    if (updates.email !== undefined) {
      data.email = updates.email;
    }
    if (updates.role !== undefined) {
      data.role = updates.role;
    }
    if (updates.cluster !== undefined) {
      data.cluster = updates.cluster || null;
    }
    if (updates.impactArea !== undefined) {
      data.impactArea = updates.impactArea || null;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ success: true });
    }

    data.updatedAt = new Date();

    await prisma.profile.update({
      where: { id },
      data,
    });

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

    // Admin reset: set password back to default and mark as not changed
    if (resetToDefault) {
      const defaultHash = await hashPassword("12345678");
      await prisma.profile.update({
        where: { id },
        data: {
          passwordHash: defaultHash,
          passwordChanged: false,
        },
      });
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

    const newHash = await hashPassword(newPassword);
    await prisma.profile.update({
      where: { id },
      data: {
        passwordHash: newHash,
        passwordChanged: true,
      },
    });

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

    await prisma.profile.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete profile:", error);
    return NextResponse.json(
      { error: "Failed to delete profile", detail: String(error) },
      { status: 500 },
    );
  }
}
