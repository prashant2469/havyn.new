/*
  # Add coordinates to location insights

  1. Changes
    - Add latitude and longitude columns to location_insights table
    - Clear existing data
    - Make coordinates required for new entries

  2. Notes
    - Uses numeric type for precise coordinate storage
    - Adds constraint to ensure valid coordinate ranges
*/

-- First, clear existing data
DELETE FROM location_insights;

-- Add coordinate columns
ALTER TABLE location_insights
  ADD COLUMN latitude numeric(10,6) NOT NULL DEFAULT 35.7596,
  ADD COLUMN longitude numeric(10,6) NOT NULL DEFAULT -79.0193;

-- Add check constraints for valid coordinates
ALTER TABLE location_insights
  ADD CONSTRAINT valid_latitude CHECK (latitude BETWEEN -90 AND 90),
  ADD CONSTRAINT valid_longitude CHECK (longitude BETWEEN -180 AND 180);