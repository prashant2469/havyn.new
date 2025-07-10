import { createClient } from 'npm:@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('Starting generate-location-insights function...');
    
    const requestData = await req.json();
    console.log('Received request data:', {
      properties: requestData.properties,
      userId: requestData.user_id
    });
    
    const { properties, user_id } = requestData;

    console.log('Calling Lambda API for location insights...');
    const lambdaResponse = await fetch(
      'https://o5unvls7x8.execute-api.us-west-1.amazonaws.com/PROD/insight',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ properties })
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

    let locationData;
    if (Array.isArray(rawLambdaResponse)) {
      locationData = rawLambdaResponse;
    } else if (rawLambdaResponse.body) {
      try {
        locationData = typeof rawLambdaResponse.body === 'string' ? 
          JSON.parse(rawLambdaResponse.body) : 
          rawLambdaResponse.body;
      } catch (e) {
        console.error('Failed to parse Lambda response:', e);
        throw new Error('Invalid response format from Lambda function');
      }
    } else {
      throw new Error('Invalid response format from Lambda function');
    }

    if (!Array.isArray(locationData)) {
      console.error('Location data is not an array:', locationData);
      throw new Error('Invalid data format from Lambda function');
    }

    console.log('Processed location data:', {
      count: locationData.length,
      sample: locationData[0]
    });

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Inserting location insights...');
    const locationInsights = locationData.map((location: any) => ({
      property: location.address,
      user_id,
      rental_market_strength_score: location.rental_market_strength_score,
      vacancy_rate: location.vacancy_rate,
      rent_trend: location.rent_trend,
      new_construction_supply: location.new_construction_supply,
      competitor_summary: location.competitor_summary || null,
      overall_market_summary: location.overall_market_summary,
      latitude: location.latitude || 35.7596,
      longitude: location.longitude || -79.0193,
      recent_news_summary: location.recent_news_summary || null
    }));

    console.log('Location insights to insert:', locationInsights);

    const { data: insertedInsights, error: insertError } = await supabase
      .from('location_insights')
      .upsert(locationInsights, {
        onConflict: 'property,user_id',
        ignoreDuplicates: false
      })
      .select();

    if (insertError) {
      console.error('Error inserting location insights:', insertError);
      throw insertError;
    }

    console.log('Successfully inserted insights:', insertedInsights?.length);

    return new Response(
      JSON.stringify(insertedInsights),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in generate-location-insights:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: 'Failed to process location insights'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});