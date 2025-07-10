import React from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Pie } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend);

interface RiskPieChartProps {
  data: {
    low: number;
    medium: number;
    high: number;
  };
  title: string;
  subtitle: string;
}

export function RiskPieChart({ data, title, subtitle }: RiskPieChartProps) {
  const chartData = {
    labels: ['Low Risk', 'Medium Risk', 'High Risk'],
    datasets: [
      {
        data: [data.low, data.medium, data.high],
        backgroundColor: [
          'rgba(34, 197, 94, 0.8)', // green-500
          'rgba(234, 179, 8, 0.8)',  // yellow-500
          'rgba(239, 68, 68, 0.8)',  // red-500
        ],
        borderColor: [
          'rgba(34, 197, 94, 1)',
          'rgba(234, 179, 8, 1)',
          'rgba(239, 68, 68, 1)',
        ],
        borderWidth: 1,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          font: {
            size: 12,
          },
          padding: 15,
        },
      },
      title: {
        display: true,
        text: [title, subtitle],
        font: {
          size: 14,
          weight: '500',
        },
        padding: {
          bottom: 15,
        },
        color: '#374151', // text-gray-700
      },
    },
  };

  return (
    <div className="bg-white rounded-lg p-4 shadow-sm">
      <Pie data={chartData} options={options} />
    </div>
  );
}