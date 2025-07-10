/*
  # Debug tenant names in tenant_insights table

  1. Purpose
    - Show all tenant names in tenant_insights table
    - Show normalized versions for comparison
    - Help debug name verification issues

  2. Output
    - Lists all unique tenant names
    - Shows normalized versions
    - Provides count of total records
*/

DO $$
DECLARE
  insight_record RECORD;
BEGIN
  RAISE NOTICE '=== TENANT NAMES IN TENANT_INSIGHTS TABLE ===';
  RAISE NOTICE '';
  
  FOR insight_record IN 
    SELECT DISTINCT tenant_name, property, unit, "Emails", "Phone Number"
    FROM tenant_insights 
    WHERE tenant_name IS NOT NULL AND tenant_name != ''
    ORDER BY tenant_name
  LOOP
    RAISE NOTICE 'EXACT NAME: "%"', insight_record.tenant_name;
    RAISE NOTICE '  Property: %', insight_record.property;
    RAISE NOTICE '  Unit: %', insight_record.unit;
    RAISE NOTICE '  Email: %', COALESCE(insight_record."Emails", 'No email');
    RAISE NOTICE '  Phone: %', COALESCE(insight_record."Phone Number", 'No phone');
    RAISE NOTICE '  Normalized: "%"', LOWER(TRIM(REPLACE(REPLACE(insight_record.tenant_name, '.', ''), ',', '')));
    RAISE NOTICE '';
  END LOOP;

  RAISE NOTICE 'TOTAL UNIQUE TENANT NAMES: %', (SELECT COUNT(DISTINCT tenant_name) FROM tenant_insights WHERE tenant_name IS NOT NULL AND tenant_name != '');
  RAISE NOTICE '';
  RAISE NOTICE 'To verify a tenant, enter their name EXACTLY as shown above.';
  RAISE NOTICE 'The system will normalize spaces and punctuation for matching.';
END $$;