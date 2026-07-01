import jwt from "jsonwebtoken"
import { NextRequest, NextResponse } from "next/server"

/**
 * Verifies the JWT token from the Authorization header.
 * Returns null if the token is valid, or a 401 NextResponse if invalid/missing.
 *
 * Usage:
 *   const authError = verifyAuth(request)
 *   if (authError) return authError
 */
export function verifyAuth(request: NextRequest): NextResponse | null {
  const secret = process.env.JWT_SECRET

  if (!secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const authHeader = request.headers.get("authorization")

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const token = authHeader.slice(7) // Remove "Bearer " prefix

  try {
    jwt.verify(token, secret)
    return null // Token is valid
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
}
