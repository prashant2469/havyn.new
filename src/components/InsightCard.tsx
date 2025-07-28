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

const formatCurrency = (amount: number) => {
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
  const [tenantHistory, s]()
