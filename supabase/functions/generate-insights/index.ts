import { createClient } from 'npm:@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TenantInsight {
  id?: string;
  tenant_name: string;
  score: number;
  renewal_recommendation: string;
  turnover_risk: string;
  predicted_delinquency: string;
  raise_rent_opportunity: boolean;
  retention_outreach_needed: boolean;
  high_delinquency_alert: boolean;
  notes_analysis: string;
  recommended_actions: string[];
  property: string;
  unit: string;
  reasoning_summary: string;
  user_id: string;
  rent_amount: number;
  past_due: number;
  delinquent_rent: number;
  aging_30: number;
  aging_60: number;
  aging_90: number;
  aging_over_90: number;
  lease_start_date: string | null;
  lease_end_date: string | null;
  total_balance: number;
  delinquency_notes: string | null;
  "Phone Number": string | null;
  "Emails": string | null;
  changes?: {
    score?: { old: number; new: number };
    turnover_risk?: { old: string; new: string };
    predicted_delinquency?: { old: string; new: string };
    past_due?: { old: number; new: number };
    delinquent_rent?: { old: number; new: number };
    total_balance?: { old: number; new: number };
  };
  report_id?: string;
  previous_insight_id?: string | null;
  created_at?: string;
}

interface LambdaResponse {
  statusCode: number;
  body: Array<{
    tenant_name: string;
    tenant_score: number;
    renewal_recommendation: string;
    turnover_risk: string;
    predicted_delinquency: string;
    raise_rent_opportunity: boolean;
    retention_outreach_needed: boolean;
    high_delinquency_alert: boolean;
    notes_analysis: string;
    recommended_actions: string[];
    property: string;
    unit: string;
    reasoning_summary: string;
  }>;
}

function compareInsights(existing: TenantInsight, newInsight: TenantInsight): TenantInsight['changes'] {
  const changes: TenantInsight['changes'] = {};

  if (existing.score !== newInsight.score) {
    changes.score = { old: existing.score, new: newInsight.score };
  }

  if (existing.turnover_risk !== newInsight.turnover_risk) {
    changes.turnover_risk = { old: existing.turnover_risk, new: newInsight.turnover_risk };
  }

  if (existing.predicted_delinquency !== newInsight.predicted_delinquency) {
    changes.predicted_delinquency = { 
      old: existing.predicted_delinquency, 
      new: newInsight.predicted_delinquency 
    };
  }

  if (existing.past_due !== newInsight.past_due) {
    changes.past_due = { old: existing.past_due, new: newInsight.past_due };
  }

  if (existing.delinquent_rent !== newInsight.delinquent_rent) {
    changes.delinquent_rent = { old: existing.delinquent_rent, new: newInsight.delinquent_rent };
  }

  if (existing.total_balance !== newInsight.total_balance) {
    changes.total_balance = { old: existing.total_balance, new: newInsight.total_balance };
  }

  return Object.keys(changes).length > 0 ? changes : undefined;
}

async function findPreviousInsight(
  supabase: any,
  userId: string,
  property: string,
  unit: string,
  tenantName: string,
  currentInsightId: string
): Promise<TenantInsight | null> {
  const { data: previousInsights } = await supabase
    .from('tenant_insights')
    .select('*')
    .eq('user_id', userId)
    .eq('property', property)
    .eq('unit', unit)
    .eq('tenant_name', tenantName)
    .neq('id', currentInsightId)
    .order('created_at', { ascending: false })
    .limit(1);

  return previousInsights?.[0] || null;
}

async function updateInsightWithHistory(
  supabase: any,
  insight: TenantInsight
): Promise<void> {
  if (!insight.id) return;

  const previousInsight = await findPreviousInsight(
    supabase,
    insight.user_id,
    insight.property,
    insight.unit,
    insight.tenant_name,
    insight.id
  );

  if (previousInsight) {
    const changes = compareInsights(previousInsight, insight);
    
    await supabase
      .from('tenant_insights')
      .update({
        previous_insight_id: previousInsight.id,
        changes
      })
      .eq('id', insight.id);
  }
}

