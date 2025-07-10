/*
  # Add report tracking and improve change detection

  1. New Tables
    - `insight_reports`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `created_at` (timestamptz)
      - `is_latest` (boolean)

  2. Changes to tenant_insights
    - Add `report_id` column (uuid, foreign key to insight_reports)
    - Add `previous_insight_id` column (uuid, self-referential foreign key)

  3. Security
    - Enable RLS on new table
    - Add policies for authenticated users
*/

-- Create reports table
CREATE TABLE insight_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  is_latest boolean NOT NULL DEFAULT true
);

-- Add report tracking to insights
ALTER TABLE tenant_insights 
  ADD COLUMN report_id uuid REFERENCES insight_reports(id),
  ADD COLUMN previous_insight_id uuid REFERENCES tenant_insights(id);

-- Enable RLS
ALTER TABLE insight_reports ENABLE ROW LEVEL SECURITY;

-- Add RLS policies
CREATE POLICY "Users can access their own reports"
  ON insight_reports
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);

-- Function to manage report versions
CREATE OR REPLACE FUNCTION manage_report_versions()
RETURNS TRIGGER AS $$
BEGIN
  -- Set previous reports as not latest
  UPDATE insight_reports
  SET is_latest = false
  WHERE user_id = NEW.user_id AND id != NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to manage report versions
CREATE TRIGGER manage_report_versions_trigger
  AFTER INSERT ON insight_reports
  FOR EACH ROW
  EXECUTE FUNCTION manage_report_versions();