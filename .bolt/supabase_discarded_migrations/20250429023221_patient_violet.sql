/*
  # Remove property listing link column

  1. Changes
    - Remove property_listing_link column from location_insights table
    - Keep recent_news_summary column

  2. Notes
    - Uses safe migration pattern
    - Maintains data integrity
*/

ALTER TABLE location_insights DROP COLUMN IF EXISTS property_listing_link;