/*
  # Create tenant_insights_v2 table

  1. New Tables
    - `tenant_insights_v2`
      - All columns from tenant_insights table
      - Additional columns for enhanced functionality
      - Proper RLS policies

  2. Security
    - Enable RLS on `tenant_insights_v2` table
    - Add policies for authenticated users to read their own data
*/

CREATE TABLE tenant_insights_v2 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_name text NOT NULL,
  tenant_score integer NOT NULL,
  renewal_recommendation text NOT NULL,
  turnover_risk text NOT NULL,
  predicted_delinquency text NOT NULL,
  raise_rent_opportunity boolean NOT NULL DEFAULT false,
  retention_outreach_needed boolean NOT NULL DEFAULT false,
  high_delinquency_alert boolean NOT NULL DEFAULT false,
  notes_analysis text NOT NULL,
  recommended_actions text[] NOT NULL,
  property text NOT NULL,
  unit text,
  reasoning_summary text,
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  rent_amount numeric(10,2) NOT NULL DEFAULT 0,
  past_due numeric(10,2) NOT NULL DEFAULT 0,
  delinquent_rent numeric(10,2) NOT NULL DEFAULT 0,
  aging_30 numeric(10,2) NOT NULL DEFAULT 0,
  aging_60 numeric(10,2) NOT NULL DEFAULT 0,
  aging_90 numeric(10,2) NOT NULL DEFAULT 0,
  aging_over_90 numeric(10,2) NOT NULL DEFAULT 0,
  lease_start_date timestamptz,
  lease_end_date timestamptz,
  total_balance numeric(10,2) NOT NULL DEFAULT 0,
  delinquency_notes text,
  phone_number text,
  email text,
  changes jsonb,
  report_id uuid,
  previous_insight_id uuid REFERENCES tenant_insights_v2(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE tenant_insights_v2 ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can only access their own insights"
  ON tenant_insights_v2
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_tenant_insights_v2_user_id ON tenant_insights_v2(user_id);
CREATE INDEX idx_tenant_insights_v2_created_at ON tenant_insights_v2(created_at);
CREATE INDEX idx_tenant_insights_v2_property ON tenant_insights_v2(property);