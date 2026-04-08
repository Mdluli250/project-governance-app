-- Database schema for Project Governance App

-- Users table
CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('PM', 'POC_MEMBER', 'POC_CHAIR', 'ADMIN')),
  cluster TEXT,
  impact_area TEXT,
  password_changed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  short_title TEXT NOT NULL,
  long_title TEXT NOT NULL,
  classification TEXT NOT NULL CHECK (classification IN ('A', 'B', 'C')),
  cluster TEXT NOT NULL,
  impact_area TEXT NOT NULL,
  pm_id TEXT NOT NULL REFERENCES profiles(id),
  sponsor_name TEXT NOT NULL,
  strategic_objectives TEXT[] DEFAULT '{}',
  contract_value DECIMAL(15,2) DEFAULT 0,
  contract_term INTEGER DEFAULT 0,
  start_date DATE,
  end_date DATE,
  this_year_amount DECIMAL(15,2) DEFAULT 0,
  risk_complexity TEXT CHECK (risk_complexity IN ('LOW', 'MEDIUM', 'HIGH')),
  reputational_risk TEXT CHECK (reputational_risk IN ('LOW', 'MEDIUM', 'HIGH')),
  rag_overall TEXT DEFAULT 'GREEN' CHECK (rag_overall IN ('RED', 'AMBER', 'GREEN')),
  rag_scope TEXT DEFAULT 'GREEN' CHECK (rag_scope IN ('RED', 'AMBER', 'GREEN')),
  rag_schedule TEXT DEFAULT 'GREEN' CHECK (rag_schedule IN ('RED', 'AMBER', 'GREEN')),
  rag_cost TEXT DEFAULT 'GREEN' CHECK (rag_cost IN ('RED', 'AMBER', 'GREEN')),
  rag_quality TEXT DEFAULT 'GREEN' CHECK (rag_quality IN ('RED', 'AMBER', 'GREEN')),
  rag_risk TEXT DEFAULT 'GREEN' CHECK (rag_risk IN ('RED', 'AMBER', 'GREEN')),
  rag_sheq TEXT DEFAULT 'GREEN' CHECK (rag_sheq IN ('RED', 'AMBER', 'GREEN')),
  rag_data TEXT DEFAULT 'GREEN' CHECK (rag_data IN ('RED', 'AMBER', 'GREEN')),
  rag_compliance TEXT DEFAULT 'GREEN' CHECK (rag_compliance IN ('RED', 'AMBER', 'GREEN')),
  health_narrative TEXT DEFAULT '',
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- POC Reviews table
CREATE TABLE IF NOT EXISTS poc_reviews (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  review_date DATE NOT NULL,
  committee_type TEXT NOT NULL CHECK (committee_type IN ('DIVISIONAL', 'CLUSTER', 'IMPACT_AREA')),
  attendees TEXT[] DEFAULT '{}',
  findings_summary TEXT DEFAULT '',
  escalation BOOLEAN DEFAULT FALSE,
  outcome TEXT CHECK (outcome IN ('APPROVED', 'APPROVED_WITH_ACTIONS', 'REJECTED', 'DEFERRED')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Actions table
CREATE TABLE IF NOT EXISTS actions (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  review_id TEXT REFERENCES poc_reviews(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  owner TEXT NOT NULL,
  due_date DATE,
  status TEXT NOT NULL CHECK (status IN ('OPEN', 'IN_PROGRESS', 'CLOSED')),
  category TEXT NOT NULL CHECK (category IN ('GOVERNANCE', 'RISK', 'SHEQ', 'COMPLIANCE', 'DATA', 'CONTRACT', 'SCHEDULE', 'FINANCE')),
  evidence_links TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Risks table
CREATE TABLE IF NOT EXISTS risks (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('RISK', 'ISSUE')),
  likelihood TEXT CHECK (likelihood IN ('LOW', 'MEDIUM', 'HIGH')),
  impact TEXT CHECK (impact IN ('LOW', 'MEDIUM', 'HIGH')),
  rag_status TEXT CHECK (rag_status IN ('RED', 'AMBER', 'GREEN')),
  mitigation TEXT DEFAULT '',
  owner TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('OPEN', 'MITIGATED', 'CLOSED')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Audit Log table
CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  actor TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('CLASSIFICATION_CHANGE', 'RAG_CHANGE', 'POC_DECISION', 'KDA_DECISION', 'ACTION_CHANGE', 'HEALTH_UPDATE', 'PROJECT_UPDATE', 'REVIEW_CREATED', 'RISK')),
  description TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT
);

-- KDA Decisions table
CREATE TABLE IF NOT EXISTS kda_decisions (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  gate_name TEXT NOT NULL,
  stage TEXT NOT NULL,
  submission_status TEXT NOT NULL,
  decision TEXT CHECK (decision IN ('APPROVED', 'REJECTED', 'EXCEPTION_REQUIRED')),
  notes TEXT DEFAULT '',
  signed_off_by TEXT NOT NULL,
  date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- POC Sessions table
CREATE TABLE IF NOT EXISTS poc_sessions (
  id TEXT PRIMARY KEY,
  date DATE NOT NULL,
  committee_type TEXT NOT NULL CHECK (committee_type IN ('DIVISIONAL', 'CLUSTER', 'IMPACT_AREA')),
  status TEXT NOT NULL CHECK (status IN ('DRAFT', 'IN_PROGRESS', 'COMPLETED')),
  attendees TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Session Projects junction table
CREATE TABLE IF NOT EXISTS session_projects (
  session_id TEXT NOT NULL REFERENCES poc_sessions(id) ON DELETE CASCADE,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  PRIMARY KEY (session_id, project_id)
);

-- Checklist Responses table
CREATE TABLE IF NOT EXISTS checklist_responses (
  id TEXT PRIMARY KEY,
  review_id TEXT NOT NULL REFERENCES poc_reviews(id) ON DELETE CASCADE,
  section TEXT NOT NULL,
  item TEXT NOT NULL,
  response TEXT CHECK (response IN ('YES', 'NO', 'PARTIAL')),
  comment TEXT DEFAULT '',
  evidence_links TEXT[] DEFAULT '{}',
  action_required BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Config Clusters table
CREATE TABLE IF NOT EXISTS config_clusters (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  impact_areas TEXT[] DEFAULT '{}'
);

-- Config Strategic Objectives table
CREATE TABLE IF NOT EXISTS config_strategic_objectives (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  description TEXT
);

-- Config Checklist Template table
CREATE TABLE IF NOT EXISTS config_checklist_template (
  id SERIAL PRIMARY KEY,
  section TEXT NOT NULL,
  items TEXT[] DEFAULT '{}',
  sort_order INTEGER NOT NULL
);

-- Config Action Categories table
CREATE TABLE IF NOT EXISTS config_action_categories (
  id SERIAL PRIMARY KEY,
  value TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_projects_pm_id ON projects(pm_id);
CREATE INDEX IF NOT EXISTS idx_actions_project_id ON actions(project_id);
CREATE INDEX IF NOT EXISTS idx_actions_review_id ON actions(review_id);
CREATE INDEX IF NOT EXISTS idx_poc_reviews_project_id ON poc_reviews(project_id);
CREATE INDEX IF NOT EXISTS idx_risks_project_id ON risks(project_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_project_id ON audit_log(project_id);
CREATE INDEX IF NOT EXISTS idx_kda_decisions_project_id ON kda_decisions(project_id);
CREATE INDEX IF NOT EXISTS idx_session_projects_session_id ON session_projects(session_id);
CREATE INDEX IF NOT EXISTS idx_session_projects_project_id ON session_projects(project_id);
CREATE INDEX IF NOT EXISTS idx_checklist_responses_review_id ON checklist_responses(review_id);