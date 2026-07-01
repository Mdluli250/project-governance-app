import { prisma } from "@/lib/prisma";
import { comparePassword } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    console.log(`DEBUG: Email: ${email}`);
    console.log(`DEBUG: Password provided: ${password ? 'yes' : 'no'}`);

    const profile = await prisma.profile.findUnique({
      where: { email: email.toLowerCase().trim() },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        cluster: true,
        impactArea: true,
        passwordHash: true,
      },
    });

    console.log(`DEBUG: Query result: ${profile ? 'found' : 'not found'}`);

    if (!profile) {
      return NextResponse.json(
        { error: "User not found", debug: { email, found: false } },
        { status: 401 },
      );
    }

    console.log(`DEBUG: Password hash exists: ${profile.passwordHash ? 'yes' : 'no'}`);
    console.log(`DEBUG: Hash length: ${profile.passwordHash?.length}`);

    // If no password hash set, allow login with default password
    if (!profile.passwordHash) {
      if (password !== "12345678") {
        return NextResponse.json(
          { error: "Invalid password (no hash set, default password expected)", debug: { email, valid: false } },
          { status: 401 },
        );
      }
    } else {
      const isValid = await comparePassword(password, profile.passwordHash);
      console.log(`DEBUG: Password valid: ${isValid}`);

      if (!isValid) {
        return NextResponse.json(
          { error: "Invalid password", debug: { email, valid: false } },
          { status: 401 },
        );
      }
    }

    const user = {
      id: profile.id,
      name: profile.name,
      email: profile.email,
      role: profile.role,
      cluster: profile.cluster ?? undefined,
      impactArea: profile.impactArea ?? undefined,
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
