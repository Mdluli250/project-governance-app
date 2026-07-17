-- CreateTable
CREATE TABLE "session_checklist_items" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "item" TEXT NOT NULL,
    "response" TEXT,
    "comment" TEXT DEFAULT '',
    "evidence_links" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "action_required" BOOLEAN DEFAULT false,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6),

    CONSTRAINT "session_checklist_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "uq_session_checklist_item" ON "session_checklist_items"("session_id", "project_id", "section", "item");

-- CreateIndex
CREATE INDEX "idx_session_checklist_session_project" ON "session_checklist_items"("session_id", "project_id");
