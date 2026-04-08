const { Client } = require("pg");

async function addSampleData() {
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

    // First, add config data
    console.log("Adding config data...");

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

    // Config checklist template
    await client.query(`
      INSERT INTO config_checklist_template (section, items, sort_order) VALUES
      ('Project Management', ARRAY['Project plan approved', 'Resource allocation confirmed', 'Risk register maintained', 'Stakeholder engagement plan'], 1),
      ('Technical Delivery', ARRAY['Architecture approved', 'Security assessment completed', 'Testing strategy defined', 'Deployment plan ready'], 2),
      ('Governance & Compliance', ARRAY['Legal review completed', 'Data protection impact assessment', 'Accessibility compliance', 'Information assurance'], 3),
      ('Financial Management', ARRAY['Budget approved', 'Cost control measures', 'Financial reporting established', 'Value for money assessment'], 4)
      ON CONFLICT DO NOTHING
    `);

    console.log("Config data added");

    // Add sample projects
    console.log("Adding sample projects...");

    const projects = [
      {
        id: "proj1",
        short_title: "NHS Digital Portal",
        long_title: "National Health Service Digital Patient Portal",
        classification: "A",
        cluster: "Health & Social Care",
        impact_area: "NHS Digital Transformation",
        pm_id: "u1", // Sarah Chen
        sponsor_name: "Department of Health",
        strategic_objectives: ["obj1", "obj2"],
        contract_value: 2500000,
        contract_term: 24,
        start_date: "2024-01-15",
        end_date: "2025-12-31",
        this_year_amount: 1200000,
        risk_complexity: "HIGH",
        reputational_risk: "HIGH",
        rag_overall: "AMBER",
        rag_scope: "GREEN",
        rag_schedule: "AMBER",
        rag_cost: "GREEN",
        rag_quality: "GREEN",
        rag_risk: "AMBER",
        rag_sheq: "GREEN",
        rag_data: "GREEN",
        rag_compliance: "GREEN",
        health_narrative:
          "Project is progressing well with minor schedule delays due to resource constraints. Risk mitigation plans are in place.",
      },
      {
        id: "proj2",
        short_title: "Cyber Security Platform",
        long_title: "Government Cyber Security Monitoring Platform",
        classification: "A",
        cluster: "Defence & Security",
        impact_area: "Cyber Security",
        pm_id: "u6", // Lisa Wong
        sponsor_name: "Ministry of Defence",
        strategic_objectives: ["obj4"],
        contract_value: 3500000,
        contract_term: 36,
        start_date: "2024-03-01",
        end_date: "2026-02-28",
        this_year_amount: 1500000,
        risk_complexity: "HIGH",
        reputational_risk: "HIGH",
        rag_overall: "GREEN",
        rag_scope: "GREEN",
        rag_schedule: "GREEN",
        rag_cost: "GREEN",
        rag_quality: "GREEN",
        rag_risk: "GREEN",
        rag_sheq: "GREEN",
        rag_data: "GREEN",
        rag_compliance: "GREEN",
        health_narrative:
          "All milestones met. Security testing phase completed successfully. Ready for production deployment.",
      },
      {
        id: "proj3",
        short_title: "Climate Data Hub",
        long_title: "National Climate Change Data Hub and Analytics Platform",
        classification: "B",
        cluster: "Environment & Climate",
        impact_area: "Climate Change Adaptation",
        pm_id: "u5", // David Thompson
        sponsor_name: "Department for Environment",
        strategic_objectives: ["obj3", "obj5"],
        contract_value: 1800000,
        contract_term: 18,
        start_date: "2024-06-01",
        end_date: "2025-11-30",
        this_year_amount: 900000,
        risk_complexity: "MEDIUM",
        reputational_risk: "MEDIUM",
        rag_overall: "GREEN",
        rag_scope: "GREEN",
        rag_schedule: "GREEN",
        rag_cost: "AMBER",
        rag_quality: "GREEN",
        rag_risk: "GREEN",
        rag_sheq: "GREEN",
        rag_data: "GREEN",
        rag_compliance: "GREEN",
        health_narrative:
          "Data integration phase completed. Some cost overruns due to additional data source requirements, but within acceptable limits.",
      },
      {
        id: "proj4",
        short_title: "Digital Education Platform",
        long_title: "National Digital Education and Skills Platform",
        classification: "B",
        cluster: "Education & Skills",
        impact_area: "Digital Education",
        pm_id: "u11", // James Wilson
        sponsor_name: "Department for Education",
        strategic_objectives: ["obj1", "obj2"],
        contract_value: 2200000,
        contract_term: 30,
        start_date: "2024-09-01",
        end_date: "2026-08-31",
        this_year_amount: 800000,
        risk_complexity: "MEDIUM",
        reputational_risk: "MEDIUM",
        rag_overall: "AMBER",
        rag_scope: "AMBER",
        rag_schedule: "GREEN",
        rag_cost: "GREEN",
        rag_quality: "AMBER",
        rag_risk: "GREEN",
        rag_sheq: "GREEN",
        rag_data: "GREEN",
        rag_compliance: "GREEN",
        health_narrative:
          "Scope creep identified during user testing phase. Additional requirements added for accessibility features.",
      },
    ];

    for (const project of projects) {
      await client.query(
        `
        INSERT INTO projects (
          id, short_title, long_title, classification, cluster, impact_area, pm_id,
          sponsor_name, strategic_objectives, contract_value, contract_term,
          start_date, end_date, this_year_amount, risk_complexity, reputational_risk,
          rag_overall, rag_scope, rag_schedule, rag_cost, rag_quality, rag_risk,
          rag_sheq, rag_data, rag_compliance, health_narrative
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16,
          $17, $18, $19, $20, $21, $22, $23, $24, $25, $26
        )
        ON CONFLICT (id) DO NOTHING
      `,
        [
          project.id,
          project.short_title,
          project.long_title,
          project.classification,
          project.cluster,
          project.impact_area,
          project.pm_id,
          project.sponsor_name,
          project.strategic_objectives,
          project.contract_value,
          project.contract_term,
          project.start_date,
          project.end_date,
          project.this_year_amount,
          project.risk_complexity,
          project.reputational_risk,
          project.rag_overall,
          project.rag_scope,
          project.rag_schedule,
          project.rag_cost,
          project.rag_quality,
          project.rag_risk,
          project.rag_sheq,
          project.rag_data,
          project.rag_compliance,
          project.health_narrative,
        ],
      );
    }

    console.log("Sample projects added");

    // Add risks
    console.log("Adding sample risks...");

    const risks = [
      {
        id: "risk1",
        project_id: "proj1",
        title: "Resource Shortage",
        type: "RISK",
        likelihood: "MEDIUM",
        impact: "HIGH",
        rag_status: "AMBER",
        mitigation:
          "Additional recruitment drive planned. Cross-training of existing staff initiated.",
        owner: "Sarah Chen",
        status: "OPEN",
      },
      {
        id: "risk2",
        project_id: "proj1",
        title: "Third-party API Dependency",
        type: "RISK",
        likelihood: "HIGH",
        impact: "HIGH",
        rag_status: "RED",
        mitigation:
          "Developing fallback integration options. Negotiating SLA improvements with vendor.",
        owner: "Sarah Chen",
        status: "OPEN",
      },
      {
        id: "risk3",
        project_id: "proj2",
        title: "Security Vulnerability Discovery",
        type: "RISK",
        likelihood: "LOW",
        impact: "HIGH",
        rag_status: "AMBER",
        mitigation:
          "Regular security audits scheduled. Incident response plan documented.",
        owner: "Lisa Wong",
        status: "MITIGATED",
      },
      {
        id: "risk4",
        project_id: "proj3",
        title: "Data Quality Issues",
        type: "ISSUE",
        likelihood: "MEDIUM",
        impact: "MEDIUM",
        rag_status: "AMBER",
        mitigation:
          "Data validation processes implemented. Quality assurance team assigned.",
        owner: "David Thompson",
        status: "OPEN",
      },
      {
        id: "risk5",
        project_id: "proj4",
        title: "Accessibility Compliance Delay",
        type: "RISK",
        likelihood: "MEDIUM",
        impact: "MEDIUM",
        rag_status: "AMBER",
        mitigation:
          "External accessibility audit scheduled. Development team training completed.",
        owner: "James Wilson",
        status: "OPEN",
      },
    ];

    for (const risk of risks) {
      await client.query(
        `
        INSERT INTO risks (id, project_id, title, type, likelihood, impact, rag_status, mitigation, owner, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (id) DO NOTHING
      `,
        [
          risk.id,
          risk.project_id,
          risk.title,
          risk.type,
          risk.likelihood,
          risk.impact,
          risk.rag_status,
          risk.mitigation,
          risk.owner,
          risk.status,
        ],
      );
    }

    console.log("Sample risks added");

    // Add actions
    console.log("Adding sample actions...");

    const actions = [
      {
        id: "action1",
        project_id: "proj1",
        description: "Recruit additional frontend developers",
        owner: "Sarah Chen",
        due_date: "2024-12-15",
        status: "IN_PROGRESS",
        category: "SCHEDULE",
        evidence_links: ["https://hr-portal/recruitment/req-2024-001"],
      },
      {
        id: "action2",
        project_id: "proj1",
        review_id: null,
        description: "Complete API vendor SLA negotiation",
        owner: "Sarah Chen",
        due_date: "2024-11-30",
        status: "OPEN",
        category: "CONTRACT",
        evidence_links: [],
      },
      {
        id: "action3",
        project_id: "proj2",
        description: "Schedule quarterly security audit",
        owner: "Lisa Wong",
        due_date: "2024-12-31",
        status: "CLOSED",
        category: "COMPLIANCE",
        evidence_links: ["https://security-portal/audit-schedule-q4-2024"],
      },
      {
        id: "action4",
        project_id: "proj3",
        description: "Implement data quality validation pipeline",
        owner: "David Thompson",
        due_date: "2025-01-15",
        status: "IN_PROGRESS",
        category: "DATA",
        evidence_links: [],
      },
      {
        id: "action5",
        project_id: "proj4",
        description: "Conduct accessibility compliance audit",
        owner: "James Wilson",
        due_date: "2024-12-01",
        status: "OPEN",
        category: "COMPLIANCE",
        evidence_links: [],
      },
    ];

    for (const action of actions) {
      await client.query(
        `
        INSERT INTO actions (id, project_id, review_id, description, owner, due_date, status, category, evidence_links)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (id) DO NOTHING
      `,
        [
          action.id,
          action.project_id,
          action.review_id,
          action.description,
          action.owner,
          action.due_date,
          action.status,
          action.category,
          action.evidence_links,
        ],
      );
    }

    console.log("Sample actions added");

    // Add POC reviews
    console.log("Adding sample POC reviews...");

    const reviews = [
      {
        id: "review1",
        project_id: "proj1",
        review_date: "2024-10-15",
        committee_type: "CLUSTER",
        attendees: ["James Morrison", "Amara Osei", "Sarah Chen"],
        findings_summary:
          "Project progressing well but resource constraints identified. Risk mitigation plan approved.",
        escalation: false,
        outcome: "APPROVED_WITH_ACTIONS",
      },
      {
        id: "review2",
        project_id: "proj2",
        review_date: "2024-09-20",
        committee_type: "DIVISIONAL",
        attendees: ["Robert Kim", "Maria Garcia", "Lisa Wong"],
        findings_summary:
          "Excellent progress on security implementation. All milestones met ahead of schedule.",
        escalation: false,
        outcome: "APPROVED",
      },
    ];

    for (const review of reviews) {
      await client.query(
        `
        INSERT INTO poc_reviews (id, project_id, review_date, committee_type, attendees, findings_summary, escalation, outcome)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (id) DO NOTHING
      `,
        [
          review.id,
          review.project_id,
          review.review_date,
          review.committee_type,
          review.attendees,
          review.findings_summary,
          review.escalation,
          review.outcome,
        ],
      );
    }

    console.log("Sample POC reviews added");

    // Add checklist responses for reviews
    console.log("Adding sample checklist responses...");

    const checklistResponses = [
      {
        id: "check1",
        review_id: "review1",
        section: "Project Management",
        item: "Project plan approved",
        response: "YES",
        comment: "Project plan reviewed and approved by all stakeholders",
        evidence_links: ["https://docs/project-plan-v2.pdf"],
        action_required: false,
      },
      {
        id: "check2",
        review_id: "review1",
        section: "Project Management",
        item: "Resource allocation confirmed",
        response: "PARTIAL",
        comment:
          "Resource allocation partially confirmed, additional developers needed",
        evidence_links: [],
        action_required: true,
      },
      {
        id: "check3",
        review_id: "review2",
        section: "Technical Delivery",
        item: "Security assessment completed",
        response: "YES",
        comment:
          "Comprehensive security assessment completed with zero critical findings",
        evidence_links: ["https://security-portal/assessment-report-2024.pdf"],
        action_required: false,
      },
    ];

    for (const response of checklistResponses) {
      await client.query(
        `
        INSERT INTO checklist_responses (id, review_id, section, item, response, comment, evidence_links, action_required)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (id) DO NOTHING
      `,
        [
          response.id,
          response.review_id,
          response.section,
          response.item,
          response.response,
          response.comment,
          response.evidence_links,
          response.action_required,
        ],
      );
    }

    console.log("Sample checklist responses added");

    // Add KDA decisions
    console.log("Adding sample KDA decisions...");

    const kdaDecisions = [
      {
        id: "kda1",
        project_id: "proj1",
        gate_name: "Planning Gate",
        stage: "Stage 1",
        submission_status: "Approved",
        decision: "APPROVED",
        notes:
          "All planning requirements met. Project approved to proceed to development phase.",
        signed_off_by: "James Morrison",
        date: "2024-02-15",
      },
      {
        id: "kda2",
        project_id: "proj2",
        gate_name: "Development Gate",
        stage: "Stage 2",
        submission_status: "Approved",
        decision: "APPROVED",
        notes:
          "Development phase completed successfully. Security testing passed all requirements.",
        signed_off_by: "Robert Kim",
        date: "2024-08-30",
      },
    ];

    for (const kda of kdaDecisions) {
      await client.query(
        `
        INSERT INTO kda_decisions (id, project_id, gate_name, stage, submission_status, decision, notes, signed_off_by, date)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (id) DO NOTHING
      `,
        [
          kda.id,
          kda.project_id,
          kda.gate_name,
          kda.stage,
          kda.submission_status,
          kda.decision,
          kda.notes,
          kda.signed_off_by,
          kda.date,
        ],
      );
    }

    console.log("Sample KDA decisions added");

    // Add audit log entries
    console.log("Adding sample audit log entries...");

    const auditEntries = [
      {
        id: "audit1",
        project_id: "proj1",
        timestamp: "2024-10-15T10:30:00Z",
        actor: "James Morrison",
        type: "POC_DECISION",
        description: "POC Review completed with approved with actions outcome",
        old_value: null,
        new_value: "APPROVED_WITH_ACTIONS",
      },
      {
        id: "audit2",
        project_id: "proj1",
        timestamp: "2024-10-16T14:20:00Z",
        actor: "Sarah Chen",
        type: "RAG_CHANGE",
        description: "RAG status updated from GREEN to AMBER",
        old_value: "GREEN",
        new_value: "AMBER",
      },
      {
        id: "audit3",
        project_id: "proj2",
        timestamp: "2024-09-20T11:15:00Z",
        actor: "Robert Kim",
        type: "KDA_DECISION",
        description: "Development Gate approved",
        old_value: null,
        new_value: "APPROVED",
      },
    ];

    for (const audit of auditEntries) {
      await client.query(
        `
        INSERT INTO audit_log (id, project_id, timestamp, actor, type, description, old_value, new_value)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (id) DO NOTHING
      `,
        [
          audit.id,
          audit.project_id,
          audit.timestamp,
          audit.actor,
          audit.type,
          audit.description,
          audit.old_value,
          audit.new_value,
        ],
      );
    }

    console.log("Sample audit log entries added");

    // Add POC sessions
    console.log("Adding sample POC sessions...");

    const sessions = [
      {
        id: "session1",
        date: "2024-11-05",
        committee_type: "CLUSTER",
        status: "COMPLETED",
        attendees: ["James Morrison", "Amara Osei", "Sarah Chen", "Lisa Wong"],
      },
      {
        id: "session2",
        date: "2024-11-12",
        committee_type: "DIVISIONAL",
        status: "IN_PROGRESS",
        attendees: [
          "Robert Kim",
          "Maria Garcia",
          "David Thompson",
          "James Wilson",
        ],
      },
    ];

    for (const session of sessions) {
      await client.query(
        `
        INSERT INTO poc_sessions (id, date, committee_type, status, attendees)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (id) DO NOTHING
      `,
        [
          session.id,
          session.date,
          session.committee_type,
          session.status,
          session.attendees,
        ],
      );
    }

    console.log("Sample POC sessions added");

    // Add session projects
    console.log("Adding session-project relationships...");

    const sessionProjects = [
      { session_id: "session1", project_id: "proj1" },
      { session_id: "session1", project_id: "proj2" },
      { session_id: "session2", project_id: "proj3" },
      { session_id: "session2", project_id: "proj4" },
    ];

    for (const sp of sessionProjects) {
      await client.query(
        `
        INSERT INTO session_projects (session_id, project_id)
        VALUES ($1, $2)
        ON CONFLICT DO NOTHING
      `,
        [sp.session_id, sp.project_id],
      );
    }

    console.log("Session-project relationships added");

    console.log("\n=== SAMPLE DATA SUMMARY ===");
    console.log(
      "✅ Config data: clusters, strategic objectives, action categories, checklist template",
    );
    console.log(
      "✅ 4 sample projects across different clusters and classifications",
    );
    console.log("✅ 5 sample risks (mix of risks and issues)");
    console.log("✅ 5 sample actions with different statuses and categories");
    console.log("✅ 2 sample POC reviews with outcomes");
    console.log("✅ 3 sample checklist responses");
    console.log("✅ 2 sample KDA decisions");
    console.log("✅ 3 sample audit log entries");
    console.log("✅ 2 sample POC sessions with project assignments");

    console.log("\n🎉 All sample data added successfully!");
  } catch (error) {
    console.error("Error adding sample data:", error);
  } finally {
    await client.end();
    console.log("Database connection closed");
  }
}

addSampleData();
