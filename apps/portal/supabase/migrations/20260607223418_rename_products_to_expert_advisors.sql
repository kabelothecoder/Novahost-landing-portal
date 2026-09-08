-- Rename table products to expert_advisors
ALTER TABLE IF EXISTS public.products RENAME TO expert_advisors;

-- Add tts_script column to expert_advisors
ALTER TABLE public.expert_advisors ADD COLUMN IF NOT EXISTS tts_script text;
