import { createClient } from 'npm:@supabase/supabase-js@2.39.7';
import { Resend } from 'npm:resend@2.1.0';
import { Twilio } from 'npm:twilio@4.23.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationPayload {
  type: 'email' | 'sms' | 'both';
  tenant_id: string;
  subject?: string;
  message: string;
  email?: string;
  phone?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { type, tenant_id, subject, message, email, phone } = await req.json() as NotificationPayload;

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Initialize email client (Resend)
    const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

    // Initialize SMS client (Twilio)
    const twilioClient = new Twilio(
      'AC3b127794bf3bf8a83a4c183318ad9bad',
      '94f73a996a79d4b42bb581b75c85d094'
    );

    const results = {
      email: null as any,
      sms: null as any,
    };

    // Send email if requested
    if ((type === 'email' || type === 'both') && email) {
      try {
        results.email = await resend.emails.send({
          from: 'notifications@havyn.com',
          to: email,
          subject: subject || 'Important Notice from Property Management',
          html: message.replace(/\n/g, '<br>'),
        });
      } catch (error) {
        console.error('Email sending failed:', error);
        results.email = { error: error.message };
      }
    }

    // Send SMS if requested
    if ((type === 'sms' || type === 'both') && phone) {
      try {
        results.sms = await twilioClient.messages.create({
          body: message,
          to: phone.replace(/-/g, ''),  // Remove dashes from phone number
          from: '+18339293855',  // Replace with your Twilio phone number
        });
      } catch (error) {
        console.error('SMS sending failed:', error);
        results.sms = { error: error.message };
      }
    }

    // Log the communication
    const { error: logError } = await supabase
      .from('communication_logs')
      .insert({
        tenant_id,
        type,
        message,
        email_status: results.email?.error ? 'failed' : type === 'email' || type === 'both' ? 'sent' : null,
        sms_status: results.sms?.error ? 'failed' : type === 'sms' || type === 'both' ? 'sent' : null,
        email_error: results.email?.error,
        sms_error: results.sms?.error
      });

    if (logError) {
      console.error('Error logging communication:', logError);
    }

    return new Response(
      JSON.stringify(results),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in send-notification:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: 'Failed to send notification'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});