-- Nova regra (pedido do Vagner): vendido/alugado é só sinalização e o imóvel
-- continua no site até o "Excluir de vez". Só arquivado sai do site.
-- properties_situacao_tipo_negocio (vendido só em venda, alugado só em aluguel) fica como está.

ALTER TABLE public.properties
  DROP CONSTRAINT IF EXISTS properties_situacao_fora_do_site;

ALTER TABLE public.properties
  ADD CONSTRAINT properties_situacao_fora_do_site CHECK (
    status <> 'arquivado' OR published IS NOT TRUE
  );
