import React, { useState, useEffect } from 'react';
import { FileUpload } from './FileUpload';
import { DataPreview } from './DataPreview';
import { InsightCard } from './InsightCard';
import { PropertyGroup } from './PropertyGroup';
import { LocationInsights } from './LocationInsights';
import { LeaseTimeline } from './LeaseTimeline';
import { DelinquencyList } from './DelinquencyList';
import { RiskDistributionBar } from './RiskDistributionBar';
import { MetricCard } from './MetricCard';
import { TenantData, TenantInsight } from '../types';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { 
  Upload, 
  Brain, 
  Loader2, 
  AlertTriangle, 
  CheckCircle, 
  Users, 
  TrendingUp, 
  DollarSign, 
  Calendar,
  Search,
  Filter,
  SortAsc,
  SortDesc,
  BarChart3,
  MapPin,
  Clock,
  Home
} from 'lucide-react';

type ViewMode = 'upload' | 'insights' | 'locations' | 'leases' | 'delinquency';
type SortField = 'tenant' | 'property' | 'score' | 'risk' | 'amount' | 'aging';
type SortOrder = 'asc' | 'desc';

export function Dashboard() {
  const { user } = useAuth();
  const [files, setFiles] = useState<{ [key: string]: File }>({});
  const [previewData, setPreviewData] = useState<TenantData[]>([]);
  const [insights, setInsights] = useState<TenantInsight[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('upload');
  const [expandedProperties, setExpandedProperties] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('score');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [generatingProgress, setGeneratingProgress] = useState<number>(0);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (user) {
      fetchExistingInsights();
    }
  }, [user]);

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

  const fetchExistingInsights = async () => {
    try {
      const { data: existingInsights, error: fetchError } = await supabase
        .from('tenant_insights')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      
      if (existingInsights && existingInsights.length > 0) {
        setInsights(existingInsights);
        setViewMode('insights');
      }
    } catch (err) {
      console.error('Error fetching existing insights:', err);
    }
  };

  const handleFilesSelected = (selectedFiles: { [key: string]: File }) => {
    setFiles(prev => ({ ...prev, ...selectedFiles }));
    setError(null);
    setSuccess(null);
  };

  const mergeFiles = async () => {
    if (Object.keys(files).length === 0) {
      setError('Please select at least one file');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const formData = new FormData();
      
      for (const [key, file] of Object.entries(files)) {
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve, reject) => {
          reader.onload = () => {
            const result = reader.result as string;
            const base64 = result.split(',')[1];
            resolve(base64);
          };
          reader.onerror = reject;
        });
        reader.readAsDataURL(file);
        
        const base64Data = await base64Promise;
        formData.append(key, base64Data);
      }

      const requestBody: any = {};
      for (const [key, file] of Object.entries(files)) {
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve, reject) => {
          reader.onload = () => {
            const result = reader.result as string;
            const base64 = result.split(',')[1];
            resolve(base64);
          };
          reader.onerror = reject;
        });
        reader.readAsDataURL(file);
        
        const base64Data = await base64Promise;
        requestBody[key] = base64Data;
      }

      const response = await fetch(`${supabase.supabaseUrl}/functions/v1/merge-data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabase.supabaseKey}`
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to process files');
      }

      const data = await response.json();
      console.log('Merged data:', data);
      
      setPreviewData(data);
      setSuccess(`Successfully processed ${data.length} tenant records`);
    } catch (err) {
      console.error('Error merging files:', err);
      setError(err instanceof Error ? err.message : 'Failed to process files');
    } finally {
      setLoading(false);
    }
  };

  const generateInsights = async () => {
    if (previewData.length === 0) {
      setError('No data available. Please upload and process files first.');
      return;
    }

    if (!user) {
      setError('Please log in to generate insights');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);
    setIsGenerating(true);
    setGeneratingProgress(0);

    try {
      console.log('Starting insight generation...');
      console.log('Preview data:', previewData);
      console.log('User ID:', user.id);

      // Step 1: POST to start the job
      const response = await fetch(`${supabase.supabaseUrl}/functions/v1/generate-insights`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabase.supabaseKey}`
        },
        body: JSON.stringify({
          tenants: previewData,
          user_id: user.id
        })
      });

      console.log('Initial response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        throw new Error(`Failed to start insight generation: ${response.status}`);
      }

      const { job_id } = await response.json();
      console.log('Job started with ID:', job_id);

      if (!job_id) {
        throw new Error('No job ID received from server');
      }

      // Step 2: Poll GET endpoint until completion
      console.log('Starting polling for job:', job_id);
      
      const pollForResults = async (jobId: string): Promise<TenantInsight[]> => {
        const maxAttempts = 30; // 30 attempts * 2 seconds = 60 seconds timeout
        let attempts = 0;

        while (attempts < maxAttempts) {
          attempts++;
          console.log(`Polling attempt ${attempts}/${maxAttempts} for job ${jobId}`);

          try {
            const pollResponse = await fetch(
              `${supabase.supabaseUrl}/functions/v1/generate-insights?job_id=${encodeURIComponent(jobId)}`,
              {
                method: 'GET',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${supabase.supabaseKey}`
                }
              }
            );

            console.log(`Poll response status: ${pollResponse.status}`);

            if (pollResponse.status === 200) {
              console.log('Job completed! Processing results...');
              const results = await pollResponse.json();
              console.log('Results received:', results);
              return results;
            } else if (pollResponse.status === 202) {
              console.log('Job still processing, waiting...');
              setGeneratingProgress(prev => Math.min(prev + 2, 95));
              await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second interval
              continue;
            } else {
              const errorText = await pollResponse.text();
              console.error(`Poll error: ${pollResponse.status} - ${errorText}`);
              throw new Error(`Polling failed: ${pollResponse.status}`);
            }
          } catch (pollError) {
            console.error('Error during polling:', pollError);
            if (attempts >= maxAttempts) {
              throw pollError;
            }
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }

        throw new Error('Insight generation timed out after 60 seconds');
      };

      const results = await pollForResults(job_id);
      
      if (!Array.isArray(results) || results.length === 0) {
        throw new Error('No insights were generated');
      }

      console.log('Final results:', results);
      setGeneratingProgress(100);
      
      setTimeout(() => {
        setInsights(results);
        setViewMode('insights');
        setSuccess(`Successfully generated insights for ${results.length} tenants`);
        setIsGenerating(false);
        setGeneratingProgress(0);
      }, 500);

    } catch (err) {
      console.error('Error generating insights:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate insights');
      setIsGenerating(false);
      setGeneratingProgress(0);
    } finally {
      setLoading(false);
    }
  };

  const togglePropertyExpansion = (property: string) => {
    setExpandedProperties(prev => {
      const newSet = new Set(prev);
      if (newSet.has(property)) {
        newSet.delete(property);
      } else {
        newSet.add(property);
      }
      return newSet;
    });
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const getSortedAndFilteredInsights = () => {
    let filtered = insights;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = insights.filter(insight => 
        insight.tenant_name.toLowerCase().includes(query) ||
        insight.property.toLowerCase().includes(query) ||
        insight.unit.toLowerCase().includes(query)
      );
    }

    return filtered.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortField) {
        case 'tenant':
          aValue = a.tenant_name;
          bValue = b.tenant_name;
          break;
        case 'property':
          aValue = a.property;
          bValue = b.property;
          break;
        case 'score':
          aValue = a.score;
          bValue = b.score;
          break;
        case 'risk':
          const riskOrder = { 'Low': 1, 'Medium': 2, 'High': 3 };
          aValue = riskOrder[a.turnover_risk as keyof typeof riskOrder] || 0;
          bValue = riskOrder[b.turnover_risk as keyof typeof riskOrder] || 0;
          break;
        case 'amount':
          aValue = a.rent_amount;
          bValue = b.rent_amount;
          break;
        case 'aging':
          aValue = Math.max(a.aging_over_90, a.aging_90, a.aging_60, a.aging_30);
          bValue = Math.max(b.aging_over_90, b.aging_90, b.aging_60, b.aging_30);
          break;
        default:
          return 0;
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortOrder === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
    });
  };

  const groupInsightsByProperty = (insights: TenantInsight[]) => {
    return insights.reduce((groups, insight) => {
      const property = insight.property;
      if (!groups[property]) {
        groups[property] = [];
      }
      groups[property].push(insight);
      return groups;
    }, {} as Record<string, TenantInsight[]>);
  };

  const calculateMetrics = () => {
    const totalTenants = insights.length;
    const highRiskTenants = insights.filter(i => i.turnover_risk.toLowerCase() === 'high').length;
    const delinquentTenants = insights.filter(i => i.high_delinquency_alert).length;
    const retentionNeeded = insights.filter(i => i.retention_outreach_needed).length;
    const rentIncreaseOpportunities = insights.filter(i => i.raise_rent_opportunity).length;
    
    const totalRent = insights.reduce((sum, i) => sum + i.rent_amount, 0);
    const totalDelinquent = insights.reduce((sum, i) => sum + i.delinquent_rent, 0);
    
    const averageScore = insights.length > 0 
      ? Math.round(insights.reduce((sum, i) => sum + i.score, 0) / insights.length)
      : 0;

    const riskDistribution = {
      low: insights.filter(i => i.turnover_risk.toLowerCase() === 'low').length,
      medium: insights.filter(i => i.turnover_risk.toLowerCase() === 'medium').length,
      high: insights.filter(i => i.turnover_risk.toLowerCase() === 'high').length,
    };

    const delinquencyDistribution = {
      low: insights.filter(i => i.predicted_delinquency.toLowerCase() === 'low').length,
      medium: insights.filter(i => i.predicted_delinquency.toLowerCase() === 'medium').length,
      high: insights.filter(i => i.predicted_delinquency.toLowerCase() === 'high').length,
    };

    return {
      totalTenants,
      highRiskTenants,
      delinquentTenants,
      retentionNeeded,
      rentIncreaseOpportunities,
      totalRent,
      totalDelinquent,
      averageScore,
      riskDistribution,
      delinquencyDistribution
    };
  };

  const metrics = calculateMetrics();
  const sortedInsights = getSortedAndFilteredInsights();
  const groupedInsights = groupInsightsByProperty(sortedInsights);

  const renderUploadView = () => (
    <div className="space-y-8">
      <div className="text-center">
        <Upload className="w-16 h-16 text-havyn-primary dark:text-green-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-havyn-primary dark:text-green-400 mb-2">
          Upload Your Data
        </h2>
        <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          Upload your tenant files to get started with AI-powered insights. You can upload individual files 
          (delinquency report, rent roll, tenant directory) or a combined report.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Individual Files</h3>
          <FileUpload
            onFilesSelected={handleFilesSelected}
            fileType="delinquency"
            label="Upload Delinquency Report"
            optional
          />
          <FileUpload
            onFilesSelected={handleFilesSelected}
            fileType="rentRoll"
            label="Upload Rent Roll"
            optional
          />
          <FileUpload
            onFilesSelected={handleFilesSelected}
            fileType="directory"
            label="Upload Tenant Directory"
            optional
          />
        </div>

        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Combined Report</h3>
          <FileUpload
            onFilesSelected={handleFilesSelected}
            fileType="combined"
            label="Upload Combined Report"
            optional
          />
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <p className="text-sm text-blue-800 dark:text-blue-300">
              <strong>Tip:</strong> If you have a combined report that includes all tenant information, 
              you can upload just that file instead of individual reports.
            </p>
          </div>
        </div>
      </div>

      {Object.keys(files).length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Selected Files</h3>
          <div className="space-y-2">
            {Object.entries(files).map(([key, file]) => (
              <div key={key} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="font-medium text-gray-900 dark:text-white">
                    {key === 'combined' ? 'Combined Report' : 
                     key === 'delinquency' ? 'Delinquency Report' :
                     key === 'rentRoll' ? 'Rent Roll' : 'Tenant Directory'}
                  </span>
                </div>
                <span className="text-sm text-gray-500 dark:text-gray-400">{file.name}</span>
              </div>
            ))}
          </div>
          
          <div className="mt-6 flex gap-4">
            <button
              onClick={mergeFiles}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-havyn-primary text-white rounded-lg hover:bg-havyn-dark disabled:opacity-50 transition-colors"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <Brain className="w-5 h-5" />
                  <span>Process Files</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {previewData.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Data Preview ({previewData.length} records)
              </h3>
              <button
                onClick={generateInsights}
                disabled={loading || isGenerating}
                className="flex items-center gap-2 px-6 py-2 bg-havyn-primary text-white rounded-lg hover:bg-havyn-dark disabled:opacity-50 transition-colors"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Generating Insights...</span>
                  </>
                ) : (
                  <>
                    <Brain className="w-5 h-5" />
                    <span>Generate Insights</span>
                  </>
                )}
              </button>
            </div>
          </div>
          <div className="max-h-96 overflow-auto">
            <DataPreview data={previewData} />
          </div>
        </div>
      )}

      {isGenerating && generatingProgress > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <Brain className="w-6 h-6 text-havyn-primary dark:text-green-400 animate-pulse" />
            <h3 className="text-lg font-semibold text-havyn-primary dark:text-green-400">
              Generating AI Insights
            </h3>
          </div>
          <div className="space-y-4">
            <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-havyn-primary dark:bg-green-400 rounded-full transition-all duration-300"
                style={{ width: `${generatingProgress}%` }}
              />
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {generatingProgress < 30 && "Analyzing tenant data..."}
              {generatingProgress >= 30 && generatingProgress < 60 && "Calculating risk scores..."}
              {generatingProgress >= 60 && generatingProgress < 90 && "Generating recommendations..."}
              {generatingProgress >= 90 && "Finalizing insights..."}
            </p>
          </div>
        </div>
      )}
    </div>
  );

  const renderInsightsView = () => (
    <div className="space-y-6">
      {/* Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Tenants"
          value={metrics.totalTenants}
          icon={<Users className="w-6 h-6" />}
          color="blue"
        />
        <MetricCard
          title="High Risk"
          value={metrics.highRiskTenants}
          icon={<AlertTriangle className="w-6 h-6" />}
          color="red"
        />
        <MetricCard
          title="Delinquent"
          value={metrics.delinquentTenants}
          icon={<DollarSign className="w-6 h-6" />}
          color="red"
        />
        <MetricCard
          title="Avg Score"
          value={`${metrics.averageScore}%`}
          icon={<TrendingUp className="w-6 h-6" />}
          color="green"
        />
      </div>

      {/* Risk Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RiskDistributionBar
          data={metrics.riskDistribution}
          title="Turnover Risk Distribution"
          subtitle="Distribution of tenant turnover risk levels"
        />
        <RiskDistributionBar
          data={metrics.delinquencyDistribution}
          title="Delinquency Risk Distribution"
          subtitle="Distribution of tenant delinquency risk levels"
        />
      </div>

      {/* Search and Sort Controls */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search tenants, properties, or units..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 
                focus:outline-none focus:ring-2 focus:ring-havyn-primary dark:focus:ring-green-400"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={sortField}
              onChange={(e) => setSortField(e.target.value as SortField)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700"
            >
              <option value="score">Score</option>
              <option value="tenant">Tenant Name</option>
              <option value="property">Property</option>
              <option value="risk">Risk Level</option>
              <option value="amount">Rent Amount</option>
            </select>
            
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
            >
              {sortOrder === 'asc' ? <SortAsc className="w-5 h-5" /> : <SortDesc className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Property Groups */}
      <div className="space-y-4">
        {Object.entries(groupedInsights).map(([property, propertyInsights]) => (
          <PropertyGroup
            key={property}
            property={property}
            insights={propertyInsights}
            isExpanded={expandedProperties.has(property)}
            onToggle={() => togglePropertyExpansion(property)}
            allInsights={insights}
            searchQuery={searchQuery}
          />
        ))}
      </div>

      {sortedInsights.length === 0 && searchQuery && (
        <div className="text-center py-12">
          <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No results found</h3>
          <p className="text-gray-600 dark:text-gray-400">
            Try adjusting your search terms or filters.
          </p>
        </div>
      )}
    </div>
  );

  const renderLeaseTimelineView = () => (
    <div className="space-y-6">
      <div className="text-center">
        <Calendar className="w-16 h-16 text-havyn-primary dark:text-green-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-havyn-primary dark:text-green-400 mb-2">
          Lease Timeline
        </h2>
        <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          Track upcoming lease expirations and plan your renewal strategy.
        </p>
      </div>

      <LeaseTimeline 
        insights={insights.filter(i => i.lease_end_date)} 
        onTenantClick={(tenant) => {
          // Could implement a modal or detailed view here
          console.log('Clicked tenant:', tenant);
        }}
      />
    </div>
  );

  const renderDelinquencyView = () => (
    <div className="space-y-6">
      <div className="text-center">
        <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-2">
          Delinquency Management
        </h2>
        <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          Monitor and manage tenant delinquencies with detailed aging reports.
        </p>
      </div>

      <DelinquencyList 
        insights={insights}
        onTenantClick={(tenant) => {
          console.log('Clicked delinquent tenant:', tenant);
        }}
        sortField={sortField}
        sortOrder={sortOrder}
      />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Navigation Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-1">
        <nav className="flex space-x-1">
          <button
            onClick={() => setViewMode('upload')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              viewMode === 'upload'
                ? 'bg-havyn-primary text-white dark:bg-green-600'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>Upload Data</span>
          </button>
          
          <button
            onClick={() => setViewMode('insights')}
            disabled={insights.length === 0}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              viewMode === 'insights'
                ? 'bg-havyn-primary text-white dark:bg-green-600'
                : insights.length === 0
                ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <Brain className="w-4 h-4" />
            <span>Insights ({insights.length})</span>
          </button>

          <button
            onClick={() => setViewMode('locations')}
            disabled={insights.length === 0}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              viewMode === 'locations'
                ? 'bg-havyn-primary text-white dark:bg-green-600'
                : insights.length === 0
                ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <MapPin className="w-4 h-4" />
            <span>Locations</span>
          </button>

          <button
            onClick={() => setViewMode('leases')}
            disabled={insights.length === 0}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              viewMode === 'leases'
                ? 'bg-havyn-primary text-white dark:bg-green-600'
                : insights.length === 0
                ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Lease Timeline</span>
          </button>

          <button
            onClick={() => setViewMode('delinquency')}
            disabled={insights.length === 0}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              viewMode === 'delinquency'
                ? 'bg-havyn-primary text-white dark:bg-green-600'
                : insights.length === 0
                ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            <span>Delinquency</span>
          </button>
        </nav>
      </div>

      {/* Error and Success Messages */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
          <p className="text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
          <p className="text-green-700 dark:text-green-400">{success}</p>
        </div>
      )}

      {/* View Content */}
      {viewMode === 'upload' && renderUploadView()}
      {viewMode === 'insights' && renderInsightsView()}
      {viewMode === 'locations' && <LocationInsights insights={insights} />}
      {viewMode === 'leases' && renderLeaseTimelineView()}
      {viewMode === 'delinquency' && renderDelinquencyView()}
    </div>
  );
}