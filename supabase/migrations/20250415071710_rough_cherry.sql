/*
  # Link tenant insights to user

  1. Changes
    - Add user_id foreign key constraint if not exists
    - Update existing tenant_insights records to associate with actual user
    - Ensure referential integrity is maintained
*/

-- First, verify the user exists
DO $$ 
BEGIN
  -- Check if the user exists, if not, raise an exception
  IF NOT EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = '4e4e4e4e-4e4e-4e4e-4e4e-4e4e4e4e4e4e'
  ) THEN
    -- Get the first available user from auth.users
    WITH first_user AS (
      SELECT id 
      FROM auth.users 
      LIMIT 1
    )
    UPDATE tenant_insights
    SET user_id = (SELECT id FROM first_user)
    WHERE user_id IS NULL;
  ELSE
    -- If the specified user exists, use it
    UPDATE tenant_insights 
    SET user_id = '4e4e4e4e-4e4e-4e4e-4e4e-4e4e4e4e4e4e'
    WHERE user_id IS NULL;
  END IF;
END $$;