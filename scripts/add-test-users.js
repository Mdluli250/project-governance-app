const { Client } = require("pg");

async function addTestUsers() {
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

    // Additional test users with more variety
    const testUsers = [
      {
        id: "u5",
        name: "David Thompson",
        email: "david.thompson@gov.uk",
        role: "PM",
        cluster: "Digital & Technology",
        impact_area: "Government Digital Services",
      },
      {
        id: "u6",
        name: "Lisa Wong",
        email: "lisa.wong@gov.uk",
        role: "PM",
        cluster: "Defence & Security",
        impact_area: "Cyber Security",
      },
      {
        id: "u7",
        name: "Michael Patel",
        email: "michael.patel@gov.uk",
        role: "POC_MEMBER",
        cluster: "Environment & Climate",
        impact_area: "Climate Change Adaptation",
      },
      {
        id: "u8",
        name: "Emma Johnson",
        email: "emma.johnson@gov.uk",
        role: "POC_MEMBER",
        cluster: "Education & Skills",
        impact_area: "Digital Education",
      },
      {
        id: "u9",
        name: "Robert Kim",
        email: "robert.kim@gov.uk",
        role: "POC_CHAIR",
        cluster: "Transport & Infrastructure",
        impact_area: "Smart Transport Systems",
      },
      {
        id: "u10",
        name: "Sophie Anderson",
        email: "sophie.anderson@gov.uk",
        role: "ADMIN",
        cluster: null,
        impact_area: null,
      },
      {
        id: "u11",
        name: "James Wilson",
        email: "james.wilson@gov.uk",
        role: "PM",
        cluster: "Health & Social Care",
        impact_area: "Mental Health Services",
      },
      {
        id: "u12",
        name: "Maria Garcia",
        email: "maria.garcia@gov.uk",
        role: "POC_MEMBER",
        cluster: "Justice & Law",
        impact_area: "Digital Justice",
      },
    ];

    for (const user of testUsers) {
      await client.query(
        `
        INSERT INTO profiles (id, name, email, role, cluster, impact_area)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (id) DO NOTHING
      `,
        [
          user.id,
          user.name,
          user.email,
          user.role,
          user.cluster,
          user.impact_area,
        ],
      );
    }

    console.log(`Added ${testUsers.length} additional test users`);

    // Verify the users were added
    const result = await client.query(
      "SELECT id, name, email, role, cluster, impact_area FROM profiles ORDER BY id",
    );
    console.log("\nAll users in database:");
    result.rows.forEach((user) => {
      console.log(
        `${user.id}: ${user.name} (${user.role}) - ${user.cluster || "No cluster"} / ${user.impact_area || "No impact area"}`,
      );
    });
  } catch (error) {
    console.error("Error adding test users:", error);
  } finally {
    await client.end();
    console.log("Database connection closed");
  }
}

addTestUsers();
