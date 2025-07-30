import React, { useState } from 'react';
import { TenantInsight } from '../types';
import { AlertTriangle, ArrowUpRight, CheckCircle, Home, TrendingDown, TrendingUp, Clock, AlertCircle } from 'lucide-react';
import { TenantHistory } from './TenantHistory';
import { supabase } from '../lib/supabase';
import { MessageTenantButton } from './MessageTenantButton';
import { parsePhoneNumber, parseEmails } from '../utils/formatters';

interface InsightCardProps {
  insight: TenantInsight;
  allInsights?: TenantInsight[];
}

const getRiskColor = (risk: string): string => {
  switch (risk.toLowerCase()) {
    case 'low':
      return 'bg-green-500';
    case 'medium':
    case 'moderate':
      return 'bg-yellow-500';
    case 'high':
      return 'bg-red-500';
    default:
      return 'bg-gray-400';
  }
};

const getRiskTextColor = (risk: string): string => {
  switch (risk.toLowerCase()) {
    case 'low':
      return 'text-green-700 dark:text-green-400';
    case 'medium':
    case 'moderate':
      return 'text-yellow-700 dark:text-yellow-400';
    case 'high':
      return 'text-red-700 dark:text-red-400';
    default:
      return 'text-gray-700 dark:text-gray-400';
  }
};

const RiskBar = ({ risk, type }: { risk: string; type: 'turnover' | 'delinquency' }) => {
  const riskLevel = risk.toLowerCase();
  const width = riskLevel === 'high' ? 'w-full' : riskLevel === 'medium' ? 'w-2/3' : 'w-1/3';
  const baseColor = getRiskColor(risk);
  const label = type === 'turnover' ? 'Turnover Risk' : 'Delinquency Risk';
  
  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
        <span className={`text-xs font-medium ${getRiskTextColor(risk)}`}>{risk}</span>
      </div>
      <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
        <div className={`h-full ${baseColor} ${width} rounded-full transition-all duration-300`} />
      </div>
    </div>
  );
};

const formatCurrency = (amount: number | undefined) => {
  if (typeof amount !== 'number' || isNaN(amount)) return '$0.00';
  return amount.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
  });
};

const ChangeIndicator = ({ 
  oldValue, 
  newValue, 
  format = 'number',
  label
}: { 
  oldValue: number | string; 
  newValue: number | string;
  format?: 'number' | 'currency' | 'text' | 'percentage';
  label?: string;
}) => {
  const isIncrease = typeof oldValue === 'number' && typeof newValue === 'number' 
    ? newValue > oldValue
    : false;

  const formatValue = (value: number | string) => {
    if (format === 'currency') return formatCurrency(value as number);
    if (format === 'percentage') return `${value}%`;
    return value;
  };

  const formattedOld = formatValue(oldValue);
  const formattedNew = formatValue(newValue);

  return (
    <div className="flex items-center gap-2">
      {label && <span className="text-sm text-gray-600 dark:text-gray-400">{label}:</span>}
      <div className="flex items-center gap-1">
        <span className="text-sm text-gray-500 dark:text-gray-400">{formattedOld}</span>
        {isIncrease ? (
          <TrendingUp className="w-4 h-4 text-red-500" />
        ) : (
          <TrendingDown className="w-4 h-4 text-green-500" />
        )}
        <span className={`text-sm ${isIncrease ? "text-red-500" : "text-green-500"}`}>
          {formattedNew}
        </span>
      </div>
    </div>
  );
};

