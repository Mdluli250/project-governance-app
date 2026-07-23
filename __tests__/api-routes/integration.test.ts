import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Stateful in-memory stores ───────────────────────────────────────────────
let projectStore: Record<string, unknown>[] = [];
let configClusterStore: Record<string, unknown>[] = [];
let configObjectiveStore: Record<string, unknown>[] = [];
let configChecklistStore: Record<string, unknown>[] = [];
let configCategoryStore: Record<string, unknown>[] = [];
let profileStore: Record<string, unknown>[] = [];

// ─── Mock Prisma with stateful in-memory behavior ────────────────────────────
vi.mock("@/lib/prisma", () => ({
  prisma: {
    project: {
      findMany: vi.fn(() => Promise.resolve(projectStore)),
      upsert: vi.fn((args: { where: { id: string }; create: Record<string, unknown>; update: Record<string, unknown> }) => {
        const existing = projectStore.find((p) => p.id === args.where.id);
        if (existing) {
          Object.assign(existing, args.update);
          return Promise.resolve(existing);
        }
        const newProject = { ...args.create };
        projectStore.push(newProject);
        return Promise.resolve(newProject);
      }),
    },
    action: {
      findMany: vi.fn(() => Promise.resolve([])),
    },
    pocReview: {
      findMany: vi.fn(() => Promise.resolve([])),
    },
    risk: {
      findMany: vi.fn(() => Promise.resolve([])),
    },
    auditLog: {
      findMany: vi.fn(() => Promise.resolve([])),
    },
    kdaDecision: {
      findMany: vi.fn(() => Promise.resolve([])),
    },
    pocSession: {
      findMany: vi.fn(() => Promise.resolve([])),
    },
    configCluster: {
      findMany: vi.fn(() => Promise.resolve(configClusterStore)),
      deleteMany: vi.fn(() => {
        configClusterStore = [];
        return Promise.resolve();
      }),
      createMany: vi.fn((args: { data: Record<string, unknown>[] }) => {
        configClusterStore.push(...args.data);
        return Promise.resolve({ count: args.data.length });
      }),
    },
    configStrategicObjective: {
      findMany: vi.fn(() => Promise.resolve(configObjectiveStore)),
    },
    configChecklistTemplate: {
      findMany: vi.fn(() => Promise.resolve(configChecklistStore)),
    },
    configActionCategory: {
      findMany: vi.fn(() => Promise.resolve(configCategoryStore)),
    },
    profile: {
      findUnique: vi.fn((args: { where: { email?: string; id?: string } }) => {
        const match = profileStore.find(
          (p) => p.email === args.where.email || p.id === args.where.id
        );
        return Promise.resolve(match || null);
      }),
      findMany: vi.fn(() => Promise.resolve(profileStore)),
      create: vi.fn((args: { data: Record<string, unknown> }) => {
        profileStore.push(args.data);
        return Promise.resolve(args.data);
      }),
    },
    $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => {
      // Provide a minimal tx proxy that mirrors the prisma mock
      const tx = {
        configCluster: {
          deleteMany: vi.fn(() => {
            configClusterStore = [];
            return Promise.resolve();
          }),
          createMany: vi.fn((args: { data: Record<string, unknown>[] }) => {
            configClusterStore.push(...args.data);
            return Promise.resolve({ count: args.data.length });
          }),
        },
        configStrategicObjective: {
          deleteMany: vi.fn(() => {
            configObjectiveStore = [];
            return Promise.resolve();
          }),
          createMany: vi.fn((args: { data: Record<string, unknown>[] }) => {
            configObjectiveStore.push(...args.data);
            return Promise.resolve({ count: args.data.length });
          }),
        },
        configChecklistTemplate: {
          deleteMany: vi.fn(() => {
            configChecklistStore = [];
            return Promise.resolve();
          }),
          createMany: vi.fn((args: { data: Record<string, unknown>[] }) => {
            configChecklistStore.push(...args.data);
            return Promise.resolve({ count: args.data.length });
          }),
        },
        configActionCategory: {
          deleteMany: vi.fn(() => {
            configCategoryStore = [];
            return Promise.resolve();
          }),
          createMany: vi.fn((args: { data: Record<string, unknown>[] }) => {
            configCategoryStore.push(...args.data);
            return Promise.resolve({ count: args.data.length });
          }),
        },
      };
      return fn(tx);
    }),
  },
}));

// ─── Mock auth module ────────────────────────────────────────────────────────
vi.mock("@/lib/auth", () => ({
  comparePassword: vi.fn().mockResolvedValue(true),
  hashPassword: vi.fn().mockResolvedValue("hashed_default_password"),
}));

// ─── Mock auth middleware to bypass JWT verification in unit tests ────────────
vi.mock("@/lib/auth-middleware", () => ({
  verifyAuth: vi.fn().mockReturnValue(null),
}));

// ─── Import route handlers after mocks are set up ────────────────────────────
import { POST as dataPOST } from "@/app/api/data/route";
import { GET as configGET, PUT as configPUT } from "@/app/api/config/route";
import { POST as loginPOST } from "@/app/api/auth/login/route";

