/*
  # Add communication logs table

  1. New Tables
    - `communication_logs`
      - `id` (uuid, primary key)
      - `tenant_id` (uuid)
      - `type` (text)
      - `message` (text)
      - `email_status` (text)
      - `sms_status` (text)
      - `email_error` (text)
      - `sms_error` (text)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS
    - Add policies for authenticated users
*/

CREATE TABLE communication_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  type text NOT NULL,
  message text NOT NULL,
  email_status text,
  sms_status text,
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