/*
  # Fix tenant data and relationships

  1. Updates
    - Update tenant record for kerenramos547@gmail.com with correct name
    - Create/update tenant properties based on tenant insights data
    - Ensure proper relationships between tables

  2. Data fixes
    - Match tenant name in tenants table with tenant_insights
    - Create property records with correct financial data
    - Set proper lease dates and balances
*/

-- Update the tenant record to match the insights data
UPDATE tenants 
SET name = 'Keren Ramos'
WHERE email = 'kerenramos547@gmail.com';

-- If the tenant doesn't exist, create it
INSERT INTO tenants (email, password_hash, name, phone) 
VALUES ('kerenramos547@gmail.com', 'dummy_hash', 'Keren Ramos', '(980) 225-2475')
ON CONFLICT (email) DO UPDATE SET 
  name = EXCLUDED.name,
  phone = EXCLUDED.phone;

-- Get the tenant ID for the property insert
DO $$
DECLARE
  tenant_uuid uuid;
BEGIN
  -- Get the tenant ID
  SELECT id INTO tenant_uuid FROM tenants WHERE email = 'kerenramos547@gmail.com';
  
  -- Delete any existing properties for this tenant to avoid duplicates
  DELETE FROM tenant_properties WHERE tenant_id = tenant_uuid;
  
  -- Insert the property based on tenant insights data
  INSERT INTO tenant_properties (
    tenant_id,
    property_name,
    unit,
    rent_amount,
    lease_start_date,
    lease_end_date,
    rent_due_date,
    balance_due,
    is_delinquent
  ) VALUES (
    tenant_uuid,
    'Marble St Apartments - 1118 Marble St Charlotte, NC 28208',
    '1110 Marble St. Apt # F',
    1300.00,
    '2024-05-01'::timestamptz,
    '2026-04-30'::timestamptz,
    '2025-02-01'::timestamptz, -- Set next month as due date
    518.88, -- Total balance from insights
    true -- Is delinquent since there's a balance
  );
END $$;