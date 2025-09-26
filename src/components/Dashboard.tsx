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
  ArrowUpDown, Search, ChevronRight
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

type SortField = 'property' | 'units' | 'score' | 'risk' | 'delinquency';
type SortOrder = 'asc' | 'desc';

type DelinquencySortField = 'tenant' | 'property' | 'amount' | 'aging';

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
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const propertyLatLng = {
  "The Villas at Park Terrace - 301 Walkertown Ave Winston Salem, NC 27105": {
    latitude: 36.1170555787963, 
    longitude: -80.20638809515557,
  },
  "High Meadow Apartments - 5625 Farm Pond Ln, Charlotte, NC 28212": {
    latitude: 35.1827,
    longitude: -80.7414,
  },
};

const propertyMeta: Record<string, { city: string; state: string; postalCode?: string }> = {
  "The Villas at Park Terrace - 301 Walkertown Ave Winston Salem, NC 27105": {
    city: "Winston-Salem",
    state: "NC",
    postalCode: "27105",
    defaultBeds: 2,
    defaultBaths: 1,
  },
  "High Meadow Apartments - 5625 Farm Pond Ln, Charlotte, NC 28212": {
    city: "Charlotte",
    state: "NC",
    postalCode: "28212",
    defaultBeds: 2,
    defaultBaths: 2,
  },
  // add more properties here as you go…
};

const API_BASE = "https://zv54onyhgk.execute-api.us-west-1.amazonaws.com/prod";

const [jobSummary, setJobSummary] = useState<{
  total: number;
  new: number;
  changed: number;
  unchanged: number;
} | null>(null);

// ------- GMAIL OAUTH INTEGRATION SECTION -------
const FUNCTIONS_BASE = `${supabase.supabaseUrl}/functions/v1`;
const POLLER_URL = import.meta.env.VITE_POLLER_URL; // set to your Lambda Function URL


const [gmailConnecting, setGmailConnecting] = useState(false);
const [gmailConnected, setGmailConnected] = useState<boolean>(false);
const [gmailEmail, setGmailEmail] = useState<string | null>(null);

// on page load, detect the callback redirect (?gmail=connected) and show status
useEffect(() => {
  const qs = new URLSearchParams(window.location.search);
  if (qs.get("gmail") === "connected") {
    setGmailConnected(true);
    // optional: read an email you stashed in localStorage or fetch from your own status endpoint
    const lastEmail = localStorage.getItem("gmailConnectedEmail");
    if (lastEmail) setGmailEmail(lastEmail);
    // clean the URL
    qs.delete("gmail");
    const url = `${window.location.pathname}${qs.toString() ? "?" + qs.toString() : ""}`;
    window.history.replaceState({}, "", url);
  }
}, []);

const connectGmail = async () => {
  if (!user?.id) {
    setError("Please log in first.");
    return;
  }

  setGmailConnecting(true);
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("You must be signed in to connect Gmail.");

    const { data, error } = await supabase.functions.invoke("oauth-google-start", {
      body: { uid: user.id },
    });

    if (error) {
      // Try to read the response body from the error (supabase-js exposes .context)
      // @ts-ignore
      const ctxText = typeof error.context?.text === "function" ? await error.context.text() : "";
      console.error("oauth-google-start error:", error, ctxText);
      throw new Error(error.message || ctxText || "Edge function failed");
    }

    if (!data?.ok) {
      // The function returned 200 with an error payload
      const msg = data?.error || "oauth-google-start returned ok:false";
      console.error("oauth-google-start payload:", data);
      setError(msg);
      return;
    }

    const redirect = data?.url ?? data?.authUrl;
    if (!redirect) throw new Error("No auth URL returned from oauth-google-start");

    (window.top ?? window).location.href = redirect;
  } catch (e: any) {
    console.error(e);
    setError(e?.message || "Failed to start Gmail connect");
  } finally {
    setGmailConnecting(false);
  }
};
  
const syncNow = async () => {
  if (!user?.id) { setError("Please log in first."); return; }
  try {
    await fetch(POLLER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.id })
    });
  } catch (e:any) {
    setError(e.message || "Failed to trigger sync");
  }
};

useEffect(() => {
  (async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase.functions.invoke("gmail-status", {
        body: { userId: user.id }
      });

      if (error) {
        console.error("gmail-status error:", error);
        return;
      }

      if (data?.connected) {
        setGmailConnected(true);
        setGmailEmail(data.email);
      } else {
        setGmailConnected(false);
        setGmailEmail(null);
      }
    } catch (e) {
      console.error("gmail-status failed:", e);
    }
  })();
}, [user?.id]);

