const { Client } = require("pg");

async function checkUsers() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || "postgresql://supabase_admin:your_password@localhost:5432/postgres",
  });

  try {
    await client.connect();
    console.log("Connected to postgres database");

    // Check existing databases
    const dbResult = await client.query(
      "SELECT datname FROM pg_database WHERE datistemplate = false;",
    );
    console.log(
      "Databases:",
      dbResult.rows.map((r) => r.datname),
    );

    // Check users
    const userResult = await client.query("SELECT usename FROM pg_user;");
    console.log(
      "Users:",
      userResult.rows.map((r) => r.usename),
    );

    // Try to create the database if it doesn't exist
    const dbExists = dbResult.rows.some(
      (r) => r.datname === "project_governance",
    );
    if (!dbExists) {
      console.log("Creating database project_governance...");
      await client.query("CREATE DATABASE project_governance;");
      console.log("Database created");
    } else {
      console.log("Database project_governance already exists");
    }
  } catch (error) {
    console.error("Error:", error.message);
  } finally {
    await client.end();
  }
}

checkUsers();
