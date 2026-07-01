import { prisma } from "@/lib/prisma";
import { mapProfile } from "@/lib/prisma-mappers";
import { hashPassword } from "@/lib/auth";
import { verifyAuth } from "@/lib/auth-middleware";
import { NextRequest, NextResponse } from "next/server";

// GET - load all profiles
export async function GET(req: NextRequest) {
  const authError = verifyAuth(req);
  if (authError) return authError;

  try {
    const profiles = await prisma.profile.findMany({
      orderBy: { name: "asc" },
    });

    const users = profiles.map(mapProfile);
    return NextResponse.json(users);
  } catch (error) {
    console.error("Failed to load profiles:", error);
    return NextResponse.json(
      { error: "Failed to load profiles", details: [String(error)] },
      { status: 500 },
    );
  }
}

// POST - create a new profile
export async function POST(req: NextRequest) {
  const authError = verifyAuth(req);
  if (authError) return authError;

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

    // Generate a cryptographically random temporary password
    const temporaryPassword = crypto.randomUUID().slice(0, 12);
    const passwordHash = await hashPassword(temporaryPassword);

    const created = await prisma.profile.create({
      data: {
        id: crypto.randomUUID(),
        name,
        email: email.toLowerCase().trim(),
        role: role,
        cluster: cluster || null,
        impactArea: impactArea || null,
        passwordHash,
        passwordChanged: false,
      },
    });

    return NextResponse.json({
      ...mapProfile(created),
      temporaryPassword,
    });
  } catch (error) {
    console.error("Failed to create profile:", error);
    return NextResponse.json(
      { error: "Failed to create profile", details: [String(error)] },
      { status: 500 },
    );
  }
}

// PUT - update an existing profile
export async function PUT(req: NextRequest) {
  const authError = verifyAuth(req);
  if (authError) return authError;

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
      { error: "Failed to update profile", details: [String(error)] },
      { status: 500 },
    );
  }
}

// PATCH - change user password OR admin reset password
export async function PATCH(req: NextRequest) {
  const authError = verifyAuth(req);
  if (authError) return authError;

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
      { error: "Failed to patch profile", details: [String(error)] },
      { status: 500 },
    );
  }
}

// DELETE - remove a profile
export async function DELETE(req: NextRequest) {
  const authError = verifyAuth(req);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "id query param is required" },
        { status: 400 },
      );
    }

    // Check for dependent projects before deletion
    const projectCount = await prisma.project.count({
      where: { pmId: id },
    });

    if (projectCount > 0) {
      return NextResponse.json(
        {
          error: "Cannot delete user with assigned projects",
          details: [
            `User is PM on ${projectCount} project(s). Reassign projects before deletion.`,
          ],
        },
        { status: 409 },
      );
    }

    await prisma.profile.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete profile:", error);
    return NextResponse.json(
      { error: "Failed to delete profile", details: [String(error)] },
      { status: 500 },
    );
  }
}