// ✅ NEW: Fetch latest Analyzer results for this landlord
useEffect(() => {
  if (!user?.id) return;

  (async () => {
    try {
      const params = new URLSearchParams();
      params.set("account_id", user.id);
      params.set("action", "latest"); // ask backend for latest job results

      const url = `${API_BASE}/get_results?${params.toString()}`;
      const res = await fetch(url, { headers: { Accept: "application/json" } });
      const text = await res.text();

      let payload: any;
      try {
        payload = JSON.parse(text);
      } catch {
        console.error("❌ Failed to parse get_results payload", text);
        return;
      }

      if (res.status === 200 && payload?.results) {
        setInsights(payload.results.map((i: any) => ({
          ...i,
          score: typeof i.tenant_score === "number" ? i.tenant_score : 0,
        })));
        setJobSummary(payload.summary);
      }
    } catch (err) {
      console.error("❌ Failed to fetch latest insights:", err);
    }
  })();
}, [user?.id]);
// ------- GMAIL OAUTH INTEGRATION SECTION -------
  
const pollForResults = async (job_id: string, accountIdForJob: string | null) => {
  const maxAttempts = 60;
  const intervalMs = 5000;

  // ✅ ALWAYS construct the query string with URLSearchParams
  const params = new URLSearchParams();
  params.set("job_id", job_id);
  if (accountIdForJob) params.set("account_id", accountIdForJob);

  const url = `${API_BASE}/get_results?${params.toString()}`;
  console.log("POLL URL:", url);

  let attempts = 0;

  while (attempts < maxAttempts) {
    let res: Response;
    try {
      // ✅ keep request "simple": no custom headers unless needed
      res = await fetch(url, { headers: { Accept: "application/json" } });
    } catch (e) {
      // If you land here, it's a network/CORS/URL problem
      console.error("❌ POLL fetch failed (network/CORS):", e, "POLL URL:", url);
      throw e;
    }

    // If you get here, we have an HTTP status (200/202/etc)
    let payloadText = await res.text();
    console.log("Poll raw:", payloadText);

    let payload: any;
    try {
      payload = JSON.parse(payloadText);
    } catch (e) {
      console.error("❌ Poll JSON parse failed:", e, payloadText);
      throw new Error("Poll did not return valid JSON");
    }

    if (res.status === 200 && payload?.status === "complete" && Array.isArray(payload.results)) {
      return payload.results;
    }

    if (res.status === 202 || payload?.status === "processing") {
      await new Promise(r => setTimeout(r, intervalMs));
      attempts++;
      continue;
    }

    // unexpected: backoff and retry
    await new Promise(r => setTimeout(r, intervalMs));
    attempts++;
  }

  throw new Error("Polling timed out");
};
  //POLLING HELP

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

type SavedRun = {
  job_id: string;
  s3_key: string;
  last_modified: string; // ISO string
  size: number;          // bytes
};

const [savedRuns, setSavedRuns] = useState<SavedRun[]>([]);
const [loadingSaved, setLoadingSaved] = useState(false);
const [showSavedRunsList, setShowSavedRunsList] = useState(false);

const loadSavedRun = async (jobId: string, accountId: string) => {
  const params = new URLSearchParams();
  params.set("job_id", jobId);
  params.set("account_id", accountId);
  params.set("nowait", "1"); // tell Lambda to NOT wait/poll S3

  const url = `${API_BASE}/get_results?${params.toString()}`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  const text = await res.text();

  let payload: any;
  try {
    payload = JSON.parse(text);
  } catch (e) {
    throw new Error(`Failed to parse get_results payload: ${text}`);
  }

  if (res.status === 200 && payload?.status === "complete" && Array.isArray(payload.results)) {
    return payload.results as any[]; // your insight shape
  }

  // If for some reason the run isn't present (should be rare), fall back to polling:
  if (res.status === 202 || payload?.status === "processing") {
    return await pollForResults(jobId, accountId);
  }

  throw new Error(`Unexpected response loading saved run: ${text}`);
};
  
