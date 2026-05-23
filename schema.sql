-- ============================================================
-- INITIAL SETUP (run once if starting fresh)
-- ============================================================
-- DROP TABLE IF EXISTS chemicals;

CREATE TABLE IF NOT EXISTS chemicals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  cas_number TEXT,
  distributor TEXT,
  container_size TEXT,
  physical_state TEXT,
  location TEXT,
  carbon_count INTEGER,
  bottle_count INTEGER,
  storage_conditions TEXT,
  hazards TEXT,
  sds_url TEXT,
  notes TEXT,
  added_by TEXT,
  added_at DATE DEFAULT CURRENT_DATE,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER chemicals_updated_at
  BEFORE UPDATE ON chemicals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE chemicals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON chemicals FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- BACKUP TABLE (run once)
-- ============================================================
CREATE TABLE IF NOT EXISTS backups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT,
  chemical_count INTEGER,
  data JSONB NOT NULL
);

ALTER TABLE backups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON backups FOR ALL USING (true) WITH CHECK (true);


-- ============================================================
-- MIGRATION: run these if you already have a chemicals table
-- ============================================================
ALTER TABLE chemicals ADD COLUMN IF NOT EXISTS added_by TEXT;
ALTER TABLE chemicals ADD COLUMN IF NOT EXISTS added_at DATE DEFAULT CURRENT_DATE;
ALTER TABLE chemicals ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