export function InsightCard({ insight, allInsights = [] }: InsightCardProps) {
  const [showHistory, setShowHistory] = useState(false);
  const [tenantHistory, setTenantHistory] = useState<TenantInsight[]>([]);
  const [loading, setLoading] = useState(false);
  const hasChanges = insight.changes && Object.keys(insight.changes).length > 0;
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

  const fetchTenantHistory = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('tenant_insights')
        .select('*')
        .eq('property', insight.property)
        .eq('unit', insight.unit)
        .eq('tenant_name', insight.tenant_name)
        .order('created_at', { ascending: false });

      if (data) {
        setTenantHistory(data);
      }
    } catch (error) {
      console.error('Error fetching tenant history:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewHistory = async () => {
    if (!showHistory) {
      await fetchTenantHistory();
    }
    setShowHistory(true);
  };

  return (
    <>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow flex flex-col">
        <div className="p-6 flex-1">
          <div className="flex justify-between items-start mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Home className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Unit {insight.unit}
                </h3>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">{insight.tenant_name}</p>
            </div>
            <div className="bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full">
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {typeof insight.rent_amount === 'number' ? formatCurrency(insight.rent_amount) : 'N/A'}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between mb-4 bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg">
            <span className="text-sm text-gray-600 dark:text-gray-400">Tenant Score</span>
            <div className="flex items-center gap-2">
              {insight.changes?.score ? (
                <ChangeIndicator 
                  oldValue={insight.changes.score.old}
                  newValue={insight.changes.score.new}
                  format="percentage"
                />
              ) : (
                <span className="text-2xl font-bold text-gray-900 dark:text-white">
                    {typeof insight.score === "number" && !isNaN(insight.score) ? `${insight.score}%` : "N/A"}
                </span>
              )}
            </div>
          </div>

          <div className="space-y-3 mb-4">
            <div>
              <RiskBar risk={insight.turnover_risk} type="turnover" />
              {insight.changes?.turnover_risk && (
                <div className="mt-1 pl-1">
                  <ChangeIndicator 
                    oldValue={insight.changes.turnover_risk.old}
                    newValue={insight.changes.turnover_risk.new}
                    format="text"
                  />
                </div>
              )}
            </div>

            <div>
              <RiskBar risk={insight.predicted_delinquency} type="delinquency" />
              {insight.changes?.predicted_delinquency && (
                <div className="mt-1 pl-1">
                  <ChangeIndicator 
                    oldValue={insight.changes.predicted_delinquency.old}
                    newValue={insight.changes.predicted_delinquency.new}
                    format="text"
                  />
                </div>
              )}
            </div>
          </div>

          {hasChanges && insight.changes?.past_due && (
            <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg space-y-2">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Financial Changes</h4>
              </div>
              {insight.changes?.past_due && (
                <ChangeIndicator 
                  oldValue={insight.changes.past_due.old}
                  newValue={insight.changes.past_due.new}
                  format="currency"
                  label="Past Due"
                />
              )}
              {insight.changes?.delinquent_rent && (
                <ChangeIndicator 
                  oldValue={insight.changes.delinquent_rent.old}
                  newValue={insight.changes.delinquent_rent.new}
                  format="currency"
                  label="Delinquent Rent"
                />
              )}
              {insight.changes?.total_balance && (
                <ChangeIndicator 
                  oldValue={insight.changes.total_balance.old}
                  newValue={insight.changes.total_balance.new}
                  format="currency"
                  label="Total Balance"
                />
              )}
            </div>
          )}

          {insight.reasoning_summary && (
            <div className="mb-4 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                <span className="font-medium text-gray-700 dark:text-gray-300">Analysis</span>
              </div>
              <p>{insight.reasoning_summary}</p>
            </div>
          )}

          <div className="space-y-2">
            {insight.high_delinquency_alert && (
              <div className="flex items-center text-red-600 dark:text-red-400 text-sm">
                <AlertTriangle className="w-4 h-4 mr-2" />
                <span>High Delinquency Alert</span>
              </div>
            )}
            {insight.raise_rent_opportunity && (
              <div className="flex items-center text-green-600 dark:text-green-400 text-sm">
                <ArrowUpRight className="w-4 h-4 mr-2" />
                <span>Rent Increase Opportunity</span>
              </div>
            )}
            {insight.retention_outreach_needed && (
              <div className="flex items-center text-blue-600 dark:text-blue-400 text-sm">
                <CheckCircle className="w-4 h-4 mr-2" />
                <span>Retention Outreach Needed</span>
              </div>
            )}
          </div>

          <div className="mt-4 flex justify-end">
            <MessageTenantButton
              tenantName={insight.tenant_name}
              tenantId={insight.id}
              phoneNumber={insight.phone_number}
              email={insight.email}
              isDelinquent={insight.high_delinquency_alert}
              leaseEndingSoon={insight.lease_end_date && new Date(insight.lease_end_date) <= thirtyDaysFromNow}
            />
          </div>

          {insight.recommended_actions.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">Recommended Actions</p>
              <ul className="space-y-1">
                {insight.recommended_actions.slice(0, 2).map((action, index) => (
                  <li key={index} className="flex items-start text-sm">
                    <span className="text-gray-400 mr-2">•</span>
                    <span className="text-gray-600 dark:text-gray-400">{action}</span>
                  </li>
                ))}
                {insight.recommended_actions.length > 2 && (
                  <li className="text-sm text-gray-500 dark:text-gray-400">
                    +{insight.recommended_actions.length - 2} more actions
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>

        <button
          onClick={handleViewHistory}
          disabled={loading}
          className="p-3 text-sm font-medium text-havyn-primary dark:text-green-400 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors border-t border-gray-200 dark:border-gray-700 flex items-center justify-center gap-2"
        >
          <Clock className="w-4 h-4" />
          <span>{loading ? 'Loading History...' : 'View History'}</span>
        </button>
      </div>

      {showHistory && (
        <TenantHistory
          insights={tenantHistory}
          onClose={() => setShowHistory(false)}
        />
      )}
    </>
  );
}
