# Havyn - Code Organization & File Structure Guide

## Project Structure Overview

```
havyn-platform/
├── src/                          # Frontend source code
├── supabase/                     # Backend infrastructure
├── public/                       # Static assets
├── docs/                         # Documentation
└── config files                  # Build and deployment config
```

## Frontend Code Organization

### Core Application Files

#### Entry Points
- **`src/main.tsx`** - Application entry point, React root mounting
- **`src/App.tsx`** - Main app component with routing logic
- **`src/index.css`** - Global styles and Tailwind imports

#### Type Definitions
- **`src/types.ts`** - Central TypeScript interfaces
  ```typescript
  // Key interfaces defined here:
  - TenantData          # CSV import data structure
  - TenantInsight       # AI-generated insights
  - LocationInsight     # Market analysis data
  ```

### Component Architecture

#### Authentication Components
- **`src/components/AuthForm.tsx`** - Owner login/signup form
  - Handles Supabase authentication
  - Email/password validation
  - Dark mode toggle integration

- **`src/components/TenantLogin.tsx`** - Tenant authentication
  - Custom tenant verification system
  - Name-based verification against database
  - Account creation flow

#### Dashboard Components
- **`src/components/Dashboard.tsx`** - Main owner dashboard
  - File upload interface
  - Insight generation controls
  - Analytics overview

- **`src/components/TenantDashboard.tsx`** - Tenant portal
  - Rental information display
  - Payment history and options
  - Tenant score visualization

- **`src/components/MainContent.tsx`** - Owner app wrapper
  - Navigation management
  - Theme controls
  - User session handling

#### Data Visualization Components
- **`src/components/InsightCard.tsx`** - Individual tenant insight display
  - Risk visualization with progress bars
  - Historical change indicators
  - Action recommendations
  - Message tenant integration

- **`src/components/PropertyGroup.tsx`** - Property-level aggregation
  - Collapsible property sections
  - Summary statistics
  - Bulk tenant management

- **`src/components/TenantHistory.tsx`** - Historical data viewer
  - Timeline visualization
  - Score change tracking
  - Interactive charts with Chart.js

#### Data Management Components
- **`src/components/FileUpload.tsx`** - CSV file upload interface
  - Drag-and-drop functionality
  - File validation (CSV only)
  - Upload progress indication

- **`src/components/DataPreview.tsx`** - Data preview table
  - Sortable columns
  - Formatted currency display
  - Responsive table design

#### Specialized Components
- **`src/components/RentPaymentModal.tsx`** - Payment interface
  - Stripe integration
  - Multiple payment options
  - Payment status tracking

- **`src/components/MessageTenantButton.tsx`** - Communication tools
  - SMS/Email integration
  - Template message generation
  - Contact information parsing

- **`src/components/LeaseTimeline.tsx`** - Lease management
  - Expiration date tracking
  - Risk-based categorization
  - Renewal opportunity identification

### Context Providers

#### Authentication Contexts
- **`src/contexts/AuthContext.tsx`** - Owner authentication state
  ```typescript
  // Provides:
  - user: User | null
  - signIn/signUp/signOut functions
  - loading states
  - Supabase auth integration
  ```

- **`src/contexts/TenantAuthContext.tsx`** - Tenant authentication state
  ```typescript
  // Provides:
  - tenant: Tenant | null
  - properties: TenantProperty[]
  - insights: TenantInsight[]
  - Custom authentication logic
  ```

#### UI Contexts
- **`src/contexts/ThemeContext.tsx`** - Dark/light mode management
  ```typescript
  // Provides:
  - isDarkMode: boolean
  - toggleDarkMode: () => void
  - localStorage persistence
  ```

### Utility Functions

#### Data Processing
- **`src/utils/formatters.ts`** - Data formatting utilities
  ```typescript
  // Key functions:
  - parsePhoneNumber()    # Extract phone numbers from text
  - parseEmails()         # Extract email addresses
  - formatCurrency()      # Consistent currency formatting
  ```

#### Database Integration
- **`src/lib/supabase.ts`** - Supabase client configuration
  ```typescript
  // Exports configured client:
  export const supabase = createClient(url, key);
  ```

## Backend Code Organization

### Supabase Edge Functions

#### Data Processing Functions
- **`supabase/functions/merge-data/index.ts`** - CSV processing engine
  ```typescript
  // Responsibilities:
  - Parse multiple CSV files
  - Merge tenant data from different sources
  - Normalize and validate data
  - Handle combined report processing
  ```

- **`supabase/functions/generate-insights/index.ts`** - AI orchestration
  ```typescript
  // Responsibilities:
  - Coordinate with AWS Lambda
  - Process AI responses
  - Store insights in database
  - Handle change detection
  ```

