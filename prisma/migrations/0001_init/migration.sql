-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('PM', 'POC_MEMBER', 'POC_CHAIR', 'ADMIN');

-- CreateEnum
CREATE TYPE "Classification" AS ENUM ('A', 'B', 'C');

-- CreateEnum
CREATE TYPE "RAGStatus" AS ENUM ('RED', 'AMBER', 'GREEN');

-- CreateEnum
CREATE TYPE "RiskComplexity" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "ReputationalRisk" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "CommitteeType" AS ENUM ('DIVISIONAL', 'CLUSTER', 'IMPACT_AREA');

-- CreateEnum
CREATE TYPE "ReviewOutcome" AS ENUM ('APPROVED', 'APPROVED_WITH_ACTIONS', 'REJECTED', 'DEFERRED');

-- CreateEnum
CREATE TYPE "ActionStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'CLOSED');

-- CreateEnum
CREATE TYPE "ActionCategory" AS ENUM ('GOVERNANCE', 'RISK', 'SHEQ', 'COMPLIANCE', 'DATA', 'CONTRACT', 'SCHEDULE', 'FINANCE');

-- CreateEnum
CREATE TYPE "RiskIssueType" AS ENUM ('RISK', 'ISSUE');

-- CreateEnum
CREATE TYPE "Likelihood" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "Impact" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "RiskStatus" AS ENUM ('OPEN', 'MITIGATED', 'CLOSED');

