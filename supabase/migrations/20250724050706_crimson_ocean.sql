/*
  # Add email and phone_number columns to tenant_insights table

  1. Schema Changes
    - Add `email` column (text, nullable) to `tenant_insights` table
    - Add `phone_number` column (text, nullable) to `tenant_insights` table

  2. Notes
    - These columns are needed to store tenant contact information
    - Both columns are nullable as not all tenants may have this information
*/

DO $$
BEGIN
  -- Add email column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tenant_insights' AND column_name = 'email'
  ) THEN
    ALTER TABLE tenant_insights ADD COLUMN email text;
  END IF;

  -- Add phone_number column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tenant_insights' AND column_name = 'phone_number'
  ) THEN
    ALTER TABLE tenant_insights ADD COLUMN phone_number text;
  END IF;
END $$;