import { prisma } from "@/lib/prisma";
import { mapProfile } from "@/lib/prisma-mappers";
import { comparePassword } from "@/lib/auth";
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";

// Simple in-memory rate limiting (resets on server restart)
const loginAttempts = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 60_000; // 1 minute

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = loginAttempts.get(ip);
  if (!entry || now > entry.resetAt) {
    loginAttempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  entry.count++;
  return entry.count > MAX_ATTEMPTS;
}

export async function POST(req: Request) {
  try {
    // Rate limit by IP
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: "Too many login attempts. Please try again in a minute." },
        { status: 429 },
      );
    }
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
