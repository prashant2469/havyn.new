/*
  # Check and fix tenant names in database

  1. Changes
    - Check current names in both tenant_insights and tenants tables
    - Update existing tenant records to match insights data
    - Insert missing tenants only if they have email addresses
    - Handle null email constraint properly

  2. Notes
    - Only creates tenant records for insights with valid email addresses
    - Updates existing records to match insights data exactly
    - Uses safe migration pattern with proper null checks
*/

-- First, let's see what names we have in tenant_insights
DO $$
DECLARE
  insight_record RECORD;
  tenant_record RECORD;
BEGIN
  RAISE NOTICE 'Current tenant names in tenant_insights:';
  FOR insight_record IN 
    SELECT DISTINCT tenant_name, property, unit, "Emails", "Phone Number"
    FROM tenant_insights 
    WHERE tenant_name IS NOT NULL AND tenant_name != ''
    ORDER BY tenant_name
  LOOP
    RAISE NOTICE 'Insight: % (Property: %, Unit: %, Email: %, Phone: %)', 
      insight_record.tenant_name, 
      insight_record.property, 
      insight_record.unit,
      COALESCE(insight_record."Emails", 'No email'),
      COALESCE(insight_record."Phone Number", 'No phone');
  END LOOP;

  RAISE NOTICE '';
  RAISE NOTICE 'Current tenant names in tenants table:';
  FOR tenant_record IN 
    SELECT name, email, phone
    FROM tenants 
    ORDER BY name
  LOOP
    RAISE NOTICE 'Tenant: % (Email: %, Phone: %)', 
      tenant_record.name, 
      tenant_record.email, 
      COALESCE(tenant_record.phone, 'No phone');
  END LOOP;
END $$;

-- Update tenant records to match the insights data exactly
-- For Keren Ramos
UPDATE tenants 
SET 
  name = 'Keren Ramos',
  phone = COALESCE(phone, '(980) 225-2475')
WHERE name ILIKE '%keren%' OR email = 'kerenramos547@gmail.com';

-- For Enrique Sanchez Zepeda  
UPDATE tenants 
SET 
  name = 'Enrique Sanchez Zepeda',
  phone = COALESCE(phone, '(980) 777-2248')
WHERE name ILIKE '%enrique%' OR email = 'armando_salinas32@hotmail.com';

-- Insert any missing tenants from tenant_insights, but only if they have email addresses
INSERT INTO tenants (name, email, phone, password_hash)
SELECT DISTINCT 
  ti.tenant_name,
  ti."Emails",
  ti."Phone Number",
  'tenant123' -- Default password for demo
FROM tenant_insights ti
LEFT JOIN tenants t ON LOWER(TRIM(t.name)) = LOWER(TRIM(ti.tenant_name))
WHERE t.id IS NULL
  AND ti.tenant_name IS NOT NULL 
  AND ti.tenant_name != ''
  AND ti."Emails" IS NOT NULL
  AND ti."Emails" != ''
  AND ti."Emails" ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' -- Valid email format
ON CONFLICT (email) DO UPDATE SET
  name = EXCLUDED.name,
  phone = EXCLUDED.phone;

-- Show final results
DO $$
DECLARE
  tenant_record RECORD;
  insight_without_email RECORD;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE 'Final tenant records:';
  FOR tenant_record IN 
    SELECT name, email, phone
    FROM tenants 
    ORDER BY name
  LOOP
    RAISE NOTICE 'Tenant: % (Email: %, Phone: %)', 
      tenant_record.name, 
      tenant_record.email, 
      COALESCE(tenant_record.phone, 'No phone');
  END LOOP;

  RAISE NOTICE '';
  RAISE NOTICE 'Tenant insights without valid emails (not added to tenants table):';
  FOR insight_without_email IN 
    SELECT DISTINCT tenant_name, property, unit, "Emails"
    FROM tenant_insights ti
    LEFT JOIN tenants t ON LOWER(TRIM(t.name)) = LOWER(TRIM(ti.tenant_name))
    WHERE t.id IS NULL
      AND ti.tenant_name IS NOT NULL 
      AND ti.tenant_name != ''
      AND (ti."Emails" IS NULL OR ti."Emails" = '' OR ti."Emails" !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
    ORDER BY tenant_name
  LOOP
    RAISE NOTICE 'Insight without email: % (Property: %, Unit: %, Email: %)', 
      insight_without_email.tenant_name, 
      insight_without_email.property, 
      insight_without_email.unit,
      COALESCE(insight_without_email."Emails", 'No email');
  END LOOP;
END $$;