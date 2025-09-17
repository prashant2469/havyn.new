import React from 'react'; 
import { TenantInsight } from '../types';
import { formatDistanceToNow } from 'date-fns';
import { TrendingUp, TrendingDown, ArrowRight, AlertTriangle, Clock } from 'lucide-react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

// ---------- ADD THIS HELPER ----------
function safeDate(dateInput: any): Date | null {
  if (!dateInput) return null;
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return null;
  return d;
}
// -------------------------------------

interface TenantHistoryProps {
  insights: TenantInsight[];
  onClose: () => void;
}

const formatCurrency = (amount: number) => {
  if (typeof amount !== "number" || isNaN(amount)) return "$0.00";
  return amount.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
  });
};

const getRiskColor = (risk: string) => {
  switch (risk?.toLowerCase()) {
    case 'high':
      return 'text-red-600 dark:text-red-400';
    case 'medium':
      return 'text-yellow-600 dark:text-yellow-400';
    case 'low':
      return 'text-green-600 dark:text-green-400';
    default:
      return 'text-gray-600 dark:text-gray-400';
  }
};

export function TenantHistory({ insights, onClose }: TenantHistoryProps) {
  // --------- PATCHED SORT ----------
  const sortedInsights = [...insights].sort((a, b) => {
    const dateA = safeDate(a.created_at);
    const dateB = safeDate(b.created_at);
    if (!dateA && !dateB) return 0;
    if (!dateA) return 1;
    if (!dateB) return -1;
    return dateA.getTime() - dateB.getTime();
  });

  const chartData = {
    labels: sortedInsights.map(insight => {
      const d = safeDate(insight.created_at);
      return d ? formatDistanceToNow(d, { addSuffix: true }) : '—';
    }),
    datasets: [
      {
        label: 'Tenant Score',
        data: sortedInsights.map(insight => Math.round((insight.score / 100) * 100)),
        borderColor: '#22c55e',
        backgroundColor: '#22c55e',
        tension: 0.4,
        pointRadius: 6,
        pointHoverRadius: 8,
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        grid: {
          color: 'rgba(75, 85, 99, 0.2)',
        },
        ticks: {
          callback: (value: number) => `${value}%`,
          color: '#9ca3af',
        }
      },
      x: {
        grid: {
          color: 'rgba(75, 85, 99, 0.2)',
        },
        ticks: {
          color: '#9ca3af',
        }
      }
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context: any) => `Score: ${context.raw}%`
        },
        backgroundColor: 'rgba(17, 24, 39, 0.8)',
        titleColor: '#fff',
        bodyColor: '#fff',
        padding: 12,
        borderColor: 'rgba(75, 85, 99, 0.2)',
        borderWidth: 1
      }
    }
  };

  const getChangeIndicator = (oldValue: number | string, newValue: number | string) => {
    if (typeof oldValue === 'number' && typeof newValue === 'number') {
      const increased = newValue > oldValue;
      const Icon = increased ? TrendingUp : TrendingDown;
      const colorClass = increased ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400';
      return (
        <div className="flex items-center gap-1">
          <span className="text-gray-600 dark:text-gray-400">{typeof oldValue === 'number' ? formatCurrency(oldValue) : oldValue}</span>
          <Icon className={`w-4 h-4 ${colorClass}`} />
          <span className={colorClass}>{typeof newValue === 'number' ? formatCurrency(newValue) : newValue}</span>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-1">
        <span className="text-gray-600 dark:text-gray-400">{oldValue}</span>
        <ArrowRight className="w-4 h-4 text-gray-500" />
        <span className={getRiskColor(newValue as string)}>{newValue}</span>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-6xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                {sortedInsights[0]?.tenant_name}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {sortedInsights[0]?.property} - Unit {sortedInsights[0]?.unit}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            >
              <span className="sr-only">Close</span>
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden flex">
          {/* Left panel - Timeline */}
          <div className="w-2/3 overflow-y-auto border-r border-gray-200 dark:border-gray-700">
            <div className="p-6 space-y-8">
              {sortedInsights.slice().reverse().map((insight, index) => {
                const previousInsight = sortedInsights[index + 1];
                const hasChanges = insight.changes && Object.keys(insight.changes).length > 0;
                const d = safeDate(insight.created_at);

                return (
                  <div key={insight.id || index} className="relative">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 mt-1">
                        <div className="h-8 w-8 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                          <Clock className="h-4 w-4 text-green-600 dark:text-green-400" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            {d
                              ? formatDistanceToNow(d, { addSuffix: true })
                              : '—'}
                          </span>
                          {insight.high_delinquency_alert && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800">
                              <AlertTriangle className="w-3 h-3" />
                              High Risk
                            </span>
                          )}
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Financial Status</h4>
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-gray-500 dark:text-gray-400">Rent Amount:</span>
                                  <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(insight.rent_amount)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-500 dark:text-gray-400">Past Due:</span>
                                  {previousInsight && insight.changes?.past_due ? (
                                    getChangeIndicator(insight.changes.past_due.old, insight.changes.past_due.new)
                                  ) : (
                                    <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(insight.past_due)}</span>
                                  )}
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-500 dark:text-gray-400">Delinquent Rent:</span>
                                  {previousInsight && insight.changes?.delinquent_rent ? (
                                    getChangeIndicator(insight.changes.delinquent_rent.old, insight.changes.delinquent_rent.new)
                                  ) : (
                                    <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(insight.delinquent_rent)}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div>
                              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Risk Assessment</h4>
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-gray-500 dark:text-gray-400">Tenant Score:</span>
                                  {previousInsight && insight.changes?.score ? (
                                    getChangeIndicator(insight.changes.score.old, insight.changes.score.new)
                                  ) : (
                                    <span className="font-medium text-gray-900 dark:text-white">{insight.score}</span>
                                  )}
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-500 dark:text-gray-400">Turnover Risk:</span>
                                  {previousInsight && insight.changes?.turnover_risk ? (
                                    getChangeIndicator(insight.changes.turnover_risk.old, insight.changes.turnover_risk.new)
                                  ) : (
                                    <span className={`font-medium ${getRiskColor(insight.turnover_risk)}`}>
                                      {insight.turnover_risk}
                                    </span>
                                  )}
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-500 dark:text-gray-400">Delinquency Risk:</span>
                                  {previousInsight && insight.changes?.predicted_delinquency ? (
                                    getChangeIndicator(
                                      insight.changes.predicted_delinquency.old,
                                      insight.changes.predicted_delinquency.new
                                    )
                                  ) : (
                                    <span className={`font-medium ${getRiskColor(insight.predicted_delinquency)}`}>
                                      {insight.predicted_delinquency}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                          {insight.reasoning_summary && (
                            <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
                              <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-1">Analysis</h4>
                              <p>{insight.reasoning_summary}</p>
                            </div>
                          )}
                          {insight.recommended_actions.length > 0 && (
                            <div className="mt-4">
                              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Recommended Actions</h4>
                              <ul className="space-y-1">
                                {insight.recommended_actions.map((action, i) => (
                                  <li key={i} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                                    <span className="text-gray-400 dark:text-gray-500 mt-1">•</span>
                                    <span>{action}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    {index < sortedInsights.length - 1 && (
                      <div className="absolute left-4 top-12 bottom-0 w-px bg-gray-200 dark:bg-gray-700" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right panel - Score Graph and Stats */}
          <div className="w-1/3 overflow-y-auto">
            <div className="p-6 space-y-6 bg-white dark:bg-gray-800 min-h-full">
              <div className="sticky top-0 bg-white dark:bg-gray-800 pt-2 pb-4 -mt-2">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Score History</h3>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 shadow-sm">
                <Line data={chartData} options={chartOptions} />
              </div>
              <div className="sticky top-[200px] bg-white dark:bg-gray-800 pt-2 pb-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Summary</h3>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 shadow-sm space-y-4">
                <div>
                  <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Current Score</div>
                  <div className="text-2xl font-bold text-havyn-primary dark:text-green-400">
                    {Math.round((sortedInsights[0]?.score / 100) * 100)}%
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Score Change</div>
                  <div className="flex items-center gap-2">
                    {sortedInsights.length > 1 && (
                      getChangeIndicator(
                        Math.round((sortedInsights[1]?.score / 100) * 100),
                        Math.round((sortedInsights[0]?.score / 100) * 100)
                      )
                    )}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Risk Level</div>
                  <div className={`font-medium ${getRiskColor(sortedInsights[0]?.turnover_risk)}`}>
                    {sortedInsights[0]?.turnover_risk}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

/*
import React from 'react';
import { TenantInsight } from '../types';
import { formatDistanceToNow } from 'date-fns';
import { TrendingUp, TrendingDown, ArrowRight, AlertTriangle, Clock, ChevronRight } from 'lucide-react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface TenantHistoryProps {
  insights: TenantInsight[];
  onClose: () => void;
}

const formatCurrency = (amount: number) => {
  return amount.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
  });
};

const getRiskColor = (risk: string) => {
  switch (risk.toLowerCase()) {
    case 'high':
      return 'text-red-600 dark:text-red-400';
    case 'medium':
      return 'text-yellow-600 dark:text-yellow-400';
    case 'low':
      return 'text-green-600 dark:text-green-400';
    default:
      return 'text-gray-600 dark:text-gray-400';
  }
};

export function TenantHistory({ insights, onClose }: TenantHistoryProps) {
  const sortedInsights = [...insights].sort((a, b) => 
    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  const chartData = {
    labels: sortedInsights.map(insight => 
      formatDistanceToNow(new Date(insight.created_at), { addSuffix: true })
    ),
    datasets: [
      {
        label: 'Tenant Score',
        data: sortedInsights.map(insight => Math.round((insight.score / 100) * 100)),
        borderColor: '#22c55e',
        backgroundColor: '#22c55e',
        tension: 0.4,
        pointRadius: 6,
        pointHoverRadius: 8,
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        grid: {
          color: 'rgba(75, 85, 99, 0.2)',
        },
        ticks: {
          callback: (value: number) => `${value}%`,
          color: '#9ca3af',
        }
      },
      x: {
        grid: {
          color: 'rgba(75, 85, 99, 0.2)',
        },
        ticks: {
          color: '#9ca3af',
        }
      }
    },
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        callbacks: {
          label: (context: any) => `Score: ${context.raw}%`
        },
        backgroundColor: 'rgba(17, 24, 39, 0.8)',
        titleColor: '#fff',
        bodyColor: '#fff',
        padding: 12,
        borderColor: 'rgba(75, 85, 99, 0.2)',
        borderWidth: 1
      }
    }
  };

  const getChangeIndicator = (oldValue: number | string, newValue: number | string) => {
    if (typeof oldValue === 'number' && typeof newValue === 'number') {
      const increased = newValue > oldValue;
      const Icon = increased ? TrendingUp : TrendingDown;
      const colorClass = increased ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400';
      
      return (
        <div className="flex items-center gap-1">
          <span className="text-gray-600 dark:text-gray-400">{typeof oldValue === 'number' ? formatCurrency(oldValue) : oldValue}</span>
          <Icon className={`w-4 h-4 ${colorClass}`} />
          <span className={colorClass}>{typeof newValue === 'number' ? formatCurrency(newValue) : newValue}</span>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-1">
        <span className="text-gray-600 dark:text-gray-400">{oldValue}</span>
        <ArrowRight className="w-4 h-4 text-gray-500" />
        <span className={getRiskColor(newValue as string)}>{newValue}</span>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-6xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                {sortedInsights[0]?.tenant_name}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {sortedInsights[0]?.property} - Unit {sortedInsights[0]?.unit}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            >
              <span className="sr-only">Close</span>
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden flex">
          {/* Left panel - Timeline 
          <div className="w-2/3 overflow-y-auto border-r border-gray-200 dark:border-gray-700">
            <div className="p-6 space-y-8">
              {sortedInsights.reverse().map((insight, index) => {
                const previousInsight = sortedInsights[index + 1];
                const hasChanges = insight.changes && Object.keys(insight.changes).length > 0;

                return (
                  <div key={insight.id} className="relative">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 mt-1">
                        <div className="h-8 w-8 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                          <Clock className="h-4 w-4 text-green-600 dark:text-green-400" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            {formatDistanceToNow(new Date(insight.created_at))} ago
                          </span>
                          {insight.high_delinquency_alert && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800">
                              <AlertTriangle className="w-3 h-3" />
                              High Risk
                            </span>
                          )}
                        </div>

                        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Financial Status</h4>
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-gray-500 dark:text-gray-400">Rent Amount:</span>
                                  <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(insight.rent_amount)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-500 dark:text-gray-400">Past Due:</span>
                                  {previousInsight && insight.changes?.past_due ? (
                                    getChangeIndicator(insight.changes.past_due.old, insight.changes.past_due.new)
                                  ) : (
                                    <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(insight.past_due)}</span>
                                  )}
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-500 dark:text-gray-400">Delinquent Rent:</span>
                                  {previousInsight && insight.changes?.delinquent_rent ? (
                                    getChangeIndicator(insight.changes.delinquent_rent.old, insight.changes.delinquent_rent.new)
                                  ) : (
                                    <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(insight.delinquent_rent)}</span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div>
                              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Risk Assessment</h4>
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-gray-500 dark:text-gray-400">Tenant Score:</span>
                                  {previousInsight && insight.changes?.score ? (
                                    getChangeIndicator(insight.changes.score.old, insight.changes.score.new)
                                  ) : (
                                    <span className="font-medium text-gray-900 dark:text-white">{insight.score}</span>
                                  )}
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-500 dark:text-gray-400">Turnover Risk:</span>
                                  {previousInsight && insight.changes?.turnover_risk ? (
                                    getChangeIndicator(insight.changes.turnover_risk.old, insight.changes.turnover_risk.new)
                                  ) : (
                                    <span className={`font-medium ${getRiskColor(insight.turnover_risk)}`}>
                                      {insight.turnover_risk}
                                    </span>
                                  )}
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-500 dark:text-gray-400">Delinquency Risk:</span>
                                  {previousInsight && insight.changes?.predicted_delinquency ? (
                                    getChangeIndicator(
                                      insight.changes.predicted_delinquency.old,
                                      insight.changes.predicted_delinquency.new
                                    )
                                  ) : (
                                    <span className={`font-medium ${getRiskColor(insight.predicted_delinquency)}`}>
                                      {insight.predicted_delinquency}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>

                          {insight.reasoning_summary && (
                            <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
                              <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-1">Analysis</h4>
                              <p>{insight.reasoning_summary}</p>
                            </div>
                          )}

                          {insight.recommended_actions.length > 0 && (
                            <div className="mt-4">
                              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Recommended Actions</h4>
                              <ul className="space-y-1">
                                {insight.recommended_actions.map((action, i) => (
                                  <li key={i} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                                    <span className="text-gray-400 dark:text-gray-500 mt-1">•</span>
                                    <span>{action}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {index < sortedInsights.length - 1 && (
                      <div className="absolute left-4 top-12 bottom-0 w-px bg-gray-200 dark:bg-gray-700" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right panel - Score Graph and Stats 
          <div className="w-1/3 overflow-y-auto">
            <div className="p-6 space-y-6 bg-white dark:bg-gray-800 min-h-full">
              <div className="sticky top-0 bg-white dark:bg-gray-800 pt-2 pb-4 -mt-2">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Score History</h3>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 shadow-sm">
                <Line data={chartData} options={chartOptions} />
              </div>

              <div className="sticky top-[200px] bg-white dark:bg-gray-800 pt-2 pb-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Summary</h3>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 shadow-sm space-y-4">
                <div>
                  <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Current Score</div>
                  <div className="text-2xl font-bold text-havyn-primary dark:text-green-400">
                    {Math.round((sortedInsights[0]?.score / 100) * 100)}%
                  </div>
                </div>

                <div>
                  <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Score Change</div>
                  <div className="flex items-center gap-2">
                    {sortedInsights.length > 1 && (
                      getChangeIndicator(
                        Math.round((sortedInsights[1]?.score / 100) * 100),
                        Math.round((sortedInsights[0]?.score / 100) * 100)
                      )
                    )}
                  </div>
                </div>

                <div>
                  <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Risk Level</div>
                  <div className={`font-medium ${getRiskColor(sortedInsights[0]?.turnover_risk)}`}>
                    {sortedInsights[0]?.turnover_risk}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
*/