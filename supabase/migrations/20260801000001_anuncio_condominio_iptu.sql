-- Lead source para a página pública "Anuncie seu Imóvel"
ALTER TYPE lead_source ADD VALUE IF NOT EXISTS 'anuncio_proprietario';

-- Fotos enviadas pelo proprietário junto com o lead de anúncio
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS photo_urls TEXT[];

-- Campos financeiros complementares do imóvel
ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS condominio_valor NUMERIC,
  ADD COLUMN IF NOT EXISTS iptu_valor        NUMERIC;
