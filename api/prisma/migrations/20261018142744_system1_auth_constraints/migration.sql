-- System 1 - Additional constraints not expressible in Prisma schema

-- Unique email (case-insensitive) on users
CREATE UNIQUE INDEX "users_email_lower_idx" ON "users"(lower("email"));

-- Spec rule: super_admin has company_id = NULL; every other role must have a company
ALTER TABLE "users"
  ADD CONSTRAINT "users_role_company_check"
  CHECK ((role = 'super_admin') = (company_id IS NULL));