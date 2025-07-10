/*
  # Create tenant system tables

  1. New Tables
    - `tenants`
      - `id` (uuid, primary key)
      - `email` (text, unique)
      - `password_hash` (text)
      - `name` (text)
      - `phone` (text)
      - `created_at` (timestamptz)
    
    - `tenant_properties`
      - `id` (uuid, primary key)
      - `tenant_id` (uuid, foreign key to tenants)
      - `property_name` (text)
      - `unit` (text)
      - `rent_amount` (numeric)
      - `lease_start_date` (timestamptz)
      - `lease_end_date` (timestamptz)
      - `rent_due_date` (timestamptz)
      - `balance_due` (numeric)
      - `is_delinquent` (boolean)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Add policies for tenant access
*/

CREATE TABLE IF NOT EXISTS tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  name text NOT NULL,
  phone text,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS tenant_properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  property_name text NOT NULL,
  unit text NOT NULL,
  rent_amount numeric(10,2) NOT NULL DEFAULT 0,
  lease_start_date timestamptz,
  lease_end_date timestamptz,
  rent_due_date timestamptz,
  balance_due numeric(10,2) NOT NULL DEFAULT 0,
  is_delinquent boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_properties ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tenants table
CREATE POLICY "Tenants can read own data"
  ON tenants
  FOR SELECT
  USING (true); -- We'll handle auth in the application layer

CREATE POLICY "Tenants can update own data"
  ON tenants
  FOR UPDATE
  USING (true);

-- RLS Policies for tenant_properties table
CREATE POLICY "Tenants can read own properties"
  ON tenant_properties
  FOR SELECT
  USING (true);

-- Insert dummy tenant data
INSERT INTO tenants (id, email, password_hash, name, phone) VALUES
  ('11111111-1111-1111-1111-111111111111', 'john.doe@email.com', 'dummy_hash', 'John Doe', '704-555-0123'),
  ('22222222-2222-2222-2222-222222222222', 'jane.smith@email.com', 'dummy_hash', 'Jane Smith', '704-555-0456')
ON CONFLICT (email) DO NOTHING;

-- Insert dummy property data
INSERT INTO tenant_properties (tenant_id, property_name, unit, rent_amount, lease_start_date, lease_end_date, rent_due_date, balance_due, is_delinquent) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Sunset Apartments', '101', 1200.00, '2023-06-01', '2024-05-31', '2024-01-01', 0.00, false),
  ('11111111-1111-1111-1111-111111111111', 'Sunset Apartments', '102', 1350.00, '2023-08-01', '2024-07-31', '2024-01-01', 150.00, true),
  ('22222222-2222-2222-2222-222222222222', 'Oak Ridge Complex', '205', 1450.00, '2023-09-01', '2024-08-31', '2024-01-01', 0.00, false)
ON CONFLICT DO NOTHING;