const fetchSavedInsights = async () => {
  if (!user?.id) {
    setError("Please log in to view saved insights");
    return;
  }

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
    // 1) list saved runs for this account
    const params = new URLSearchParams();
    params.set("action", "list");
    params.set("account_id", user.id);

    const url = `${API_BASE}/get_results?${params.toString()}`;
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    const text = await res.text();

    let payload: any;
    try {
      payload = JSON.parse(text);
    } catch (e) {
      throw new Error(`Failed to parse list payload: ${text}`);
    }

    if (res.status !== 200 || !payload?.items || !Array.isArray(payload.items)) {
      throw new Error(`List failed: ${text}`);
    }

    const items: SavedRun[] = payload.items;
    setSavedRuns(items);

    if (!items.length) {
      setError("No previous insights found for your account");
      return;
    }

    // Show the list of saved runs instead of auto-loading
    setShowSavedRunsList(true);
  } catch (err: any) {
    console.error("Error fetching saved insights from S3:", err);
    setError(err?.message || "Error fetching saved insights");
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
    setShowSavedInsights(false);
    setInsights([]);
    setShowPreview(false);
    setGeneratingProgress(0);
    setRequestData(null);
    setDebugData(null);
    setAnalysisResults(null);
  
    try {
      // ----------- FIX: GET THE SESSION FIRST ------------
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('You must be logged in to process files');
        setLoading(false);
        return;
      }
      // ---------------------------------------------------
  
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
          'Authorization': `Bearer ${anonKey}`
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
          changes.push({
            tenant: newRow.tenant,
            property: newRow.property,
            unit: newRow.unit,
            changes: rowChanges
          });
          changedCount++;
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
      setDebugData({
        allTenants: mergedData,
        sampledTenants: mergedData
      });
  
      // const requestBody = { 
      //   tenants: mergedData,
      //   user_id: user.id
      // };
      // setRequestData(JSON.stringify(requestBody, null, 2));

      
      // ----- NEW: Request Presigned S3 URL + job_id -----
      console.log('About to fetch presigned-upload-url');

      const resp = await fetch(
        "https://dy7d1mkqgd.execute-api.us-west-1.amazonaws.com/prod/presigned-upload-url",
        { 
          method: "POST", 
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ "accountId": user?.id })
        }
      );
      if (!resp.ok) throw new Error("Failed to get presigned S3 URL");
      //const { presigned_url, job_id } = await resp.json();

      console.log('Got presigned URL response:', resp);

      const text = await resp.text();
      console.log('Raw response text:', text);
      
      let data;
      try {
        data = JSON.parse(text);
        console.log('Parsed JSON:', data);
      } catch (e) {
        console.error('Failed to parse JSON!', e);
        setError('API did not return valid JSON: ' + text);
        setIsGenerating(false);
        return;
      }
      
      if (!data.presigned_url || !data.job_id) {
        console.error('Missing fields in API response:', data);
        setError('API response missing expected fields: ' + JSON.stringify(data));
        setIsGenerating(false);
        return;
      }
      
const { presigned_url, job_id, s3_key } = data;

// Prefer explicit account_id if presign ever returns it
let accountIdForJob: string | null =
  (data.account_id ?? data.accountId ?? null) as string | null;

// If presign returns a tenant-scoped key, extract it: tenant_jobs/{accountId}/{jobId}/input.json
if (!accountIdForJob && typeof s3_key === 'string' && s3_key.startsWith('tenant_jobs/')) {
  const parts = s3_key.split('/'); // ["tenant_jobs", maybeAccountIdOrJobId, maybeJobId, "input.json"]
  if (parts.length >= 4) accountIdForJob = parts[1]; // tenant-scoped
}

// FINAL FALLBACK: if still null, use the signed-in user id (often equals the account id)
if (!accountIdForJob && user?.id) {
  accountIdForJob = user.id;
}

const uploadResp = await fetch(presigned_url, {
  method: "PUT",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(mergedData),
});
if (!uploadResp.ok) {
  console.error("S3 upload failed:", uploadResp.status, await uploadResp.text());
  throw new Error(`Failed to upload input.json to S3 (status ${uploadResp.status})`);
}

