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
  email: string | null;
  phone_number: string | null;
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
      firstTenant: requestData.tenants?.[0]
    });

    const { tenants, user_id, job_id } = requestData;

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

    // Get the insights API URL from environment variable
    const insightsApiUrl = Deno.env.get('INSIGHTS_API_URL') || 'https://qicbherqdoimeowmkuti.supabase.co/functions/v1/generate-insights';
    
    // Use the polling approach from the JavaScript snippet
    console.log('Starting polling-based insights generation...');
    
    // 1️⃣ Kick off a new insights job
    const postRes = await fetch(
      insightsApiUrl,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenants: tenants,
          user_id: user_id
        }),
      }
    );
    
    if (!postRes.ok) {
      throw new Error(`Failed to start job: ${postRes.status}`);
    }
    
    const { job_id: actualJobId } = await postRes.json();
    console.log('Started job with ID:', actualJobId);

    // 2️⃣ Poll for results until ready
    const timeout = Date.now() + 60_000;   // give up after 60s
    let insightData = [];
    
    while (Date.now() < timeout) {
      const getRes = await fetch(
        `${insightsApiUrl}?job_id=${encodeURIComponent(actualJobId)}`
      );
      
      if (getRes.status === 200) {
        // 🎉 Success – get the real insights array
        insightData = await getRes.json();
        console.log('Received insights from polling:', { count: insightData.length });
        break;
      }
      
      if (getRes.status !== 202) {
        const err = await getRes.text();
        throw new Error(`Error fetching results: ${getRes.status} – ${err}`);
      }
      
      // still processing → wait 2s and try again
      console.log('Job still processing, waiting 2s...');
      await new Promise(r => setTimeout(r, 2000));
    }
    
    if (Date.now() >= timeout) {
      throw new Error("Timed out waiting for insights");
    }

    // Ensure insightData is always an array
    if (!Array.isArray(insightData)) {
      console.log('Converting single insight object to array:', insightData);
      if (insightData && typeof insightData === 'object' && 
          (insightData.tenant_name || insightData.tenant_score !== undefined)) {
        insightData = [insightData];
      } else {
        console.error('Insight data is not an array and not a valid insight object:', insightData);
        insightData = [];
      }
    }

    // Handle empty array case
    if (insightData.length === 0) {
      console.log('No insights returned from polling, returning empty array');
      return new Response(
        JSON.stringify([]),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
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
        tenant_name: item.tenant_name || '',
        score: item.tenant_score,
        renewal_recommendation: item.renewal_recommendation,
        turnover_risk: item.turnover_risk,
        predicted_delinquency: item.predicted_delinquency,
        raise_rent_opportunity: item.raise_rent_opportunity,
        retention_outreach_needed: item.retention_outreach_needed,
        high_delinquency_alert: item.high_delinquency_alert,
        notes_analysis: item.notes_analysis,
        recommended_actions: Array.isArray(item.recommended_actions) ? item.recommended_actions : [],
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
        phone_number: tenantData?.phoneNumbers || null,
        email: tenantData?.emails || null,
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
        details: 'Failed to process insights from polling endpoint'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});