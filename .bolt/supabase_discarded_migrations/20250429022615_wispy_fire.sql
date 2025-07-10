/*
  # Add news summary and property listing columns

  1. Changes
    - Add recent_news_summary column for property news
    - Add property_listing_link column for external listings
    - Both columns are nullable since this data may not always be available

  2. Notes
    - Uses safe migration pattern with existence checks
    - Maintains data integrity
*/

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'location_insights' AND column_name = 'recent_news_summary'
  ) THEN
    ALTER TABLE location_insights ADD COLUMN recent_news_summary text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'location_insights' AND column_name = 'property_listing_link'
  ) THEN
    ALTER TABLE location_insights ADD COLUMN property_listing_link text;
  END IF;
END $$;