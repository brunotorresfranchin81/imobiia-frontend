-- Tabela property_images
CREATE TABLE property_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  company_id UUID NOT NULL,
  storage_path TEXT NOT NULL,
  url TEXT NOT NULL,
  is_main BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Garante apenas uma foto principal por imóvel
CREATE UNIQUE INDEX property_images_main_idx
  ON property_images (property_id)
  WHERE is_main = true;

-- RLS
ALTER TABLE property_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "property_images_select" ON property_images
  FOR SELECT TO authenticated
  USING (company_id = (auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid);

CREATE POLICY "property_images_insert" ON property_images
  FOR INSERT TO authenticated
  WITH CHECK (company_id = (auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid);

CREATE POLICY "property_images_delete" ON property_images
  FOR DELETE TO authenticated
  USING (company_id = (auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid);

-- Grants
GRANT SELECT, INSERT, DELETE ON property_images TO authenticated;
GRANT SELECT, INSERT, DELETE ON property_images TO service_role;

-- Storage policies para bucket imobiia-properties
CREATE POLICY "storage_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'imobiia-properties');

CREATE POLICY "storage_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'imobiia-properties'
    AND (storage.foldername(name))[1] = (auth.jwt() -> 'app_metadata' ->> 'company_id')
  );
