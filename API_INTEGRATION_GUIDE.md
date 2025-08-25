# Havyn - API Integration & External Services Guide

## Overview

Havyn integrates with multiple external services to provide comprehensive property management functionality. This guide documents all API integrations, data flows, and implementation details.

## External Service Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Supabase      │    │   AWS Lambda    │    │   Stripe API    │
│   Database      │◄──►│   AI Engine     │    │   Payments      │
│   Auth          │    │   Insights      │    │   Webhooks      │
│   Edge Functions│    └─────────────────┘    └─────────────────┘
└─────────────────┘
        │
        ▼
┌─────────────────┐    ┌─────────────────┐
│   Resend API    │    │   Twilio API    │
│   Email Service │    │   SMS Service   │
└─────────────────┘    └─────────────────┘
```

## Supabase Integration

### Database Configuration
```typescript
// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);
```

### Authentication Integration
```typescript
// Owner Authentication (Supabase Auth)
const { data, error } = await supabase.auth.signInWithPassword({
  email,
  password,
});

// Session Management
const { data: { session } } = await supabase.auth.getSession();

// Auth State Listener
supabase.auth.onAuthStateChange((event, session) => {
  setUser(session?.user ?? null);
});
```

### Database Operations
```typescript
// Insert with RLS
const { data, error } = await supabase
  .from('tenant_insights')
  .insert(insights)
  .select();

// Query with user isolation
const { data } = await supabase
  .from('tenant_insights')
  .select('*')
  .eq('user_id', user.id)
  .order('created_at', { ascending: false });

// Real-time subscriptions
const subscription = supabase
  .from('tenant_insights')
  .on('INSERT', payload => {
    // Handle new insights
  })
  .subscribe();
```

### Edge Functions Integration
```typescript
// Call Edge Function
const response = await fetch(`${supabase.supabaseUrl}/functions/v1/function-name`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${supabase.supabaseKey}`
  },
  body: JSON.stringify(payload)
});
```

## AWS Lambda Integration

### AI Insight Generation
```typescript
// Lambda Endpoint Configuration
const LAMBDA_ENDPOINT = 'https://zv54onyhgk.execute-api.us-west-1.amazonaws.com/prod/insight';

// Request Structure
interface LambdaRequest {
  tenants: TenantData[];
  user_id: string;
  job_id?: string;
}

// Response Structure
interface LambdaResponse {
  statusCode: number;
  body: TenantInsight[];
}
```

### Implementation in Edge Functions
```typescript
// supabase/functions/generate-insights/index.ts
const lambdaResponse = await fetch(LAMBDA_ENDPOINT, {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  body: JSON.stringify({
    tenants: processedTenantData,
    user_id: userId
  })
});

const insights = await lambdaResponse.json();
```

### Location Insights Lambda
```typescript
// Location Analysis Endpoint
const LOCATION_LAMBDA = 'https://o5unvls7x8.execute-api.us-west-1.amazonaws.com/PROD/insight';

// Request for market analysis
const locationResponse = await fetch(LOCATION_LAMBDA, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    properties: uniquePropertyAddresses 
  })
});
```

## Stripe Payment Integration

### Configuration
```typescript
// Environment Variables
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...

// Stripe Client Initialization
const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2023-10-16',
});
```

### Checkout Session Creation
```typescript
// supabase/functions/create-checkout-session/index.ts
const session = await stripe.checkout.sessions.create({
  payment_method_types: ['card'],
  line_items: [{
    price_data: {
      currency: 'usd',
      product_data: {
        name: `Rent Payment - ${property}`,
        description: `Unit ${unit} - ${tenantName}`,
      },
      unit_amount: amountInCents,
    },
    quantity: 1,
  }],
  mode: 'payment',
  success_url: successUrl,
  cancel_url: cancelUrl,
  metadata: {
    tenant_name: tenantName,
    property: property,
    unit: unit,
    payment_type: paymentType,
  }
});
```

### Payment Status Verification
```typescript
// supabase/functions/check-payment-status/index.ts
const session = await stripe.checkout.sessions.retrieve(sessionId);

// Payment completion check
if (session.payment_status === 'paid') {
  // Update payment logs
  await supabase
    .from('payment_logs')
    .update({ status: 'completed' })
    .eq('payment_intent_id', sessionId);
}
```

### Frontend Payment Flow
```typescript
// src/components/RentPaymentModal.tsx
const handlePayment = async () => {
  // Create checkout session
  const response = await fetch(`${supabase.supabaseUrl}/functions/v1/create-checkout-session`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${supabase.supabaseKey}`
    },
    body: JSON.stringify({
      amount: Math.round(paymentAmount * 100),
      currency: 'usd',
      success_url: `${window.location.origin}/tenant-login?payment=success`,
      cancel_url: `${window.location.origin}/tenant-login?payment=cancelled`,
      metadata: paymentMetadata
    })
  });

  const { checkout_url } = await response.json();
  
  // Open Stripe Checkout
  window.open(checkout_url, '_blank');
};
```

## Communication APIs

### Resend Email Integration
```typescript
// supabase/functions/send-notification/index.ts
import { Resend } from 'npm:resend@2.1.0';

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

