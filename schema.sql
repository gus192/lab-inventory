-- Run this in Supabase → SQL Editor
-- If you already ran the old schema, run the DROP TABLE line first

DROP TABLE IF EXISTS chemicals;

CREATE TABLE chemicals (
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
