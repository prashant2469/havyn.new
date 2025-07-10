/*
  # Add changes column to tenant_insights table

  1. Changes
    - Add `changes` column to `tenant_insights` table
      - Type: JSONB (to store nested changes object)
      - Nullable: Yes (not all insights will have changes)
      - Purpose: Store historical changes in tenant metrics

  2. Schema Update Details
    - Uses DO block to safely add column if it doesn't exist
    - JSONB type allows storing complex nested JSON objects
    - Column is nullable to maintain compatibility with existing data
*/

DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'tenant_insights' 
    AND column_name = 'changes'
  ) THEN 
    ALTER TABLE tenant_insights 
    ADD COLUMN changes JSONB;
  END IF;
END $$;