-- System 2 - administrative_requests table

CREATE TABLE "administrative_requests" (
    "id"                    UUID        NOT NULL DEFAULT gen_random_uuid(),
    "company_name"          VARCHAR(150) NOT NULL,
    "registration_number"   VARCHAR(50),
    "industry"              VARCHAR(100),
    "contact_phone"         VARCHAR(30),
    "applicant_full_name"   VARCHAR(120) NOT NULL,
    "applicant_email"       VARCHAR(255) NOT NULL,
    "password_hash"         TEXT,
    "status"                "RequestStatus" NOT NULL DEFAULT 'pending',
    "reviewed_by"           UUID,
    "reviewed_at"           TIMESTAMPTZ,
    "decision_note"         TEXT,
    "created_company_id"    UUID,
    "created_at"            TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "administrative_requests_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE INDEX "administrative_requests_status_created_at_idx"
    ON "administrative_requests"("status", "created_at" DESC);

-- One pending request per email
CREATE UNIQUE INDEX "administrative_requests_pending_email_idx"
    ON "administrative_requests"(lower("applicant_email"))
    WHERE "status" = 'pending';

-- Foreign keys
ALTER TABLE "administrative_requests"
    ADD CONSTRAINT "administrative_requests_reviewed_by_fkey"
    FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE SET NULL;

ALTER TABLE "administrative_requests"
    ADD CONSTRAINT "administrative_requests_created_company_id_fkey"
    FOREIGN KEY ("created_company_id") REFERENCES "companies"("id") ON DELETE SET NULL;
