const { Client } = require("pg");

async function testConnection() {
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
    console.log("Connected successfully");
    const result = await client.query("SELECT version()");
    console.log("PostgreSQL version:", result.rows[0].version);
  } catch (error) {
    console.error("Connection failed:", error.message);
  } finally {
    await client.end();
  }
}

testConnection();
