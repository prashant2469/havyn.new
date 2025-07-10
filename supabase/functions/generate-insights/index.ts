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
      firstTenant: requestData.tenants?.[0] // Log first tenant as sample
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

    console.log('Calling Lambda API...');
    const lambdaPayload = { json: tenants, count: tenants.length };
    console.log('Lambda payload:', lambdaPayload);

    const lambdaResponse = await fetch(
      'https://zv54onyhgk.execute-api.us-west-1.amazonaws.com/prod/insight',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(lambdaPayload)
      }
    );

    console.log('Lambda response status:', lambdaResponse.status);
    if (!lambdaResponse.ok) {
      console.error('Lambda API error:', lambdaResponse.status);
      const errorText = await lambdaResponse.text();
      console.error('Lambda error details:', errorText);
      throw new Error(`Lambda API error: ${lambdaResponse.status}`);
    }

    const rawLambdaResponse = await lambdaResponse.json();
    console.log('Raw Lambda response:', rawLambdaResponse);

    let insightData;
    if (Array.isArray(rawLambdaResponse)) {
      console.log('Lambda response is direct array');
      insightData = rawLambdaResponse;
    } else if (rawLambdaResponse.body && Array.isArray(rawLambdaResponse.body)) {
      console.log('Lambda response has body array');
      insightData = rawLambdaResponse.body;
    } else if (typeof rawLambdaResponse.body === 'string') {
      console.log('Lambda response body is string, attempting to parse');
      try {
        const parsedBody = JSON.parse(rawLambdaResponse.body);
        insightData = Array.isArray(parsedBody) ? parsedBody : parsedBody.body;
      } catch (e) {
        console.error('Failed to parse Lambda response body:', e);
        throw new Error('Invalid response format from Lambda function');
      }
    } else {
      console.error('Invalid Lambda response format:', rawLambdaResponse);
      throw new Error('Invalid response format from Lambda function');
    }

    if (!Array.isArray(insightData)) {
      console.error('Lambda did not return array:', insightData);
      throw new Error('Lambda function did not return an array of insights');
    }

    console.log('Processing insights:', {
      count: insightData.length,
      sample: insightData[0]
    });

    const insights = insightData.map((item: any) => {
      const tenantData = tenants.find((t: any) => 
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