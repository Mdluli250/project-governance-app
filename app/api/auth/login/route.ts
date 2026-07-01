import { prisma } from "@/lib/prisma";
import { mapProfile } from "@/lib/prisma-mappers";
import { comparePassword } from "@/lib/auth";
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 },
      );
    }

    // Look up user by normalized email using Prisma
    const profile = await prisma.profile.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!profile) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 },
      );
    }

    // Users without a password hash cannot login
    if (!profile.passwordHash) {
      return NextResponse.json(
        { error: "Account not activated" },
        { status: 401 },
      );
    }

    // Verify password with bcrypt
    const isValid = await comparePassword(password, profile.passwordHash);
    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 },
      );
    }

    const user = mapProfile(profile);

    // Generate JWT token for authenticated API access
    const secret = process.env.JWT_SECRET;
    const token = secret
      ? jwt.sign({ sub: profile.id, email: profile.email, role: profile.role }, secret, { expiresIn: "24h" })
      : undefined;

    return NextResponse.json({ user, token });
  } catch (err) {
    console.error("Login error:", err);
    return NextResponse.json(
      { error: "Something went wrong." },
      { status: 500 },
    );
  }
}
