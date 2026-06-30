-- Grants necessários para a Edge Function summarize-lead (service_role)
GRANT SELECT, INSERT, UPDATE ON ai_summaries TO service_role;

-- Unique constraint para permitir UPSERT por lead_id
ALTER TABLE ai_summaries ADD CONSTRAINT ai_summaries_lead_id_key UNIQUE (lead_id);
