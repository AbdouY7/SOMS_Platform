-- CreateEnum
CREATE TYPE "ReportType" AS ENUM ('geo', 'growth', 'scheduler', 'forecast', 'combined');

-- CreateTable
CREATE TABLE "reports" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "created_by" UUID,
    "report_type" "ReportType" NOT NULL,
    "title" VARCHAR(150) NOT NULL,
    "period_start" DATE,
    "period_end" DATE,
    "filters_json" JSONB NOT NULL DEFAULT '{}',
    "data_mode" VARCHAR(5) NOT NULL DEFAULT 'real',
    "snapshot_json" JSONB NOT NULL,
    "sources_json" JSONB NOT NULL DEFAULT '{}',
    "file_url" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "reports_company_id_created_at_idx" ON "reports"("company_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "reports_company_id_report_type_idx" ON "reports"("company_id", "report_type");

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
