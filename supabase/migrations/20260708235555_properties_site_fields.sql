-- Colunas para publicação no site público
ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS published   BOOLEAN         NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS slug        TEXT,
  ADD COLUMN IF NOT EXISTS featured    BOOLEAN         NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS operation_type property_intent DEFAULT 'venda';

-- Slug único por empresa (não global — multi-tenant safe)
ALTER TABLE properties
  ADD CONSTRAINT properties_company_slug_unique UNIQUE (company_id, slug);

-- RLS: anon pode ler imóveis publicados
CREATE POLICY "anon_read_published_properties"
  ON properties FOR SELECT
  TO anon
  USING (published = true);

-- RLS: anon pode ler fotos de imóveis publicados
CREATE POLICY "anon_read_property_images"
  ON property_images FOR SELECT
  TO anon
  USING (
    property_id IN (SELECT id FROM properties WHERE published = true)
  );

-- Corrige política de storage: INSERT deve verificar pasta da empresa
-- (a policy existente não restringia por company_id, qualquer autenticado
--  podia fazer upload em qualquer pasta)
DROP POLICY IF EXISTS "storage_insert" ON storage.objects;
CREATE POLICY "storage_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'imobiia-properties'
    AND (storage.foldername(name))[1] = (auth.jwt() -> 'app_metadata' ->> 'company_id')
  );
