/*
  # Create tenant insights table

  1. New Tables
    - `tenant_insights`
      - `id` (uuid, primary key)
      - `tenant_name` (text)
      - `score` (integer)
      - `renewal_recommendation` (text)
      - `turnover_risk` (text)
      - `predicted_delinquency` (text)
      - `raise_rent_opportunity` (boolean)
      - `retention_outreach_needed` (boolean)
      - `high_delinquency_alert` (boolean)
      - `notes_analysis` (text)
      - `recommended_actions` (text[])
      - `property` (text)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on `tenant_insights` table
    - Add policies for authenticated users to read all insights
*/

CREATE TABLE tenant_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_name text NOT NULL,
  score integer NOT NULL,
  renewal_recommendation text NOT NULL,
  turnover_risk text NOT NULL,
  predicted_delinquency text NOT NULL,
  raise_rent_opportunity boolean NOT NULL DEFAULT false,
  retention_outreach_needed boolean NOT NULL DEFAULT false,
  high_delinquency_alert boolean NOT NULL DEFAULT false,
  notes_analysis text NOT NULL,
  recommended_actions text[] NOT NULL,
  property text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE tenant_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to read all insights"
  ON tenant_insights
  FOR SELECT
  TO authenticated
  USING (true);