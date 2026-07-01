import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth-middleware";

export async function POST(req: NextRequest) {
  // Return 404 in production — debug endpoint should not be accessible
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not Found" }, { status: 404 });
  }

  // Require JWT authentication in non-production environments
  const authError = verifyAuth(req);
  if (authError) return authError;

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
      },
    });

    console.log(`DEBUG: Query result: ${profile ? 'found' : 'not found'}`);

    if (!profile) {
      return NextResponse.json(
        { error: "User not found", debug: { email, found: false } },
        { status: 401 },
      );
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
