const { Client } = require("pg");
const fs = require("fs");
const path = require("path");

async function runMigration() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || "postgresql://supabase_admin:your_password@localhost:5432/project_governance",
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

    // Add password_hash column if it doesn't exist
    const addColumnSqlPath = path.join(__dirname, "add-password-hash-column.sql");
    if (fs.existsSync(addColumnSqlPath)) {
      const addColumnSql = fs.readFileSync(addColumnSqlPath, "utf8");
      await client.query(addColumnSql);
      console.log("Password hash column migration completed");
    }
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  } finally {
    await client.end();
    console.log("Database connection closed");
  }
}

runMigration();
