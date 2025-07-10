import React, { useState } from 'react';
import { Menu, Sun, Moon } from 'lucide-react';
import { Dashboard } from './Dashboard';
import { SettingsPage } from './SettingsPage';
import { NavigationSidebar } from './NavigationSidebar';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

export function MainContent() {
  const [currentView, setCurrentView] = useState('home');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { user } = useAuth();
  const { isDarkMode, toggleDarkMode } = useTheme();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <div className="flex justify-between items-center h-20 px-4 sm:px-6 lg:px-8 bg-white dark:bg-gray-800 shadow-sm transition-colors">
        <div className="flex items-center">
          <img src="/havyn-icon.svg" alt="Havyn" className="h-24 w-auto" />
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={toggleDarkMode}
            className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
          <span className="text-sm text-havyn-primary dark:text-green-400 font-medium">{user?.email}</span>
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 text-havyn-primary dark:text-green-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>
      </div>

      <NavigationSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        currentView={currentView}
        onNavigate={setCurrentView}
      />

      {currentView === 'home' ? <Dashboard /> : <SettingsPage />}
    </div>
  );
}