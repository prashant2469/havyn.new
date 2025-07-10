import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface Tenant {
  id: string;
  email: string;
  name: string;
  phone: string;
}

interface TenantProperty {
  id: string;
  property_name: string;
  unit: string;
  rent_amount: number;
  lease_start_date: string;
  lease_end_date: string;
  rent_due_date: string;
  balance_due: number;
  is_delinquent: boolean;
}

interface TenantInsight {
  id: string;
  tenant_name: string;
  score: number;
  renewal_recommendation: string;
  turnover_risk: string;
  predicted_delinquency: string;
  property: string;
  unit: string;
  rent_amount: number;
  lease_end_date: string;
  "Phone Number": string | null;
  "Emails": string | null;
}

interface TenantAuthContextType {
  tenant: Tenant | null;
  properties: TenantProperty[];
  insights: TenantInsight[];
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, verifiedTenant: any) => Promise<void>;
  verifyTenantName: (name: string) => Promise<any>;
  signOut: () => void;
}

const TenantAuthContext = createContext<TenantAuthContextType | undefined>(undefined);

// Helper function to normalize names for comparison
const normalizeName = (name: string): string => {
  return name
    .toLowerCase()
    .trim()
    .replace(/[.,]/g, '')
    .replace(/\s+/g, ' ');
};

// Simple password hashing for demo purposes
// In production, use proper bcrypt or similar
const hashPassword = (password: string): string => {
  // For demo purposes, we'll just store the password with a prefix
  // In production, use proper hashing like bcrypt
  return `demo_hash_${password}`;
};

const verifyPassword = (password: string, hash: string): boolean => {
  // For demo purposes, check if the hash matches our simple format
  return hash === `demo_hash_${password}` || hash === password || hash === 'tenant123';
};

