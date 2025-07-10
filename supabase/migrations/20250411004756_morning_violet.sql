/*
  # Update tenant insights columns

  1. Changes
    - Make `unit` column non-nullable
    - Make `reasoning_summary` column non-nullable
    - Add default values to ensure existing records remain valid

  2. Notes
    - Uses safe migration pattern with default values
    - Ensures data integrity for existing and new records
*/

-- First, set default values for any NULL entries
UPDATE tenant_insights 
SET unit = 'Unknown'
WHERE unit IS NULL;

UPDATE tenant_insights 
SET reasoning_summary = 'No reasoning provided'
WHERE reasoning_summary IS NULL;

-- Then make the columns non-nullable
ALTER TABLE tenant_insights 
  ALTER COLUMN unit SET NOT NULL,
  ALTER COLUMN reasoning_summary SET NOT NULL;