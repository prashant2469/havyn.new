import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { TenantAuthProvider } from './contexts/TenantAuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { MainContent } from './components/MainContent';
import { AuthForm } from './components/AuthForm';
import { LandingPage } from './components/LandingPage';
import { TenantApp } from './components/TenantApp';
import { useAuth } from './contexts/AuthContext';
import GoogleGmailCallback from './pages/GoogleGmailCallback';

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-havyn-primary"></div>
      </div>
    );
  }

  return user ? <MainContent /> : <AuthForm />;
}

function App() {
  return (
    <Router>
      <ThemeProvider>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route 
            path="/login" 
            element={
              <AuthProvider>
                <AppContent />
              </AuthProvider>
            } 
          />
          <Route 
            path="/dashboard" 
            element={
              <AuthProvider>
                <AppContent />
              </AuthProvider>
            } 
          />
          <Route 
            path="/tenant-login" 
            element={
              <TenantAuthProvider>
                <TenantApp />
              </TenantAuthProvider>
            } 
          />
          <Route
            path="/oauth/google/callback"
            element={
              <AuthProvider>
                <GoogleGmailCallback />
              </AuthProvider>
            }
          />
        </Routes>
      </ThemeProvider>
    </Router>
  );
}

export default App;