#### Payment Processing Functions
- **`supabase/functions/create-checkout-session/index.ts`** - Stripe integration
  ```typescript
  // Responsibilities:
  - Create Stripe checkout sessions
  - Handle payment metadata
  - Log payment attempts
  - Error handling and validation
  ```

- **`supabase/functions/check-payment-status/index.ts`** - Payment verification
  ```typescript
  // Responsibilities:
  - Verify payment completion
  - Update payment logs
  - Handle webhook alternatives
  ```

#### Communication Functions
- **`supabase/functions/send-notification/index.ts`** - Multi-channel messaging
  ```typescript
  // Integrations:
  - Resend API for email
  - Twilio API for SMS
  - Template message handling
  - Communication logging
  ```

### Database Migrations

#### Core Schema Migrations
- **`20250409001457_still_king.sql`** - Initial tenant_insights table
- **`20250411003011_morning_mode.sql`** - Add unit and reasoning columns
- **`20250415070433_violet_shore.sql`** - Add user_id for multi-tenancy
- **`20250417073258_wispy_breeze.sql`** - Add financial tracking fields

#### Feature Enhancement Migrations
- **`20250418020128_icy_grove.sql`** - Add changes tracking (JSONB)
- **`20250422215632_muddy_fog.sql`** - Add report versioning system
- **`20250626221201_amber_reef.sql`** - Add tenant authentication tables
- **`20250704004409_young_bar.sql`** - Add payment logging system

## Data Flow Architecture

### File Upload to Insights Pipeline
```
1. FileUpload.tsx
   ↓ (CSV files)
2. merge-data Edge Function
   ↓ (processed data)
3. Supabase Database
   ↓ (tenant data)
4. generate-insights Edge Function
   ↓ (AWS Lambda call)
5. AI Processing
   ↓ (insights)
6. Database Storage
   ↓ (display)
7. Dashboard Components
```

### Authentication Flow
```
Owner Flow:
AuthForm.tsx → AuthContext → Supabase Auth → MainContent.tsx

Tenant Flow:
TenantLogin.tsx → TenantAuthContext → Custom Auth → TenantDashboard.tsx
```

### Payment Processing Flow
```
TenantDashboard.tsx
   ↓
RentPaymentModal.tsx
   ↓
create-checkout-session Edge Function
   ↓
Stripe Checkout (external)
   ↓
check-payment-status Edge Function
   ↓
Payment confirmation
```

## State Management Patterns

### Global State (Context API)
```typescript
// Authentication state
const { user, signIn, signOut } = useAuth();

// Theme state
const { isDarkMode, toggleDarkMode } = useTheme();

// Tenant state
const { tenant, properties, insights } = useTenantAuth();
```

### Local Component State
```typescript
// Data fetching pattern
const [data, setData] = useState([]);
const [loading, setLoading] = useState(false);
const [error, setError] = useState(null);

useEffect(() => {
  fetchData();
}, [dependency]);
```

### Form State Management
```typescript
// Form handling pattern
const [formData, setFormData] = useState(initialState);

const handleInputChange = (e) => {
  setFormData(prev => ({
    ...prev,
    [e.target.name]: e.target.value
  }));
};
```

## Error Handling Patterns

### Frontend Error Handling
```typescript
// Async operation pattern
try {
  setLoading(true);
  const result = await apiCall();
  setData(result);
} catch (error) {
  setError(error.message);
  console.error('Operation failed:', error);
} finally {
  setLoading(false);
}
```

### Backend Error Handling
```typescript
// Edge Function pattern
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

## Styling Organization

### Tailwind CSS Patterns
```css
/* Component-specific styles in index.css */
.preview-table {
  @apply min-w-full divide-y divide-gray-200 dark:divide-gray-700;
}

/* Dark mode transitions */
.dark * {
  @apply transition-colors duration-200;
}
```

### Color System
```javascript
// tailwind.config.js
colors: {
  havyn: {
    primary: '#3F6B28',
    dark: '#345A22',
    light: '#4C8032',
    // ... additional shades
  }
}
```

## Testing Organization

### Component Testing Structure
```
src/
├── __tests__/
│   ├── components/
│   ├── utils/
│   └── contexts/
└── __mocks__/
    ├── supabase.ts
    └── stripe.ts
```

### Test Patterns
```typescript
// Component test pattern
describe('ComponentName', () => {
  it('should render correctly', () => {
    render(<ComponentName />);
    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });
});
```

This code organization guide provides a comprehensive map of where functionality is implemented and how components interact within the Havyn platform. Use this as a reference for understanding the codebase structure and locating specific features.