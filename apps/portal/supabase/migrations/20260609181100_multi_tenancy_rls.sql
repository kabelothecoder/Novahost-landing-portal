-- Migration: Add multi-tenancy support via user_id columns and strict RLS policies on expert_advisors and licenses.

-- 1. Add user_id column referencing auth.users to expert_advisors and licenses
ALTER TABLE public.expert_advisors 
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) DEFAULT auth.uid();

ALTER TABLE public.licenses 
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) DEFAULT auth.uid();

-- 2. Populate user_id from owner_id for existing licenses
UPDATE public.licenses 
  SET user_id = owner_id 
  WHERE user_id IS NULL;

-- 3. Ensure RLS is enabled on both tables
ALTER TABLE public.expert_advisors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.licenses ENABLE ROW LEVEL SECURITY;

-- 4. Refactor RLS policies for expert_advisors
DROP POLICY IF EXISTS "Products selectable by anyone" ON public.expert_advisors;
DROP POLICY IF EXISTS "Users can view their own expert advisors" ON public.expert_advisors;
DROP POLICY IF EXISTS "Users can manage their own expert advisors" ON public.expert_advisors;

CREATE POLICY "Users can view their own expert advisors" ON public.expert_advisors
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own expert advisors" ON public.expert_advisors
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 5. Refactor RLS policies for licenses
DROP POLICY IF EXISTS "Users can view their own licenses" ON public.licenses;
DROP POLICY IF EXISTS "Users can create their own licenses" ON public.licenses;
DROP POLICY IF EXISTS "Users can update their own licenses" ON public.licenses;
DROP POLICY IF EXISTS "Users can manage their own licenses" ON public.licenses;

CREATE POLICY "Users can view their own licenses" ON public.licenses
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own licenses" ON public.licenses
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
