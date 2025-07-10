/*
  # Clear tenant insights table

  1. Changes
    - Remove all existing rows from tenant_insights table
    - Keep table structure and constraints intact

  2. Notes
    - This is a one-time cleanup operation
    - All insights will need to be regenerated
*/

DELETE FROM tenant_insights;