-- Situação do imóvel (pedido do Vagner): o enum property_status passa a ser a
-- "Situação", separada do tipo de negócio (operation_type: venda/aluguel).
--   ativo     -> disponivel
--   reservado -> em_negociacao
--   + alugado
--   vendido e arquivado continuam.
-- RENAME VALUE mantém o OID: as linhas, o default da coluna e a view
-- vgv_summary passam a mostrar o nome novo sem reescrever nada.
-- ADD VALUE precisa ser commitado antes de ser usado, por isso o resto fica
-- na migration seguinte.

ALTER TYPE public.property_status RENAME VALUE 'ativo' TO 'disponivel';
ALTER TYPE public.property_status RENAME VALUE 'reservado' TO 'em_negociacao';
ALTER TYPE public.property_status ADD VALUE IF NOT EXISTS 'alugado' AFTER 'vendido';
