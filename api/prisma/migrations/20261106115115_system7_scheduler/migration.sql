-- DropForeignKey
ALTER TABLE "activity_logs" DROP CONSTRAINT "activity_logs_actor_fkey";

-- DropForeignKey
ALTER TABLE "activity_logs" DROP CONSTRAINT "activity_logs_company_fkey";

-- DropForeignKey
ALTER TABLE "administrative_requests" DROP CONSTRAINT "administrative_requests_created_company_id_fkey";

-- DropForeignKey
ALTER TABLE "administrative_requests" DROP CONSTRAINT "administrative_requests_reviewed_by_fkey";

-- DropForeignKey
ALTER TABLE "data_import_errors" DROP CONSTRAINT "data_import_errors_import_id_fkey";

-- DropForeignKey
ALTER TABLE "data_imports" DROP CONSTRAINT "data_imports_company_id_fkey";

-- DropForeignKey
ALTER TABLE "data_imports" DROP CONSTRAINT "data_imports_imported_by_fkey";

-- DropForeignKey
ALTER TABLE "regional_metrics" DROP CONSTRAINT "regional_metrics_company_id_fkey";

-- DropForeignKey
ALTER TABLE "regional_metrics" DROP CONSTRAINT "regional_metrics_import_id_fkey";

-- DropForeignKey
ALTER TABLE "regional_metrics" DROP CONSTRAINT "regional_metrics_wilaya_code_fkey";

-- DropForeignKey
ALTER TABLE "sales_records" DROP CONSTRAINT "sales_records_company_id_fkey";

-- DropForeignKey
ALTER TABLE "sales_records" DROP CONSTRAINT "sales_records_import_id_fkey";

-- DropForeignKey
ALTER TABLE "sales_records" DROP CONSTRAINT "sales_records_wilaya_code_fkey";

-- DropForeignKey
ALTER TABLE "social_posts" DROP CONSTRAINT "social_posts_company_id_fkey";

-- DropForeignKey
ALTER TABLE "social_posts" DROP CONSTRAINT "social_posts_import_id_fkey";

-- DropForeignKey
ALTER TABLE "system_settings" DROP CONSTRAINT "system_settings_updater_fkey";

-- DropIndex
DROP INDEX "administrative_requests_status_created_at_idx";

-- AlterTable
ALTER TABLE "wilayas" ALTER COLUMN "aliases" DROP DEFAULT;

-- CreateTable
CREATE TABLE "scheduled_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "platform" "Platform" NOT NULL,
    "planned_at" TIMESTAMPTZ NOT NULL,
    "title" VARCHAR(150) NOT NULL,
    "content_type" "ContentType",
    "notes" TEXT,
    "status" VARCHAR(12) NOT NULL DEFAULT 'planned',
    "created_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "scheduled_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "scheduled_items_company_id_planned_at_idx" ON "scheduled_items"("company_id", "planned_at");

-- AddForeignKey
ALTER TABLE "administrative_requests" ADD CONSTRAINT "administrative_requests_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "administrative_requests" ADD CONSTRAINT "administrative_requests_created_company_id_fkey" FOREIGN KEY ("created_company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "system_settings" ADD CONSTRAINT "system_settings_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "data_imports" ADD CONSTRAINT "data_imports_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "data_imports" ADD CONSTRAINT "data_imports_imported_by_fkey" FOREIGN KEY ("imported_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "data_import_errors" ADD CONSTRAINT "data_import_errors_import_id_fkey" FOREIGN KEY ("import_id") REFERENCES "data_imports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_posts" ADD CONSTRAINT "social_posts_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_posts" ADD CONSTRAINT "social_posts_import_id_fkey" FOREIGN KEY ("import_id") REFERENCES "data_imports"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "regional_metrics" ADD CONSTRAINT "regional_metrics_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "regional_metrics" ADD CONSTRAINT "regional_metrics_wilaya_code_fkey" FOREIGN KEY ("wilaya_code") REFERENCES "wilayas"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "regional_metrics" ADD CONSTRAINT "regional_metrics_import_id_fkey" FOREIGN KEY ("import_id") REFERENCES "data_imports"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_records" ADD CONSTRAINT "sales_records_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_records" ADD CONSTRAINT "sales_records_wilaya_code_fkey" FOREIGN KEY ("wilaya_code") REFERENCES "wilayas"("code") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_records" ADD CONSTRAINT "sales_records_import_id_fkey" FOREIGN KEY ("import_id") REFERENCES "data_imports"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scheduled_items" ADD CONSTRAINT "scheduled_items_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scheduled_items" ADD CONSTRAINT "scheduled_items_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "activity_logs_action_date_idx" RENAME TO "activity_logs_action_created_at_idx";

-- RenameIndex
ALTER INDEX "activity_logs_company_date_idx" RENAME TO "activity_logs_company_id_created_at_idx";

-- RenameIndex
ALTER INDEX "idx_import_errors_import" RENAME TO "data_import_errors_import_id_idx";

-- RenameIndex
ALTER INDEX "idx_data_imports_company" RENAME TO "data_imports_company_id_created_at_idx";

-- RenameIndex
ALTER INDEX "idx_regional_metrics_company" RENAME TO "regional_metrics_company_id_period_start_period_end_idx";

-- RenameIndex
ALTER INDEX "uq_regional_metric" RENAME TO "regional_metrics_company_id_wilaya_code_period_start_period_key";

-- RenameIndex
ALTER INDEX "idx_sales_records_company" RENAME TO "sales_records_company_id_order_date_idx";

-- RenameIndex
ALTER INDEX "idx_social_posts_company_platform" RENAME TO "social_posts_company_id_platform_published_at_idx";
