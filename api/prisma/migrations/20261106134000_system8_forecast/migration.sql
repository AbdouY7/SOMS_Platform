-- CreateTable
CREATE TABLE "campaign_simulations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "budget" DECIMAL(14,2),
    "start_date" DATE NOT NULL,
    "duration_days" INTEGER NOT NULL,
    "assumptions_json" JSONB NOT NULL,
    "scenario_json" JSONB NOT NULL,
    "is_archived" BOOLEAN NOT NULL DEFAULT false,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "campaign_simulations_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "chk_duration_days" CHECK ("duration_days" >= 1 AND "duration_days" <= 365)
);

-- CreateIndex
CREATE INDEX "campaign_simulations_company_id_is_archived_idx" ON "campaign_simulations"("company_id", "is_archived");

-- CreateIndex
CREATE INDEX "campaign_simulations_company_id_created_at_idx" ON "campaign_simulations"("company_id", "created_at" DESC);

-- AddForeignKey
ALTER TABLE "campaign_simulations" ADD CONSTRAINT "campaign_simulations_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_simulations" ADD CONSTRAINT "campaign_simulations_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

