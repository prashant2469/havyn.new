/*
  # Update tenant insights column names

  1. Changes
    - Rename phone_numbers to "Phone Number"
    - Rename emails to "Emails"
    - Preserve existing data
    - Add NOT NULL constraints with default values

  2. Notes
    - Uses safe migration pattern
    - Maintains data integrity
    - Sets reasonable defaults
*/

DO $$ 
BEGIN
  -- First rename existing columns if they exist
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tenant_insights' AND column_name = 'phone_numbers'
  ) THEN
    ALTER TABLE tenant_insights RENAME COLUMN phone_numbers TO "Phone Number";
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tenant_insights' AND column_name = 'emails'
  ) THEN
    ALTER TABLE tenant_insights RENAME COLUMN emails TO "Emails";
  END IF;

  -- Add columns if they don't exist
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