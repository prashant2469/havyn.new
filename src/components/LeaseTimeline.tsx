import React from 'react';
import { TenantInsight } from '../types';
import { Calendar, AlertTriangle, Clock } from 'lucide-react';

interface LeaseTimelineProps {
  insights: TenantInsight[];
  onTenantClick: (tenant: TenantInsight) => void;
}

export function LeaseTimeline({ insights, onTenantClick }: LeaseTimelineProps) {
  const today = new Date();
  const thirtyDaysFromNow = new Date(today.getTime() + (30 * 24 * 60 * 60 * 1000));
  const ninetyDaysFromNow = new Date(today.getTime() + (90 * 24 * 60 * 60 * 1000));

  const getTimeframe = (date: Date) => {
    if (date <= thirtyDaysFromNow) return { label: 'Immediate', color: 'red' };
    if (date <= ninetyDaysFromNow) return { label: '30-90 Days', color: 'yellow' };
    return { label: '90+ Days', color: 'green' };
  };

  const groupedInsights = insights.reduce((acc, insight) => {
    if (!insight.lease_end_date) return acc;
    const leaseEnd = new Date(insight.lease_end_date);
    const { label } = getTimeframe(leaseEnd);
    if (!acc[label]) acc[label] = [];
    acc[label].push(insight);
    return acc;
  }, {} as Record<string, TenantInsight[]>);

  const getDaysUntilLeaseEnd = (leaseEndDate: string) => {
    const end = new Date(leaseEndDate);
    const diffTime = Math.abs(end.getTime() - today.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const getProgressColor = (timeframe: string) => {
    switch (timeframe) {
      case 'Immediate': return 'bg-red-500 dark:bg-red-400';
      case '30-90 Days': return 'bg-yellow-500 dark:bg-yellow-400';
      default: return 'bg-green-500 dark:bg-green-400';
    }
  };

  const getLabelColor = (timeframe: string) => {
    switch (timeframe) {
      case 'Immediate': return 'text-red-700 bg-red-50 border-red-200 dark:text-red-400 dark:bg-red-900/20 dark:border-red-800';
      case '30-90 Days': return 'text-yellow-700 bg-yellow-50 border-yellow-200 dark:text-yellow-400 dark:bg-yellow-900/20 dark:border-yellow-800';
      default: return 'text-green-700 bg-green-50 border-green-200 dark:text-green-400 dark:bg-green-900/20 dark:border-green-800';
    }
  };

  return (
    <div className="space-y-8">
      {Object.entries(groupedInsights).map(([timeframe, tenants]) => (
        <div key={timeframe} className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-gray-400" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{timeframe}</h3>
            </div>
            <div className={`px-3 py-1 rounded-full text-sm font-medium border ${getLabelColor(timeframe)}`}>
              {tenants.length} {tenants.length === 1 ? 'lease' : 'leases'}
            </div>
          </div>

          <div className="space-y-4">
            {tenants.map(tenant => {
              const daysRemaining = getDaysUntilLeaseEnd(tenant.lease_end_date);
              const progress = Math.min((daysRemaining / 90) * 100, 100);

              return (
                <button
                  key={tenant.id}
                  onClick={() => onTenantClick(tenant)}
                  className="w-full group"
                >
                  <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 
                    dark:border-gray-600 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-900 dark:text-white group-hover:text-green-600 
                            dark:group-hover:text-green-400 transition-colors">
                            {tenant.tenant_name}
                          </p>
                          {tenant.turnover_risk === 'High' && (
                            <AlertTriangle className="w-4 h-4 text-red-400" />
                          )}
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Unit {tenant.unit}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {new Date(tenant.lease_end_date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500 dark:text-gray-400">{daysRemaining} days remaining</span>
                        <span className={tenant.turnover_risk === 'High' ? 'text-red-600 dark:text-red-400' : 
                          tenant.turnover_risk === 'Medium' ? 'text-yellow-600 dark:text-yellow-400' : 'text-green-600 dark:text-green-400'}>
                          {tenant.turnover_risk} Risk
                        </span>
                      </div>
                      <div className="h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${getProgressColor(timeframe)} transition-all duration-500`}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}