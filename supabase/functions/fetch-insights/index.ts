import { createClient } from 'npm:@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': '*',
  'Content-Type': 'application/json'
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }

  try {
    console.log('Fetching saved insights from database...');

    // Validate environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing required environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data, error: fetchError } = await supabase
      .from('tenant_insights')
      .select('*')
      .order('created_at', { ascending: false });

    if (fetchError) {
      console.error('Error fetching insights:', fetchError);
      throw fetchError;
    }

    console.log(`Successfully fetched ${data?.length || 0} insights`);

    if (!data || data.length === 0) {
      console.log('No insights found in database');
      return new Response(
        JSON.stringify([]), // Return empty array instead of error message
        { headers: corsHeaders }
      );
    }

    return new Response(
      JSON.stringify(data),
      { headers: corsHeaders }
    );

  } catch (error) {
    console.error('Error in fetch-insights function:', error);
    
    return new Response(
      JSON.stringify({
        error: 'Failed to fetch insights',
        details: error.message
      }),
      { 
        status: 500,
        headers: corsHeaders
      }
    );
  }
});