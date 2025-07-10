import React from 'react';

interface RiskDistributionBarProps {
  data: {
    low: number;
    medium: number;
    high: number;
  };
  title: string;
  subtitle: string;
}

export function RiskDistributionBar({ data, title, subtitle }: RiskDistributionBarProps) {
  const total = data.low + data.medium + data.high;
  const lowPercent = (data.low / total) * 100;
  const mediumPercent = (data.medium / total) * 100;
  const highPercent = (data.high / total) * 100;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>
      </div>

      <div className="space-y-4">
        <div className="h-4 flex rounded-full overflow-hidden">
          <div 
            className="bg-green-500 dark:bg-green-600 transition-all duration-500"
            style={{ width: `${lowPercent}%` }}
          />
          <div 
            className="bg-yellow-500 dark:bg-yellow-600 transition-all duration-500"
            style={{ width: `${mediumPercent}%` }}
          />
          <div 
            className="bg-red-500 dark:bg-red-600 transition-all duration-500"
            style={{ width: `${highPercent}%` }}
          />
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="text-lg font-semibold text-green-700 dark:text-green-400">{data.low}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Low</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-yellow-700 dark:text-yellow-400">{data.medium}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Medium</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-red-700 dark:text-red-400">{data.high}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">High</div>
          </div>
        </div>
      </div>
    </div>
  );
}