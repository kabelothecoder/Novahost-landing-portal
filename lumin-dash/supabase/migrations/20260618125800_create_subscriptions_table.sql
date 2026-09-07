-- Create subscriptions table for PayFast integration
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    plan_type TEXT NOT NULL CHECK (plan_type IN ('monthly', 'quarterly', 'lifetime')),
    status TEXT NOT NULL CHECK (status IN ('active', 'expired')),
    expires_at TIMESTAMP WITH TIME ZONE,
    payfast_payment_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS Policies
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Allow public to read if they have the email (used by Android app via endpoint/query if needed, but endpoint can use service role)
-- Assuming the endpoint uses service role to update/read, we can just allow service role full access.
-- We can add a basic read policy for authenticated users if they own it, but email is not necessarily auth.uid().
CREATE POLICY "Enable read access for all" ON subscriptions FOR SELECT USING (true);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_subscriptions_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_subscriptions_updated_at
    BEFORE UPDATE ON subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_subscriptions_updated_at_column();