// ─── Helpers ─────────────────────────────────────────────────────────────────
function makeRequest(url: string, method: string, body?: unknown): Request {
  return new Request(url, {
    method,
    headers: { "Content-Type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}

// ─── Tests ───────────────────────────────────────────────────────────────────
describe("API Integration Tests - Full Round-Trip", () => {
  beforeEach(() => {
    projectStore = [];
    configClusterStore = [];
    configObjectiveStore = [];
    configChecklistStore = [];
    configCategoryStore = [];
    profileStore = [];
    vi.clearAllMocks();
  });

  // ─── Data Round-Trip: POST project then GET ──────────────────────────────

  describe("Data round-trip (POST then GET)", () => {
    it("inserts a project via POST and returns success", async () => {
      // Arrange: POST a project upsert
      const projectData = {
        id: "proj-1",
        shortTitle: "Test Project",
        longTitle: "Test Project Long Title",
        classification: "A",
        cluster: "Cluster1",
        impactArea: "IA1",
        pmId: "u1",
        sponsorName: "John Sponsor",
        strategicObjectives: ["SO1", "SO2"],
        contractValue: 1500000,
        contractTerm: 24,
        startDate: "2024-01-15",
        endDate: "2025-12-31",
        thisYearAmount: 750000,
        riskComplexity: "MEDIUM",
        reputationalRisk: "LOW",
        rag: {
          overall: "GREEN",
          scope: "GREEN",
          schedule: "AMBER",
          cost: "GREEN",
          quality: "GREEN",
          risk: "RED",
          sheq: "GREEN",
          data: "GREEN",
          compliance: "GREEN",
        },
        healthNarrative: "Project is on track",
        lastUpdated: "2024-06-01T00:00:00.000Z",
      };

      const postReq = makeRequest("http://localhost/api/data", "POST", {
        action: "upsert",
        entity: "project",
        data: projectData,
      });

      const postResponse = await dataPOST(postReq as any);
      expect(postResponse.status).toBe(200);
      const postBody = await postResponse.json();
      expect(postBody.success).toBe(true);

      // Verify the project was stored in the mock store
      expect(projectStore).toHaveLength(1);
      expect(projectStore[0].id).toBe("proj-1");
      expect(projectStore[0].shortTitle).toBe("Test Project");
    });
  });

  // ─── Config Save and Reload Cycle ────────────────────────────────────────

  describe("Configuration save and reload cycle", () => {
    it("saves cluster config via PUT then retrieves it via GET", async () => {
      // Arrange & Act: PUT clusters config
      const putReq = makeRequest("http://localhost/api/config", "PUT", {
        section: "clusters",
        data: {
          clusters: ["Cluster1"],
          impactAreas: { Cluster1: ["IA1"] },
        },
      });

      const putResponse = await configPUT(putReq as any);
      expect(putResponse.status).toBe(200);
      const putBody = await putResponse.json();
      expect(putBody.success).toBe(true);

      // Act: GET config
      const getResponse = await configGET();
      expect(getResponse.status).toBe(200);

      const config = await getResponse.json();

      // Assert: response contains saved config
      expect(config.clusters).toBeDefined();
      expect(config.clusters).toContain("Cluster1");
      expect(config.impactAreas).toBeDefined();
      expect(config.impactAreas["Cluster1"]).toEqual(["IA1"]);

      // Verify full config shape
      expect(config.strategicObjectives).toBeDefined();
      expect(config.checklistTemplate).toBeDefined();
      expect(config.actionCategories).toBeDefined();
    });
  });

  // ─── Login Flow End-to-End ───────────────────────────────────────────────

  describe("Login flow end-to-end", () => {
    it("creates a profile then logs in successfully with correct response shape", async () => {
      // Arrange: Seed a profile in the in-memory store
      profileStore = [
        {
          id: "u1",
          name: "Alice PM",
          email: "alice@example.com",
          role: "PM",
          cluster: "Cluster1",
          impactArea: "IA1",
          passwordHash: "$2a$10$somehashedpassword",
          passwordChanged: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      // Act: Login with correct credentials
      const loginReq = makeRequest("http://localhost/api/auth/login", "POST", {
        email: "alice@example.com",
        password: "correctpassword",
      });

      const loginResponse = await loginPOST(loginReq);
      expect(loginResponse.status).toBe(200);

      const loginBody = await loginResponse.json();

      // Assert: response has user object with correct shape
      expect(loginBody.user).toBeDefined();
      expect(loginBody.user.id).toBe("u1");
      expect(loginBody.user.name).toBe("Alice PM");
      expect(loginBody.user.email).toBe("alice@example.com");
      expect(loginBody.user.role).toBe("PM");

      // Verify no sensitive data in response
      expect(loginBody.user.passwordHash).toBeUndefined();
    });

    it("returns 401 for invalid credentials", async () => {
      // Arrange: Seed a profile
      profileStore = [
        {
          id: "u2",
          name: "Bob",
          email: "bob@example.com",
          role: "ADMIN",
          cluster: null,
          impactArea: null,
          passwordHash: "$2a$10$somehashedpassword",
          passwordChanged: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      // Override comparePassword to return false for this test
      const { comparePassword } = await import("@/lib/auth");
      vi.mocked(comparePassword).mockResolvedValueOnce(false);

      // Act: Login with wrong password
      const loginReq = makeRequest("http://localhost/api/auth/login", "POST", {
        email: "bob@example.com",
        password: "wrongpassword",
      });

      const loginResponse = await loginPOST(loginReq);
      expect(loginResponse.status).toBe(401);

      const body = await loginResponse.json();
      expect(body.error).toContain("Invalid email or password");
    });
  });
});
