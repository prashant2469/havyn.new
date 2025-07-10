/*
  # Add coordinates to location insights

  1. Changes
    - Add latitude and longitude columns to location_insights table
    - Both columns are required (NOT NULL) to ensure valid coordinates
    - Using numeric(10,6) for precise coordinate storage
      - Allows 6 decimal places which is sufficient for GPS coordinates
      - Total 10 digits allows for full range of valid coordinates

  2. Notes
    - Latitude range: -90 to 90
    - Longitude range: -180 to 180
    - Using CHECK constraints to ensure valid coordinate ranges
*/

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'location_insights' 
    AND column_name = 'latitude'
  ) THEN
    ALTER TABLE location_insights 
    ADD COLUMN latitude numeric(10,6) NOT NULL,
    ADD COLUMN longitude numeric(10,6) NOT NULL,
    ADD CONSTRAINT valid_latitude CHECK (latitude >= -90 AND latitude <= 90),
    ADD CONSTRAINT valid_longitude CHECK (longitude >= -180 AND longitude <= 180);
  END IF;
END $$;