import { createClient } from 'npm:@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const API_BASE_URL = 'https://api.openai.com/v1/chat/completions';

// -------- FIX: get OpenAI API key, not Supabase anon key --------
const openaiKey = Deno.env.get('OPENAI_API_KEY');
if (!openaiKey) {
  throw new Error('OPENAI_API_KEY environment variable is required');
}
// ---------------------------------------------------------------

interface TenantInsight {
  // ... (unchanged interface)
}

// ... compareInsights, findPreviousInsight, updateInsightWithHistory (unchanged) ...

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('=== GENERATE INSIGHTS FUNCTION START ===');
    console.log('Request method:', req.method);
    console.log('Request URL:', req.url);
    
    const url = new URL(req.url);
    const jobId = url.searchParams.get('job_id');
    console.log('Job ID from query params:', jobId);
    
    // Handle GET request for polling results
    if (req.method === 'GET' && jobId) {
      console.log('=== HANDLING GET REQUEST FOR POLLING ===');
      console.log('Polling for job ID:', jobId);

      // FIX: Use OpenAI key, not Supabase key
      const apiHeaders = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiKey}`
      };

      console.log('Making GET request to external API...');
      const getRes = await fetch(
        `${API_BASE_URL}?job_id=${encodeURIComponent(jobId)}`,
        {
          method: "GET",
          headers: apiHeaders
        }
      );
      
      console.log('GET response status:', getRes.status);
      
      if (getRes.status === 200) {
        console.log('Job completed! Returning results...');
        const insightData = await getRes.json();
        console.log('Insight data received:', { count: Array.isArray(insightData) ? insightData.length : 'not array' });
        
        return new Response(
          JSON.stringify(insightData),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (getRes.status === 202) {
        console.log('Job still processing, returning 202...');
        return new Response(
          JSON.stringify({ status: 'processing', job_id: jobId }),
          { 
            status: 202,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
      
      // Any other status is an error
      const err = await getRes.text();
      console.error('GET request error:', getRes.status, err);
      throw new Error(`Error fetching results: ${getRes.status} – ${err}`);
    }
    
    // Handle POST request to start job
    if (req.method === 'POST') {
      console.log('=== HANDLING POST REQUEST TO START JOB ===');
      
      const requestData = await req.json();
      console.log('Received request data:', {
        tenantsCount: requestData.tenants?.length,
        userId: requestData.user_id,
        firstTenant: requestData.tenants?.[0]
      });

      const { tenants, user_id } = requestData;

      // FIX: Use OpenAI key, not Supabase key
      const apiHeaders = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiKey}`
      };

      console.log('Making POST request to start job...');
      const postRes = await fetch(API_BASE_URL, {
        method: "POST",
        headers: apiHeaders,
        body: JSON.stringify({
          tenants,
          user_id
        }),
      });
      
      console.log('POST response status:', postRes.status);
      
      if (!postRes.ok) {
        const errorText = await postRes.text();
        console.error('POST request failed:', postRes.status, errorText);
        throw new Error(`Failed to start job: ${postRes.status}`);
      }
      
      const { job_id } = await postRes.json();
      console.log('Started job with ID:', job_id);
      
      return new Response(
        JSON.stringify({ job_id }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Method not allowed
    console.log('Method not allowed:', req.method);
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('=== ERROR IN GENERATE INSIGHTS ===');
    console.error('Error type:', error.constructor.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: 'Failed to process insights request'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
