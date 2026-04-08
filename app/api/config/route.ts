import { query } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

// GET - load all config
export async function GET() {
  try {
    const [clustersRes, objectivesRes, checklistRes, categoriesRes] =
      await Promise.all([
        query("SELECT name, impact_areas FROM config_clusters ORDER BY id"),
        query(
          "SELECT id, label, description FROM config_strategic_objectives ORDER BY id",
        ),
        query(
          "SELECT section, items, sort_order FROM config_checklist_template ORDER BY sort_order",
        ),
        query("SELECT value, label FROM config_action_categories ORDER BY id"),
      ]);

    const clusters: string[] = [];
    const impactAreas: Record<string, string[]> = {};
    for (const row of clustersRes.rows ?? []) {
      clusters.push(row.name);
      impactAreas[row.name] = row.impact_areas ?? [];
    }

    return NextResponse.json({
      clusters,
      impactAreas,
      strategicObjectives: (objectivesRes.rows ?? []).map((r) => ({
        id: r.id,
        label: r.label,
        description: r.description,
      })),
      checklistTemplate: (checklistRes.rows ?? []).map((r) => ({
        section: r.section,
        items: r.items ?? [],
      })),
      actionCategories: (categoriesRes.rows ?? []).map((r) => ({
        value: r.value,
        label: r.label,
      })),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Config load error:", message);
    return NextResponse.json(
      { error: "Failed to load config", detail: message },
      { status: 500 },
    );
  }
}

// PUT - save a specific config section
export async function PUT(req: NextRequest) {
  const body = await req.json();
  const { section, data } = body as { section: string; data: unknown };

  try {
    switch (section) {
      case "clusters": {
        const { clusters, impactAreas } = data as {
          clusters: string[];
          impactAreas: Record<string, string[]>;
        };
        // GUARD: Never allow empty clusters to overwrite existing data.
        if (!clusters || clusters.length === 0) {
          return NextResponse.json(
            {
              error:
                "Refusing to save empty clusters -- would wipe existing data",
            },
            { status: 400 },
          );
        }
        // Delete all existing rows
        await query("DELETE FROM config_clusters");
        if (clusters.length > 0) {
          const values = clusters
            .map(
              (name: string, i: number) =>
                `(${i + 1}, '${name.replace(/'/g, "''")}', $${i + 1})`,
            )
            .join(",");
          await query(
            `INSERT INTO config_clusters (id, name, impact_areas) VALUES ${values}`,
            [...clusters.map((name: string) => impactAreas[name] ?? [])],
          );
        }
        break;
      }
      case "strategic_objectives": {
        const objectives = data as {
          id: string;
          label: string;
          description: string;
        }[];
        // GUARD: Never allow empty objectives to overwrite existing data.
        if (!objectives || objectives.length === 0) {
          return NextResponse.json(
            {
              error:
                "Refusing to save empty strategic objectives -- would wipe existing data",
            },
            { status: 400 },
          );
        }
        await query("DELETE FROM config_strategic_objectives");
        if (objectives.length > 0) {
          const values = objectives
            .map(
              (o, i) =>
                `('${o.id.replace(/'/g, "''")}', '${o.label.replace(/'/g, "''")}', $${i + 1})`,
            )
            .join(",");
          await query(
            `INSERT INTO config_strategic_objectives (id, label, description) VALUES ${values}`,
            objectives.map((o) => o.description),
          );
        }
        break;
      }
      case "checklist_template": {
        const template = data as { section: string; items: string[] }[];
        await query("DELETE FROM config_checklist_template");
        if (template.length > 0) {
          const values = template
            .map(
              (s, i) =>
                `(${i + 1}, '${s.section.replace(/'/g, "''")}', $${i + 1}, ${i})`,
            )
            .join(",");
          await query(
            `INSERT INTO config_checklist_template (id, section, items, sort_order) VALUES ${values}`,
            template.map((s) => s.items),
          );
        }
        break;
      }
      case "action_categories": {
        const categories = data as { value: string; label: string }[];
        await query("DELETE FROM config_action_categories");
        if (categories.length > 0) {
          const values = categories
            .map(
              (c, i) =>
                `(${i + 1}, '${c.value.replace(/'/g, "''")}', '${c.label.replace(/'/g, "''")}')`,
            )
            .join(",");
          await query(
            `INSERT INTO config_action_categories (id, value, label) VALUES ${values}`,
          );
        }
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
      { error: "Failed to save config", detail: message },
      { status: 500 },
    );
  }
}
