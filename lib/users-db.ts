import type { User } from "./types"
import { getAuthHeaders } from "./auth-token"

export async function loadUsers(): Promise<User[]> {
  const res = await fetch("/api/users", {
    headers: { ...getAuthHeaders() },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    console.error("loadUsers failed:", res.status, body)
    throw new Error(body.error || `Failed to load users (${res.status})`)
  }
  return res.json()
}

export async function createUser(
  user: Omit<User, "id">
): Promise<User & { temporaryPassword?: string }> {
  const res = await fetch("/api/users", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body: JSON.stringify(user),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `Failed to create user (${res.status})`)
  }
  return res.json()
}

export async function updateUserDb(
  id: string,
  updates: Partial<Omit<User, "id">>
): Promise<void> {
  const res = await fetch("/api/users", {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body: JSON.stringify({ id, ...updates }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `Failed to update user (${res.status})`)
  }
}

export async function deleteUserDb(id: string): Promise<void> {
  const res = await fetch(`/api/users?id=${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: { ...getAuthHeaders() },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `Failed to delete user (${res.status})`)
  }
}
