-- prisma/migrations/20261027_system3_logs_settings/migration.sql

-- ── activity_logs ────────────────────────────────────────────────────────────
CREATE TABLE activity_logs (
  id            UUID        NOT NULL DEFAULT gen_random_uuid(),
  actor_user_id UUID,
  company_id    UUID,
  action        VARCHAR(60) NOT NULL,
  entity_type   VARCHAR(60),
  entity_id     UUID,
  metadata      JSONB,
  ip            VARCHAR(45),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT activity_logs_pkey PRIMARY KEY (id),
  CONSTRAINT activity_logs_actor_fkey
    FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT activity_logs_company_fkey
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL
);

CREATE INDEX activity_logs_company_date_idx  ON activity_logs (company_id, created_at DESC);
CREATE INDEX activity_logs_action_date_idx   ON activity_logs (action,     created_at DESC);

-- ── system_settings ──────────────────────────────────────────────────────────
CREATE TABLE system_settings (
  key        VARCHAR(80) NOT NULL,
  value      JSONB       NOT NULL,
  updated_by UUID,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT system_settings_pkey PRIMARY KEY (key),
  CONSTRAINT system_settings_updater_fkey
    FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Seed default settings (idempotent ON CONFLICT DO NOTHING)
INSERT INTO system_settings (key, value) VALUES
  ('default_language',              '"ar"'),
  ('allow_registration',            'true'),
  ('import_max_file_mb',            '5'),
  ('import_max_rows',               '50000'),
  ('scheduler_min_posts_per_slot',  '5'),
  ('scheduler_min_total_posts',     '30'),
  ('growth_min_periods',            '3'),
  ('opportunity_weights',           '{"demand_growth":30,"conversion_rate":25,"leads_volume":20,"cac":15,"margin":10}')
ON CONFLICT (key) DO NOTHING;
