-- Harden founding-member waitlist: no public/API client access.
-- Only service_role (edge function) + postgres (Studio) can use it.

ALTER TABLE public.landing_waitlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.landing_waitlist FORCE ROW LEVEL SECURITY;

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'landing_waitlist'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.landing_waitlist', r.policyname);
  END LOOP;
END $$;

REVOKE ALL ON TABLE public.landing_waitlist FROM PUBLIC;
REVOKE ALL ON TABLE public.landing_waitlist FROM anon;
REVOKE ALL ON TABLE public.landing_waitlist FROM authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.landing_waitlist TO service_role;
GRANT ALL ON TABLE public.landing_waitlist TO postgres;

COMMENT ON TABLE public.landing_waitlist IS
  'Private founding-member waitlist. Not readable via anon/authenticated API. Access only via service_role edge function or Dashboard (postgres).';

DROP VIEW IF EXISTS public.founding_waitlist_emails;

CREATE VIEW public.founding_waitlist_emails
WITH (security_invoker = true) AS
SELECT
  created_at,
  name,
  email,
  phone,
  source,
  welcome_email_status,
  welcome_email_sent_at,
  welcome_email_error,
  welcome_email_attempts,
  id
FROM public.landing_waitlist
ORDER BY created_at DESC;

COMMENT ON VIEW public.founding_waitlist_emails IS
  'Admin-only waitlist read helper. security_invoker=true so underlying RLS/grants apply. Not granted to anon/authenticated.';

REVOKE ALL ON TABLE public.founding_waitlist_emails FROM PUBLIC;
REVOKE ALL ON TABLE public.founding_waitlist_emails FROM anon;
REVOKE ALL ON TABLE public.founding_waitlist_emails FROM authenticated;
GRANT SELECT ON TABLE public.founding_waitlist_emails TO service_role;
GRANT SELECT ON TABLE public.founding_waitlist_emails TO postgres;
