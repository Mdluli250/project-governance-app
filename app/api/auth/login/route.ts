import { prisma } from "@/lib/prisma";
import { mapProfile } from "@/lib/prisma-mappers";
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

    // If no password hash set, allow login with default password "12345678"
    if (!profile.passwordHash) {
      if (password !== "12345678") {
        return NextResponse.json(
          { error: "Invalid email or password." },
          { status: 401 },
        );
      }
    } else {
      // Verify password with bcrypt
      const isValid = await comparePassword(password, profile.passwordHash);
      if (!isValid) {
        return NextResponse.json(
          { error: "Invalid email or password." },
          { status: 401 },
        );
      }
    }

    const user = mapProfile(profile);

    return NextResponse.json({ user });
  } catch (err) {
    console.error("Login error:", err);
    return NextResponse.json(
      { error: "Something went wrong." },
      { status: 500 },
    );
  }
}
