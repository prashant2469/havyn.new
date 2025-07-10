/*
  # Add unit and reasoning_summary columns to tenant_insights

  1. Changes
    - Add `unit` column to store the unit number
    - Add `reasoning_summary` column to store the AI's reasoning for the tenant's score

  2. Notes
    - Both columns are nullable to maintain compatibility with existing data
*/

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tenant_insights' AND column_name = 'unit'
  ) THEN
    ALTER TABLE tenant_insights ADD COLUMN unit text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tenant_insights' AND column_name = 'reasoning_summary'
  ) THEN
    ALTER TABLE tenant_insights ADD COLUMN reasoning_summary text;
  END IF;
END $$;