CREATE OR REPLACE FUNCTION public.check_email_exists(lookup_email text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users WHERE email = lower(lookup_email)
  );
$$;