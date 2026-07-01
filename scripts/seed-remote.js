require('dotenv').config();
const { Client } = require("pg");
const bcrypt = require("bcryptjs");

async function seed() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log("Connected to remote database");

    // Hash the default password for seed users
    const defaultPassword = "Password1!";
    const passwordHash = await bcrypt.hash(defaultPassword, 10);
    console.log(`Default password for all seed users: ${defaultPassword}`);

    // Add password_hash and password_changed columns if not exist
    await client.query(`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS password_hash TEXT`);
    await client.query(`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS password_changed BOOLEAN DEFAULT false`);

    // Config clusters
    await client.query(`
      INSERT INTO config_clusters (name, impact_areas) VALUES
      ('Health & Social Care', ARRAY['NHS Digital Transformation', 'Mental Health Services', 'Primary Care Digitalisation']),
      ('Digital & Technology', ARRAY['Government Digital Services', 'Data Platforms', 'Cyber Security']),
      ('Defence & Security', ARRAY['Cyber Security', 'Intelligence Systems', 'Border Security']),
      ('Environment & Climate', ARRAY['Climate Change Adaptation', 'Environmental Monitoring', 'Sustainable Development']),
      ('Education & Skills', ARRAY['Digital Education', 'Skills Development', 'Online Learning']),
      ('Transport & Infrastructure', ARRAY['Smart Transport Systems', 'Infrastructure Digitalisation', 'Logistics']),
      ('Justice & Law', ARRAY['Digital Justice', 'Court Modernisation', 'Legal Tech'])
      ON CONFLICT (name) DO NOTHING
    `);
    console.log("Config clusters added");

    // Config strategic objectives
    await client.query(`
      INSERT INTO config_strategic_objectives (id, label, description) VALUES
      ('obj1', 'Digital Transformation', 'Modernise government services through digital technologies'),
      ('obj2', 'User-Centric Design', 'Design services around user needs and experiences'),
      ('obj3', 'Data-Driven Decision Making', 'Leverage data for better policy and service delivery'),
      ('obj4', 'Cyber Security Enhancement', 'Strengthen cyber security across all systems'),
      ('obj5', 'Sustainable Development', 'Integrate sustainability into all government initiatives')
      ON CONFLICT (id) DO NOTHING
    `);
    console.log("Strategic objectives added");

    // Config action categories
    await client.query(`
      INSERT INTO config_action_categories (value, label) VALUES
      ('GOVERNANCE', 'Governance'),
      ('RISK', 'Risk Management'),
      ('SHEQ', 'Safety, Health, Environment & Quality'),
      ('COMPLIANCE', 'Compliance & Legal'),
      ('DATA', 'Data Management'),
      ('CONTRACT', 'Contract Management'),
      ('SCHEDULE', 'Schedule Management'),
      ('FINANCE', 'Financial Management')
      ON CONFLICT (value) DO NOTHING
    `);
    console.log("Action categories added");

    // Config checklist template
    await client.query(`
      INSERT INTO config_checklist_template (section, items, sort_order) VALUES
      ('Project Management', ARRAY['Project plan approved', 'Resource allocation confirmed', 'Risk register maintained', 'Stakeholder engagement plan'], 1),
      ('Technical Delivery', ARRAY['Architecture approved', 'Security assessment completed', 'Testing strategy defined', 'Deployment plan ready'], 2),
      ('Governance & Compliance', ARRAY['Legal review completed', 'Data protection impact assessment', 'Accessibility compliance', 'Information assurance'], 3),
      ('Financial Management', ARRAY['Budget approved', 'Cost control measures', 'Financial reporting established', 'Value for money assessment'], 4)
      ON CONFLICT DO NOTHING
    `);
    console.log("Checklist template added");

    // Profiles - now with password_hash so users can log in
    const users = [
      { id: 'u1', name: 'Sarah Chen', email: 'sarah.chen@csir.co.za', role: 'PM', cluster: 'Health & Social Care', impact_area: 'NHS Digital Transformation' },
      { id: 'u2', name: 'James Morrison', email: 'james.morrison@csir.co.za', role: 'POC_CHAIR', cluster: null, impact_area: null },
      { id: 'u3', name: 'Amara Osei', email: 'amara.osei@csir.co.za', role: 'POC_MEMBER', cluster: null, impact_area: null },
      { id: 'u4', name: 'Tom Bradley', email: 'tom.bradley@csir.co.za', role: 'ADMIN', cluster: null, impact_area: null },
      { id: 'u5', name: 'David Thompson', email: 'david.thompson@csir.co.za', role: 'PM', cluster: 'Digital & Technology', impact_area: 'Government Digital Services' },
      { id: 'u6', name: 'Lisa Wong', email: 'lisa.wong@csir.co.za', role: 'PM', cluster: 'Defence & Security', impact_area: 'Cyber Security' },
      { id: 'u7', name: 'Michael Patel', email: 'michael.patel@csir.co.za', role: 'POC_MEMBER', cluster: 'Environment & Climate', impact_area: 'Climate Change Adaptation' },
      { id: 'u8', name: 'Emma Johnson', email: 'emma.johnson@csir.co.za', role: 'POC_MEMBER', cluster: 'Education & Skills', impact_area: 'Digital Education' },
      { id: 'u9', name: 'Robert Kim', email: 'robert.kim@csir.co.za', role: 'POC_CHAIR', cluster: 'Transport & Infrastructure', impact_area: 'Smart Transport Systems' },
      { id: 'u10', name: 'Sophie Anderson', email: 'sophie.anderson@csir.co.za', role: 'ADMIN', cluster: null, impact_area: null },
      { id: 'u11', name: 'James Wilson', email: 'james.wilson@csir.co.za', role: 'PM', cluster: 'Health & Social Care', impact_area: 'Mental Health Services' },
      { id: 'u12', name: 'Maria Garcia', email: 'maria.garcia@csir.co.za', role: 'POC_MEMBER', cluster: 'Justice & Law', impact_area: 'Digital Justice' },
    ];

    for (const u of users) {
      await client.query(
        `INSERT INTO profiles (id, name, email, role, cluster, impact_area, password_hash, password_changed)
         VALUES ($1, $2, $3, $4, $5, $6, $7, false)
         ON CONFLICT (id) DO UPDATE SET password_hash = $7 WHERE profiles.password_hash IS NULL`,
        [u.id, u.name, u.email, u.role, u.cluster, u.impact_area, passwordHash]
      );
    }
    console.log("Users added (with password hash)");

    // Projects
    const projects = [
      { id: 'proj1', short_title: 'NHS Digital Portal', long_title: 'National Health Service Digital Patient Portal', classification: 'A', cluster: 'Health & Social Care', impact_area: 'NHS Digital Transformation', pm_id: 'u1', sponsor_name: 'Department of Health', strategic_objectives: ['obj1','obj2'], contract_value: 2500000, contract_term: 24, start_date: '2024-01-15', end_date: '2025-12-31', this_year_amount: 1200000, risk_complexity: 'HIGH', reputational_risk: 'HIGH', rag_overall: 'AMBER', rag_scope: 'GREEN', rag_schedule: 'AMBER', rag_cost: 'GREEN', rag_quality: 'GREEN', rag_risk: 'AMBER', rag_sheq: 'GREEN', rag_data: 'GREEN', rag_compliance: 'GREEN', health_narrative: 'Project progressing with minor schedule delays.' },
      { id: 'proj2', short_title: 'Cyber Security Platform', long_title: 'Government Cyber Security Monitoring Platform', classification: 'A', cluster: 'Defence & Security', impact_area: 'Cyber Security', pm_id: 'u6', sponsor_name: 'Ministry of Defence', strategic_objectives: ['obj4'], contract_value: 3500000, contract_term: 36, start_date: '2024-03-01', end_date: '2026-02-28', this_year_amount: 1500000, risk_complexity: 'HIGH', reputational_risk: 'HIGH', rag_overall: 'GREEN', rag_scope: 'GREEN', rag_schedule: 'GREEN', rag_cost: 'GREEN', rag_quality: 'GREEN', rag_risk: 'GREEN', rag_sheq: 'GREEN', rag_data: 'GREEN', rag_compliance: 'GREEN', health_narrative: 'All milestones met. Ready for production.' },
      { id: 'proj3', short_title: 'Climate Data Hub', long_title: 'National Climate Change Data Hub', classification: 'B', cluster: 'Environment & Climate', impact_area: 'Climate Change Adaptation', pm_id: 'u5', sponsor_name: 'Department for Environment', strategic_objectives: ['obj3','obj5'], contract_value: 1800000, contract_term: 18, start_date: '2024-06-01', end_date: '2025-11-30', this_year_amount: 900000, risk_complexity: 'MEDIUM', reputational_risk: 'MEDIUM', rag_overall: 'GREEN', rag_scope: 'GREEN', rag_schedule: 'GREEN', rag_cost: 'AMBER', rag_quality: 'GREEN', rag_risk: 'GREEN', rag_sheq: 'GREEN', rag_data: 'GREEN', rag_compliance: 'GREEN', health_narrative: 'Data integration phase completed.' },
      { id: 'proj4', short_title: 'Digital Education Platform', long_title: 'National Digital Education and Skills Platform', classification: 'B', cluster: 'Education & Skills', impact_area: 'Digital Education', pm_id: 'u11', sponsor_name: 'Department for Education', strategic_objectives: ['obj1','obj2'], contract_value: 2200000, contract_term: 30, start_date: '2024-09-01', end_date: '2026-08-31', this_year_amount: 800000, risk_complexity: 'MEDIUM', reputational_risk: 'MEDIUM', rag_overall: 'AMBER', rag_scope: 'AMBER', rag_schedule: 'GREEN', rag_cost: 'GREEN', rag_quality: 'AMBER', rag_risk: 'GREEN', rag_sheq: 'GREEN', rag_data: 'GREEN', rag_compliance: 'GREEN', health_narrative: 'Scope creep identified during user testing.' },
    ];

    for (const p of projects) {
      await client.query(
        `INSERT INTO projects (id, short_title, long_title, classification, cluster, impact_area, pm_id, sponsor_name, strategic_objectives, contract_value, contract_term, start_date, end_date, this_year_amount, risk_complexity, reputational_risk, rag_overall, rag_scope, rag_schedule, rag_cost, rag_quality, rag_risk, rag_sheq, rag_data, rag_compliance, health_narrative) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26) ON CONFLICT (id) DO NOTHING`,
        [p.id, p.short_title, p.long_title, p.classification, p.cluster, p.impact_area, p.pm_id, p.sponsor_name, p.strategic_objectives, p.contract_value, p.contract_term, p.start_date, p.end_date, p.this_year_amount, p.risk_complexity, p.reputational_risk, p.rag_overall, p.rag_scope, p.rag_schedule, p.rag_cost, p.rag_quality, p.rag_risk, p.rag_sheq, p.rag_data, p.rag_compliance, p.health_narrative]
      );
    }
    console.log("Projects added");

    // Risks
    const risks = [
      { id: 'risk1', project_id: 'proj1', title: 'Resource Shortage', type: 'RISK', likelihood: 'MEDIUM', impact: 'HIGH', rag_status: 'AMBER', mitigation: 'Additional recruitment drive planned.', owner: 'Sarah Chen', status: 'OPEN' },
      { id: 'risk2', project_id: 'proj1', title: 'Third-party API Dependency', type: 'RISK', likelihood: 'HIGH', impact: 'HIGH', rag_status: 'RED', mitigation: 'Developing fallback options.', owner: 'Sarah Chen', status: 'OPEN' },
      { id: 'risk3', project_id: 'proj2', title: 'Security Vulnerability', type: 'RISK', likelihood: 'LOW', impact: 'HIGH', rag_status: 'AMBER', mitigation: 'Regular security audits scheduled.', owner: 'Lisa Wong', status: 'MITIGATED' },
      { id: 'risk4', project_id: 'proj3', title: 'Data Quality Issues', type: 'ISSUE', likelihood: 'MEDIUM', impact: 'MEDIUM', rag_status: 'AMBER', mitigation: 'Data validation processes implemented.', owner: 'David Thompson', status: 'OPEN' },
    ];

    for (const r of risks) {
      await client.query(
        `INSERT INTO risks (id, project_id, title, type, likelihood, impact, rag_status, mitigation, owner, status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT (id) DO NOTHING`,
        [r.id, r.project_id, r.title, r.type, r.likelihood, r.impact, r.rag_status, r.mitigation, r.owner, r.status]
      );
    }
    console.log("Risks added");

    // Actions
    const actions = [
      { id: 'action1', project_id: 'proj1', description: 'Recruit additional frontend developers', owner: 'Sarah Chen', due_date: '2024-12-15', status: 'IN_PROGRESS', category: 'SCHEDULE', evidence_links: [] },
      { id: 'action2', project_id: 'proj1', description: 'Complete API vendor SLA negotiation', owner: 'Sarah Chen', due_date: '2024-11-30', status: 'OPEN', category: 'CONTRACT', evidence_links: [] },
      { id: 'action3', project_id: 'proj2', description: 'Schedule quarterly security audit', owner: 'Lisa Wong', due_date: '2024-12-31', status: 'CLOSED', category: 'COMPLIANCE', evidence_links: [] },
    ];

    for (const a of actions) {
      await client.query(
        `INSERT INTO actions (id, project_id, description, owner, due_date, status, category, evidence_links) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (id) DO NOTHING`,
        [a.id, a.project_id, a.description, a.owner, a.due_date, a.status, a.category, a.evidence_links]
      );
    }
    console.log("Actions added");

    // Sessions
    await client.query(`INSERT INTO poc_sessions (id, date, committee_type, status, attendees) VALUES ('session1', '2024-11-05', 'CLUSTER', 'COMPLETED', ARRAY['James Morrison','Amara Osei','Sarah Chen']) ON CONFLICT (id) DO NOTHING`);
    await client.query(`INSERT INTO session_projects (session_id, project_id) VALUES ('session1', 'proj1') ON CONFLICT DO NOTHING`);
    await client.query(`INSERT INTO session_projects (session_id, project_id) VALUES ('session1', 'proj2') ON CONFLICT DO NOTHING`);
    console.log("Sessions added");

    console.log("\n✅ Remote database seeded successfully!");
    console.log(`\n📝 Login credentials for all users:`);
    console.log(`   Email: <any user email above>@csir.co.za`);
    console.log(`   Password: ${defaultPassword}`);
  } catch (error) {
    console.error("Error:", error.message);
  } finally {
    await client.end();
  }
}

seed();
