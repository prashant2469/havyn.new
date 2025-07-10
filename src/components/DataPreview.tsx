import React from 'react';
import { TenantData } from '../types';

interface DataPreviewProps {
  data: TenantData[];
}

export function DataPreview({ data }: DataPreviewProps) {
  if (!data.length) return null;

  const priorityColumns = [
    'property',
    'unit',
    'tenant',
    'rentAmount',
    'marketRent',
    'pastDue',
    'delinquentRent',
    'amountReceivable',
    'aging30',
    'aging60',
    'aging90',
    'agingOver90',
    'delinquentSubsidyAmount',
    'delinquencyNotes',
    'lateCount',
    'tenureMonths',
    'latePaymentRate',
    'phoneNumbers',
    'emails'
  ];

  const allColumns = Object.keys(data[0]);
  
  const sortedColumns = [
    ...priorityColumns.filter(col => allColumns.includes(col)),
    ...allColumns.filter(col => !priorityColumns.includes(col))
  ];

  const formatValue = (value: any, column: string): string => {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'number') {
      if (['rentAmount', 'marketRent', 'pastDue', 'delinquentRent', 'amountReceivable', 
           'aging30', 'aging60', 'aging90', 'agingOver90', 'delinquentSubsidyAmount'].includes(column)) {
        return value.toLocaleString('en-US', {
          style: 'currency',
          currency: 'USD'
        });
      }
      if (column === 'latePaymentRate') return (value * 100).toFixed(1) + '%';
      return value.toString();
    }
    return value.toString();
  };

  const getCellClass = (column: string, value: any): string => {
    const baseClass = "px-6 py-4 text-sm whitespace-nowrap ";
    
    if (['pastDue', 'delinquentRent', 'amountReceivable'].includes(column) && value > 0) {
      return baseClass + "text-red-600 font-medium";
    }
    
    if (['aging30', 'aging60', 'aging90', 'agingOver90'].includes(column)) {
      if (value > 0) return baseClass + "text-orange-600 font-medium";
      return baseClass + "text-gray-400";
    }
    
    return baseClass + "text-gray-500";
  };

  const getColumnHeader = (column: string): string => {
    const headers: { [key: string]: string } = {
      aging30: '0-30 Days',
      aging60: '30-60 Days',
      aging90: '60-90 Days',
      agingOver90: '90+ Days'
    };
    return headers[column] || column.charAt(0).toUpperCase() + column.slice(1);
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {sortedColumns.map((header) => (
              <th
                key={header}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap"
              >
                {getColumnHeader(header)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {data.slice(0, 100).map((row, index) => (
            <tr key={index} className="hover:bg-gray-50">
              {sortedColumns.map((column) => (
                <td
                  key={column}
                  className={getCellClass(column, row[column as keyof TenantData])}
                >
                  {formatValue(row[column as keyof TenantData], column)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}