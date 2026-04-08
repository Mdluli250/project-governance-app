const { Client } = require("pg");

async function verifySampleData() {
  const client = new Client({
    host: "localhost",
    port: 5432,
    user: "supabase_admin",
    password: "Red199330PP",
    database: "project_governance",
    ssl: false,
  });

  try {
    await client.connect();
    console.log("Connected to database\n");

    // Count records in each table
    const tables = [
      "config_clusters",
      "config_strategic_objectives",
      "config_action_categories",
      "config_checklist_template",
      "projects",
      "risks",
      "actions",
      "poc_reviews",
      "checklist_responses",
      "kda_decisions",
      "audit_log",
      "poc_sessions",
      "session_projects",
    ];

    console.log("=== DATABASE RECORD COUNTS ===");
    for (const table of tables) {
      const result = await client.query(
        `SELECT COUNT(*) as count FROM ${table}`,
      );
      console.log(`${table}: ${result.rows[0].count} records`);
    }

    console.log("\n=== SAMPLE PROJECTS ===");
    const projects = await client.query(`
      SELECT id, short_title, cluster, pm_id, rag_overall, contract_value
      FROM projects
      ORDER BY id
    `);
    projects.rows.forEach((p) => {
      console.log(
        `- ${p.id}: ${p.short_title} (${p.cluster}) - PM: ${p.pm_id} - RAG: ${p.rag_overall} - £${p.contract_value.toLocaleString()}`,
      );
    });

    console.log("\n=== SAMPLE RISKS ===");
    const risks = await client.query(`
      SELECT r.id, p.short_title, r.title, r.type, r.rag_status, r.status
      FROM risks r
      JOIN projects p ON r.project_id = p.id
      ORDER BY r.id
    `);
    risks.rows.forEach((r) => {
      console.log(
        `- ${r.id}: ${r.title} (${r.type}) - Project: ${r.short_title} - RAG: ${r.rag_status} - Status: ${r.status}`,
      );
    });

    console.log("\n=== SAMPLE ACTIONS ===");
    const actions = await client.query(`
      SELECT a.id, p.short_title, a.description, a.category, a.status, a.due_date
      FROM actions a
      JOIN projects p ON a.project_id = p.id
      ORDER BY a.due_date
    `);
    actions.rows.forEach((a) => {
      console.log(
        `- ${a.id}: ${a.description} (${a.category}) - Project: ${a.short_title} - Status: ${a.status} - Due: ${new Date(a.due_date).toLocaleDateString()}`,
      );
    });

    console.log("\n=== POC REVIEWS ===");
    const reviews = await client.query(`
      SELECT r.id, p.short_title, r.review_date, r.committee_type, r.outcome
      FROM poc_reviews r
      JOIN projects p ON r.project_id = p.id
      ORDER BY r.review_date DESC
    `);
    reviews.rows.forEach((r) => {
      console.log(
        `- ${r.id}: ${r.short_title} - ${new Date(r.review_date).toLocaleDateString()} (${r.committee_type}) - ${r.outcome}`,
      );
    });

    console.log("\n=== KDA DECISIONS ===");
    const kdas = await client.query(`
      SELECT k.id, p.short_title, k.gate_name, k.decision, k.date
      FROM kda_decisions k
      JOIN projects p ON k.project_id = p.id
      ORDER BY k.date DESC
    `);
    kdas.rows.forEach((k) => {
      console.log(
        `- ${k.id}: ${k.short_title} - ${k.gate_name} - ${k.decision} (${new Date(k.date).toLocaleDateString()})`,
      );
    });

    console.log("\n=== CONFIG DATA ===");
    const clusters = await client.query(
      "SELECT name, array_length(impact_areas, 1) as impact_count FROM config_clusters",
    );
    console.log(
      `Clusters: ${clusters.rows.length} (${clusters.rows.map((c) => c.name).join(", ")})`,
    );

    const objectives = await client.query(
      "SELECT COUNT(*) as count FROM config_strategic_objectives",
    );
    console.log(`Strategic Objectives: ${objectives.rows[0].count}`);

    const categories = await client.query(
      "SELECT COUNT(*) as count FROM config_action_categories",
    );
    console.log(`Action Categories: ${categories.rows[0].count}`);

    console.log("\n🎉 Sample data verification complete!");
  } catch (error) {
    console.error("Error verifying sample data:", error);
  } finally {
    await client.end();
    console.log("Database connection closed");
  }
}

verifySampleData();
