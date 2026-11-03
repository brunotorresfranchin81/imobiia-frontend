-- Regras da Situação (depende de 20261103000001_situacao_imovel_enum).

-- Arquivados por "Fechado com outra corretora" viram vendido/alugado conforme
-- o tipo de negócio. Continuam fora do site.
UPDATE public.properties
SET status = CASE WHEN operation_type = 'aluguel' THEN 'alugado'::public.property_status
                  ELSE 'vendido'::public.property_status END,
    published = false,
    featured = false,
    updated_at = now()
WHERE status = 'arquivado';

-- Quem foi marcado "vendido" num imóvel de aluguel vira "alugado".
UPDATE public.properties
SET status = 'alugado', updated_at = now()
WHERE status = 'vendido' AND operation_type = 'aluguel';

-- Fora do site não pode estar publicado.
UPDATE public.properties
SET published = false, featured = false, updated_at = now()
WHERE status IN ('vendido', 'alugado', 'arquivado') AND published IS TRUE;

-- vendido só em venda; alugado só em aluguel (operation_type nulo = venda, o default).
ALTER TABLE public.properties
  ADD CONSTRAINT properties_situacao_tipo_negocio CHECK (
    (status IS DISTINCT FROM 'vendido' OR COALESCE(operation_type, 'venda') = 'venda')
    AND (status IS DISTINCT FROM 'alugado' OR operation_type = 'aluguel')
  );

-- vendido/alugado/arquivado saem do site.
ALTER TABLE public.properties
  ADD CONSTRAINT properties_situacao_fora_do_site CHECK (
    status NOT IN ('vendido', 'alugado', 'arquivado') OR published IS NOT TRUE
  );

-- Dashboard: "imóveis ativos" = no mercado (disponível ou em negociação).
CREATE OR REPLACE FUNCTION public.get_dashboard_metrics()
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_company_id UUID;
  v_total_leads INT;
  v_leads_by_status JSON;
  v_top_corretores JSON;
  v_active_properties INT;
BEGIN
  -- Obter company_id do usuário logado
  v_company_id := ((auth.jwt() -> 'app_metadata') ->> 'company_id')::UUID;

  -- Total de leads
  SELECT COUNT(*) INTO v_total_leads
  FROM public.leads
  WHERE company_id = v_company_id;

  -- Leads por status
  SELECT json_agg(json_build_object('status', status, 'count', cnt))
  INTO v_leads_by_status
  FROM (
    SELECT status::TEXT, COUNT(*) as cnt
    FROM public.leads
    WHERE company_id = v_company_id
    GROUP BY status
    ORDER BY cnt DESC
  ) s;

  -- Top corretores por número de leads
  SELECT json_agg(json_build_object('id', p.id, 'full_name', p.full_name, 'leadCount', cnt))
  INTO v_top_corretores
  FROM (
    SELECT assigned_to, COUNT(*) as cnt
    FROM public.leads
    WHERE company_id = v_company_id
    AND assigned_to IS NOT NULL
    GROUP BY assigned_to
    ORDER BY cnt DESC
    LIMIT 5
  ) l
  JOIN public.profiles p ON p.id = l.assigned_to;

  -- Imóveis no mercado (disponível ou em negociação)
  SELECT COUNT(*) INTO v_active_properties
  FROM public.properties
  WHERE company_id = v_company_id
  AND status IN ('disponivel', 'em_negociacao');

  RETURN json_build_object(
    'totalLeads', COALESCE(v_total_leads, 0),
    'leadsByStatus', COALESCE(v_leads_by_status, '[]'::JSON),
    'topCorretores', COALESCE(v_top_corretores, '[]'::JSON),
    'activeProperties', COALESCE(v_active_properties, 0)
  );
END;
$function$;
