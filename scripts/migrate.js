const { Client } = require("pg");
const fs = require("fs");
const path = require("path");

async function runMigration() {
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
    console.log("Connected to database");

    const sqlPath = path.join(__dirname, "create-schema.sql");
    const sql = fs.readFileSync(sqlPath, "utf8");

    await client.query(sql);
    console.log("Schema created successfully");

    // Now run the profiles migration
    const profilesSqlPath = path.join(__dirname, "migrate-profiles.sql");
    const profilesSql = fs.readFileSync(profilesSqlPath, "utf8");

    await client.query(profilesSql);
    console.log("Profiles migration completed");
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  } finally {
    await client.end();
    console.log("Database connection closed");
  }
}

runMigration();
