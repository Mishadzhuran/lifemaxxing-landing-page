-- public.spatial_ref_sys is owned by supabase_admin (PostGIS), so ENABLE ROW LEVEL
-- SECURITY cannot be applied by the postgres migration role.
-- Defense: block anon/authenticated writes with a SECURITY DEFINER trigger.
-- Reads remain allowed (EPSG definitions are public reference data).

CREATE OR REPLACE FUNCTION public.enforce_spatial_ref_sys_readonly()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  jwt_role text := coalesce(auth.role(), '');
  sess_role text := current_user;
BEGIN
  IF jwt_role IN ('anon', 'authenticated')
     OR sess_role IN ('anon', 'authenticated') THEN
    RAISE EXCEPTION 'public.spatial_ref_sys is read-only for API clients'
      USING ERRCODE = '42501';
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS spatial_ref_sys_readonly_guard ON public.spatial_ref_sys;

CREATE TRIGGER spatial_ref_sys_readonly_guard
BEFORE INSERT OR UPDATE OR DELETE ON public.spatial_ref_sys
FOR EACH ROW
EXECUTE FUNCTION public.enforce_spatial_ref_sys_readonly();

REVOKE ALL ON FUNCTION public.enforce_spatial_ref_sys_readonly() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.enforce_spatial_ref_sys_readonly() TO postgres, service_role, anon, authenticated;

COMMENT ON FUNCTION public.enforce_spatial_ref_sys_readonly() IS
  'Blocks anon/authenticated writes to PostGIS spatial_ref_sys (RLS cannot be enabled; table owned by supabase_admin).';
