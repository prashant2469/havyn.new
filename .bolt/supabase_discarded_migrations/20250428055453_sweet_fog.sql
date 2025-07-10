/*
  # Add coordinates to location_insights table

  1. Changes
    - Add `latitude` column (numeric) to `location_insights` table
    - Add `longitude` column (numeric) to `location_insights` table
    
  2. Notes
    - Using numeric type for precise coordinate storage
    - Columns are nullable since some locations might not have coordinates yet
*/

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'location_insights' AND column_name = 'latitude'
  ) THEN
    ALTER TABLE location_insights ADD COLUMN latitude numeric;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'location_insights' AND column_name = 'longitude'
  ) THEN
    ALTER TABLE location_insights ADD COLUMN longitude numeric;
  END IF;
END $$;