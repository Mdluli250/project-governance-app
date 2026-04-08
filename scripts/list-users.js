const { Client } = require("pg");

async function listUsers() {
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

    const result = await client.query(`
      SELECT id, name, email, role, cluster, impact_area
      FROM profiles
      ORDER BY role, name
    `);

    console.log("=== TEST USERS ===\n");

    const usersByRole = result.rows.reduce((acc, user) => {
      if (!acc[user.role]) acc[user.role] = [];
      acc[user.role].push(user);
      return acc;
    }, {});

    Object.keys(usersByRole).forEach((role) => {
      console.log(`${role}s:`);
      usersByRole[role].forEach((user) => {
        console.log(`  ${user.id}: ${user.name} (${user.email})`);
        if (user.cluster) {
          console.log(`      Cluster: ${user.cluster}`);
        }
        if (user.impact_area) {
          console.log(`      Impact Area: ${user.impact_area}`);
        }
        console.log("");
      });
    });

    console.log(`Total users: ${result.rows.length}`);
  } catch (error) {
    console.error("Error listing users:", error);
  } finally {
    await client.end();
  }
}

// Run if called directly
if (require.main === module) {
  listUsers();
}

module.exports = { listUsers };
