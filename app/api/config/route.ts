import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth-middleware";

// GET - load all config in parallel
export async function GET(req: NextRequest) {
  const authError = verifyAuth(req);
  if (authError) return authError;

  try {
    const [clusters, objectives, checklist, categories] = await Promise.all([
      prisma.configCluster.findMany({ orderBy: { id: "asc" } }),
      prisma.configStrategicObjective.findMany({ orderBy: { id: "asc" } }),
      prisma.configChecklistTemplate.findMany({ orderBy: { sortOrder: "asc" } }),
      prisma.configActionCategory.findMany({ orderBy: { id: "asc" } }),
    ]);

    const clusterNames: string[] = [];
    const impactAreas: Record<string, string[]> = {};
    for (const row of clusters) {
      clusterNames.push(row.name);
      impactAreas[row.name] = row.impactAreas;
    }

    return NextResponse.json({
      clusters: clusterNames,
      impactAreas,
      strategicObjectives: objectives.map((o) => ({
        id: o.id,
        label: o.label,
        description: o.description,
      })),
      checklistTemplate: checklist.map((c) => ({
        section: c.section,
        items: c.items,
      })),
      actionCategories: categories.map((c) => ({
        value: c.value,
        label: c.label,
      })),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Config load error:", message);
    return NextResponse.json(
      { error: "Failed to load config", details: [message] },
      { status: 500 },
    );
  }
}

// PUT - save a specific config section (uses Prisma transactions for atomicity)
export async function PUT(req: NextRequest) {
  const authError = verifyAuth(req);
  if (authError) return authError;

  const body = await req.json();
  const { section, data } = body as { section: string; data: unknown };

  try {
    switch (section) {
      case "clusters": {
        const { clusters, impactAreas } = data as {
          clusters: string[];
          impactAreas: Record<string, string[]>;
        };

        if (!clusters || clusters.length === 0) {
          return NextResponse.json(
            {
              error:
                "Refusing to save empty clusters -- would wipe existing data",
            },
            { status: 400 },
          );
        }

        await prisma.$transaction(async (tx) => {
          await tx.configCluster.deleteMany();
          await tx.configCluster.createMany({
            data: clusters.map((name, i) => ({
              id: i + 1,
              name,
              impactAreas: impactAreas[name] ?? [],
            })),
          });
        });
        break;
      }

      case "strategic_objectives": {
        const objectives = data as {
          id: string;
          label: string;
          description: string;
        }[];

        if (!objectives || objectives.length === 0) {
          return NextResponse.json(
            {
              error:
                "Refusing to save empty strategic objectives -- would wipe existing data",
            },
            { status: 400 },
          );
        }

        await prisma.$transaction(async (tx) => {
          await tx.configStrategicObjective.deleteMany();
          await tx.configStrategicObjective.createMany({
            data: objectives.map((o) => ({
              id: o.id,
              label: o.label,
              description: o.description,
            })),
          });
        });
        break;
      }

      case "checklist_template": {
        const template = data as { section: string; items: string[] }[];

        await prisma.$transaction(async (tx) => {
          await tx.configChecklistTemplate.deleteMany();
          await tx.configChecklistTemplate.createMany({
            data: template.map((t, i) => ({
              id: i + 1,
              section: t.section,
              items: t.items,
              sortOrder: i,
            })),
          });
        });
        break;
      }

      case "action_categories": {
        const categories = data as { value: string; label: string }[];

        await prisma.$transaction(async (tx) => {
          await tx.configActionCategory.deleteMany();
          await tx.configActionCategory.createMany({
            data: categories.map((c, i) => ({
              id: i + 1,
              value: c.value,
              label: c.label,
            })),
          });
        });
        break;
      }

      default:
        return NextResponse.json(
          { error: `Unknown section: ${section}` },
          { status: 400 },
        );
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Config save error:", message);
    return NextResponse.json(
      { error: "Failed to save config", details: [message] },
      { status: 500 },
    );
  }
}
