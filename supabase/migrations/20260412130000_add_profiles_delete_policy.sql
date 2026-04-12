-- Allow users to delete only their own profile row (used by delete-account flow)
CREATE POLICY "Users can delete own profile"
  ON public.profiles
  FOR DELETE
  USING (auth.uid() = user_id);
