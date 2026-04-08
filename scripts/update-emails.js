const { Client } = require("pg");

async function updateEmails() {
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

    // Update all emails from @gov.uk to @csir.co.za
    await client.query(`
      UPDATE profiles
      SET email = REPLACE(email, '@gov.uk', '@csir.co.za')
      WHERE email LIKE '%@gov.uk'
    `);

    console.log("Emails updated successfully");

    // Show updated emails
    const result = await client.query(
      "SELECT id, name, email FROM profiles ORDER BY id",
    );
    console.log("\nUpdated user emails:");
    result.rows.forEach((user) => {
      console.log(`${user.id}: ${user.name} - ${user.email}`);
    });
  } catch (error) {
    console.error("Error updating emails:", error);
  } finally {
    await client.end();
  }
}

updateEmails();
