import React from 'react';

interface RiskBarProps {
  risk: 'low' | 'medium' | 'high';
  type: 'turnover' | 'delinquency';
}

export function RiskBar({ risk, type }: RiskBarProps) {
  const getBarSegments = () => {
    switch (risk.toLowerCase()) {
      case 'high':
        return ['bg-red-500', 'bg-red-500', 'bg-red-500'];
      case 'medium':
        return ['bg-yellow-500', 'bg-yellow-500', 'bg-gray-200'];
      case 'low':
        return ['bg-green-500', 'bg-gray-200', 'bg-gray-200'];
      default:
        return ['bg-gray-200', 'bg-gray-200', 'bg-gray-200'];
    }
  };

  const segments = getBarSegments();
  const label = type === 'turnover' ? 'Turnover' : 'Delinquency';
  const textColor = risk === 'high' ? 'text-red-700' : risk === 'medium' ? 'text-yellow-700' : 'text-green-700';

  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-0.5">
        {segments.map((color, index) => (
          <div
            key={index}
            className={`h-2 w-1.5 first:rounded-l last:rounded-r ${color}`}
          />
        ))}
      </div>
      <span className={`text-xs font-medium ${textColor}`}>
        {label}
      </span>
    </div>
  );
}