/*
  # Clear location insights table

  1. Changes
    - Delete all rows from location_insights table
    - Keep table structure and constraints intact

  2. Notes
    - This is a one-time cleanup operation
    - All insights will need to be regenerated
*/

DELETE FROM location_insights;