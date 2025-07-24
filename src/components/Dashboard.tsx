import React, { useState, useEffect } from 'react';
import { FileUpload } from './FileUpload';
import { DataPreview } from './DataPreview';
import { PropertyGroup } from './PropertyGroup';
import { RiskDistributionBar } from './RiskDistributionBar';
import { MetricCard } from './MetricCard';
import { LeaseTimeline } from './LeaseTimeline';
import { DelinquencyList } from './DelinquencyList';
import { LocationInsights } from './LocationInsights';
import { TenantData, TenantInsight } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { 
  Loader2, History, Building2, AlertTriangle, Users, TrendingUp, 
  ArrowUpRight, FileX, Upload, FileCheck, Eye, Brain, Bug, 
  ChevronDown, ChevronUp, DollarSign, Clock, AlertCircle,
  ArrowUpDown, Search
} from 'lucide-react';

type SortField = 'property' | 'units' | 'score' | 'risk' | 'delinquency';
type SortOrder = 'asc' | 'desc';

type DelinquencySortField = 'tenant' | 'property' | 'amount' | 'aging';

// POLLING HELP
async function pollForResults(jobId, maxAttempts = 30, intervalMs = 2000) {
  const getResultUrl = `${supabase.supabaseUrl}/functions/v1/get_result?job_id=${jobId}`;
  let attempts = 0;
  while (attempts < maxAttempts) {
    const res = await fetch(getResultUrl, {
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${accessToken}`
      }
    });
    if (res.status === 200) return await res.json();
    if (res.status !== 202) throw new Error(`Polling failed: ${res.status}`);
    await new Promise(r => setTimeout(r, intervalMs));
    attempts++;
  }
  throw new Error('Polling timed out');
}
//POLLING HELP

export function Dashboard() {
  const { user } = useAuth();
  const [files, setFiles] = useState<{ [key: string]: File }>({});
  const [mergedData, setMergedData] = useState<TenantData[]>([]);
  const [insights, setInsights] = useState<TenantInsight[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showSavedInsights, setShowSavedInsights] = useState<boolean>(false);
  const [showUploadSection, setShowUploadSection] = useState<boolean>(true);
  const [showPreview, setShowPreview] = useState<boolean>(false);
  const [generatingProgress, setGeneratingProgress] = useState<number>(0);
  const [requestData, setRequestData] = useState<string | null>(null);
  const [showDebugPanel, setShowDebugPanel] = useState<boolean>(false);
  const [debugData, setDebugData] = useState<{
    allTenants: TenantData[];
    sampledTenants: TenantData[];
  } | null>(null);
  const [expandedProperties, setExpandedProperties] = useState<Set<string>>(new Set());
  const [allExpanded, setAllExpanded] = useState(true);
  const [selectedProperty, setSelectedProperty] = useState<string | null>(null);
  const [selectedTenant, setSelectedTenant] = useState<TenantInsight | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'location' | 'delinquency' | 'leases'>('overview');
  const [propertySortField, setPropertySortField] = useState<SortField>('property');
  const [propertySortOrder, setPropertySortOrder] = useState<SortOrder>('asc');
  const [delinquencySortField, setDelinquencySortField] = useState<DelinquencySortField>('amount');
  const [delinquencySortOrder, setDelinquencySortOrder] = useState<SortOrder>('desc');
  const [searchQuery, setSearchQuery] = useState('');
  const [analysisResults, setAnalysisResults] = useState<{
    totalRows: number;
    unchangedRows: number;
    changedRows: number;
    changes: Array<{
      tenant: string;
      property: string;
      unit: string;
      changes: Record<string, { old: any; new: any }>;
    }>;
  } | null>(null);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isGenerating && generatingProgress < 95) {
      interval = setInterval(() => {
        setGeneratingProgress(prev => {
          const increment = Math.random() * 15;
          const newProgress = prev + increment;
          return newProgress > 95 ? 95 : newProgress;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isGenerating, generatingProgress]);

  useEffect(() => {
    if (insights.length > 0) {
      const properties = insights.map(insight => insight.property);
      setExpandedProperties(new Set(properties));
      setAllExpanded(true);
    }
  }, [insights]);

  const handleFileSelect = (newFiles: { [key: string]: File }) => {
    if (newFiles.combined) {
      setFiles({ combined: newFiles.combined });
    } else {
      const { combined, ...existingFiles } = files;
      setFiles({ ...existingFiles, ...newFiles });
    }
    setError(null);
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64String = reader.result as string;
        const base64Content = base64String.split(',')[1];
        resolve(base64Content);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const fetchSavedInsights = async () => {
    if (!user) return;
    
    setLoading(true);
    setError(null);
    setShowSavedInsights(true);
    setShowUploadSection(false);
    setMergedData([]);
    setInsights([]);
    setShowPreview(false);
    setGeneratingProgress(0);
    setRequestData(null);
    setDebugData(null);
    
    try {
      // First get the latest report
      const { data: latestReport, error: reportError } = await supabase
        .from('insight_reports')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_latest', true)
        .single();

      if (reportError) throw reportError;

      if (!latestReport) {
        setError('No previous insights found for your account');
        return;
      }

      // Then get all insights from that report
      const { data, error: insightsError } = await supabase
        .from('tenant_insights')
        .select('*')
        .eq('report_id', latestReport.id)
        .order('created_at', { ascending: false });

      if (insightsError) throw insightsError;

      if (!data || data.length === 0) {
        setError('No previous insights found for your account');
        return;
      }

      setInsights(data);
    } catch (error) {
      console.error('Error fetching saved insights:', error);
      setError(error instanceof Error ? error.message : 'Error fetching saved insights');
      setInsights([]);
    } finally {
      setLoading(false);
    }
  };

  const mergeFiles = async () => {
    if (files.combined) {
      if (!files.combined) {
        setError('Please upload the combined report file');
        return;
      }
    } else {
      if (!files.delinquency || !files.rentRoll || !files.directory) {
        setError('Please upload all three files or a combined report file');
        return;
      }
    }

    setLoading(true);
    setError(null);
    console.log('=== STARTING INSIGHTS GENERATION ===');
    console.log('User ID:', user.id);
    console.log('Data length:', data.length);
    setShowSavedInsights(false);
    setInsights([]);
    setShowPreview(false);
    setGeneratingProgress(0);
    setRequestData(null);
    setDebugData(null);
    setAnalysisResults(null);
    
    try {
      let base64Data;
      
      if (files.combined) {
        base64Data = {
          combined: await fileToBase64(files.combined)
        };
      } else {
        base64Data = {
          delinquency: await fileToBase64(files.delinquency),
          rent_roll: await fileToBase64(files.rentRoll),
          directory: await fileToBase64(files.directory)
        };
      }

      const response = await fetch(`${supabase.supabaseUrl}/functions/v1/merge-data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabase.supabaseKey}`
        },
        body: JSON.stringify(base64Data),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Analyze data changes before setting merged data
      await analyzeDataChanges(data);
      
      setMergedData(data);
    } catch (error) {
      console.error('Error merging files:', error);
      setError(error instanceof Error ? error.message : 'Error merging files');
      setMergedData([]);
    } finally {
      setLoading(false);
    }
  };

  const analyzeDataChanges = async (newData: TenantData[]) => {
    if (!user) return;

    try {
      console.log('=== STEP 1: STARTING JOB (POST) ===');
      console.log('Starting data analysis...');
      
      // Fetch existing tenant insights from database
      const { data: existingInsights, error } = await supabase
        .from('tenant_insights')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching existing insights:', error);
        return;
      }

      console.log(`Found ${existingInsights?.length || 0} existing insights`);
      
      if (!existingInsights || existingInsights.length === 0) {
        console.log('No existing data to compare against');
        setAnalysisResults({
          totalRows: newData.length,
          unchangedRows: 0,
          changedRows: newData.length,
          changes: []
        });
        return;
      }

      // Create a map of existing data for quick lookup
      const existingDataMap = new Map();
      existingInsights.forEach(insight => {
        const key = `${insight.property}-${insight.unit}-${insight.tenant_name}`;
        existingDataMap.set(key, {
          rent_amount: insight.rent_amount,
          delinquent_rent: insight.delinquent_rent,
          past_due: insight.past_due,
          aging_30: insight.aging_30,
          aging_60: insight.aging_60,
          aging_90: insight.aging_90,
          aging_over_90: insight.aging_over_90,
          total_balance: insight.total_balance,
          delinquency_notes: insight.delinquency_notes
        });
      });

      const changes: Array<{
        tenant: string;
        property: string;
        unit: string;
        changes: Record<string, { old: any; new: any }>;
      }> = [];

      let unchangedCount = 0;
      let changedCount = 0;

      // Compare each new row with existing data
      newData.forEach(newRow => {
        const key = `${newRow.property}-${newRow.unit}-${newRow.tenant}`;
        const existingRow = existingDataMap.get(key);

        if (!existingRow) {
          // New tenant - count as changed
          changedCount++;
          console.log(`New tenant found: ${newRow.tenant} at ${newRow.property} - ${newRow.unit}`);
          return;
        }

        // Compare relevant fields
        const fieldsToCompare = {
          rent_amount: newRow.rentAmount || 0,
          delinquent_rent: newRow.delinquentRent || 0,
          past_due: newRow.pastDue || 0,
          aging_30: newRow.aging30 || 0,
          aging_60: newRow.aging60 || 0,
          aging_90: newRow.aging90 || 0,
          aging_over_90: newRow.agingOver90 || 0,
          total_balance: (newRow.pastDue || 0) + (newRow.delinquentRent || 0),
          delinquency_notes: newRow.delinquencyNotes || ''
        };

        const rowChanges: Record<string, { old: any; new: any }> = {};
        let hasChanges = false;

        // Check each field for changes
        Object.entries(fieldsToCompare).forEach(([field, newValue]) => {
          const oldValue = existingRow[field];
          
          // Handle numeric comparisons with tolerance for floating point
          if (typeof newValue === 'number' && typeof oldValue === 'number') {
            if (Math.abs(newValue - oldValue) > 0.01) {
              rowChanges[field] = { old: oldValue, new: newValue };
              hasChanges = true;
            }
          } else if (String(newValue).trim() !== String(oldValue).trim()) {
            rowChanges[field] = { old: oldValue, new: newValue };
            hasChanges = true;
          }
        });

        if (hasChanges) {
          changedCount++;
          changes.push({
            tenant: newRow.tenant,
            property: newRow.property,
            unit: newRow.unit,
            changes: rowChanges
          });
          
          console.log(`Changes detected for ${newRow.tenant}:`, rowChanges);
        } else {
          unchangedCount++;
          console.log(`No changes for ${newRow.tenant} - skipping`);
        }
      });

      const results = {
        totalRows: newData.length,
        unchangedRows: unchangedCount,
        changedRows: changedCount,
        changes
      };

      console.log('Analysis Results:', results);
      setAnalysisResults(results);

      // Log summary
      console.log(`Data Analysis Complete:
        - Total rows processed: ${results.totalRows}
        - Unchanged rows (skipped): ${results.unchangedRows}
        - Changed rows (kept): ${results.changedRows}
        - Detailed changes: ${results.changes.length} records`);

    } catch (error) {
      console.error('Error analyzing data changes:', error);
    }
  };

  /*
  const generateInsights = async () => {
    if (!mergedData.length) {
      setError('Please merge files first');
      return;
    }

    if (!user) {
      setError('Please log in to generate insights');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setShowSavedInsights(false);
    setShowUploadSection(false);
    setShowPreview(false);
    setGeneratingProgress(0);
    
    try {
      setDebugData({
        allTenants: mergedData,
        sampledTenants: mergedData
      });

      const requestBody = { 
        tenants: mergedData,
        user_id: user.id
      };
      
      setRequestData(JSON.stringify(requestBody, null, 2));

      const response = await fetch(`${supabase.supabaseUrl}/functions/v1/generate-insights`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabase.supabaseKey}`
        },
        body: JSON.stringify(requestBody),
      });

      console.log('POST response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setGeneratingProgress(100);
      setTimeout(() => {
        // Check if this is debug data from Lambda
        if (data.debug && data.rawLambdaResponse) {
          // Display raw JSON for testing
          alert('Raw Lambda Response:\n\n' + JSON.stringify(data.rawLambdaResponse, null, 2));
          console.log('Raw Lambda Response:', data.rawLambdaResponse);
          console.log('Request Payload:', data.requestPayload);
          setInsights([]);
        } else {
          setInsights(data);
        }
        setGeneratingProgress(0);
        setRequestData(null);
        setIsGenerating(false);
      }, 500);
    } catch (error) {
      console.error('Error generating insights:', error);
      setError(error instanceof Error ? error.message : 'Error generating insights');
      setInsights([]);
      setIsGenerating(false);
    }
  };
