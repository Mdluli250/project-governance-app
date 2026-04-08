const { Client } = require("pg");

async function checkUsers() {
  // Try connecting to default postgres database
  const client = new Client({
    host: "localhost",
    port: 5432,
    user: "supabase_admin", // default superuser
    password: "Red199330PP", // assuming same password
    database: "postgres",
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
