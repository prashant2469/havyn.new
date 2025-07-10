/*
  # Add communication logs table and update notification settings

  1. New Tables
    - `communication_logs`
      - `id` (uuid, primary key)
      - `tenant_id` (uuid, references tenant_insights)
      - `type` (text)
      - `message` (text)
      - `email_status` (text)
      - `sms_status` (text)
      - `email_error` (text)
      - `sms_error` (text)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS
    - Add policy for users to access their own logs
*/

CREATE TABLE IF NOT EXISTS communication_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenant_insights(id),
  type text NOT NULL CHECK (type IN ('email', 'sms', 'both')),
  message text NOT NULL,
  email_status text CHECK (email_status IN ('sent', 'failed', NULL)),
  sms_status text CHECK (sms_status IN ('sent', 'failed', NULL)),
  email_error text,
  sms_error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE communication_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access their own communication logs"
  ON communication_logs
  FOR ALL
  TO authenticated
  USING (auth.uid() IN (
    SELECT user_id FROM tenant_insights WHERE id = tenant_id
  ));