*/
  // NEW
  const generateInsights = async () => {
    if (!mergedData.length) {
      setError('Please merge files first');
      return;
    }
    if (!user) {
      setError('Please log in to generate insights');
      return;
    }
  
    setIsGenerating(true);
    setError(null);
    setShowSavedInsights(false);
    setShowUploadSection(false);
    setShowPreview(false);
    setGeneratingProgress(0);
  
    try {
      console.log('Starting Generate Insights flow...');
      
      // 1. Generate a unique job_id
      let job_id = crypto.randomUUID();
  
      setDebugData({
        allTenants: mergedData,
        sampledTenants: mergedData
      });

      // Prepare tenant data for API
      const tenantData = mergedData.map(tenant => ({
        property: tenant.property,
        unit: tenant.unit,
        tenant: tenant.tenant,
        rentAmount: tenant.rentAmount,
        pastDue: tenant.pastDue,
        delinquentRent: tenant.delinquentRent,
        aging30: tenant.aging30,
        aging60: tenant.aging60,
        aging90: tenant.aging90,
        agingOver90: tenant.agingOver90,
        delinquencyNotes: tenant.delinquencyNotes,
        moveInDate: tenant.moveInDate,
        leaseEndDate: tenant.leaseEndDate,
        phoneNumbers: tenant.phoneNumbers,
        emails: tenant.emails
      }));
  
      const requestBody = { 
        tenants: tenantData,
        user_id: user.id,
        job_id // Add job_id to request!
      };
      setRequestData(JSON.stringify(requestBody, null, 2));
  
      console.log('Calling generate-insights edge function...');
      // 2. POST to generate-insights
      const response = await fetch(`${supabase.supabaseUrl}/functions/v1/generate-insights`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabase.supabaseKey}`
        },
        body: JSON.stringify(requestBody),
      });
  
      // 3. Handle 202 response and extract job_id (may be in body or rawLambdaResponse)
      let jobIdToPoll = job_id; // fallback
      if (response.status === 202 || response.status === 200) {
        const respData = await response.json();
        // Try to extract job_id if it is sent from backend (for forward compatibility)
        if (respData.job_id) jobIdToPoll = respData.job_id;
        else if (respData.body) {
          const b = typeof respData.body === 'string' ? JSON.parse(respData.body) : respData.body;
          if (b.job_id) jobIdToPoll = b.job_id;
        }
      } else {
        const errorText = await response.text();
        console.error('POST failed:', errorText);
        console.error('Edge function error:', response.status, errorText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }
  
      ({ job_id } = await response.json());
      console.log('Job started with ID:', job_id);
      
      if (!job_id) {
        throw new Error('No job_id returned from POST request');
      }

      console.log('=== STEP 2: POLLING FOR RESULTS (GET) ===');
      
      // Start polling for results
      const timeout = Date.now() + 60000; // 60 second timeout
      let insights = [];
      
      while (Date.now() < timeout) {
        console.log('Polling for results...');
        
        const pollResponse = await fetch(
          `${supabase.supabaseUrl}/functions/v1/generate-insights?job_id=${encodeURIComponent(job_id)}`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`
            }
          }
        );
        
        console.log('GET response status:', pollResponse.status);
        
        if (pollResponse.status === 200) {
          console.log('Job completed! Processing results...');
          insights = await pollResponse.json();
          console.log('Received insights:', { count: insights.length });
          break;
        }
        
        if (pollResponse.status === 202) {
          console.log('Job still processing, waiting 2 seconds...');
          await new Promise(resolve => setTimeout(resolve, 2000));
          continue;
        }
        
        // Any other status is an error
        const errorText = await pollResponse.text();
        console.error('Polling error:', pollResponse.status, errorText);
        throw new Error(`Polling error: ${pollResponse.status}`);
      }
      
      if (Date.now() >= timeout) {
        throw new Error('Timeout waiting for insights generation');
      }
      
      console.log('=== INSIGHTS GENERATION COMPLETE ===');
      setInsights(insights);
      setGeneratingProgress(10);
  
      // 4. Poll for completion, also with user token!
      const results = await pollForResults(jobIdToPoll, session.access_token);
      console.log('Received insights:', { count: results?.length });
      setGeneratingProgress(100);
  
      setTimeout(() => {
        if (Array.isArray(results)) {
          setInsights(results);
          console.log('Successfully generated insights');
        } else {
          console.error('Invalid insights format:', results);
          throw new Error('Invalid response format');
        }
        setGeneratingProgress(0);
        setRequestData(null);
        setIsGenerating(false);
      }, 500);
    } catch (error) {
      console.error('Generate insights error:', error);
      console.error('=== INSIGHTS GENERATION ERROR ===');
      console.error('Error:', err);
      setError(error instanceof Error ? error.message : 'Error generating insights');
      setInsights([]);
      setIsGenerating(false);
    }
  };
  // NEW
  
  const showUploadView = () => {
    setShowUploadSection(true);
    setShowSavedInsights(false);
    setMergedData([]);
    setInsights([]);
    setError(null);
    setShowPreview(false);
    setGeneratingProgress(0);
    setRequestData(null);
    setDebugData(null);
  };

  const togglePreview = () => {
    setShowPreview(!showPreview);
  };

  const toggleDebugPanel = () => {
    setShowDebugPanel(!showDebugPanel);
  };

  const toggleAllProperties = () => {
    if (allExpanded) {
      setExpandedProperties(new Set());
    } else {
      const properties = insights.map(insight => insight.property);
      setExpandedProperties(new Set(properties));
    }
    setAllExpanded(!allExpanded);
  };

  const toggleProperty = (property: string) => {
    const newExpanded = new Set(expandedProperties);
    if (newExpanded.has(property)) {
      newExpanded.delete(property);
    } else {
      newExpanded.add(property);
    }
    setExpandedProperties(newExpanded);
    setAllExpanded(newExpanded.size === Object.keys(propertyGroups).length);
  };

  const calculateOverallStats = () => {
    // Ensure insights is always treated as an array
    const insightsArray = Array.isArray(insights) ? insights : [];
    
    if (!insightsArray.length) return null;

    const totalRevenue = insightsArray.reduce((sum, insight) => sum + insight.rent_amount, 0);
    const averageRent = totalRevenue / insightsArray.length;

    const delinquentCount = insightsArray.filter(i => i.delinquent_rent > 0).length;
    const upcomingLeases = insightsArray.filter(i => {
      if (!i.lease_end_date) return false;
      const leaseEnd = new Date(i.lease_end_date);
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      return leaseEnd <= thirtyDaysFromNow;
    }).length;

    const turnoverRisks = {
      low: 0,
      medium: 0,
      high: 0
    };

    const delinquencyRisks = {
      low: 0,
      medium: 0,
      high: 0
    };

    insightsArray.forEach(insight => {
      const turnoverRisk = insight.turnover_risk.toLowerCase() as 'low' | 'medium' | 'high';
      turnoverRisks[turnoverRisk]++;

      const delinquencyRisk = insight.predicted_delinquency.toLowerCase() as 'low' | 'medium' | 'high';
      delinquencyRisks[delinquencyRisk]++;
    });

    return {
      turnoverRisks,
      delinquencyRisks,
      totalUnits: insightsArray.length,
      totalRevenue,
      averageRent,
      delinquentCount,
      upcomingLeases,
      highRiskCount: insightsArray.filter(i => i.turnover_risk.toLowerCase() === 'high').length,
      retentionNeeded: insightsArray.filter(i => i.retention_outreach_needed).length,
      rentIncreaseOpportunities: insightsArray.filter(i => i.raise_rent_opportunity).length,
      averageScore: Math.round(
        insightsArray.reduce((sum, insight) => sum + insight.score, 0) / insightsArray.length
      )
    };
  };

  const handleTenantClick = (tenant: TenantInsight) => {
    setSelectedTenant(tenant);
  };

  const filterAndSortProperties = () => {
    // First, filter properties based on search
    const filteredGroups = Object.entries(propertyGroups).reduce((acc, [property, insights]) => {
      const matchingInsights = insights.filter(insight => 
        insight.tenant_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        insight.unit.toLowerCase().includes(searchQuery.toLowerCase())
      );
      
      if (matchingInsights.length > 0) {
        acc[property] = matchingInsights;
      }
      return acc;
    }, {} as Record<string, TenantInsight[]>);

    // Then sort the filtered properties
    return Object.entries(filteredGroups).sort((a, b) => {
      const [propA, insightsA] = a;
      const [propB, insightsB] = b;
      
      const compareValue = (valA: any, valB: any) => {
        if (propertySortOrder === 'asc') {
          return valA > valB ? 1 : -1;
        }
        return valA < valB ? 1 : -1;
      };

      switch (propertySortField) {
        case 'property':
          return compareValue(propA, propB);
        case 'units':
          return compareValue(insightsA.length, insightsB.length);
        case 'score':
          const avgScoreA = insightsA.reduce((sum, i) => sum + i.score, 0) / insightsA.length;
          const avgScoreB = insightsB.reduce((sum, i) => sum + i.score, 0) / insightsB.length;
          return compareValue(avgScoreA, avgScoreB);
        case 'risk':
          const riskCountA = insightsA.filter(i => i.turnover_risk.toLowerCase() === 'high').length;
          const riskCountB = insightsB.filter(i => i.turnover_risk.toLowerCase() === 'high').length;
          return compareValue(riskCountA, riskCountB);
        case 'delinquency':
          const delinqCountA = insightsA.filter(i => i.high_delinquency_alert).length;
          const delinqCountB = insightsB.filter(i => i.high_delinquency_alert).length;
          return compareValue(delinqCountA, delinqCountB);
        default:
          return 0;
      }
    });
  };

  const getSortIcon = (field: SortField | DelinquencySortField, currentField: string, order: SortOrder) => {
    if (field !== currentField) {
      return <ArrowUpDown className="w-4 h-4 text-gray-400" />;
    }
    return order === 'asc' ? 
      <ChevronUp className="w-4 h-4 text-[#3F6B28]" /> : 
      <ChevronDown className="w-4 h-4 text-[#3F6B28]" />;
  };

  const stats = calculateOverallStats();
  const propertyGroups = (Array.isArray(insights) ? insights : []).reduce((groups: { [key: string]: TenantInsight[] }, insight) => {
    if (!groups[insight.property]) {
      groups[insight.property] = [];
    }
    groups[insight.property].push(insight);
    return groups;
  }, {});

  const allFilesUploaded = Object.keys(files).length === 3;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex flex-wrap gap-4 mb-8">
        <button
          onClick={showUploadView}
          className="px-4 py-2 bg-[#3F6B28] text-white rounded-lg hover:bg-[#345A22] disabled:opacity-50 disabled:hover:bg-[#3F6B28] flex items-center gap-2"
        >
          <Upload className="w-5 h-5" />
          <span>Upload New Files</span>
        </button>
        <button
          onClick={fetchSavedInsights}
          disabled={loading}
          className="px-4 py-2 bg-[#3F6B28] text-white rounded-lg hover:bg-[#345A22] disabled:opacity-50 disabled:hover:bg-[#3F6B28] flex items-center gap-2"
        >
          <History className="w-5 h-5" />
          <span>View Saved Insights</span>
        </button>
        {import.meta.env.DEV && (
          <button
            onClick={toggleDebugPanel}
            className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 flex items-center gap-2"
          >
            <Bug className="w-5 h-5" />
            <span>Toggle Debug Panel</span>
          </button>
        )}
      </div>

      {showUploadSection && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-[#3F6B28] dark:text-green-400 mb-6">Upload Files</h2>
          <div className="grid grid-cols-1 gap-6 mb-8">
            <FileUpload
              onFilesSelected={handleFileSelect}
              fileType="combined"
              label="Upload Combined Report CSV"
              optional={!files.combined}
            />
            <div className="text-center text-sm text-gray-500 dark:text-gray-400">- OR -</div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <FileUpload
                onFilesSelected={handleFileSelect}
                fileType="delinquency"
                label="Upload Delinquency CSV"
                optional={!!files.combined}
              />
              <FileUpload
                onFilesSelected={handleFileSelect}
                fileType="rentRoll"
                label="Upload Rent Roll CSV"
                optional={!!files.combined}
              />
              <FileUpload
                onFilesSelected={handleFileSelect}
                fileType="directory"
                label="Upload Tenant Directory CSV"
                optional={!!files.combined}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex-1">
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <FileCheck className="w-5 h-5 text-[#3F6B28] dark:text-green-400" />
                <span>
                  {files.combined 
                    ? "Combined report file uploaded" 
                    : `${Object.keys(files).length}/3 files uploaded`}
                </span>
              </div>
            </div>
            <div className="flex gap-4">
              <button
                onClick={mergeFiles}
                disabled={loading || (!files.combined && !allFilesUploaded)}
                className="px-6 py-2 bg-[#3F6B28] text-white rounded-lg hover:bg-[#345A22] disabled:opacity-50 disabled:hover:bg-[#3F6B28] flex items-center gap-2 transition-colors"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <ArrowUpRight className="w-5 h-5" />
                    <span>Process Data</span>
                  </>
                )}
              </button>
              {mergedData.length > 0 && (
                <>
                  <button
                    onClick={togglePreview}
                    className="px-4 py-2 text-[#3F6B28] dark:text-green-400 border border-[#3F6B28] dark:border-green-400 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 transition-colors"
                  >
                    <Eye className="w-5 h-5" />
                    <span>{showPreview ? 'Hide Preview' : 'Show Preview'}</span>
                  </button>
                  <button
                    onClick={generateInsights}
                    disabled={isGenerating}
                    className="px-6 py-2 bg-[#3F6B28] text-white rounded-lg hover:bg-[#345A22] disabled:opacity-50 disabled:hover:bg-[#3F6B28] flex items-center gap-2 transition-colors"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Generating...</span>
                      </>
                    ) : (
                      <>
                        <TrendingUp className="w-5 h-5" />
                        <span>Generate Insights</span>
                      </>
                    )}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Data Analysis Results */}
      {analysisResults && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <Search className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Data Analysis Results</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {analysisResults.totalRows}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Total Rows</div>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {analysisResults.unchangedRows}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Unchanged (Skipped)</div>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {analysisResults.changedRows}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Changed (Kept)</div>
            </div>
          </div>

          {analysisResults.changes.length > 0 && (
            <div>
              <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-4">
                Detailed Changes ({analysisResults.changes.length} records)
              </h4>
              <div className="max-h-96 overflow-y-auto space-y-4">
                {analysisResults.changes.map((change, index) => (
                  <div key={index} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h5 className="font-medium text-gray-900 dark:text-white">
                          {change.tenant}
                        </h5>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {change.property} - Unit {change.unit}
                        </p>
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {Object.keys(change.changes).length} change{Object.keys(change.changes).length !== 1 ? 's' : ''}
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      {Object.entries(change.changes).map(([field, values]) => (
                        <div key={field} className="flex items-center justify-between text-sm">
                          <span className="font-medium text-gray-700 dark:text-gray-300 capitalize">
                            {field.replace(/_/g, ' ')}:
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-red-600 dark:text-red-400">
                              {typeof values.old === 'number' ? `$${values.old.toFixed(2)}` : 
                               values.old || 'Empty'}
                            </span>
                            <span className="text-gray-400">→</span>
                            <span className="text-green-600 dark:text-green-400">
                              {typeof values.new === 'number' ? `$${values.new.toFixed(2)}` : 
                               values.new || 'Empty'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {analysisResults.changes.length === 0 && analysisResults.unchangedRows > 0 && (
            <div className="text-center py-8">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                </div>
              </div>
              <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No Changes Detected
              </h4>
              <p className="text-gray-600 dark:text-gray-400">
                All {analysisResults.unchangedRows} records match existing data exactly.
              </p>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="mb-8 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {isGenerating && generatingProgress > 0 && (
        <div className="mb-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <Brain className="w-6 h-6 text-[#3F6B28] dark:text-green-400 animate-pulse" />
            <h3 className="text-lg font-semibold text-[#3F6B28] dark:text-green-400">Generating Insights</h3>
          </div>
          <div className="space-y-4">
            <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-[#3F6B28] dark:bg-green-400 rounded-full transition-all duration-300"
                style={{ width: `${generatingProgress}%` }}
              />
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {generatingProgress < 30 && "Analyzing tenant data..."}
              {generatingProgress >= 30 && generatingProgress < 60 && "Calculating risk factors..."}
              {generatingProgress >= 60 && generatingProgress < 90 && "Generating recommendations..."}
              {generatingProgress >= 90 && "Finalizing insights..."}
            </p>
          </div>
        </div>
      )}

      {import.meta.env.DEV && showDebugPanel && debugData && (
        <div className="mb-8 bg-gray-900 rounded-lg shadow-lg p-6 text-white">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Bug className="w-5 h-5" />
            Debug Information
          </h3>
          
          <div className="space-y-6">
            <div>
              <h4 className="text-sm font-medium text-gray-400 mb-2">All Tenants ({debugData.allTenants.length})</h4>
              <div className="bg-gray-800 rounded-lg p-4 overflow-x-auto">
                <pre className="text-xs text-gray-300">
                  {JSON.stringify(debugData.allTenants.slice(0, 5).map(tenant => ({
                    property: tenant.property,
                    unit: tenant.unit,
                    tenant: tenant.tenant,
                    rentAmount: tenant.rentAmount,
                    delinquentRent: tenant.delinquentRent
                  })), null, 2)}
                </pre>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-400 mb-2">Sampled Random Tenants ({debugData.sampledTenants.length})</h4>
              <div className="bg-gray-800 rounded-lg p-4 overflow-x-auto">
                <pre className="text-xs text-gray-300">
                  {JSON.stringify(debugData.sampledTenants, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}

      {requestData && (
        <div className="mb-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold text-[#3F6B28] dark:text-green-400 mb-4">API Request Data</h3>
          <pre className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg overflow-x-auto text-sm">
            {requestData}
          </pre>
        </div>
      )}

      {error && showSavedInsights && !insights.length && (
        <div className="flex flex-col items-center justify-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
          <FileX className="w-16 h-16 text-gray-400 mb-4" />
          <h3 className="text-xl font-medium text-[#3F6B28] dark:text-green-400 mb-2">No Previous Insights</h3>
          <p className="text-gray-600 dark:text-gray-400">Upload your files and generate new insights to get started.</p>
        </div>
      )}

      {showPreview && mergedData.length > 0 && !showSavedInsights && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4 text-[#3F6B28] dark:text-green-400">Data Preview</h2>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
            <DataPreview data={mergedData} />
          </div>
        </div>
      )}

      {stats && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCard
              title="Total Revenue"
              value={`$${stats.totalRevenue.toLocaleString()}`}
              icon={<DollarSign className="w-6 h-6" />}
              color="green"
            />
            <MetricCard
              title="Average Rent"
              value={`$${Math.round(stats.averageRent).toLocaleString()}`}
              icon={<Building2 className="w-6 h-6" />}
              color="blue"
            />
            <MetricCard
              title="Delinquent Tenants"
              value={stats.delinquentCount}
              icon={<AlertCircle className="w-6 h-6" />}
              color="red"
            />
            <MetricCard
              title="Upcoming Leases"
              value={stats.upcomingLeases}
              icon={<Clock className="w-6 h-6" />}
              color="purple"
            />
          </div>

          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="flex space-x-8">
              <button
                onClick={() => setActiveTab('overview')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'overview'
                    ? 'border-havyn-primary text-havyn-primary dark:border-green-400 dark:text-green-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('location')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'location'
                    ? 'border-havyn-primary text-havyn-primary dark:border-green-400 dark:text-green-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                Location Insights
              </button>
              <button
                onClick={() => setActiveTab('delinquency')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'delinquency'
                
                    ? 'border-havyn-primary text-havyn-primary dark:border-green-400 dark:text-green-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                Delinquency
              </button>
              <button
                onClick={() => setActiveTab('leases')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'leases'
                    ? 'border-havyn-primary text-havyn-primary dark:border-green-400 dark:text-green-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                Lease Timeline
              </button>
            </nav>
          </div>

          <div className="mt-6">
            {activeTab === 'overview' && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  <RiskDistributionBar
                    data={stats.turnoverRisks}
                    title="Turnover Risk"
                    subtitle="Distribution by risk level"
                  />
                  <RiskDistributionBar
                    data={stats.delinquencyRisks}
                    title="Delinquency Risk"
                    subtitle="Distribution by risk level"
                  />
                </div>

                <div>
                  <div className="mb-6">
                    <div className="flex justify-between items-center mb-4">
                      <h2 className="text-xl font-semibold text-[#3F6B28] dark:text-green-400 whitespace-nowrap">
                        {showSavedInsights ? 'Save Insights' : 'Property Insights'}
                      </h2>
                    </div>

                    <div className="flex flex-wrap items-center gap-4">
                      <div className="flex items-center gap-4 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            onClick={() => handlePropertySort('property')}
                            className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md whitespace-nowrap"
                          >
                            Property {getSortIcon('property', propertySortField, propertySortOrder)}
                          </button>
                          <button
                            onClick={() => handlePropertySort('units')}
                            className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md whitespace-nowrap"
                          >
                            Units {getSortIcon('units', propertySortField, propertySortOrder)}
                          </button>
                          <button
                            onClick={() => handlePropertySort('score')}
                            className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md whitespace-nowrap"
                          >
                            Score {getSortIcon('score', propertySortField, propertySortOrder)}
                          </button>
                          <button
                            onClick={() => handlePropertySort('risk')}
                            className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md whitespace-nowrap"
                          >
                            Risk {getSortIcon('risk', propertySortField, propertySortOrder)}
                          </button>
                          <button
                            onClick={() => handlePropertySort('delinquency')}
                            className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md whitespace-nowrap"
                          >
                            Delinquency {getSortIcon('delinquency', propertySortField, propertySortOrder)}
                          </button>
                        </div>

                        <div className="flex items-center gap-4 ml-auto">
                          <div className="relative">
                            <input
                              type="text"
                              placeholder="Search unit or tenant..."
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              className="pl-10 pr-4 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-[#3F6B28] dark:focus:ring-green-400 w-64"
                            />
                            <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                          </div>

                          <select
                            value={selectedProperty || ''}
                            onChange={(e) => {
                              const value = e.target.value;
                              setSelectedProperty(value || null);
                              if (value) {
                                setExpandedProperties(new Set([value]));
                                setAllExpanded(false);
                              }
                            }}
                            className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-[#3F6B28] dark:focus:ring-green-400 min-w-[160px]"
                          >
                            <option value="">All Properties</option>
                            {Object.keys(propertyGroups).map(property => (
                              <option key={property} value={property}>{property}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <button
                        onClick={toggleAllProperties}
                        className="flex items-center gap-2 px-4 py-1.5 text-[#3F6B28] dark:text-green-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors whitespace-nowrap"
                      >
                        {allExpanded ? (
                          <>
                            <ChevronUp className="w-5 h-5" />
                            <span>Collapse All</span>
                          </>
                        ) : (
                          <>
                            <ChevronDown className="w-5 h-5" />
                            <span>Expand All</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {filterAndSortProperties()
                      .filter(([property]) => !selectedProperty || property === selectedProperty)
                      .map(([property, propertyInsights]) => (
                        <PropertyGroup
                          key={property}
                          property={property}
                          insights={propertyInsights}
                          isExpanded={expandedProperties.has(property)}
                          onToggle={() => toggleProperty(property)}
                          searchQuery={searchQuery}
                        />
                      ))}
                  </div>
                </div>
              </>
            )}

            {activeTab === 'location' && (
              <LocationInsights insights={insights} />
            )}

            {activeTab === 'delinquency' && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold text-[#3F6B28] dark:text-green-400">Delinquency Management</h2>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        if (delinquencySortField === 'tenant') {
                          setDelinquencySortOrder(delinquencySortOrder === 'asc' ? 'desc' : 'asc');
                        } else {
                          setDelinquencySortField('tenant');
                          setDelinquencySortOrder('asc');
                        }
                      }}
                      className="flex items-center gap-1 px-3 py-1 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                    >
                      Tenant {getSortIcon('tenant', delinquencySortField, delinquencySortOrder)}
                    </button>
                    <button
                      onClick={() => {
                        if (delinquencySortField === 'property') {
                          setDelinquencySortOrder(delinquencySortOrder === 'asc' ? 'desc' : 'asc');
                        } else {
                          setDelinquencySortField('property');
                          setDelinquencySortOrder('asc');
                        }
                      }}
                      className="flex items-center gap-1 px-3 py-1 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                    >
                      Property {getSortIcon('property', delinquencySortField, delinquencySortOrder)}
                    </button>
                    <button
                      onClick={() => {
                        if (delinquencySortField === 'amount') {
                          setDelinquencySortOrder(delinquencySortOrder === 'asc' ? 'desc' : 'asc');
                        } else {
                          setDelinquencySortField('amount');
                          setDelinquencySortOrder('desc');
                        }
                      }}
                      className="flex items-center gap-1 px-3 py-1 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                    >
                      Amount {getSortIcon('amount', delinquencySortField, delinquencySortOrder)}
                    </button>
                    <button
                      onClick={() => {
                        if (delinquencySortField === 'aging') {
                          setDelinquencySortOrder(delinquencySortOrder === 'asc' ? 'desc' : 'asc');
                        } else {
                          setDelinquencySortField('aging');
                          setDelinquencySortOrder('desc');
                        }
                      }}
                      className="flex items-center gap-1 px-3 py-1 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                    >
                      Aging {getSortIcon('aging', delinquencySortField, delinquencySortOrder)}
                    </button>
                  </div>
                </div>
                <DelinquencyList
                  insights={insights}
                  onTenantClick={handleTenantClick}
                  sortField={delinquencySortField}
                  sortOrder={delinquencySortOrder}
                />
              </div>
            )}

            {activeTab === 'leases' && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-semibold text-[#3F6B28] dark:text-green-400 mb-6">Lease Timeline</h2>
                <LeaseTimeline
                  insights={insights}
                  onTenantClick={handleTenantClick}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}