-- =============================================================
-- 04_estado_plan.sql
-- Permite que la pantalla de entrada avise cuando el plan gratuito
-- de Supabase se está llenando (base de datos: 500 MB, fotos: 1 GB).
-- Ejecútelo UNA vez en Supabase: SQL Editor -> New query -> Run.
-- Solo devuelve tamaños en bytes; no expone datos del ganado.
-- =============================================================

CREATE OR REPLACE FUNCTION public.estado_plan()
RETURNS json
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, storage
AS $$
  SELECT json_build_object(
    'db_bytes', pg_database_size(current_database()),
    'storage_bytes', COALESCE((SELECT SUM((metadata->>'size')::bigint) FROM storage.objects), 0)
  );
$$;

REVOKE ALL ON FUNCTION public.estado_plan() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.estado_plan() TO anon, authenticated;
