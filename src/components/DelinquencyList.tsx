import React from 'react';
import { TenantInsight } from '../types';
import { AlertTriangle, Clock, FileText } from 'lucide-react';

interface DelinquencyListProps {
  insights: TenantInsight[];
  onTenantClick: (tenant: TenantInsight) => void;
  sortField: 'tenant' | 'property' | 'amount' | 'aging';
  sortOrder: 'asc' | 'desc';
}

export function DelinquencyList({ insights, onTenantClick, sortField, sortOrder }: DelinquencyListProps) {
  const delinquentTenants = insights
    .filter(tenant => tenant.high_delinquency_alert || tenant.delinquent_rent > 0)
    .sort((a, b) => {
      const compareValue = (valA: any, valB: any) => {
        if (sortOrder === 'asc') {
          return valA > valB ? 1 : -1;
        }
        return valA < valB ? 1 : -1;
      };

      switch (sortField) {
        case 'tenant':
          return compareValue(a.tenant_name, b.tenant_name);
        case 'property':
          return compareValue(a.property, b.property);
        case 'amount':
          return compareValue(a.delinquent_rent, b.delinquent_rent);
        case 'aging':
          const agingA = Math.max(a.aging_over_90, a.aging_90, a.aging_60, a.aging_30);
          const agingB = Math.max(b.aging_over_90, b.aging_90, b.aging_60, b.aging_30);
          return compareValue(agingA, agingB);
        default:
          return 0;
      }
    });

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
    });
  };

  const getAgingBarWidth = (amount: number, maxAmount: number) => {
    return maxAmount > 0 ? (amount / maxAmount) * 100 : 0;
  };

  const maxDelinquency = Math.max(
    ...delinquentTenants.map(t => Math.max(
      t.aging_30,
      t.aging_60,
      t.aging_90,
      t.aging_over_90
    ))
  );

  return (
    <div className="space-y-6">
      {delinquentTenants.map(tenant => {
        const totalDelinquent = tenant.delinquent_rent;
        const hasAgingBuckets = tenant.aging_30 > 0 || tenant.aging_60 > 0 || 
          tenant.aging_90 > 0 || tenant.aging_over_90 > 0;

        return (
          <div
            key={tenant.id}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden border border-gray-200 dark:border-gray-700 
              hover:shadow-md transition-shadow"
          >
            {/* Header with tenant info and total amount */}
            <div className="p-4 flex items-start justify-between border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-start gap-3">
                <div className="mt-1">
                  <AlertTriangle className="w-5 h-5 text-red-500 dark:text-red-400" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white">{tenant.tenant_name}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {tenant.property} - Unit {tenant.unit}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-red-600 dark:text-red-400 font-semibold">
                  {formatCurrency(totalDelinquent)}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Total Past Due</p>
              </div>
            </div>

            {/* Aging buckets visualization */}
            {hasAgingBuckets && (
              <div className="p-4 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
                <div className="space-y-3">
                  {tenant.aging_30 > 0 && (
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-500 dark:text-gray-400">0-30 Days</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {formatCurrency(tenant.aging_30)}
                        </span>
                      </div>
                      <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-yellow-400 transition-all duration-500"
                          style={{ width: `${getAgingBarWidth(tenant.aging_30, maxDelinquency)}%` }}
                        />
                      </div>
                    </div>
                  )}
                  {tenant.aging_60 > 0 && (
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-500 dark:text-gray-400">30-60 Days</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {formatCurrency(tenant.aging_60)}
                        </span>
                      </div>
                      <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-orange-400 transition-all duration-500"
                          style={{ width: `${getAgingBarWidth(tenant.aging_60, maxDelinquency)}%` }}
                        />
                      </div>
                    </div>
                  )}
                  {tenant.aging_90 > 0 && (
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-500 dark:text-gray-400">60-90 Days</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {formatCurrency(tenant.aging_90)}
                        </span>
                      </div>
                      <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-red-400 transition-all duration-500"
                          style={{ width: `${getAgingBarWidth(tenant.aging_90, maxDelinquency)}%` }}
                        />
                      </div>
                    </div>
                  )}
                  {tenant.aging_over_90 > 0 && (
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-500 dark:text-gray-400">90+ Days</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {formatCurrency(tenant.aging_over_90)}
                        </span>
                      </div>
                      <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-purple-400 transition-all duration-500"
                          style={{ width: `${getAgingBarWidth(tenant.aging_over_90, maxDelinquency)}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Notes section */}
            {tenant.delinquency_notes && (
              <div className="p-4 flex items-start gap-2">
                <FileText className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-gray-600 dark:text-gray-400">{tenant.delinquency_notes}</p>
              </div>
            )}

            {/* Action button */}
            <button
              onClick={() => onTenantClick(tenant)}
              className="w-full p-2 text-sm font-medium text-havyn-primary dark:text-green-400 hover:bg-gray-50 
                dark:hover:bg-gray-700/50 transition-colors border-t border-gray-200 dark:border-gray-700"
            >
              View Details
            </button>
          </div>
        );
      })}
    </div>
  );
}