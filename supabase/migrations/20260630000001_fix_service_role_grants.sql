-- Grants necessários para a Edge Function qualify-lead (service_role)
GRANT SELECT ON profiles TO service_role;
GRANT SELECT ON leads TO service_role;
GRANT SELECT, INSERT ON ai_scores TO service_role;

-- Remove constraint incorreta que esperava valores categóricos
-- (score agora é numérico como string: "75")
ALTER TABLE ai_scores DROP CONSTRAINT IF EXISTS ai_scores_score_check;
