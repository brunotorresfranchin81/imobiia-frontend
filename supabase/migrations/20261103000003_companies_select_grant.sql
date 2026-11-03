-- "Publicar agora" quebrava com "[socialPosts.autoPublish] [object Object]":
-- authenticated não tinha SELECT em companies (42501 permission denied), então
-- o CRM e a Edge Function notify-post-queue não conseguiam ler auto_publish.
-- As linhas continuam protegidas pelas policies de RLS já existentes.
GRANT SELECT ON public.companies TO authenticated;
