/*
  # Add report tracking and versioning

  1. Changes
    - Add report tracking columns to tenant_insights if not exists
    - Add trigger function for managing report versions
    - Add RLS policies for report access

  2. Notes
    - Uses safe migration pattern with existence checks
    - Maintains data integrity
    - Preserves existing data
*/

-- Add report tracking to insights safely
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tenant_insights' AND column_name = 'report_id'
  ) THEN
    ALTER TABLE tenant_insights ADD COLUMN report_id uuid REFERENCES insight_reports(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tenant_insights' AND column_name = 'previous_insight_id'
  ) THEN
    ALTER TABLE tenant_insights ADD COLUMN previous_insight_id uuid REFERENCES tenant_insights(id);
  END IF;
END $$;

-- Create or replace the version management function
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

-- Drop and recreate trigger if exists
DROP TRIGGER IF EXISTS manage_report_versions_trigger ON insight_reports;
CREATE TRIGGER manage_report_versions_trigger
  AFTER INSERT ON insight_reports
  FOR EACH ROW
  EXECUTE FUNCTION manage_report_versions();

-- Ensure RLS is enabled
ALTER TABLE insight_reports ENABLE ROW LEVEL SECURITY;

-- Drop and recreate policy
DROP POLICY IF EXISTS "Users can access their own reports" ON insight_reports;
CREATE POLICY "Users can access their own reports"
  ON insight_reports
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);