// Send email
const emailResult = await resend.emails.send({
  from: 'notifications@havyn.com',
  to: tenantEmail,
  subject: 'Important Notice from Property Management',
  html: message.replace(/\n/g, '<br>'),
});
```

### Twilio SMS Integration
```typescript
import { Twilio } from 'npm:twilio@4.23.0';

const twilioClient = new Twilio(
  'AC3b127794bf3bf8a83a4c183318ad9bad',  // Account SID
  '94f73a996a79d4b42bb581b75c85d094'   // Auth Token
);

// Send SMS
const smsResult = await twilioClient.messages.create({
  body: message,
  to: phoneNumber.replace(/-/g, ''),
  from: '+18339293855',  // Twilio phone number
});
```

### Communication Logging
```typescript
// Log communication attempts
const { error } = await supabase
  .from('communication_logs')
  .insert({
    tenant_id,
    type: 'both', // 'email', 'sms', or 'both'
    message,
    email_status: emailResult?.error ? 'failed' : 'sent',
    sms_status: smsResult?.error ? 'failed' : 'sent',
    email_error: emailResult?.error,
    sms_error: smsResult?.error
  });
```

## Data Processing Pipeline

### CSV Processing Flow
```typescript
// supabase/functions/merge-data/index.ts
const decodeBase64ToCSV = (base64String: string): any[] => {
  const text = new TextDecoder().decode(
    Uint8Array.from(atob(base64String), c => c.charCodeAt(0))
  );
  return parseCSV(text, {
    columns: true,
    skip_empty_lines: true,
    trim: true
  });
};

// Data merging logic
const mergeRecords = (delinquencyData, rentRollData, directoryData) => {
  // Complex data merging logic
  // Normalize tenant names
  // Match records across files
  // Validate and clean data
};
```

### File Upload Integration
```typescript
// src/components/FileUpload.tsx
const onDrop = useCallback((acceptedFiles: File[]) => {
  const file = acceptedFiles[0];
  
  // Convert to base64 for API transmission
  const reader = new FileReader();
  reader.onload = () => {
    const base64 = reader.result?.toString().split(',')[1];
    onFilesSelected({ [fileType]: base64 });
  };
  reader.readAsDataURL(file);
}, [fileType, onFilesSelected]);
```

## Error Handling & Monitoring

### API Error Handling Patterns
```typescript
// Standardized error response
const handleApiError = (error: any) => {
  return new Response(
    JSON.stringify({
      error: error.message,
      details: 'Operation failed',
      timestamp: new Date().toISOString()
    }),
    { 
      status: error.status || 500,
      headers: corsHeaders
    }
  );
};
```

### Frontend Error Handling
```typescript
// API call with error handling
const callApi = async (endpoint: string, data: any) => {
  try {
    setLoading(true);
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'API call failed');
    }

    return await response.json();
  } catch (error) {
    console.error('API Error:', error);
    setError(error.message);
    throw error;
  } finally {
    setLoading(false);
  }
};
```

## Rate Limiting & Performance

### API Rate Limiting
```typescript
// Implement rate limiting for external APIs
const rateLimiter = {
  stripe: { requests: 100, window: 60000 }, // 100 requests per minute
  twilio: { requests: 1, window: 1000 },    // 1 request per second
  resend: { requests: 10, window: 60000 }   // 10 requests per minute
};
```

### Caching Strategies
```typescript
// Cache frequently accessed data
const cache = new Map();

const getCachedData = async (key: string, fetchFn: () => Promise<any>) => {
  if (cache.has(key)) {
    return cache.get(key);
  }
  
  const data = await fetchFn();
  cache.set(key, data);
  
  // Auto-expire cache after 5 minutes
  setTimeout(() => cache.delete(key), 5 * 60 * 1000);
  
  return data;
};
```

## Security Considerations

### API Key Management
```typescript
// Environment variable validation
const validateEnvironment = () => {
  const required = [
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_ANON_KEY',
    'STRIPE_SECRET_KEY',
    'RESEND_API_KEY',
    'TWILIO_ACCOUNT_SID'
  ];
  
  const missing = required.filter(key => !Deno.env.get(key));
  if (missing.length > 0) {
    throw new Error(`Missing environment variables: ${missing.join(', ')}`);
  }
};
```

### Request Validation
```typescript
// Input validation for API requests
const validatePaymentRequest = (data: any) => {
  if (!data.amount || data.amount < 50 || data.amount > 1000000) {
    throw new Error('Invalid payment amount');
  }
  
  if (!data.metadata?.tenant_name) {
    throw new Error('Tenant name required');
  }
  
  // Additional validation...
};
```

## Monitoring & Logging

### API Call Logging
```typescript
// Log all external API calls
const logApiCall = async (service: string, endpoint: string, success: boolean, duration: number) => {
  await supabase
    .from('api_logs')
    .insert({
      service,
      endpoint,
      success,
      duration,
      timestamp: new Date().toISOString()
    });
};
```

### Performance Monitoring
```typescript
// Monitor API response times
const monitorApiCall = async (apiCall: () => Promise<any>) => {
  const startTime = Date.now();
  try {
    const result = await apiCall();
    const duration = Date.now() - startTime;
    console.log(`API call completed in ${duration}ms`);
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`API call failed after ${duration}ms:`, error);
    throw error;
  }
};
```

This API integration guide provides comprehensive documentation of all external service integrations within the Havyn platform. Use this as a reference for understanding data flows, implementing new integrations, and troubleshooting API-related issues.