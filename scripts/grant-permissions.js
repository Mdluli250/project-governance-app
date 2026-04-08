const { Client } = require("pg");

async function grantPermissions() {
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
    console.log("Connected as postgres to project_governance");

    // Grant all privileges on the database
    await client.query(
      "GRANT ALL PRIVILEGES ON DATABASE project_governance TO supabase_admin;",
    );

    // Grant all privileges on the public schema
    await client.query("GRANT ALL ON SCHEMA public TO supabase_admin;");

    // Grant all privileges on all tables in public schema
    await client.query(
      "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO supabase_admin;",
    );

    // Also grant for future tables
    await client.query(
      "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO supabase_admin;",
    );

    console.log("Permissions granted to supabase_admin");
  } catch (error) {
    console.error("Error granting permissions:", error.message);
  } finally {
    await client.end();
  }
}

grantPermissions();
