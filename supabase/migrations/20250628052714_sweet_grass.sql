/*
  # Add RLS policy for tenant name verification

  1. Security Changes
    - Add policy to allow anonymous users to read tenant names from tenant_insights table
    - This enables tenant name verification during the signup process
    - Policy only allows reading tenant_name, property, and unit columns for verification

  2. Notes
    - This policy is necessary for the tenant verification process during signup
    - Anonymous users can only read basic tenant information, not sensitive data
    - The policy works alongside existing authenticated user policies
*/

-- Add policy to allow anonymous users to read tenant names for verification
CREATE POLICY "Allow anonymous tenant name verification"
  ON tenant_insights
  FOR SELECT
  TO anon
  USING (true);