/*
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('Starting generate-insights function...');

    const requestData = await req.json();
    console.log('Received request data:', {
      tenantsCount: requestData.tenants?.length,
      userId: requestData.user_id,
      firstTenant: requestData.tenants?.[0]
    });

    const { tenants, user_id } = requestData;

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Creating new insight report...');
    const { data: newReport, error: reportError } = await supabase
      .from('insight_reports')
      .insert({ user_id })
      .select()
      .single();

    if (reportError) {
      console.error('Error creating report:', reportError);
      throw reportError;
    }
    console.log('Created new report:', newReport);

    console.log('Calling AWS Lambda function for tenant insights...');
    const lambdaPayload = { tenants, user_id };

    // Use the correct AWS Lambda endpoint
    const lambdaResponse = await fetch(
      'https://zv54onyhgk.execute-api.us-west-1.amazonaws.com/prod/insight',
      {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(lambdaPayload)
      }
    );

    console.log('Lambda response status:', lambdaResponse.status);
    
    if (!lambdaResponse.ok) {
      const errorText = await lambdaResponse.text();
      console.error('Lambda API error:', errorText);
      throw new Error(`Lambda API failed with status ${lambdaResponse.status}: ${errorText}`);
    }

    const rawLambdaResponse = await lambdaResponse.json();
    console.log('Raw Lambda response received:', {
      type: typeof rawLambdaResponse,
      isArray: Array.isArray(rawLambdaResponse),
      hasBody: 'body' in rawLambdaResponse,
      statusCode: rawLambdaResponse.statusCode
    });

    // Handle different response formats from Lambda
    let insightData;
    if (Array.isArray(rawLambdaResponse)) {
      // Direct array response
      insightData = rawLambdaResponse;
    } else if (rawLambdaResponse.body) {
      // Response wrapped in body property
      if (typeof rawLambdaResponse.body === 'string') {
        try {
          insightData = JSON.parse(rawLambdaResponse.body);
        } catch (parseError) {
          console.error('Failed to parse Lambda response body:', parseError);
          throw new Error('Invalid JSON in Lambda response body');
        }
      } else {
        insightData = rawLambdaResponse.body;
      }
    } else if (rawLambdaResponse.statusCode === 200) {
      // Check if the response itself contains the data
      const { statusCode, ...responseData } = rawLambdaResponse;
      if (Object.keys(responseData).length > 0) {
        insightData = [responseData]; // Wrap single object in array
      } else {
        throw new Error('Lambda response contains no data');
      }
    } else {
      console.error('Unexpected Lambda response format:', rawLambdaResponse);
      throw new Error('Unexpected response format from Lambda function');
    }

    // Ensure insightData is always an array
    if (!Array.isArray(insightData)) {
      console.log('Converting single insight object to array:', insightData);
      // Check if it's a single insight object with expected properties
      if (insightData && typeof insightData === 'object' && 
          (insightData.tenant_name || insightData.tenant_score !== undefined)) {
        insightData = [insightData];
      } else {
        console.error('Insight data is not an array and not a valid insight object:', insightData);
        throw new Error('Lambda function did not return valid insight data');
      }
    }

    console.log('Processing insights:', {
      count: insightData.length,
      sample: insightData[0]
    });

    const insights = insightData.map((item) => {
      const tenantData = tenants.find((t) => 
        t.property === item.property && 
        t.unit === (item.unit || 'Unknown') && 
        t.tenant === item.tenant_name
      );

      return {
        tenant_name: item.tenant_name,
        score: item.tenant_score,
        renewal_recommendation: item.renewal_recommendation,
        turnover_risk: item.turnover_risk,
        predicted_delinquency: item.predicted_delinquency,
        raise_rent_opportunity: item.raise_rent_opportunity,
        retention_outreach_needed: item.retention_outreach_needed,
        high_delinquency_alert: item.high_delinquency_alert,
        notes_analysis: item.notes_analysis,
        recommended_actions: item.recommended_actions,
        property: item.property,
        unit: item.unit || 'Unknown',
        reasoning_summary: item.reasoning_summary,
        user_id,
        rent_amount: tenantData?.rentAmount || 0,
        past_due: tenantData?.pastDue || 0,
        delinquent_rent: tenantData?.delinquentRent || 0,
        aging_30: tenantData?.aging30 || 0,
        aging_60: tenantData?.aging60 || 0,
        aging_90: tenantData?.aging90 || 0,
        aging_over_90: tenantData?.agingOver90 || 0,
        lease_start_date: tenantData?.moveInDate || null,
        lease_end_date: tenantData?.leaseEndDate || null,
        total_balance: (tenantData?.pastDue || 0) + (tenantData?.delinquentRent || 0),
        delinquency_notes: tenantData?.delinquencyNotes || null,
        "Phone Number": tenantData?.phoneNumbers || null,
        "Emails": tenantData?.emails || null,
        report_id: newReport.id,
        previous_insight_id: null,
        changes: undefined
      };
    });

    console.log('Inserting insights into database...');
    const { data: insertedInsights, error: insertError } = await supabase
      .from('tenant_insights')
      .insert(insights)
      .select();

    if (insertError) {
      console.error('Error inserting insights:', insertError);
      throw insertError;
    }
    console.log('Inserted insights count:', insertedInsights.length);

    console.log('Updating insights with history...');
    await Promise.all(
      insertedInsights.map(insight => updateInsightWithHistory(supabase, insight))
    );

    console.log('Fetching final insights...');
    const { data: finalInsights, error: fetchError } = await supabase
      .from('tenant_insights')
      .select('*')
      .eq('report_id', newReport.id);

    if (fetchError) {
      console.error('Error fetching final insights:', fetchError);
      throw fetchError;
    }
    console.log('Final insights count:', finalInsights?.length);

    return new Response(
      JSON.stringify(finalInsights),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in generate-insights:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: 'Failed to process insights from Lambda function'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
*/
import { createClient } from '@supabase/supabase-js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ▲ YOUR API endpoints here ▼
const INSIGHT_API_URL    = 'https://zv54onyhgk.execute-api.us‑west‑1.amazonaws.com/prod/insight';
const GET_RESULTS_URL    = 'https://zv54onyhgk.execute-api.us‑west‑1.amazonaws.com/prod/get_results';
// ▲▲▲ Replace those with your real invoke URLs ▲▲▲

