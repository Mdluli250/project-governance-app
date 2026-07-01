import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    profile: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    configCluster: {
      findMany: vi.fn(),
    },
    configStrategicObjective: {
      findMany: vi.fn(),
    },
    configChecklistTemplate: {
      findMany: vi.fn(),
    },
    configActionCategory: {
      findMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

// Mock auth
vi.mock("@/lib/auth", () => ({
  comparePassword: vi.fn(),
  hashPassword: vi.fn().mockResolvedValue("hashed_password"),
}));

// Mock prisma-mappers
vi.mock("@/lib/prisma-mappers", () => ({
  mapProfile: vi.fn((row) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
  })),
}));

import { prisma } from "@/lib/prisma";
import { comparePassword } from "@/lib/auth";


describe("API Routes - Error Handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── 500 Error Responses (Database Errors) ─────────────────────────────────

  describe("500 responses on database errors", () => {
    it("login route returns 500 when prisma.profile.findUnique throws", async () => {
      const { POST } = await import("@/app/api/auth/login/route");

      vi.mocked(prisma.profile.findUnique).mockRejectedValue(
        new Error("Database connection failed"),
      );

      const req = new Request("http://localhost/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: "test@example.com",
          password: "password123",
        }),
      });

      const response = await POST(req);
      expect(response.status).toBe(500);

      const body = await response.json();
      expect(body.error).toBeDefined();
    });

    it("users route GET returns 500 when prisma.profile.findMany throws", async () => {
      const { GET } = await import("@/app/api/users/route");

      vi.mocked(prisma.profile.findMany).mockRejectedValue(
        new Error("Database connection failed"),
      );

      const response = await GET();
      expect(response.status).toBe(500);

      const body = await response.json();
      expect(body.error).toBeDefined();
    });

    it("config route GET returns 500 when findMany throws", async () => {
      const { GET } = await import("@/app/api/config/route");

      vi.mocked(prisma.configCluster.findMany).mockRejectedValue(
        new Error("Database connection failed"),
      );

      const response = await GET();
      expect(response.status).toBe(500);

      const body = await response.json();
      expect(body.error).toBeDefined();
    });
  });

  // ─── 400 Validation Responses (Config Route) ──────────────────────────────

  describe("400 validation responses for config route", () => {
    it("config PUT rejects empty clusters array with 400", async () => {
      const { PUT } = await import("@/app/api/config/route");

      const req = new Request("http://localhost/api/config", {
        method: "PUT",
        body: JSON.stringify({
          section: "clusters",
          data: { clusters: [], impactAreas: {} },
        }),
      });

      const response = await PUT(req);
      expect(response.status).toBe(400);

      const body = await response.json();
      expect(body.error).toContain("empty clusters");
    });

    it("config PUT rejects empty strategic_objectives array with 400", async () => {
      const { PUT } = await import("@/app/api/config/route");

      const req = new Request("http://localhost/api/config", {
        method: "PUT",
        body: JSON.stringify({
          section: "strategic_objectives",
          data: [],
        }),
      });

      const response = await PUT(req);
      expect(response.status).toBe(400);

      const body = await response.json();
      expect(body.error).toContain("empty strategic objectives");
    });
  });

  // ─── 401 Responses (Login Route) ──────────────────────────────────────────

  describe("401 responses for login route", () => {
    it("returns 401 when user email does not exist", async () => {
      const { POST } = await import("@/app/api/auth/login/route");

      vi.mocked(prisma.profile.findUnique).mockResolvedValue(null);

      const req = new Request("http://localhost/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: "nonexistent@example.com",
          password: "password123",
        }),
      });

      const response = await POST(req);
      expect(response.status).toBe(401);

      const body = await response.json();
      expect(body.error).toContain("Invalid email or password");
    });

    it("returns 401 when password is wrong (bcrypt compare fails)", async () => {
      const { POST } = await import("@/app/api/auth/login/route");

      vi.mocked(prisma.profile.findUnique).mockResolvedValue({
        id: "u1",
        name: "Test User",
        email: "test@example.com",
        role: "PM",
        cluster: null,
        impactArea: null,
        passwordHash: "$2a$10$hashedpassword",
        passwordChanged: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      vi.mocked(comparePassword).mockResolvedValue(false);

      const req = new Request("http://localhost/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: "test@example.com",
          password: "wrongpassword",
        }),
      });

      const response = await POST(req);
      expect(response.status).toBe(401);

      const body = await response.json();
      expect(body.error).toContain("Invalid email or password");
    });
  });
});
