/*
  # Create location insights table

  1. New Tables
    - `location_insights`
      - `id` (uuid, primary key)
      - `property` (text)
      - `user_id` (uuid, foreign key to auth.users)
      - `rental_market_strength_score` (integer)
      - `vacancy_rate` (text)
      - `rent_trend` (text)
      - `new_construction_supply` (text)
      - `competitor_summary` (text)
      - `overall_market_summary` (text)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on `location_insights` table
    - Add policy for authenticated users to read their own data
    - Add policy for authenticated users to insert their own data
*/

CREATE TABLE IF NOT EXISTS location_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property text NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  rental_market_strength_score integer NOT NULL,
  vacancy_rate text NOT NULL,
  rent_trend text NOT NULL,
  new_construction_supply text NOT NULL,
  competitor_summary text,
  overall_market_summary text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(property, user_id)
);

ALTER TABLE location_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own location insights"
  ON location_insights
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own location insights"
  ON location_insights
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);