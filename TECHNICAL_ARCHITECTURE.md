# Havyn - Technical Architecture & Implementation Guide

## System Overview

Havyn is a full-stack property management platform built with modern cloud-native architecture, featuring AI-powered tenant analytics, secure payment processing, and dual-portal user experience.

## Architecture Diagram

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Supabase       │    │   AWS Lambda    │
│   React/TS      │◄──►│   Database       │◄──►│   AI Engine     │
│   Tailwind CSS  │    │   Auth           │    │   Insights      │
└─────────────────┘    │   Edge Functions │    └─────────────────┘
                       └──────────────────┘
                                │
                       ┌──────────────────┐
                       │   Stripe API     │
                       │   Payments       │
                       └──────────────────┘
```

## Frontend Architecture

### Component Structure
```
src/
├── components/
│   ├── AuthForm.tsx              # Owner authentication
│   ├── TenantLogin.tsx           # Tenant authentication  
│   ├── Dashboard.tsx             # Main owner dashboard
│   ├── TenantDashboard.tsx       # Tenant portal
│   ├── MainContent.tsx           # Owner app wrapper
│   ├── LandingPage.tsx           # Marketing landing page
│   ├── InsightCard.tsx           # Tenant insight display
│   ├── PropertyGroup.tsx         # Property grouping
│   ├── TenantHistory.tsx         # Historical data viewer
│   ├── FileUpload.tsx            # CSV file upload
│   ├── DataPreview.tsx           # Data preview table
│   ├── MetricCard.tsx            # Dashboard metrics
│   ├── RiskBar.tsx               # Risk visualization
│   ├── DelinquencyList.tsx       # Delinquent tenants
│   ├── LeaseTimeline.tsx         # Lease expiration tracking
│   ├── LocationInsights.tsx      # Market analysis
│   ├── MessageTenantButton.tsx   # Communication tools
│   ├── RentPaymentModal.tsx      # Payment interface
│   └── NavigationSidebar.tsx     # App navigation
├── contexts/
│   ├── AuthContext.tsx           # Owner authentication state
│   ├── TenantAuthContext.tsx     # Tenant authentication state
│   └── ThemeContext.tsx          # Dark/light mode
├── lib/
│   └── supabase.ts               # Database client
├── utils/
│   └── formatters.ts             # Data formatting utilities
└── types.ts                      # TypeScript definitions
```

### State Management
- **React Context API** for global state (auth, theme)
- **Local component state** with useState/useEffect hooks
- **Custom hooks** for data fetching and business logic

### Styling System
- **Tailwind CSS** for utility-first styling
- **Custom color palette** (havyn-primary: #3F6B28)
- **Dark mode support** with CSS variables
- **Responsive design** with mobile-first approach

## Backend Architecture

### Supabase Infrastructure
```
Database Tables:
├── tenant_insights          # AI-generated tenant analysis
├── insight_reports          # Report versioning
├── tenants                  # Tenant authentication
├── tenant_properties        # Tenant property relationships
├── location_insights        # Market analysis data
├── payment_logs            # Payment transaction history
└── communication_logs      # Message tracking
```

### Database Schema Details

#### tenant_insights
```sql
- id (uuid, primary key)
- tenant_name (text)
- score (integer 0-100)
- turnover_risk (text: low/medium/high)
- predicted_delinquency (text: low/medium/high)
- property (text)
- unit (text)
- rent_amount (numeric)
- past_due (numeric)
- delinquent_rent (numeric)
- aging_30/60/90/over_90 (numeric)
- lease_start_date/lease_end_date (timestamptz)
- recommended_actions (text[])
- reasoning_summary (text)
- changes (jsonb) # Historical change tracking
- report_id (uuid, foreign key)
- previous_insight_id (uuid, self-reference)
- user_id (uuid, foreign key to auth.users)
- created_at (timestamptz)
```

#### Row Level Security (RLS)
```sql
-- Users can only access their own data
CREATE POLICY "Users can only access their own insights"
  ON tenant_insights FOR ALL TO authenticated
  USING (auth.uid() = user_id);
```

### Supabase Edge Functions
```
supabase/functions/
├── merge-data/              # CSV processing and data merging
├── generate-insights/       # AI insight generation orchestration
├── fetch-insights/          # Retrieve saved insights
├── create-checkout-session/ # Stripe payment session creation
├── check-payment-status/    # Payment verification
├── send-notification/       # SMS/Email communication
└── generate-location-insights/ # Market analysis
```

## AI Processing Pipeline

### AWS Lambda Integration
```
Lambda Functions:
├── Tenant Analysis Engine
│   ├── Input: Tenant data (rent, payment history, demographics)
│   ├── Processing: ML models for risk assessment
│   └── Output: Scores, recommendations, risk levels
└── Location Analysis Engine
    ├── Input: Property addresses
    ├── Processing: Market data aggregation
    └── Output: Market strength, vacancy rates, trends
```

### Data Flow
```
1. CSV Upload → Frontend
2. File Processing → merge-data Edge Function
3. Data Validation → Supabase Database
4. AI Analysis → AWS Lambda
5. Insight Generation → generate-insights Edge Function
6. Results Storage → tenant_insights table
7. Dashboard Display → React Components
```

## Authentication System

### Dual Authentication Architecture
```
Owner Authentication:
├── Supabase Auth (auth.users table)
├── Email/password authentication
├── Session management with JWT tokens
└── RLS policies for data isolation

