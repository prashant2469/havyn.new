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
    const { code, state, userId } = await req.json();
    
    console.log('Starting token exchange...');
    console.log('Environment variables check:', {
      hasClientId: !!Deno.env.get('GOOGLE_CLIENT_ID'),
      hasClientSecret: !!Deno.env.get('GOOGLE_CLIENT_SECRET'),
      redirectUri: Deno.env.get('GOOGLE_REDIRECT_URI')
    });
    
    if (!code) {
      throw new Error('Authorization code is required');
    }
    
    if (!userId) {
      throw new Error('User ID is required');
    }

    // Get Google OAuth credentials from environment
    const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
    const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');
    const redirectUri = Deno.env.get('GOOGLE_REDIRECT_URI') || 'http://localhost:5174/oauth/google/callback';
    
    if (!clientId || !clientSecret) {
      throw new Error('Google OAuth credentials not configured');
    }
    
    // Add debug logging before token exchange
    console.log('About to exchange code for token with:', {
      clientId: clientId,
      redirectUri: redirectUri,
      code: code.substring(0, 10) + '...' // Log partial code for security
    });
    
    // Exchange authorization code for access token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      }),
    });

    console.log('Token response status:', tokenResponse.status);
    console.log('Token response headers:', Object.fromEntries(tokenResponse.headers.entries()));

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Token exchange failed:', errorText);
      throw new Error('Failed to exchange authorization code for access token');
    }

    const tokenData = await tokenResponse.json();
    console.log('Token exchange successful');

    // Get user info from Google
    console.log('About to get user info with token:', tokenData.access_token.substring(0, 20) + '...');
    
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
      },
    });

    console.log('User info response status:', userInfoResponse.status);
    console.log('User info response headers:', Object.fromEntries(userInfoResponse.headers.entries()));

    if (!userInfoResponse.ok) {
      const errorText = await userInfoResponse.text();
      console.error('User info request failed:', errorText);
      throw new Error(`Failed to get user info from Google: ${errorText}`);
    }

    const userInfo = await userInfoResponse.json();
    console.log('User info retrieved:', userInfo.email);

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Store the OAuth tokens in your database
    // You might want to create a table to store these tokens
    console.log('About to insert into gmail_connections table');
    
    const { error: insertError } = await supabase
      .from('gmail_connections')
      .upsert({
        user_id: userId,
        email: userInfo.email,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_at: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id'
      });

    if (insertError) {
      console.error('Error storing Gmail connection:', insertError);
      throw new Error('Failed to store Gmail connection');
    }

    console.log('Gmail connection stored successfully');

    return new Response(JSON.stringify({
      ok: true,
      email: userInfo.email,
      message: 'Gmail connected successfully'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('OAuth callback error:', error);
    console.error('Error stack:', error.stack);
    console.error('Error details:', JSON.stringify(error, null, 2));
    
    return new Response(JSON.stringify({
      ok: false,
      error: error.message || 'Unknown error',
      details: error.toString(),
      type: error.name || 'Error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});