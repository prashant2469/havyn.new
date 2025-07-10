import { createClient } from 'npm:@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PaymentIntentRequest {
  amount: number; // Amount in cents
  currency: string;
  metadata: {
    tenant_name: string;
    property: string;
    unit: string;
    payment_type: string;
    rent_amount: number;
    past_due_amount: number;
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('Creating payment intent...');
    const { amount, currency, metadata }: PaymentIntentRequest = await req.json();

    // Validate the request
    if (!amount || amount < 50) { // Minimum $0.50
      throw new Error('Amount must be at least $0.50');
    }

    if (amount > 1000000) { // Maximum $10,000
      throw new Error('Amount cannot exceed $10,000');
    }

    console.log('Payment request:', { amount, currency, metadata });

    // Get Stripe keys from environment variables
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    const stripePublishableKey = Deno.env.get('STRIPE_PUBLISHABLE_KEY');
    
    if (!stripeSecretKey) {
      console.error('Missing STRIPE_SECRET_KEY environment variable');
      throw new Error('Stripe secret key not configured');
    }

    if (!stripePublishableKey) {
      console.error('Missing STRIPE_PUBLISHABLE_KEY environment variable');
      throw new Error('Stripe publishable key not configured');
    }

    console.log('Using Stripe secret key:', stripeSecretKey.substring(0, 12) + '...');
    console.log('Using Stripe publishable key:', stripePublishableKey.substring(0, 12) + '...');

    // Initialize Stripe with your secret key
    const stripe = new (await import('npm:stripe@14.21.0')).Stripe(
      stripeSecretKey,
      {
        apiVersion: '2023-10-16',
      }
    );

    // Create payment intent
    console.log('Creating Stripe PaymentIntent...');
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: currency || 'usd',
      metadata: {
        tenant_name: metadata.tenant_name,
        property: metadata.property,
        unit: metadata.unit,
        payment_type: metadata.payment_type,
        rent_amount: metadata.rent_amount.toString(),
        past_due_amount: metadata.past_due_amount.toString(),
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    console.log('PaymentIntent created:', paymentIntent.id);

    // Initialize Supabase client for logging
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Log the payment attempt
    const { error: logError } = await supabase
      .from('payment_logs')
      .insert({
        payment_intent_id: paymentIntent.id,
        tenant_name: metadata.tenant_name,
        property: metadata.property,
        unit: metadata.unit,
        amount: amount / 100, // Convert back to dollars for logging
        payment_type: metadata.payment_type,
        status: 'created',
        created_at: new Date().toISOString(),
      });

    if (logError) {
      console.error('Error logging payment:', logError);
    }

    console.log('Payment intent created successfully');

    return new Response(
      JSON.stringify({
        client_secret: paymentIntent.client_secret,
        payment_intent_id: paymentIntent.id,
        publishable_key: stripePublishableKey,
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error creating payment intent:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: 'Failed to create payment intent'
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});