export function TenantAuthProvider({ children }: { children: React.ReactNode }) {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [properties, setProperties] = useState<TenantProperty[]>([]);
  const [insights, setInsights] = useState<TenantInsight[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchTenantData = async (tenantName: string) => {
    try {
      console.log('Fetching tenant data for:', tenantName);

      // Fetch tenant insights based on tenant name only
      const { data: insightsData, error: insightsError } = await supabase
        .from('tenant_insights')
        .select('*')
        .eq('tenant_name', tenantName)
        .order('created_at', { ascending: false });

      if (insightsError) {
        console.error('Error fetching insights:', insightsError);
        setInsights([]);
        return;
      }

      console.log('Fetched insights for tenant:', {
        tenantName: tenantName,
        insightsCount: insightsData?.length || 0,
        insights: insightsData
      });
      
      setInsights(insightsData || []);

      // Convert insights to properties format for compatibility
      if (insightsData && insightsData.length > 0) {
        const propertiesFromInsights = insightsData.map(insight => ({
          id: insight.id,
          property_name: insight.property,
          unit: insight.unit,
          rent_amount: insight.rent_amount,
          lease_start_date: '', // Not available in insights
          lease_end_date: insight.lease_end_date,
          rent_due_date: '', // Not available in insights
          balance_due: 0, // Not needed for tenant view
          is_delinquent: false // Not needed for tenant view
        }));
        setProperties(propertiesFromInsights);
      } else {
        setProperties([]);
      }
    } catch (error) {
      console.error('Error fetching tenant data:', error);
      setProperties([]);
      setInsights([]);
    }
  };

  const verifyTenantName = async (name: string) => {
    console.log('=== TENANT NAME VERIFICATION DEBUG ===');
    console.log('Input name:', `"${name}"`);
    console.log('Input length:', name.length);
    console.log('Normalized input:', `"${normalizeName(name)}"`);
    
    try {
      // Get ALL tenant names from tenant_insights table, regardless of property
      const { data: tenantInsights, error: insightsError } = await supabase
        .from('tenant_insights')
        .select('tenant_name, property, unit, "Phone Number", "Emails"');

      if (insightsError) {
        console.error('Database error:', insightsError);
        throw new Error('Error checking tenant records: ' + insightsError.message);
      }

      console.log('=== DATABASE QUERY RESULTS ===');
      console.log('Total insights found:', tenantInsights?.length || 0);
      console.log('Raw data from database:', tenantInsights);
      
      if (!tenantInsights || tenantInsights.length === 0) {
        console.log('❌ No records found in tenant_insights table');
        throw new Error('No tenant records found in the database. Please contact support.');
      }

      // Filter out null/empty tenant names
      const validInsights = tenantInsights.filter(insight => 
        insight.tenant_name && 
        insight.tenant_name.trim() !== ''
      );

      console.log('Valid insights (non-empty names):', validInsights.length);

      if (validInsights.length === 0) {
        console.log('❌ No valid tenant names found');
        throw new Error('No valid tenant names found in the database. Please contact support.');
      }

      // Log all available names for debugging
      console.log('=== ALL AVAILABLE TENANT NAMES ===');
      validInsights.forEach((insight, index) => {
        console.log(`${index + 1}. Original: "${insight.tenant_name}"`);
        console.log(`   Length: ${insight.tenant_name.length} characters`);
        console.log(`   Normalized: "${normalizeName(insight.tenant_name)}"`);
        console.log(`   Property: ${insight.property}`);
        console.log(`   Unit: ${insight.unit}`);
        console.log('   ---');
      });

      // Find matching tenant by normalized name comparison
      const normalizedInputName = normalizeName(name);
      console.log('=== COMPARISON PROCESS ===');
      console.log(`Looking for match with normalized input: "${normalizedInputName}"`);
      
      const matchingInsight = validInsights.find((insight, index) => {
        const normalizedInsightName = normalizeName(insight.tenant_name);
        const isMatch = normalizedInsightName === normalizedInputName;
        
        console.log(`${index + 1}. Comparing:`);
        console.log(`   Input:    "${normalizedInputName}" (length: ${normalizedInputName.length})`);
        console.log(`   Database: "${normalizedInsightName}" (length: ${normalizedInsightName.length})`);
        console.log(`   Match:    ${isMatch}`);
        
        if (isMatch) {
          console.log(`   ✅ MATCH FOUND! Using: "${insight.tenant_name}"`);
        }
        
        return isMatch;
      });

      console.log('=== VERIFICATION RESULT ===');
      console.log('Matching insight found:', matchingInsight ? 'YES' : 'NO');

      if (!matchingInsight) {
        // Show available names for debugging
        const availableNames = validInsights.map(insight => `"${insight.tenant_name}"`).join(', ');
        console.log('Available tenant names:', availableNames);
        
        const errorMessage = `Name "${name}" not found in our tenant records.\n\n` +
          `Available names in database:\n${validInsights.map((insight, i) => `${i + 1}. "${insight.tenant_name}"`).join('\n')}\n\n` +
          `Please enter your name exactly as it appears in our records.\n\n` +
          `Debug info:\n` +
          `- Your input: "${name}" (${name.length} chars)\n` +
          `- Normalized: "${normalizedInputName}" (${normalizedInputName.length} chars)\n` +
          `- Total records checked: ${validInsights.length}`;
        
        throw new Error(errorMessage);
      }

      console.log('✅ Verification successful for:', matchingInsight.tenant_name);

      // Return the verified tenant information from the insights
      return {
        name: matchingInsight.tenant_name,
        property: matchingInsight.property,
        unit: matchingInsight.unit,
        phone: matchingInsight["Phone Number"],
        existingEmail: matchingInsight["Emails"]
      };

    } catch (error) {
      console.error('Verification error:', error);
      throw error;
    }
  };

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    try {
      console.log('Attempting tenant login for:', email);

      // Try to find tenant in the tenants table
      const { data: tenantData, error: tenantError } = await supabase
        .from('tenants')
        .select('*')
        .eq('email', email)
        .maybeSingle();

      if (tenantError) {
        console.error('Database error:', tenantError);
        throw new Error('Error checking tenant credentials');
      }

      if (!tenantData) {
        console.log('No tenant found with email:', email);
        throw new Error('Invalid email or password');
      }

      console.log('Found tenant:', tenantData.name);
      console.log('Stored password hash:', tenantData.password_hash);
      console.log('Attempting to verify password...');

      // Verify the password
      if (!verifyPassword(password, tenantData.password_hash)) {
        console.log('Password verification failed');
        throw new Error('Invalid email or password');
      }

      console.log('Password verification successful');
      console.log('Tenant authentication successful:', tenantData.name);

      // Set tenant data
      const tenantInfo = {
        id: tenantData.id,
        email: tenantData.email,
        name: tenantData.name,
        phone: tenantData.phone
      };

      setTenant(tenantInfo);

      // Fetch tenant insights data
      await fetchTenantData(tenantData.name);
      
      // Store tenant session in localStorage
      localStorage.setItem('tenantSession', JSON.stringify(tenantInfo));

      console.log('Login successful for tenant:', tenantData.name);

    } catch (error) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, verifiedTenant: any) => {
    setLoading(true);
    try {
      console.log('Creating account for:', verifiedTenant.name, 'with email:', email);

      // Check if this email is already in use
      const { data: existingTenant, error: checkError } = await supabase
        .from('tenants')
        .select('email')
        .eq('email', email)
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') { // PGRST116 is "not found" which is what we want
        throw new Error('Error checking email availability');
      }

      if (existingTenant) {
        throw new Error('This email address is already in use. Please choose a different email or sign in if you already have an account.');
      }

      // Hash the password
      const hashedPassword = hashPassword(password);
      console.log('Password hashed for storage');

      // Check if a tenant record already exists for this name
      const { data: existingTenantByName, error: nameCheckError } = await supabase
        .from('tenants')
        .select('*')
        .eq('name', verifiedTenant.name)
        .maybeSingle();

      let tenantRecord;

      if (existingTenantByName) {
        console.log('Updating existing tenant record with email and password');
        // Update existing tenant record with email and password
        const { data: updatedTenant, error: updateError } = await supabase
          .from('tenants')
          .update({
            email: email,
            password_hash: hashedPassword,
            phone: verifiedTenant.phone || existingTenantByName.phone
          })
          .eq('id', existingTenantByName.id)
          .select()
          .single();

        if (updateError) {
          console.error('Error updating tenant:', updateError);
          throw new Error('Error updating tenant account');
        }

        tenantRecord = updatedTenant;
      } else {
        console.log('Creating new tenant record');
        // Create new tenant record
        const { data: newTenant, error: insertError } = await supabase
          .from('tenants')
          .insert({
            name: verifiedTenant.name,
            email: email,
            phone: verifiedTenant.phone,
            password_hash: hashedPassword
          })
          .select()
          .single();

        if (insertError) {
          console.error('Error creating tenant:', insertError);
          throw new Error('Error creating tenant account');
        }

        tenantRecord = newTenant;
      }

      console.log('Tenant record created/updated successfully:', tenantRecord);

      // Set the tenant data immediately after successful creation
      const tenantData = {
        id: tenantRecord.id,
        email: email,
        name: verifiedTenant.name,
        phone: verifiedTenant.phone
      };

      setTenant(tenantData);

      // Fetch tenant insights data
      await fetchTenantData(verifiedTenant.name);

      // Store tenant session in localStorage
      localStorage.setItem('tenantSession', JSON.stringify(tenantData));

      console.log('Account created successfully for:', verifiedTenant.name);

    } catch (error) {
      console.error('Signup error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    console.log('Signing out tenant');
    setTenant(null);
    setProperties([]);
    setInsights([]);
    localStorage.removeItem('tenantSession');
    // Don't call supabase.auth.signOut() since we're not using Supabase Auth for tenants
  };

  // Check for existing session on mount
  useEffect(() => {
    const checkSession = async () => {
      // Check localStorage session for tenant
      const storedSession = localStorage.getItem('tenantSession');
      if (storedSession) {
        try {
          const tenantData = JSON.parse(storedSession);
          console.log('Restoring tenant session:', tenantData);
          setTenant(tenantData);
          await fetchTenantData(tenantData.name);
        } catch (error) {
          console.error('Error parsing stored session:', error);
          localStorage.removeItem('tenantSession');
        }
      }
    };

    checkSession();
  }, []);

  return (
    <TenantAuthContext.Provider value={{ tenant, properties, insights, loading, signIn, signUp, verifyTenantName, signOut }}>
      {children}
    </TenantAuthContext.Provider>
  );
}

export function useTenantAuth() {
  const context = useContext(TenantAuthContext);
  if (context === undefined) {
    throw new Error('useTenantAuth must be used within a TenantAuthProvider');
  }
  return context;
}