Tenant Authentication:
├── Custom authentication system
├── tenants table with password hashing
├── Name verification against tenant_insights
├── localStorage session management
```

### Security Implementation
```typescript
// Owner auth (Supabase Auth)
const { user, signIn, signUp, signOut } = useAuth();

// Tenant auth (Custom system)
const { tenant, signIn, signUp, verifyTenantName } = useTenantAuth();

// RLS enforcement
CREATE POLICY "tenant_data_isolation"
  ON tenant_insights FOR ALL TO authenticated
  USING (auth.uid() = user_id);
```

## Payment Processing

### Stripe Integration Architecture
```
Payment Flow:
1. Tenant initiates payment → RentPaymentModal
2. Payment session creation → create-checkout-session Edge Function
3. Stripe Checkout → External Stripe hosted page
4. Payment completion → Webhook/polling verification
5. Status update → check-payment-status Edge Function
6. Transaction logging → payment_logs table
```

### Payment Types Supported
- Full amount due (rent + past due)
- Current rent only
- Past due balance only
- Custom amount (with validation)

## Data Processing Pipeline

### CSV File Processing
```typescript
// File upload and processing flow
1. FileUpload.tsx → File selection with validation
2. merge-data Edge Function → CSV parsing and merging
3. Data normalization → Clean and standardize data
4. Database insertion → Store processed data
5. AI analysis trigger → Generate insights
```

### Data Validation Rules
```typescript
// Tenant data validation
- Required fields: property, unit, tenant, rentAmount
- Numeric validation: All monetary fields
- Date validation: Lease dates and move-in dates
- Name normalization: Consistent tenant name formatting
```

## Real-time Features

### Live Data Updates
```typescript
// Real-time insight updates
useEffect(() => {
  const subscription = supabase
    .from('tenant_insights')
    .on('INSERT', payload => {
      // Update dashboard with new insights
    })
    .subscribe();
}, []);
```

### Change Tracking System
```typescript
// Historical change detection
interface TenantChanges {
  score?: { old: number; new: number };
  turnover_risk?: { old: string; new: string };
  past_due?: { old: number; new: number };
}
```

## Communication System

### Multi-channel Messaging
```
Communication Channels:
├── Email (Resend API)
│   ├── Delinquency notices
│   ├── Lease renewal reminders
│   └── General communications
└── SMS (Twilio API)
    ├── Urgent notifications
    ├── Payment reminders
    └── Quick updates
```

## Performance Optimizations

### Frontend Optimizations
- **Code splitting** with React.lazy()
- **Memoization** with React.memo() and useMemo()
- **Virtual scrolling** for large data sets
- **Image optimization** with lazy loading

### Backend Optimizations
- **Database indexing** on frequently queried columns
- **Connection pooling** with Supabase
- **Caching strategies** for static data
- **Batch processing** for bulk operations

## Deployment Architecture

### Environment Configuration
```
Production:
├── Frontend: Vercel/Netlify deployment
├── Database: Supabase hosted PostgreSQL
├── Edge Functions: Supabase serverless
├── AI Processing: AWS Lambda (us-west-1)
└── Payments: Stripe production API

Development:
├── Local development server (Vite)
├── Supabase local development
├── Environment variables (.env)
└── Hot module replacement
```

### Environment Variables
```bash
# Supabase Configuration
VITE_SUPABASE_URL=https://project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...

# Stripe Configuration  
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...

# Communication APIs
RESEND_API_KEY=re_...
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
```

## Error Handling & Logging

### Frontend Error Boundaries
```typescript
// Global error handling
try {
  await apiCall();
} catch (error) {
  console.error('Operation failed:', error);
  setError(error.message);
}
```

### Backend Error Handling
```typescript
// Edge Function error handling
try {
  const result = await processData();
  return new Response(JSON.stringify(result), {
    headers: corsHeaders
  });
} catch (error) {
  return new Response(JSON.stringify({
    error: error.message,
    details: 'Operation failed'
  }), {
    status: 500,
    headers: corsHeaders
  });
}
```

## Testing Strategy

### Component Testing
- **Unit tests** for utility functions
- **Integration tests** for API endpoints
- **E2E tests** for critical user flows
- **Visual regression tests** for UI components

### Data Testing
- **Schema validation** for database operations
- **CSV parsing tests** for file processing
- **AI model validation** for insight accuracy
- **Payment flow testing** with Stripe test mode

## Monitoring & Analytics

### Application Monitoring
- **Error tracking** with console logging
- **Performance monitoring** with React DevTools
- **Database monitoring** with Supabase dashboard
- **Payment monitoring** with Stripe dashboard

### Business Metrics
- **User engagement** tracking
- **Feature usage** analytics
- **Payment success rates**
- **AI insight accuracy** metrics

## Security Considerations

### Data Protection
- **Encryption at rest** (Supabase)
- **Encryption in transit** (HTTPS/TLS)
- **PCI compliance** (Stripe)
- **GDPR compliance** considerations

### Access Control
- **Role-based access** (owners vs tenants)
- **Row-level security** (RLS policies)
- **API rate limiting**
- **Input validation** and sanitization

## Scalability Considerations

### Horizontal Scaling
- **Serverless architecture** (Edge Functions, Lambda)
- **Database connection pooling**
- **CDN integration** for static assets
- **Load balancing** for high traffic

### Vertical Scaling
- **Database optimization** (indexing, query optimization)
- **Caching strategies** (Redis for session data)
- **Background job processing** (for heavy AI workloads)
- **Resource monitoring** and auto-scaling

This technical architecture serves as the foundation for understanding, maintaining, and extending the Havyn platform. All code organization, data flows, and system interactions follow these established patterns.