import React from 'react';
import { TenantInsight } from '../types';
import { ChevronRight } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  onClick?: () => void;
  color?: string;
}

export function MetricCard({ title, value, icon, trend, onClick, color = 'blue' }: MetricCardProps) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-700',
    green: 'bg-green-50 text-green-700',
    red: 'bg-red-50 text-red-700',
    purple: 'bg-purple-50 text-purple-700',
  };

  return (
    <button
      onClick={onClick}
      className={`w-full p-6 rounded-lg ${colorClasses[color as keyof typeof colorClasses]} 
        hover:shadow-md transition-shadow cursor-pointer`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          {icon}
          <div>
            <p className="text-sm font-medium opacity-75">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
          </div>
        </div>
        {onClick && <ChevronRight className="w-5 h-5 opacity-50" />}
      </div>
      {trend && (
        <div className="mt-4 flex items-center gap-2">
          <span className={trend.isPositive ? 'text-green-600' : 'text-red-600'}>
            {trend.isPositive ? '↑' : '↓'} {trend.value}%
          </span>
          <span className="text-sm opacity-75">vs last month</span>
        </div>
      )}
    </button>
  );
}