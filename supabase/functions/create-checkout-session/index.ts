import { createClient } from 'npm:@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CheckoutSessionRequest {
  amount: number; // Amount in cents
  currency: string;
  success_url: string;
  cancel_url: string;
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
    console.log('=== CREATE CHECKOUT SESSION START ===');
    console.log('Request method:', req.method);

    const requestBody = await req.json();
    console.log('Request body received');

    const { amount, currency, success_url, cancel_url, metadata }: CheckoutSessionRequest = requestBody;

    // Validate the request
    if (!amount || amount < 50) { // Minimum $0.50
      throw new Error('Amount must be at least $0.50');
    }

    if (amount > 1000000) { // Maximum $10,000
      throw new Error('Amount cannot exceed $10,000');
    }

    console.log('Validation passed. Amount:', amount, 'Currency:', currency);

    // Get Stripe keys from environment variables
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    const stripePublishableKey = Deno.env.get('STRIPE_PUBLISHABLE_KEY');
    
    console.log('Environment variables check:');
    console.log('STRIPE_SECRET_KEY exists:', !!stripeSecretKey);
    console.log('STRIPE_PUBLISHABLE_KEY exists:', !!stripePublishableKey);
    
    if (!stripeSecretKey) {
      console.error('Missing STRIPE_SECRET_KEY environment variable');
      throw new Error('Stripe secret key not configured');
    }

    if (!stripePublishableKey) {
      console.error('Missing STRIPE_PUBLISHABLE_KEY environment variable');
      throw new Error('Stripe publishable key not configured');
    }

    // Initialize Stripe with your secret key
    console.log('Importing Stripe...');
    const Stripe = (await import('npm:stripe@14.21.0')).default;
    console.log('Stripe imported successfully');

    console.log('Initializing Stripe client...');
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
    });
    console.log('Stripe client initialized');

    // Create checkout session
    console.log('Creating Stripe Checkout Session...');
    const sessionData = {
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: currency || 'usd',
            product_data: {
              name: `Rent Payment - ${metadata.property}`,
              description: `Unit ${metadata.unit} - ${metadata.tenant_name}`,
            },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: success_url,
      cancel_url: cancel_url,
      metadata: {
        tenant_name: metadata.tenant_name,
        property: metadata.property,
        unit: metadata.unit,
        payment_type: metadata.payment_type,
        rent_amount: metadata.rent_amount.toString(),
        past_due_amount: metadata.past_due_amount.toString(),
      },
      // Add these settings to ensure proper redirect behavior
      allow_promotion_codes: false,
      billing_address_collection: 'auto',
      shipping_address_collection: undefined,
      submit_type: 'pay',
    };

    console.log('Creating session with data...');

    const session = await stripe.checkout.sessions.create(sessionData);

    console.log('Checkout session created successfully:');
    console.log('Session ID:', session.id);
    console.log('Session URL:', session.url);

    // Verify the URL is valid
    if (!session.url) {
      throw new Error('Stripe did not return a checkout URL');
    }

    // Initialize Supabase client for logging
    console.log('Initializing Supabase client for logging...');
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Log the payment attempt
    console.log('Logging payment attempt...');
    const { error: logError } = await supabase
      .from('payment_logs')
      .insert({
        payment_intent_id: session.id,
        tenant_name: metadata.tenant_name,
        property: metadata.property,
        unit: metadata.unit,
        amount: amount / 100, // Convert back to dollars for logging
        payment_type: metadata.payment_type,
        status: 'checkout_created',
        created_at: new Date().toISOString(),
      });

    if (logError) {
      console.error('Error logging payment:', logError);
    } else {
      console.log('Payment logged successfully');
    }

    const responseData = {
      checkout_url: session.url,
      session_id: session.id,
      publishable_key: stripePublishableKey,
    };

    console.log('Returning successful response');
    console.log('=== CREATE CHECKOUT SESSION END ===');

    return new Response(
      JSON.stringify(responseData),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('=== ERROR IN CREATE CHECKOUT SESSION ===');
    console.error('Error type:', error.constructor.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: 'Failed to create checkout session',
        timestamp: new Date().toISOString()
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});