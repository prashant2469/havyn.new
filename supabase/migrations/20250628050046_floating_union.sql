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
      COALESCE(tenant_record.email, 'No email'), 
      COALESCE(tenant_record.phone, 'No phone');
  END LOOP;
END $$;

-- Make email nullable temporarily to allow tenant creation without email
ALTER TABLE tenants ALTER COLUMN email DROP NOT NULL;

-- Update existing tenant records to match the insights data
UPDATE tenants 
SET 
  name = 'Keren Ramos',
  phone = COALESCE(tenants.phone, '(980) 225-2475')
WHERE name ILIKE '%keren%' OR email = 'kerenramos547@gmail.com';

UPDATE tenants 
SET 
  name = 'Enrique Sanchez Zepeda',
  phone = COALESCE(tenants.phone, '(980) 777-2248')
WHERE name ILIKE '%enrique%' OR email = 'armando_salinas32@hotmail.com';

-- Insert all tenant names from tenant_insights that don't exist in tenants table
-- Use a temporary email that will be updated when they sign up
INSERT INTO tenants (name, email, phone, password_hash)
SELECT DISTINCT 
  ti.tenant_name,
  NULL, -- No email initially - they'll provide one during signup
  ti."Phone Number",
  'tenant123' -- Default password for demo
FROM tenant_insights ti
LEFT JOIN tenants t ON LOWER(TRIM(REPLACE(REPLACE(t.name, '.', ''), ',', ''))) = LOWER(TRIM(REPLACE(REPLACE(ti.tenant_name, '.', ''), ',', '')))
WHERE t.id IS NULL
  AND ti.tenant_name IS NOT NULL 
  AND ti.tenant_name != ''
ON CONFLICT DO NOTHING;

-- Update any tenants that have emails in insights but not in tenants table
UPDATE tenants 
SET 
  email = COALESCE(tenants.email, subquery.insight_email),
  phone = COALESCE(tenants.phone, subquery.insight_phone)
FROM (
  SELECT DISTINCT 
    ti.tenant_name,
    ti."Emails" as insight_email,
    ti."Phone Number" as insight_phone
  FROM tenant_insights ti
  WHERE ti."Emails" IS NOT NULL 
    AND ti."Emails" != ''
    AND ti."Emails" ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
) subquery
WHERE LOWER(TRIM(REPLACE(REPLACE(tenants.name, '.', ''), ',', ''))) = LOWER(TRIM(REPLACE(REPLACE(subquery.tenant_name, '.', ''), ',', '')))
  AND tenants.email IS NULL;

-- Show final results
DO $$
DECLARE
  tenant_record RECORD;
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
      COALESCE(tenant_record.email, 'No email - can sign up'), 
      COALESCE(tenant_record.phone, 'No phone');
  END LOOP;

  RAISE NOTICE '';
  RAISE NOTICE 'Total tenants in database: %', (SELECT COUNT(*) FROM tenants);
  RAISE NOTICE 'Tenants without email (can create accounts): %', (SELECT COUNT(*) FROM tenants WHERE email IS NULL);
  RAISE NOTICE 'Tenants with email: %', (SELECT COUNT(*) FROM tenants WHERE email IS NOT NULL);
END $$;