/**
 * 1️⃣ Send the job to your POST /insight endpoint.
 *    Expects a 202 + { job_id } response.
 */
async function submitJob(
  payload: { tenants: any[]; user_id: string }
): Promise<string> {
  const resp = await fetch(INSIGHT_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (resp.status !== 202) {
    const txt = await resp.text();
    throw new Error(`Submit failed (${resp.status}): ${txt}`);
  }

  const { job_id } = await resp.json();
  return job_id;
}

/**
 * 2️⃣ Poll GET /get_results?job_id=… until it returns 200 with the insights array.
 */
async function pollForResults(
  jobId: string,
  intervalMs = 1000,
  maxAttempts = 30
): Promise<any[]> {
  const endpoint = `${GET_RESULTS_URL}?job_id=${encodeURIComponent(jobId)}`;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const resp = await fetch(endpoint, { headers: corsHeaders });

    if (resp.status === 202) {
      // still processing → wait then retry
      await new Promise((r) => setTimeout(r, intervalMs));
      continue;
    }

    if (resp.status === 200) {
      return await resp.json();
    }

    // anything else is a hard error
    const text = await resp.text();
    throw new Error(`Unexpected status ${resp.status}: ${text}`);
  }

  throw new Error('Timed out waiting for insights');
}

/**
 * 3️⃣ Your main HTTP handler.
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { tenants, user_id } = await req.json();
    if (!Array.isArray(tenants) || !user_id) {
      return new Response(
        JSON.stringify({ error: 'Payload must include tenants[] and user_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Submit the job
    console.log('Submitting job to POST /insight …');
    const jobId = await submitJob({ tenants, user_id });
    console.log('Received job_id:', jobId);

    // Poll until final results are ready
    console.log('Polling GET /get_results …');
    const insights = await pollForResults(jobId);
    console.log('Insights received:', insights);

    // Return the final array
    return new Response(JSON.stringify(insights), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('Error in generateInsights handler:', err);
    return new Response(
      JSON.stringify({ error: err.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
