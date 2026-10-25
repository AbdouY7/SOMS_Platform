-- CreateEnum
CREATE TYPE "Role" AS ENUM ('super_admin', 'company_admin', 'analyst', 'viewer');

-- CreateEnum
CREATE TYPE "CompanyStatus" AS ENUM ('active', 'inactive');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('pending', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "SourceType" AS ENUM ('public_manual', 'csv_import', 'official_api', 'synthetic_demo');

-- CreateEnum
CREATE TYPE "Platform" AS ENUM ('instagram', 'facebook', 'tiktok', 'other');

-- CreateEnum
CREATE TYPE "ContentType" AS ENUM ('image', 'video', 'reel', 'carousel', 'story', 'text', 'other');

-- CreateEnum
CREATE TYPE "ImportType" AS ENUM ('social_posts', 'regional_metrics', 'sales_records');

-- CreateEnum
CREATE TYPE "ImportStatus" AS ENUM ('previewed', 'processing', 'completed', 'completed_with_errors', 'failed', 'cancelled');

-- CreateEnum
CREATE TYPE "MetricType" AS ENUM ('impressions', 'clicks', 'conversions', 'spend', 'orders', 'revenue', 'followers', 'profit_margin');

-- CreateEnum
CREATE TYPE "ReportType" AS ENUM ('geo', 'growth', 'scheduler', 'forecast', 'combined');

-- CreateTable
CREATE TABLE "companies" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(150) NOT NULL,
    "registration_number" VARCHAR(50),
    "industry" VARCHAR(100),
    "email" VARCHAR(255),
    "phone" VARCHAR(30),
    "address" TEXT,
    "logo_url" TEXT,
    "logo_public_id" TEXT,
    "status" "CompanyStatus" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID,
    "full_name" VARCHAR(120) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "avatar_url" TEXT,
    "avatar_public_id" TEXT,
    "preferred_language" VARCHAR(2) NOT NULL DEFAULT 'ar',
    "failed_login_count" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMPTZ,
    "last_login_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "token_hash" CHAR(64) NOT NULL,
    "family_id" UUID NOT NULL,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "revoked_at" TIMESTAMPTZ,
    "replaced_by" UUID,
    "user_agent" TEXT,
    "ip" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "companies_registration_number_key" ON "companies"("registration_number");

-- CreateIndex
CREATE INDEX "users_company_id_idx" ON "users"("company_id");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");

-- CreateIndex
CREATE INDEX "refresh_tokens_token_hash_idx" ON "refresh_tokens"("token_hash");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
