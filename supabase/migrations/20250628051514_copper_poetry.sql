/*
  # Show all tenant records for debugging

  1. Purpose
    - Display all tenant names in tenant_insights table
    - Show the exact format and content
    - Help debug verification issues

  2. Output
    - Lists all tenant names exactly as stored
    - Shows associated property and unit information
    - Displays contact information if available
*/

DO $$
DECLARE
  insight_record RECORD;
  tenant_record RECORD;
  total_insights INTEGER;
  total_tenants INTEGER;
BEGIN
  -- Get counts first
  SELECT COUNT(DISTINCT tenant_name) INTO total_insights 
  FROM tenant_insights 
  WHERE tenant_name IS NOT NULL AND tenant_name != '';
  
  SELECT COUNT(*) INTO total_tenants FROM tenants;

  RAISE NOTICE '=== DEBUGGING TENANT VERIFICATION ===';
  RAISE NOTICE '';
  RAISE NOTICE 'TENANT_INSIGHTS TABLE RECORDS:';
  RAISE NOTICE 'Total unique tenant names: %', total_insights;
  RAISE NOTICE '';

  -- Show all tenant names from tenant_insights
  FOR insight_record IN 
    SELECT DISTINCT 
      tenant_name, 
      property, 
      unit, 
      "Emails", 
      "Phone Number",
      COUNT(*) OVER (PARTITION BY tenant_name) as record_count
    FROM tenant_insights 
    WHERE tenant_name IS NOT NULL AND tenant_name != ''
    ORDER BY tenant_name
  LOOP
    RAISE NOTICE '>>> TENANT NAME: "%"', insight_record.tenant_name;
    RAISE NOTICE '    Property: %', insight_record.property;
    RAISE NOTICE '    Unit: %', insight_record.unit;
    RAISE NOTICE '    Email: %', COALESCE(insight_record."Emails", 'None');
    RAISE NOTICE '    Phone: %', COALESCE(insight_record."Phone Number", 'None');
    RAISE NOTICE '    Records: % insight(s)', insight_record.record_count;
    RAISE NOTICE '    Length: % characters', LENGTH(insight_record.tenant_name);
    RAISE NOTICE '    Normalized: "%"', LOWER(TRIM(REPLACE(REPLACE(insight_record.tenant_name, '.', ''), ',', '')));
    RAISE NOTICE '';
  END LOOP;

  RAISE NOTICE '=== TENANTS TABLE RECORDS ===';
  RAISE NOTICE 'Total tenant records: %', total_tenants;
  RAISE NOTICE '';

  -- Show all tenant names from tenants table
  FOR tenant_record IN 
    SELECT name, email, phone
    FROM tenants 
    ORDER BY name
  LOOP
    RAISE NOTICE '>>> TENANT: "%"', tenant_record.name;
    RAISE NOTICE '    Email: %', COALESCE(tenant_record.email, 'None');
    RAISE NOTICE '    Phone: %', COALESCE(tenant_record.phone, 'None');
    RAISE NOTICE '    Length: % characters', LENGTH(tenant_record.name);
    RAISE NOTICE '    Normalized: "%"', LOWER(TRIM(REPLACE(REPLACE(tenant_record.name, '.', ''), ',', '')));
    RAISE NOTICE '';
  END LOOP;

  RAISE NOTICE '=== VERIFICATION INSTRUCTIONS ===';
  RAISE NOTICE 'To test verification, try entering one of these EXACT names:';
  
  FOR insight_record IN 
    SELECT DISTINCT tenant_name
    FROM tenant_insights 
    WHERE tenant_name IS NOT NULL AND tenant_name != ''
    ORDER BY tenant_name
    LIMIT 5
  LOOP
    RAISE NOTICE '  - "%"', insight_record.tenant_name;
  END LOOP;

END $$;