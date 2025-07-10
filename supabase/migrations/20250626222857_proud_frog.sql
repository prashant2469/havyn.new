/*
  # Add Phone Number and Emails columns to tenant_insights

  1. Changes
    - Add "Phone Number" column to tenant_insights table
    - Add "Emails" column to tenant_insights table
    - Both columns are nullable to maintain compatibility

  2. Notes
    - Column names match the exact format used in the application
    - Uses safe migration pattern with existence checks
*/

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tenant_insights' AND column_name = 'Phone Number'
  ) THEN
    ALTER TABLE tenant_insights ADD COLUMN "Phone Number" text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tenant_insights' AND column_name = 'Emails'
  ) THEN
    ALTER TABLE tenant_insights ADD COLUMN "Emails" text;
  END IF;
END $$;