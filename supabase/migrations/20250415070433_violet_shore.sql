/*
  # Add user_id to tenant_insights table

  1. Changes
    - Add user_id column to tenant_insights table
    - Add foreign key constraint to auth.users
    - Update RLS policies to restrict access by user_id

  2. Security
    - Enable RLS
    - Add policy for users to only see their own insights
*/

-- Add user_id column
ALTER TABLE tenant_insights ADD COLUMN user_id UUID REFERENCES auth.users(id);

-- Drop existing RLS policy
DROP POLICY IF EXISTS "Allow authenticated users to read all insights" ON tenant_insights;

-- Create new RLS policy for user-specific access
CREATE POLICY "Users can only access their own insights"
  ON tenant_insights
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);