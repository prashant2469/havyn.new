import React from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { 
  Brain, 
  ArrowRight, 
  ChevronRight,
  Sun,
  Moon,
  Upload,
  Users,
  Home
} from 'lucide-react';

export function LandingPage() {
  const { isDarkMode, toggleDarkMode } = useTheme();

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 transition-colors">
      {/* Sticky Header */}
      <header className="fixed top-0 left-0 right-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm z-50 border-b border-gray-100 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
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
              <div className="flex items-center gap-3">
                <Link
                  to="/login"
                  className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white px-4 py-2 text-sm font-medium transition-colors"
                >
                  <Users className="w-4 h-4" />
                  Owner Log In
                </Link>
                <Link
                  to="/tenant-login"
                  className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  <Home className="w-4 h-4" />
                  Tenant Log In
                </Link>
              </div>
              <a
                href="#demo"
                className="bg-havyn-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-havyn-dark transition-colors"
              >
                Book a Free Demo
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-24 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <img src="/havyn-icon.svg" alt="Havyn" className="h-32 mx-auto mb-8" />
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6">
            Smarter Insights,
            <br />
            Faster Decisions
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
            Transform your property management with AI-powered tenant insights. 
            Make data-driven decisions and optimize your rental portfolio.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="#demo"
              className="bg-havyn-primary text-white px-8 py-4 rounded-lg text-lg font-medium hover:bg-havyn-dark transition-colors inline-flex items-center justify-center gap-2"
            >
              Book a Free Demo
              <ArrowRight className="w-5 h-5" />
            </a>
            <a
              href="#how-it-works"
              className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-8 py-4 rounded-lg text-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors inline-flex items-center justify-center gap-2"
            >
              See How It Works
              <ChevronRight className="w-5 h-5" />
            </a>
          </div>
        </div>
      </section>

      {/* Login Options Section */}
      <section className="py-16 bg-gray-50 dark:bg-gray-800 transition-colors">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
            Choose Your Portal
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Link
              to="/login"
              className="group bg-white dark:bg-gray-700 p-8 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-200 dark:border-gray-600"
            >
              <div className="w-16 h-16 bg-havyn-primary bg-opacity-10 dark:bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                <Users className="w-8 h-8 text-havyn-primary dark:text-green-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Property Owners
              </h3>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                Access AI-powered tenant insights, analytics, and property management tools.
              </p>
              <div className="flex items-center justify-center gap-2 text-havyn-primary dark:text-green-400 font-medium group-hover:gap-3 transition-all">
                <span>Owner Log In</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </Link>

            <Link
              to="/tenant-login"
              className="group bg-white dark:bg-gray-700 p-8 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-200 dark:border-gray-600"
            >
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                <Home className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Tenants
              </h3>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                View your rental information, lease details, and account status.
              </p>
              <div className="flex items-center justify-center gap-2 text-blue-600 dark:text-blue-400 font-medium group-hover:gap-3 transition-all">
                <span>Tenant Log In</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-24 bg-white dark:bg-gray-900 transition-colors">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-xl">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center mb-4">
                <Brain className="w-6 h-6 text-havyn-primary dark:text-green-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Automated Analysis
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Let AI analyze your tenant data and provide actionable insights instantly.
              </p>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-xl">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center mb-4">
                <Brain className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Smart Predictions
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Predict tenant behavior and identify risks before they become problems.
              </p>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-xl">
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center mb-4">
                <Upload className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Easy Integration
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Simply upload your rent roll and tenant files to get started.
              </p>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-xl">
              <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900 rounded-lg flex items-center justify-center mb-4">
                <Brain className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Enterprise Security
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Built on AWS and Supabase for bank-level data protection.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-24 bg-gray-50 dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-16">
            How It Works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="text-center">
              <div className="w-16 h-16 bg-havyn-primary bg-opacity-10 dark:bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Upload className="w-8 h-8 text-havyn-primary dark:text-green-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                1. Upload Your Data
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Simply upload your rent roll and tenant files through our secure interface.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-havyn-primary bg-opacity-10 dark:bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Brain className="w-8 h-8 text-havyn-primary dark:text-green-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                2. AI Analysis
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Our AI analyzes your data to generate insights and recommendations.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-havyn-primary bg-opacity-10 dark:bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Brain className="w-8 h-8 text-havyn-primary dark:text-green-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                3. Take Action
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Get actionable insights and make data-driven decisions for your properties.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Screenshot Section */}
      <section className="py-24 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Powerful Analytics Dashboard
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Get a clear view of your property portfolio with our intuitive dashboard.
            </p>
          </div>
          <div className="rounded-xl overflow-hidden shadow-2xl">
            <img
              src="https://images.pexels.com/photos/7681078/pexels-photo-7681078.jpeg"
              alt="Havyn Dashboard"
              className="w-full"
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section id="demo" className="py-24 bg-gray-50 dark:bg-gray-800">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Ready to Transform Your Property Management?
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
            Book a free demo to see how Havyn can help you make better decisions.
          </p>
          <a
            href="#demo"
            className="bg-havyn-primary text-white px-8 py-4 rounded-lg text-lg font-medium hover:bg-havyn-dark transition-colors inline-flex items-center justify-center gap-2"
          >
            Book Your Free Demo
            <ArrowRight className="w-5 h-5" />
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 dark:bg-black text-white py-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center mb-4">
                <img src="/havyn-icon.svg" alt="Havyn" className="h-10 w-auto" />
              </div>
              <p className="text-gray-400">
                Smarter Insights, Faster Decisions
              </p>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">Product</h4>
              <ul className="space-y-2">
                <li><a href="#features" className="text-gray-400 hover:text-white">Features</a></li>
                <li><a href="#pricing" className="text-gray-400 hover:text-white">Pricing</a></li>
                <li><a href="#demo" className="text-gray-400 hover:text-white">Book Demo</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">Company</h4>
              <ul className="space-y-2">
                <li><a href="#about" className="text-gray-400 hover:text-white">About</a></li>
                <li><a href="#blog" className="text-gray-400 hover:text-white">Blog</a></li>
                <li><a href="#careers" className="text-gray-400 hover:text-white">Careers</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">Legal</h4>
              <ul className="space-y-2">
                <li><a href="#privacy" className="text-gray-400 hover:text-white">Privacy</a></li>
                <li><a href="#terms" className="text-gray-400 hover:text-white">Terms</a></li>
                <li><a href="#security" className="text-gray-400 hover:text-white">Security</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-12 pt-8 text-center text-gray-400">
            <p>&copy; {new Date().getFullYear()} Havyn. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;