/*
  # Add latitude and longitude to location_insights

  1. Changes
    - Add latitude column (numeric)
    - Add longitude column (numeric)
    - Add recent_news_summary column (text, nullable)

  2. Notes
    - Coordinates are nullable to maintain compatibility
    - Uses safe migration pattern with existence checks
*/

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'location_insights' AND column_name = 'longitude'
  ) THEN
    ALTER TABLE location_insights ADD COLUMN longitude numeric;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'location_insights' AND column_name = 'latitude'
  ) THEN
    ALTER TABLE location_insights ADD COLUMN latitude numeric;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'location_insights' AND column_name = 'recent_news_summary'
  ) THEN
    ALTER TABLE location_insights ADD COLUMN recent_news_summary text;
  END IF;
END $$;