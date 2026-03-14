-- institutions
CREATE TABLE institutions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  slug       TEXT UNIQUE NOT NULL,
  address    TEXT,
  phone      TEXT,
  is_active  BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- users (extends auth.users)
CREATE TABLE users (
  id             UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  institution_id UUID REFERENCES institutions(id),
  full_name      TEXT,
  role           TEXT CHECK (role IN ('admin','radiologist','clinician','technician')),
  specialization TEXT,
  is_active      BOOLEAN DEFAULT TRUE,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- auto-create user row on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO users (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- patients
CREATE TABLE patients (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES institutions(id),
  mrn            TEXT NOT NULL,
  full_name      TEXT NOT NULL,
  date_of_birth  DATE,
  gender         TEXT CHECK (gender IN ('M','F','Other','Unknown')),
  phone          TEXT,
  email          TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (institution_id, mrn)
);

-- studies
CREATE TABLE studies (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id      UUID NOT NULL REFERENCES institutions(id),
  patient_id          UUID NOT NULL REFERENCES patients(id),
  accession_number    TEXT,
  study_instance_uid  TEXT UNIQUE,
  modality            TEXT NOT NULL DEFAULT 'CR',
  body_part           TEXT,
  study_description   TEXT,
  study_date          TIMESTAMPTZ,
  referring_physician TEXT,
  status              TEXT DEFAULT 'unread'
    CHECK (status IN ('unread','in_progress','reported','verified','amended')),
  priority            TEXT DEFAULT 'routine'
    CHECK (priority IN ('stat','urgent','routine')),
  assigned_to         UUID REFERENCES users(id),
  num_series          INT DEFAULT 0,
  num_images          INT DEFAULT 0,
  storage_path        TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_studies_institution ON studies(institution_id);
CREATE INDEX idx_studies_patient     ON studies(patient_id);
CREATE INDEX idx_studies_status      ON studies(status);
CREATE INDEX idx_studies_assigned    ON studies(assigned_to);

-- series
CREATE TABLE series (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  study_id            UUID NOT NULL REFERENCES studies(id) ON DELETE CASCADE,
  series_instance_uid TEXT UNIQUE,
  series_number       INT,
  series_description  TEXT,
  modality            TEXT,
  num_images          INT DEFAULT 0,
  storage_path        TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- images
CREATE TABLE images (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  series_id        UUID NOT NULL REFERENCES series(id) ON DELETE CASCADE,
  study_id         UUID NOT NULL REFERENCES studies(id) ON DELETE CASCADE,
  sop_instance_uid TEXT UNIQUE,
  instance_number  INT,
  storage_path     TEXT NOT NULL,
  file_size        BIGINT,
  rows             INT,
  columns          INT,
  bits_allocated   INT,
  photometric      TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_images_series ON images(series_id);
CREATE INDEX idx_images_study  ON images(study_id);

-- reports
CREATE TABLE reports (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  study_id         UUID UNIQUE NOT NULL REFERENCES studies(id),
  institution_id   UUID NOT NULL REFERENCES institutions(id),
  radiologist_id   UUID REFERENCES users(id),
  template_id      UUID,
  clinical_history TEXT,
  technique        TEXT,
  findings         TEXT NOT NULL DEFAULT '',
  impression       TEXT NOT NULL DEFAULT '',
  recommendation   TEXT,
  critical_finding BOOLEAN DEFAULT FALSE,
  status           TEXT DEFAULT 'draft'
    CHECK (status IN ('draft','preliminary','final','amended','addendum')),
  signed_at        TIMESTAMPTZ,
  signed_by        UUID REFERENCES users(id),
  hl7_sent         BOOLEAN DEFAULT FALSE,
  hl7_sent_at      TIMESTAMPTZ,
  hl7_message_id   TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- report_templates
CREATE TABLE report_templates (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id    UUID REFERENCES institutions(id),
  name              TEXT NOT NULL,
  modality          TEXT,
  body_part         TEXT,
  technique_text    TEXT,
  findings_prompt   TEXT,
  impression_prompt TEXT,
  is_global         BOOLEAN DEFAULT FALSE,
  created_by        UUID REFERENCES users(id),
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- worklist_items
CREATE TABLE worklist_items (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  study_id       UUID UNIQUE NOT NULL REFERENCES studies(id),
  institution_id UUID NOT NULL REFERENCES institutions(id),
  assigned_to    UUID REFERENCES users(id),
  priority       TEXT DEFAULT 'routine'
    CHECK (priority IN ('stat','urgent','routine')),
  due_by         TIMESTAMPTZ,
  notes          TEXT,
  status         TEXT DEFAULT 'pending'
    CHECK (status IN ('pending','in_progress','completed','on_hold')),
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_worklist_assigned ON worklist_items(assigned_to);
CREATE INDEX idx_worklist_status   ON worklist_items(status, priority);

-- audit_logs
CREATE TABLE audit_logs (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID REFERENCES users(id),
  institution_id UUID REFERENCES institutions(id),
  action         TEXT NOT NULL,
  resource_type  TEXT,
  resource_id    UUID,
  ip_address     INET,
  metadata       JSONB,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_user     ON audit_logs(user_id);
CREATE INDEX idx_audit_resource ON audit_logs(resource_type, resource_id);

ALTER TABLE institutions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients       ENABLE ROW LEVEL SECURITY;
ALTER TABLE studies        ENABLE ROW LEVEL SECURITY;
ALTER TABLE series         ENABLE ROW LEVEL SECURITY;
ALTER TABLE images         ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports        ENABLE ROW LEVEL SECURITY;
ALTER TABLE worklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs     ENABLE ROW LEVEL SECURITY;

-- Helper functions
CREATE OR REPLACE FUNCTION current_institution_id()
RETURNS UUID AS $$
  SELECT institution_id FROM users WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION current_user_role()
RETURNS TEXT AS $$
  SELECT role FROM users WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Studies policies
CREATE POLICY studies_select ON studies FOR SELECT
  USING (institution_id = current_institution_id());

CREATE POLICY studies_insert ON studies FOR INSERT
  WITH CHECK (
    institution_id = current_institution_id()
    AND current_user_role() IN ('admin','technician','radiologist')
  );

CREATE POLICY studies_update ON studies FOR UPDATE
  USING (institution_id = current_institution_id())
  WITH CHECK (institution_id = current_institution_id());

-- Reports policies
CREATE POLICY reports_select ON reports FOR SELECT
  USING (institution_id = current_institution_id());

CREATE POLICY reports_write ON reports FOR ALL
  USING (
    institution_id = current_institution_id()
    AND current_user_role() IN ('admin','radiologist')
  )
  WITH CHECK (
    institution_id = current_institution_id()
    AND current_user_role() IN ('admin','radiologist')
  );

-- Worklist policies
CREATE POLICY worklist_select ON worklist_items FOR SELECT
  USING (
    institution_id = current_institution_id()
    AND (assigned_to = auth.uid() OR current_user_role() = 'admin')
  );

-- Patients, series, images -- institution-scoped read
CREATE POLICY patients_select ON patients FOR SELECT
  USING (institution_id = current_institution_id());

CREATE POLICY series_select ON series FOR SELECT
  USING (study_id IN (SELECT id FROM studies WHERE institution_id = current_institution_id()));

CREATE POLICY images_select ON images FOR SELECT
  USING (study_id IN (SELECT id FROM studies WHERE institution_id = current_institution_id()));
