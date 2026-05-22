export interface Chemical {
  id: string
  name: string
  cas_number: string | null
  location: string | null
  quantity: number | null
  unit: string | null
  supplier: string | null
  catalog_number: string | null
  lot_number: string | null
  date_received: string | null
  expiration_date: string | null
  sds_url: string | null
  purchase_url: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export type ChemicalInsert = Omit<Chemical, 'id' | 'created_at' | 'updated_at'>

export const UNITS = ['g', 'mg', 'kg', 'mL', 'L', 'µL', 'mol', 'mmol', 'µmol', 'ea']

export const COLUMN_LABELS: Record<keyof ChemicalInsert, string> = {
  name: 'Name',
  cas_number: 'CAS Number',
  location: 'Location',
  quantity: 'Quantity',
  unit: 'Unit',
  supplier: 'Supplier',
  catalog_number: 'Catalog #',
  lot_number: 'Lot #',
  date_received: 'Date Received',
  expiration_date: 'Expiration',
  sds_url: 'SDS URL',
  purchase_url: 'Purchase URL',
  notes: 'Notes',
}
