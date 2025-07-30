import React from 'react';
import { InsightCard } from './InsightCard';
import { RiskBar } from './RiskBar';
import { TenantInsight } from '../types';
import { ChevronDown, ChevronRight, Building2, AlertTriangle, TrendingUp, Users } from 'lucide-react';

interface PropertyGroupProps {
  property: string;
  insights: TenantInsight[];
  isExpanded: boolean;
  onToggle: () => void;
  allInsights?: TenantInsight[];
  searchQuery?: string;
}

export function PropertyGroup({ property, insights, isExpanded, onToggle, allInsights = [], searchQuery = '' }: PropertyGroupProps) {
  const calculateStats = () => {
    const stats = {
      totalUnits: insights.length,
      highRiskCount: insights.filter(i => i.turnover_risk.toLowerCase() === 'high').length,
      retentionNeededCount: insights.filter(i => i.retention_outreach_needed).length,
      rentIncreaseOpportunities: insights.filter(i => i.raise_rent_opportunity).length,
      delinquencyAlerts: insights.filter(i => i.high_delinquency_alert).length,
      averageScore: Math.round(
        insights.reduce((sum, insight) => sum + insight.score, 0) / insights.length
      ),
    };

    const turnoverRisks = insights.map(i => i.turnover_risk.toLowerCase());
    const delinquencyRisks = insights.map(i => i.predicted_delinquency.toLowerCase());

    const getPredominantRisk = (risks: string[]) => {
      const counts = { high: 0, medium: 0, low: 0 };
      risks.forEach(risk => counts[risk as keyof typeof counts]++);
      if (counts.high > counts.medium && counts.high > counts.low) return 'high';
      if (counts.medium > counts.low) return 'medium';
      return 'low';
    };

    return {
      ...stats,
      predominantTurnoverRisk: getPredominantRisk(turnoverRisks),
      predominantDelinquencyRisk: getPredominantRisk(delinquencyRisks)
    };
  };

  const stats = calculateStats();

  const filteredInsights = searchQuery
    ? insights.filter(insight => 
        insight.tenant_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        insight.unit.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : insights;
  
  console.log("Property insights:", insights);  // Add this to see what's being passed

  return (
    <div className="mb-4 bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full px-6 py-4 flex items-center justify-between bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
      >
        <div className="flex items-center gap-4">
          <Building2 className="w-5 h-5 text-havyn-primary dark:text-green-400" />
          <h3 className="text-xl font-semibold text-havyn-primary dark:text-green-400">{property}</h3>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600 dark:text-gray-400">{stats.totalUnits} units</span>
              <RiskBar risk={stats.predominantTurnoverRisk} type="turnover" />
              <RiskBar risk={stats.predominantDelinquencyRisk} type="delinquency" />
            </div>
            <div className="h-4 w-px bg-gray-200 dark:bg-gray-600" />
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Score:</span>
              <span className="text-sm font-semibold text-havyn-primary dark:text-green-400">{stats.averageScore}</span>
            </div>
          </div>
        </div>
        {isExpanded ? (
          <ChevronDown className="w-5 h-5 text-gray-400" />
        ) : (
          <ChevronRight className="w-5 h-5 text-gray-400" />
        )}
      </button>

      <div className={`transition-all duration-300 ${isExpanded ? 'block' : 'hidden'}`}>
        <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700">
          <div className="grid grid-cols-4 gap-4">
            <div className="flex items-center gap-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg p-3">
              <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              <div>
                <p className="text-sm text-orange-600 dark:text-orange-400">High Risk</p>
                <p className="text-lg font-semibold text-orange-700 dark:text-orange-300">{stats.highRiskCount}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3">
              <Users className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              <div>
                <p className="text-sm text-purple-600 dark:text-purple-400">Retention Needed</p>
                <p className="text-lg font-semibold text-purple-700 dark:text-purple-300">{stats.retentionNeededCount}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
              <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
              <div>
                <p className="text-sm text-green-600 dark:text-green-400">Rent Increase</p>
                <p className="text-lg font-semibold text-green-700 dark:text-green-300">{stats.rentIncreaseOpportunities}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 rounded-lg p-3">
              <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
              <div>
                <p className="text-sm text-red-600 dark:text-red-400">Delinquency</p>
                <p className="text-lg font-semibold text-red-700 dark:text-red-300">{stats.delinquencyAlerts}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-gray-100 dark:border-gray-700">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredInsights.map((insight) => (
               <InsightCard
                key={`${insight.property}-${insight.unit}-${insight.tenant_name}`}
                insight={insight}
                allInsights={allInsights}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}