-- CreateEnum
CREATE TYPE "GateDecision" AS ENUM ('APPROVED', 'REJECTED', 'EXCEPTION_REQUIRED');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('DRAFT', 'IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "AuditType" AS ENUM ('CLASSIFICATION_CHANGE', 'RAG_CHANGE', 'POC_DECISION', 'KDA_DECISION', 'ACTION_CHANGE', 'HEALTH_UPDATE', 'PROJECT_UPDATE', 'REVIEW_CREATED', 'RISK');

-- CreateEnum
CREATE TYPE "ChecklistResponse" AS ENUM ('YES', 'NO', 'PARTIAL');

-- CreateTable
CREATE TABLE "profiles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "cluster" TEXT,
    "impact_area" TEXT,
    "password_hash" TEXT,
    "password_changed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL,
    "short_title" TEXT NOT NULL,
    "long_title" TEXT NOT NULL,
    "classification" "Classification" NOT NULL,
    "cluster" TEXT NOT NULL,
    "impact_area" TEXT NOT NULL,
    "pm_id" TEXT NOT NULL,
    "sponsor_name" TEXT NOT NULL,
    "strategic_objectives" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "contract_value" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "contract_term" INTEGER NOT NULL DEFAULT 0,
    "start_date" DATE,
    "end_date" DATE,
    "this_year_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "risk_complexity" "RiskComplexity",
    "reputational_risk" "RiskComplexity",
    "rag_overall" "RAGStatus" NOT NULL DEFAULT 'GREEN',
    "rag_scope" "RAGStatus" NOT NULL DEFAULT 'GREEN',
    "rag_schedule" "RAGStatus" NOT NULL DEFAULT 'GREEN',
    "rag_cost" "RAGStatus" NOT NULL DEFAULT 'GREEN',
    "rag_quality" "RAGStatus" NOT NULL DEFAULT 'GREEN',
    "rag_risk" "RAGStatus" NOT NULL DEFAULT 'GREEN',
    "rag_sheq" "RAGStatus" NOT NULL DEFAULT 'GREEN',
    "rag_data" "RAGStatus" NOT NULL DEFAULT 'GREEN',
    "rag_compliance" "RAGStatus" NOT NULL DEFAULT 'GREEN',
    "health_narrative" TEXT NOT NULL DEFAULT '',
    "last_updated" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "poc_reviews" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "review_date" DATE NOT NULL,
    "committee_type" "CommitteeType" NOT NULL,
    "attendees" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "findings_summary" TEXT NOT NULL DEFAULT '',
    "escalation" BOOLEAN NOT NULL DEFAULT false,
    "outcome" "ReviewOutcome",
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "poc_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "actions" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "review_id" TEXT,
    "description" TEXT NOT NULL,
    "owner" TEXT NOT NULL,
    "due_date" DATE,
    "status" "ActionStatus" NOT NULL,
    "category" "ActionCategory" NOT NULL,
    "evidence_links" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "risks" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" "RiskIssueType" NOT NULL,
    "likelihood" "Likelihood",
    "impact" "Impact",
    "rag_status" "RAGStatus",
    "mitigation" TEXT NOT NULL DEFAULT '',
    "owner" TEXT NOT NULL,
    "status" "RiskStatus" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "risks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actor" TEXT NOT NULL,
    "type" "AuditType" NOT NULL,
    "description" TEXT NOT NULL,
    "old_value" TEXT,
    "new_value" TEXT,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kda_decisions" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "gate_name" TEXT NOT NULL,
    "stage" TEXT NOT NULL,
    "submission_status" TEXT NOT NULL,
    "decision" "GateDecision",
    "notes" TEXT NOT NULL DEFAULT '',
    "signed_off_by" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "kda_decisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "poc_sessions" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "committee_type" "CommitteeType" NOT NULL,
    "status" "SessionStatus" NOT NULL,
    "attendees" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "poc_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session_projects" (
    "session_id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,

    CONSTRAINT "session_projects_pkey" PRIMARY KEY ("session_id","project_id")
);

-- CreateTable
CREATE TABLE "checklist_responses" (
    "id" TEXT NOT NULL,
    "review_id" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "item" TEXT NOT NULL,
    "response" "ChecklistResponse",
    "comment" TEXT NOT NULL DEFAULT '',
    "evidence_links" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "action_required" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "checklist_responses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "config_clusters" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "impact_areas" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "config_clusters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "config_strategic_objectives" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "config_strategic_objectives_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "config_checklist_template" (
    "id" SERIAL NOT NULL,
    "section" TEXT NOT NULL,
    "items" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "sort_order" INTEGER NOT NULL,

    CONSTRAINT "config_checklist_template_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "config_action_categories" (
    "id" SERIAL NOT NULL,
    "value" TEXT NOT NULL,
    "label" TEXT NOT NULL,

    CONSTRAINT "config_action_categories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "profiles_email_key" ON "profiles"("email");

-- CreateIndex
CREATE INDEX "projects_pm_id_idx" ON "projects"("pm_id");

-- CreateIndex
CREATE INDEX "poc_reviews_project_id_idx" ON "poc_reviews"("project_id");

-- CreateIndex
CREATE INDEX "actions_project_id_idx" ON "actions"("project_id");

-- CreateIndex
CREATE INDEX "actions_review_id_idx" ON "actions"("review_id");

-- CreateIndex
CREATE INDEX "risks_project_id_idx" ON "risks"("project_id");

-- CreateIndex
CREATE INDEX "audit_log_project_id_idx" ON "audit_log"("project_id");

-- CreateIndex
CREATE INDEX "kda_decisions_project_id_idx" ON "kda_decisions"("project_id");

-- CreateIndex
CREATE INDEX "session_projects_session_id_idx" ON "session_projects"("session_id");

-- CreateIndex
CREATE INDEX "session_projects_project_id_idx" ON "session_projects"("project_id");

-- CreateIndex
CREATE INDEX "checklist_responses_review_id_idx" ON "checklist_responses"("review_id");

-- CreateIndex
CREATE UNIQUE INDEX "config_clusters_name_key" ON "config_clusters"("name");

-- CreateIndex
CREATE UNIQUE INDEX "config_action_categories_value_key" ON "config_action_categories"("value");

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_pm_id_fkey" FOREIGN KEY ("pm_id") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "poc_reviews" ADD CONSTRAINT "poc_reviews_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "actions" ADD CONSTRAINT "actions_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "actions" ADD CONSTRAINT "actions_review_id_fkey" FOREIGN KEY ("review_id") REFERENCES "poc_reviews"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risks" ADD CONSTRAINT "risks_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kda_decisions" ADD CONSTRAINT "kda_decisions_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_projects" ADD CONSTRAINT "session_projects_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "poc_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_projects" ADD CONSTRAINT "session_projects_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checklist_responses" ADD CONSTRAINT "checklist_responses_review_id_fkey" FOREIGN KEY ("review_id") REFERENCES "poc_reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;
