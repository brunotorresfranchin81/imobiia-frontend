-- "Publicar agora" quebrava com "[socialPosts.autoPublish] [object Object]":
-- authenticated não tinha SELECT em companies (42501 permission denied), então
-- o CRM e a Edge Function notify-post-queue não conseguiam ler auto_publish.
-- Grant só nas 2 colunas que o fluxo usa (id pro filtro, auto_publish pro valor):
-- a policy companies_admin_all deixa qualquer admin ler linhas de outras
-- empresas, então liberar a tabela inteira exporia nome, CNPJ, telefone etc.
GRANT SELECT (id, auto_publish) ON public.companies TO authenticated;
