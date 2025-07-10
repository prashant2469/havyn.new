/*
  # Clear all tenant data

  1. Changes
    - Delete all rows from tenant_insights table
    - Delete all rows from insight_reports table
    - Reset sequences if any exist

  2. Notes
    - This is a one-time cleanup operation
    - All insights will need to be regenerated
*/

-- Delete all rows from tenant_insights first (due to foreign key constraints)
DELETE FROM tenant_insights;

-- Then delete all rows from insight_reports
DELETE FROM insight_reports;