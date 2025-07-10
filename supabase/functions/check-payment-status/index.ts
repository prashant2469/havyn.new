import { createClient } from 'npm:@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PaymentStatusRequest {
  session_id: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('=== CHECK PAYMENT STATUS START ===');
    
    const { session_id }: PaymentStatusRequest = await req.json();
    
    if (!session_id) {
      throw new Error('Session ID is required');
    }

    console.log('Checking payment status for session:', session_id);

    // Get Stripe secret key
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    
    if (!stripeSecretKey) {
      console.error('Missing STRIPE_SECRET_KEY environment variable');
      throw new Error('Stripe secret key not configured');
    }

    // Initialize Stripe
    const Stripe = (await import('npm:stripe@14.21.0')).default;
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
    });

    // Retrieve the checkout session
    console.log('Retrieving checkout session from Stripe...');
    const session = await stripe.checkout.sessions.retrieve(session_id);
    
    console.log('Session status:', session.payment_status);
    console.log('Session payment intent:', session.payment_intent);

    // Initialize Supabase client for logging
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Update payment log if payment is complete
    if (session.payment_status === 'paid') {
      console.log('Payment confirmed as paid, updating payment log...');
      
      const { error: updateError } = await supabase
        .from('payment_logs')
        .update({
          status: 'completed',
          updated_at: new Date().toISOString(),
        })
        .eq('payment_intent_id', session_id);

      if (updateError) {
        console.error('Error updating payment log:', updateError);
      } else {
        console.log('Payment log updated successfully');
      }
    }

    const responseData = {
      status: session.payment_status,
      session_id: session.id,
      payment_intent: session.payment_intent,
      amount_total: session.amount_total,
      currency: session.currency,
      customer_email: session.customer_details?.email,
    };

    console.log('Returning payment status response:', responseData);
    console.log('=== CHECK PAYMENT STATUS END ===');

    return new Response(
      JSON.stringify(responseData),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('=== ERROR IN CHECK PAYMENT STATUS ===');
    console.error('Error type:', error.constructor.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: 'Failed to check payment status',
        timestamp: new Date().toISOString()
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});