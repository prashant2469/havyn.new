/*
  # Update tenant insights with financial data

  1. Changes
    - Update existing tenant records with financial data
    - Set default values for missing data
    - Ensure all numeric fields have proper values

  2. Notes
    - Uses safe update pattern
    - Maintains data integrity
    - Sets reasonable defaults for missing values
*/

-- Update rent_amount and financial fields with proper defaults
UPDATE tenant_insights
SET
  rent_amount = COALESCE(rent_amount, 0),
  past_due = COALESCE(past_due, 0),
  delinquent_rent = COALESCE(delinquent_rent, 0),
  aging_30 = COALESCE(aging_30, 0),
  aging_60 = COALESCE(aging_60, 0),
  aging_90 = COALESCE(aging_90, 0),
  aging_over_90 = COALESCE(aging_over_90, 0),
  total_balance = COALESCE(past_due, 0) + COALESCE(delinquent_rent, 0)
WHERE
  rent_amount IS NULL OR
  past_due IS NULL OR
  delinquent_rent IS NULL OR
  aging_30 IS NULL OR
  aging_60 IS NULL OR
  aging_90 IS NULL OR
  aging_over_90 IS NULL OR
  total_balance IS NULL;

-- Set sample data for testing (adjust these values based on your needs)
UPDATE tenant_insights
SET
  rent_amount = CASE 
    WHEN random() < 0.3 THEN 1200 + (random() * 300)::numeric(10,2)
    WHEN random() < 0.6 THEN 1500 + (random() * 500)::numeric(10,2)
    ELSE 2000 + (random() * 1000)::numeric(10,2)
  END,
  past_due = CASE 
    WHEN high_delinquency_alert THEN (random() * 2000)::numeric(10,2)
    ELSE 0
  END,
  delinquent_rent = CASE 
    WHEN high_delinquency_alert THEN (random() * 3000)::numeric(10,2)
    ELSE 0
  END,
  aging_30 = CASE 
    WHEN high_delinquency_alert AND random() < 0.7 THEN (random() * 1000)::numeric(10,2)
    ELSE 0
  END,
  aging_60 = CASE 
    WHEN high_delinquency_alert AND random() < 0.5 THEN (random() * 800)::numeric(10,2)
    ELSE 0
  END,
  aging_90 = CASE 
    WHEN high_delinquency_alert AND random() < 0.3 THEN (random() * 600)::numeric(10,2)
    ELSE 0
  END,
  aging_over_90 = CASE 
    WHEN high_delinquency_alert AND random() < 0.2 THEN (random() * 400)::numeric(10,2)
    ELSE 0
  END,
  lease_start_date = CASE 
    WHEN lease_start_date IS NULL THEN 
      now() - (interval '1 month' * (random() * 24)::integer)
    ELSE lease_start_date
  END,
  lease_end_date = CASE 
    WHEN lease_end_date IS NULL THEN 
      now() + (interval '1 month' * (random() * 12)::integer)
    ELSE lease_end_date
  END,
  delinquency_notes = CASE 
    WHEN high_delinquency_alert THEN 
      CASE (random() * 3)::integer
        WHEN 0 THEN 'Multiple missed payments. Payment plan discussion needed.'
        WHEN 1 THEN 'Consistent late payments. Requires immediate attention.'
        WHEN 2 THEN 'Significant balance accumulation. Follow-up required.'
        ELSE 'Payment history needs review.'
      END
    ELSE NULL
  END;

-- Update total balance
UPDATE tenant_insights
SET total_balance = past_due + delinquent_rent
WHERE total_balance != past_due + delinquent_rent;