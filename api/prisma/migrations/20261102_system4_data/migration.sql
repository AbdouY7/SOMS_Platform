-- prisma/migrations/20261102_system4_data/migration.sql
-- System 4: wilayas, data_imports, data_import_errors, social_posts, regional_metrics, sales_records

-- ── wilayas (reference table, seeded below) ───────────────────────────────────
CREATE TABLE wilayas (
  code      CHAR(2)      PRIMARY KEY,
  name_ar   VARCHAR(80)  NOT NULL,
  name_fr   VARCHAR(80)  NOT NULL,
  name_en   VARCHAR(80)  NOT NULL,
  aliases   TEXT[]       NOT NULL DEFAULT '{}',
  is_active BOOLEAN      NOT NULL DEFAULT TRUE
);

-- ── data_imports ──────────────────────────────────────────────────────────────
CREATE TABLE data_imports (
  id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    UUID          NOT NULL REFERENCES companies(id),
  import_type   "ImportType"  NOT NULL,
  source_type   "SourceType"  NOT NULL DEFAULT 'csv_import',
  file_name     VARCHAR(255),
  mode          VARCHAR(10)   NOT NULL CHECK (mode IN ('append','upsert')),
  on_error      VARCHAR(15)   NOT NULL CHECK (on_error IN ('skip_invalid','abort')),
  status        "ImportStatus" NOT NULL DEFAULT 'previewed',
  total_rows    INT           NOT NULL DEFAULT 0,
  accepted_rows INT           NOT NULL DEFAULT 0,
  rejected_rows INT           NOT NULL DEFAULT 0,
  error_summary JSONB,
  imported_by   UUID          REFERENCES users(id),
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  completed_at  TIMESTAMPTZ
);
CREATE INDEX idx_data_imports_company ON data_imports(company_id, created_at DESC);

-- ── data_import_errors ────────────────────────────────────────────────────────
CREATE TABLE data_import_errors (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  import_id   UUID         NOT NULL REFERENCES data_imports(id) ON DELETE CASCADE,
  row_number  INT          NOT NULL,
  column_name VARCHAR(100),
  error_code  VARCHAR(50)  NOT NULL,
  message     TEXT         NOT NULL,
  raw_row     JSONB
);
CREATE INDEX idx_import_errors_import ON data_import_errors(import_id);

-- ── social_posts ──────────────────────────────────────────────────────────────
CREATE TABLE social_posts (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id       UUID         NOT NULL REFERENCES companies(id),
  platform         "Platform"   NOT NULL,
  external_post_id VARCHAR(100),
  published_at     TIMESTAMPTZ  NOT NULL,
  content_type     "ContentType",
  caption_public   TEXT,
  likes            INT          CHECK (likes >= 0),
  comments         INT          CHECK (comments >= 0),
  shares           INT          CHECK (shares >= 0),
  views            INT          CHECK (views >= 0),
  reach            INT          CHECK (reach >= 0),
  impressions      INT          CHECK (impressions >= 0),
  clicks           INT          CHECK (clicks >= 0),
  source_type      "SourceType" NOT NULL,
  import_id        UUID         REFERENCES data_imports(id),
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  -- Unique per (company, platform, external_post_id) but only when external_post_id IS NOT NULL
  CONSTRAINT uq_post_identity UNIQUE NULLS NOT DISTINCT (company_id, platform, external_post_id)
);
CREATE INDEX idx_social_posts_company_platform ON social_posts(company_id, platform, published_at DESC);

-- ── regional_metrics ──────────────────────────────────────────────────────────
CREATE TABLE regional_metrics (
  id           UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   UUID          NOT NULL REFERENCES companies(id),
  wilaya_code  CHAR(2)       NOT NULL REFERENCES wilayas(code),
  period_start DATE          NOT NULL,
  period_end   DATE          NOT NULL,
  metric_type  "MetricType"  NOT NULL,
  metric_value NUMERIC(18,4) NOT NULL CHECK (metric_value >= 0),
  source_type  "SourceType"  NOT NULL,
  import_id    UUID          REFERENCES data_imports(id),
  CONSTRAINT uq_regional_metric UNIQUE (company_id, wilaya_code, period_start, period_end, metric_type, source_type)
);
CREATE INDEX idx_regional_metrics_company ON regional_metrics(company_id, period_start, period_end);

