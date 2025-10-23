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
    const { uid } = await req.json();
    
    if (!uid) {
      throw new Error('User ID is required');
    }

    // Get your domain from environment or construct it
    const siteUrl = Deno.env.get('SITE_URL') || 'http://localhost:5173';
    const redirectUri = `${siteUrl}/oauth/google/callback`;
    
    // Get Google OAuth credentials from environment
    const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
    const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');
    
    if (!clientId) {
      throw new Error('Google Client ID not configured');
    }
    
    // Google OAuth URL construction
    const googleAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    googleAuthUrl.searchParams.set('client_id', clientId);
    googleAuthUrl.searchParams.set('redirect_uri', redirectUri);
    googleAuthUrl.searchParams.set('response_type', 'code');
    googleAuthUrl.searchParams.set('scope', 'https://www.googleapis.com/auth/gmail.readonly');
    googleAuthUrl.searchParams.set('access_type', 'offline');
    googleAuthUrl.searchParams.set('state', uid);
    googleAuthUrl.searchParams.set('prompt', 'consent');
    
    console.log('Generated OAuth URL:', googleAuthUrl.toString());
    
    return new Response(JSON.stringify({
      ok: true,
      url: googleAuthUrl.toString(),
      authUrl: googleAuthUrl.toString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('OAuth start error:', error);
    return new Response(JSON.stringify({
      ok: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});