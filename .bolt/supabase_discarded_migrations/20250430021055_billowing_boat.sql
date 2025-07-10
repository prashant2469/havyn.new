/*
  # Add contact information columns to tenant insights

  1. Changes
    - Add `phone_numbers` column to store tenant phone numbers
    - Add `emails` column to store tenant email addresses

  2. Notes
    - Both columns are nullable since contact info might not always be available
    - Using text type to allow multiple numbers/emails in comma-separated format
*/

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tenant_insights' AND column_name = 'phone_numbers'
  ) THEN
    ALTER TABLE tenant_insights ADD COLUMN phone_numbers text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tenant_insights' AND column_name = 'emails'
  ) THEN
    ALTER TABLE tenant_insights ADD COLUMN emails text;
  END IF;
END $$;