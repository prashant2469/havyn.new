/*
  # Add financial data to tenant insights

  1. Changes
    - Add rent amount and payment tracking fields
    - Add aging buckets for past due amounts
    - Add lease date tracking
    - Add delinquency tracking fields

  2. Notes
    - All monetary fields use numeric type for precise calculations
    - Default values prevent null entries
    - Timestamps for lease dates
*/

DO $$ 
BEGIN
  -- Add rent amount fields
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tenant_insights' AND column_name = 'rent_amount'
  ) THEN
    ALTER TABLE tenant_insights ADD COLUMN rent_amount numeric(10,2) NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tenant_insights' AND column_name = 'past_due'
  ) THEN
    ALTER TABLE tenant_insights ADD COLUMN past_due numeric(10,2) NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tenant_insights' AND column_name = 'delinquent_rent'
  ) THEN
    ALTER TABLE tenant_insights ADD COLUMN delinquent_rent numeric(10,2) NOT NULL DEFAULT 0;
  END IF;

  -- Add aging buckets
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tenant_insights' AND column_name = 'aging_30'
  ) THEN
    ALTER TABLE tenant_insights ADD COLUMN aging_30 numeric(10,2) NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tenant_insights' AND column_name = 'aging_60'
  ) THEN
    ALTER TABLE tenant_insights ADD COLUMN aging_60 numeric(10,2) NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tenant_insights' AND column_name = 'aging_90'
  ) THEN
    ALTER TABLE tenant_insights ADD COLUMN aging_90 numeric(10,2) NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tenant_insights' AND column_name = 'aging_over_90'
  ) THEN
    ALTER TABLE tenant_insights ADD COLUMN aging_over_90 numeric(10,2) NOT NULL DEFAULT 0;
  END IF;

  -- Add lease dates
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tenant_insights' AND column_name = 'lease_start_date'
  ) THEN
    ALTER TABLE tenant_insights ADD COLUMN lease_start_date timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tenant_insights' AND column_name = 'lease_end_date'
  ) THEN
    ALTER TABLE tenant_insights ADD COLUMN lease_end_date timestamptz;
  END IF;

  -- Add delinquency tracking
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tenant_insights' AND column_name = 'total_balance'
  ) THEN
    ALTER TABLE tenant_insights ADD COLUMN total_balance numeric(10,2) NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tenant_insights' AND column_name = 'delinquency_notes'
  ) THEN
    ALTER TABLE tenant_insights ADD COLUMN delinquency_notes text;
  END IF;
END $$;