-- ── sales_records ─────────────────────────────────────────────────────────────
CREATE TABLE sales_records (
  id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id       UUID          NOT NULL REFERENCES companies(id),
  order_date       DATE          NOT NULL,
  wilaya_code      CHAR(2)       REFERENCES wilayas(code),
  product_category VARCHAR(100),
  order_count      INT           NOT NULL CHECK (order_count >= 0),
  revenue          NUMERIC(14,2) NOT NULL CHECK (revenue >= 0),
  acquisition_cost NUMERIC(14,2) CHECK (acquisition_cost >= 0),
  source_type      "SourceType"  NOT NULL,
  import_id        UUID          REFERENCES data_imports(id)
);
CREATE INDEX idx_sales_records_company ON sales_records(company_id, order_date DESC);

-- ── Seed: 58 Algerian wilayas (pre-2019 list, codes 01-58) ───────────────────
INSERT INTO wilayas (code, name_ar, name_fr, name_en, aliases) VALUES
('01', 'أدرار',           'Adrar',           'Adrar',           ARRAY['adrar','ادرار']),
('02', 'الشلف',           'Chlef',            'Chlef',           ARRAY['chlef','الشلف','cheliff','ech cheliff']),
('03', 'الأغواط',         'Laghouat',         'Laghouat',        ARRAY['laghouat','الاغواط']),
('04', 'أم البواقي',      'Oum El Bouaghi',   'Oum El Bouaghi',  ARRAY['oum el bouaghi','ام البواقي']),
('05', 'باتنة',           'Batna',            'Batna',           ARRAY['batna']),
('06', 'بجاية',           'Béjaïa',           'Bejaia',          ARRAY['bejaia','béjaïa','bgayet']),
('07', 'بسكرة',           'Biskra',           'Biskra',          ARRAY['biskra']),
('08', 'بشار',            'Béchar',           'Bechar',          ARRAY['bechar','béchar']),
('09', 'البليدة',         'Blida',            'Blida',           ARRAY['blida']),
('10', 'البويرة',         'Bouira',           'Bouira',          ARRAY['bouira']),
('11', 'تمنراست',         'Tamanrasset',      'Tamanrasset',     ARRAY['tamanrasset','tamenrasset']),
('12', 'تبسة',            'Tébessa',          'Tebessa',         ARRAY['tebessa','تبسة']),
('13', 'تلمسان',          'Tlemcen',          'Tlemcen',         ARRAY['tlemcen','tlemsen']),
('14', 'تيارت',           'Tiaret',           'Tiaret',          ARRAY['tiaret']),
('15', 'تيزي وزو',        'Tizi Ouzou',       'Tizi Ouzou',      ARRAY['tizi ouzou','tizi-ouzou']),
('16', 'الجزائر',         'Alger',            'Algiers',         ARRAY['alger','algiers','algier','الجزائر العاصمة']),
('17', 'الجلفة',          'Djelfa',           'Djelfa',          ARRAY['djelfa']),
('18', 'جيجل',            'Jijel',            'Jijel',           ARRAY['jijel']),
('19', 'سطيف',            'Sétif',            'Setif',           ARRAY['setif','sétif']),
('20', 'سعيدة',           'Saïda',            'Saida',           ARRAY['saida','saïda']),
('21', 'سكيكدة',          'Skikda',           'Skikda',          ARRAY['skikda']),
('22', 'سيدي بلعباس',     'Sidi Bel Abbès',   'Sidi Bel Abbes',  ARRAY['sidi bel abbes','sidi bel abbès']),
('23', 'عنابة',           'Annaba',           'Annaba',          ARRAY['annaba']),
('24', 'قالمة',           'Guelma',           'Guelma',          ARRAY['guelma']),
('25', 'قسنطينة',         'Constantine',      'Constantine',     ARRAY['constantine']),
('26', 'المدية',          'Médéa',            'Medea',           ARRAY['medea','médéa']),
('27', 'مستغانم',         'Mostaganem',       'Mostaganem',      ARRAY['mostaganem']),
('28', 'المسيلة',         'M''Sila',          'Msila',           ARRAY['msila','m''sila','m sila']),
('29', 'معسكر',           'Mascara',          'Mascara',         ARRAY['mascara','معسكر']),
('30', 'ورقلة',           'Ouargla',          'Ouargla',         ARRAY['ouargla','warqla']),
('31', 'وهران',           'Oran',             'Oran',            ARRAY['oran','wahran']),
('32', 'البيض',           'El Bayadh',        'El Bayadh',       ARRAY['el bayadh','el-bayadh']),
('33', 'إليزي',           'Illizi',           'Illizi',          ARRAY['illizi']),
('34', 'برج بوعريريج',    'Bordj Bou Arréridj','Bordj Bou Arreridj',ARRAY['bordj bou arreridj','bba']),
('35', 'بومرداس',         'Boumerdès',        'Boumerdes',       ARRAY['boumerdes','boumerdès']),
('36', 'الطارف',          'El Tarf',          'El Tarf',         ARRAY['el tarf']),
('37', 'تندوف',           'Tindouf',          'Tindouf',         ARRAY['tindouf']),
('38', 'تيسمسيلت',        'Tissemsilt',       'Tissemsilt',      ARRAY['tissemsilt']),
('39', 'الوادي',          'El Oued',          'El Oued',         ARRAY['el oued','eloued']),
('40', 'خنشلة',           'Khenchela',        'Khenchela',       ARRAY['khenchela']),
('41', 'سوق أهراس',       'Souk Ahras',       'Souk Ahras',      ARRAY['souk ahras']),
('42', 'تيبازة',          'Tipaza',           'Tipaza',          ARRAY['tipaza','tipasa']),
('43', 'ميلة',            'Mila',             'Mila',            ARRAY['mila']),
('44', 'عين الدفلى',      'Aïn Defla',        'Ain Defla',       ARRAY['ain defla','aïn defla']),
('45', 'النعامة',         'Naâma',            'Naama',           ARRAY['naama','naâma']),
('46', 'عين تيموشنت',     'Aïn Témouchent',   'Ain Temouchent',  ARRAY['ain temouchent','aïn témouchent']),
('47', 'غرداية',          'Ghardaïa',         'Ghardaia',        ARRAY['ghardaia','ghardaïa']),
('48', 'غليزان',          'Relizane',         'Relizane',        ARRAY['relizane','غليزان']),
('49', 'تيميمون',         'Timimoun',         'Timimoun',        ARRAY['timimoun']),
('50', 'برج باجي مختار',  'Bordj Badji Mokhtar','Bordj Badji Mokhtar',ARRAY['bordj badji mokhtar','bbm']),
('51', 'أولاد جلال',      'Ouled Djellal',    'Ouled Djellal',   ARRAY['ouled djellal']),
('52', 'بني عباس',        'Béni Abbès',       'Beni Abbes',      ARRAY['beni abbes','béni abbès']),
('53', 'عين صالح',        'In Salah',         'In Salah',        ARRAY['in salah','ain salah']),
('54', 'عين قزام',        'In Guezzam',       'In Guezzam',      ARRAY['in guezzam']),
('55', 'توقرت',           'Touggourt',        'Touggourt',       ARRAY['touggourt']),
('56', 'جانت',            'Djanet',           'Djanet',          ARRAY['djanet']),
('57', 'المغير',          'El M''Ghair',      'El Mghair',       ARRAY['el mghair','el m''ghair']),
('58', 'المنيعة',         'El Menia',         'El Menia',        ARRAY['el menia','el meniaa']);