console.log('Polling with job_id:', job_id, 'accountIdForJob:', accountIdForJob);
const results = await pollForResults(job_id, accountIdForJob);
      setGeneratingProgress(100);
  
      setTimeout(() => {
        if (Array.isArray(results)) {
          // Map tenant_score to score for frontend display
          const formattedInsights = results.map(insight => ({
            ...insight,
            score: typeof insight.tenant_score === 'number' ? insight.tenant_score : 0,
          }));
          setInsights(formattedInsights);
          setGeneratingProgress(0);
          setRequestData(null);
          setIsGenerating(false);
        } else {
          setError('Invalid response format');
          setInsights([]);
          setIsGenerating(false);
        }
      }, 500);

  
      // --- Old/Commented-Out Code (for reference) ---
      /*
      const response = await fetch(`${supabase.supabaseUrl}/functions/v1/generate-insights`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${anonKey}`
        },
        body: JSON.stringify(requestBody),
      });
  
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
      */
      // --- END Old Code ---
  
    } catch (error) {
      console.error('Error in generateInsights:', error);

      setError(error instanceof Error ? error.message : 'Error generating insights');
      setInsights([]);
      setIsGenerating(false);
    }
  };
  // ----- END NEW ----------
  
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

    const totalRevenue = insightsArray.reduce(
      (sum, insight) => sum + (typeof insight.rent_amount === 'number'
        ? insight.rent_amount
        : Number(insight.rent_amount) || 0),
      0
    );
    
    const averageRent = insightsArray.length > 0
      ? totalRevenue / insightsArray.length
      : 0;


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

  const handlePropertySort = (field: SortField) => {
    if (propertySortField === field) {
      setPropertySortOrder(propertySortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setPropertySortField(field);
      setPropertySortOrder('asc');
    }
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
  const propertyGroups = (Array.isArray(insights) ? insights : []).reduce((groups: { [key: string]: TenantInsight[]}, insight) => {
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
        <button
          onClick={connectGmail}
          disabled={gmailConnecting || !user}
          className="px-4 py-2 bg-[#3F6B28] text-white rounded-lg hover:bg-[#345A22] disabled:opacity-50 flex items-center gap-2"
        >
          {gmailConnecting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Users className="w-5 h-5" />}
          <span>
            {gmailConnected ? (gmailEmail ? `Gmail Connected (${gmailEmail})` : "Gmail Connected") : "Connect Gmail"}
          </span>
        </button>
      
        {/* NEW (optional): manual sync trigger for the poller */}
        {gmailConnected && (
          <button
            onClick={syncNow}
            className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 flex items-center gap-2"
          >
            <Clock className="w-5 h-5" />
            <span>Sync Now</span>
          </button>
        )}
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
                            {typeof values.old === 'number'
                              ? `$${values.old.toFixed(2)}`
                              : values.old || 'Empty'}
                          </span>
                          <span className="text-gray-400">→</span>
                          <span className="text-green-600 dark:text-green-400">
                            {typeof values.new === 'number'
                              ? `$${values.new.toFixed(2)}`
                              : values.new || 'Empty'}
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

      {/* Saved Runs List View */}
      {showSavedRunsList && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-[#3F6B28] dark:text-green-400">
              Saved Insight Reports
            </h2>
            <button
              onClick={() => setShowSavedRunsList(false)}
              className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
            >
              Back to Dashboard
            </button>
          </div>

          {savedRuns.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-500 dark:text-gray-400">
                <Brain className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-2">No Saved Reports</h3>
                <p>Generate your first tenant insights to see them here.</p>
              </div>
            </div>
          ) : (
            <div className="grid gap-4">
              {savedRuns.map((report) => (
                <div
                  key={report.job_id}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={async () => {
                    setShowSavedRunsList(false);
                    const results = await loadSavedRun(report.job_id, user?.id || '');
                    const formattedInsights = results.map(insight => ({
                      ...insight,
                      score: typeof insight.tenant_score === 'number' ? insight.tenant_score : 0,
                    }));
                    setInsights(formattedInsights);
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-[#3F6B28] bg-opacity-10 dark:bg-opacity-20 rounded-lg flex items-center justify-center">
                        <Brain className="w-6 h-6 text-[#3F6B28] dark:text-green-400" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          Insight Report
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Generated on {new Date(report.last_modified).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    </div>
                  </div>
                  
                  <div className="mt-4 flex items-center gap-6 text-sm text-gray-600 dark:text-gray-400">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      <span>Job ID: {report.job_id.slice(0, 8)}...</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      <span>{formatDistanceToNow(new Date(report.last_modified), { addSuffix: true })}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
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
      {jobSummary && (
        <div className="mb-8 bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-[#3F6B28] dark:text-green-400 mb-4">
            Latest Sync Summary
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-2xl font-bold">{jobSummary.total}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Tenants</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">{jobSummary.new}</p>
              <p className="text-sm">New</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-600">{jobSummary.changed}</p>
              <p className="text-sm">Changed</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-600">{jobSummary.unchanged}</p>
              <p className="text-sm">Unchanged</p>
            </div>
          </div>
        </div>
      )}
      {stats && !showSavedRunsList && (
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
                        {showSavedInsights ? 'Saved Insights' : 'Property Insights'}
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
              <LocationInsights 
                insights={insights} 
                propertyLatLng={propertyLatLng}
                propertyMeta={propertyMeta}
                />
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