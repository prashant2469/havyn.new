import React from 'react';
import { useTenantAuth } from '../contexts/TenantAuthContext';
import { TenantLogin } from './TenantLogin';
import { TenantDashboard } from './TenantDashboard';

export function TenantApp() {
  const { tenant, loading } = useTenantAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-blue-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return tenant ? <TenantDashboard /> : <TenantLogin />;
}