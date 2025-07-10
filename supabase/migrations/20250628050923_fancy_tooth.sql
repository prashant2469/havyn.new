/*
  # Check tenant names in tenant_insights table

  1. Purpose
    - Display all tenant names currently in the tenant_insights table
    - Help debug the name verification process

  2. Output
    - List all distinct tenant names
    - Show associated property and unit information
*/

DO $$
DECLARE
  insight_record RECORD;
BEGIN
  RAISE NOTICE 'All tenant names in tenant_insights table:';
  RAISE NOTICE '================================================';
  
  FOR insight_record IN 
    SELECT DISTINCT tenant_name, property, unit, "Emails", "Phone Number"
    FROM tenant_insights 
    WHERE tenant_name IS NOT NULL AND tenant_name != ''
    ORDER BY tenant_name
  LOOP
    RAISE NOTICE 'Name: "%"', insight_record.tenant_name;
    RAISE NOTICE '  Property: %', insight_record.property;
    RAISE NOTICE '  Unit: %', insight_record.unit;
    RAISE NOTICE '  Email: %', COALESCE(insight_record."Emails", 'No email');
    RAISE NOTICE '  Phone: %', COALESCE(insight_record."Phone Number", 'No phone');
    RAISE NOTICE '  Normalized: "%"', LOWER(TRIM(REPLACE(REPLACE(insight_record.tenant_name, '.', ''), ',', '')));
    RAISE NOTICE '  --------';
  END LOOP;

  RAISE NOTICE '';
  RAISE NOTICE 'Total tenant records in tenant_insights: %', (SELECT COUNT(DISTINCT tenant_name) FROM tenant_insights WHERE tenant_name IS NOT NULL AND tenant_name != '');
END $$;