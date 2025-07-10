/*
  # Create payment logs table

  1. New Tables
    - `payment_logs`
      - `id` (uuid, primary key)
      - `payment_intent_id` (text, unique)
      - `tenant_name` (text)
      - `property` (text)
      - `unit` (text)
      - `amount` (numeric)
      - `payment_type` (text)
      - `status` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `payment_logs` table
    - Add policies for authenticated users
*/

CREATE TABLE IF NOT EXISTS payment_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_intent_id text UNIQUE NOT NULL,
  tenant_name text NOT NULL,
  property text NOT NULL,
  unit text NOT NULL,
  amount numeric(10,2) NOT NULL,
  payment_type text NOT NULL,
  status text NOT NULL DEFAULT 'created',
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE payment_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to read payment logs"
  ON payment_logs
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow service role to manage payment logs"
  ON payment_logs
  FOR ALL
  TO service_role
  USING (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_payment_logs_updated_at
  BEFORE UPDATE ON payment_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();