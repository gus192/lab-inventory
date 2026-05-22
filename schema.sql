-- Run this in Supabase → SQL Editor

CREATE TABLE chemicals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  cas_number TEXT,
  location TEXT,
  quantity NUMERIC,
  unit TEXT DEFAULT 'g',
  supplier TEXT,
  catalog_number TEXT,
  lot_number TEXT,
  date_received DATE,
  expiration_date DATE,
  sds_url TEXT,
  purchase_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER chemicals_updated_at
  BEFORE UPDATE ON chemicals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Allow public read/write (the app handles auth via password)
ALTER TABLE chemicals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON chemicals FOR ALL USING (true) WITH CHECK (true);
