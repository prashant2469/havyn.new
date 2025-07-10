-- Create tenant record for Enrique Sanchez Zepeda
INSERT INTO tenants (email, password_hash, name, phone) 
VALUES ('armando_salinas32@hotmail.com', 'dummy_hash', 'Enrique Sanchez Zepeda', '(980) 777-2248')
ON CONFLICT (email) DO UPDATE SET 
  name = EXCLUDED.name,
  phone = EXCLUDED.phone;

-- Get the tenant ID and create property record
DO $$
DECLARE
  tenant_uuid uuid;
BEGIN
  -- Get the tenant ID
  SELECT id INTO tenant_uuid FROM tenants WHERE email = 'armando_salinas32@hotmail.com';
  
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
    'Freedom St Apartments - 357 Freedom St SW Concord, NC 28025',
    '3D',
    950.00,
    '2024-02-01'::timestamptz,
    '2025-01-31'::timestamptz,
    '2025-02-01'::timestamptz, -- Set next month as due date
    0.00, -- No balance due according to insights
    false -- Not delinquent since balance is 0
  );
END $$;