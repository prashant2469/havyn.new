import React, { useState, useEffect } from 'react';
import { useTenantAuth } from '../contexts/TenantAuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { RentPaymentModal } from './RentPaymentModal';
import { 
  Home, 
  Calendar, 
  DollarSign, 
  Sun,
  Moon,
  LogOut,
  User,
  MapPin,
  Star,
  TrendingUp,
  TrendingDown,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  Target,
  CheckCircle,
  ArrowUp,
  ArrowDown,
  Minus,
  AlertTriangle,
  Clock,
  BarChart3,
  History,
  CreditCard,
  Bell,
  X
} from 'lucide-react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface PaymentNotification {
  id: string;
  amount: number;
  type: string;
  timestamp: Date;
}

export function TenantDashboard() {
  const { tenant, insights, signOut } = useTenantAuth();
  const { isDarkMode, toggleDarkMode } = useTheme();
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [showScoreHistory, setShowScoreHistory] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentNotifications, setPaymentNotifications] = useState<PaymentNotification[]>([]);

  // Check for payment success in URL parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const paymentStatus = urlParams.get('payment');
    
    if (paymentStatus === 'success') {
      // Show success notification
      const newNotification: PaymentNotification = {
        id: Date.now().toString(),
        amount: 0, // Will be updated when we get the actual amount
        type: 'success',
        timestamp: new Date()
      };
      setPaymentNotifications(prev => [newNotification, ...prev]);
      
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
    });
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Not specified';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 dark:text-green-400';
    if (score >= 60) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    return 'Needs Improvement';
  };

  const getRecommendations = (score: number, hasPastDue: boolean) => {
    if (hasPastDue) {
      return [
        "🚨 Priority: Bring your past due balance current as soon as possible.",
        "Contact the property management office to discuss payment arrangements.",
        "Set up a payment plan if you need assistance with the full amount.",
        "Consider setting up automatic payments to prevent future late payments.",
        "Communicate proactively about any financial difficulties.",
        "Once current, focus on maintaining consistent on-time payments."
      ];
    }

    if (score >= 80) {
      return [
        "Keep up the excellent work! You're a model tenant.",
        "Continue paying rent on time to maintain your high score.",
        "Consider asking about lease renewal options early.",
        "Your positive rental history makes you eligible for premium properties."
      ];
    } else if (score >= 60) {
      return [
        "You're doing well! Here are ways to improve further:",
        "Ensure all rent payments are made on or before the due date.",
        "Communicate proactively with property management about any issues.",
        "Keep your unit well-maintained and report maintenance needs promptly.",
        "Consider setting up automatic rent payments to avoid late fees."
      ];
    } else {
      return [
        "Let's work together to improve your tenant score:",
        "Priority: Bring any past due amounts current as soon as possible.",
        "Set up a payment plan with property management if needed.",
        "Establish a consistent payment schedule to avoid future late payments.",
        "Communicate regularly with the property management team.",
        "Consider setting up automatic payments or payment reminders.",
        "Focus on maintaining your unit in good condition."
      ];
    }
  };

  // Function to clean property name by removing state and zipcode
  const cleanPropertyName = (propertyName: string) => {
    if (!propertyName) return '';
    
    // Remove common patterns like "- Address, State Zipcode" or "Address, State Zipcode"
    // This regex removes everything after the last dash or comma that contains state/zipcode patterns
    return propertyName
      .replace(/\s*-\s*\d+.*?[A-Z]{2}\s+\d{5}.*$/i, '') // Remove "- 123 Street, NC 28208"
      .replace(/\s*,\s*[A-Z]{2}\s+\d{5}.*$/i, '') // Remove ", NC 28208"
      .replace(/\s*-\s*.*?[A-Z]{2}\s+\d{5}.*$/i, '') // Remove "- Any Street Name, NC 28208"
      .trim();
  };

  // Get score change information - FIXED to show actual changes
  const getScoreChange = () => {
    if (insights.length < 2) return null;
    
    // Sort insights by creation date (newest first)
    const sortedInsights = [...insights].sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    
    const currentScore = sortedInsights[0].score;
    const previousScore = sortedInsights[1].score;
    const change = currentScore - previousScore;
    
    return {
      change,
      isIncrease: change > 0,
      isDecrease: change < 0,
      isStable: change === 0
    };
  };

  // Get score history for chart display
  const getScoreHistory = () => {
    if (insights.length === 0) return [];
    
    // Sort insights by creation date (oldest first for chronological display)
    const sortedInsights = [...insights].sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    return sortedInsights.map((insight, index) => ({
      date: new Date(insight.created_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      }),
      score: insight.score,
      fullDate: new Date(insight.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      change: index > 0 ? insight.score - sortedInsights[index - 1].score : 0,
      turnoverRisk: insight.turnover_risk,
      delinquencyRisk: insight.predicted_delinquency,
      timestamp: new Date(insight.created_at).getTime()
    }));
  };

  // Create chart data for score history
  const createChartData = () => {
    const scoreHistory = getScoreHistory();
    
    if (scoreHistory.length === 0) return null;

    const chartData = {
      labels: scoreHistory.map(entry => entry.date),
      datasets: [
        {
          label: 'Tenant Score',
          data: scoreHistory.map(entry => entry.score),
          borderColor: '#3B82F6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          borderWidth: 3,
          pointBackgroundColor: scoreHistory.map(entry => {
            if (entry.score >= 80) return '#10B981'; // Green
            if (entry.score >= 60) return '#F59E0B'; // Yellow
            return '#EF4444'; // Red
          }),
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
          pointRadius: 6,
          pointHoverRadius: 8,
          fill: true,
          tension: 0.4
        }
      ]
    };

    const chartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          backgroundColor: isDarkMode ? 'rgba(17, 24, 39, 0.95)' : 'rgba(255, 255, 255, 0.95)',
          titleColor: isDarkMode ? '#ffffff' : '#1f2937',
          bodyColor: isDarkMode ? '#ffffff' : '#1f2937',
          borderColor: isDarkMode ? 'rgba(75, 85, 99, 0.3)' : 'rgba(209, 213, 219, 0.3)',
          borderWidth: 1,
          cornerRadius: 8,
          padding: 12,
          callbacks: {
            title: (context: any) => {
              const index = context[0].dataIndex;
              return scoreHistory[index].fullDate;
            },
            label: (context: any) => {
              const index = context.dataIndex;
              const entry = scoreHistory[index];
              const lines = [`Score: ${entry.score}%`];
              
              if (entry.change !== 0) {
                lines.push(`Change: ${entry.change > 0 ? '+' : ''}${entry.change} points`);
              }
              
              lines.push(`Risk Level: ${entry.turnoverRisk}`);
              return lines;
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          max: 100,
          grid: {
            color: isDarkMode ? 'rgba(75, 85, 99, 0.2)' : 'rgba(209, 213, 219, 0.3)',
          },
          ticks: {
            callback: (value: number) => `${value}%`,
            color: isDarkMode ? '#9CA3AF' : '#6B7280',
            font: {
              size: 12
            }
          }
        },
        x: {
          grid: {
            color: isDarkMode ? 'rgba(75, 85, 99, 0.2)' : 'rgba(209, 213, 219, 0.3)',
          },
          ticks: {
            color: isDarkMode ? '#9CA3AF' : '#6B7280',
            font: {
              size: 12
            }
          }
        }
      },
      interaction: {
        intersect: false,
        mode: 'index' as const
      }
    };

    return { chartData, chartOptions };
  };

  const handlePaymentSuccess = (amount: number, type: string) => {
    const newNotification: PaymentNotification = {
      id: Date.now().toString(),
      amount,
      type,
      timestamp: new Date()
    };
    setPaymentNotifications(prev => [newNotification, ...prev]);
    
    // Auto-remove notification after 10 seconds
    setTimeout(() => {
      setPaymentNotifications(prev => prev.filter(n => n.id !== newNotification.id));
    }, 10000);
  };

  const removeNotification = (id: string) => {
    setPaymentNotifications(prev => prev.filter(n => n.id !== id));
  };

  // Get the primary insight for the tenant - use the most recent one
  const primaryInsight = insights.length > 0 ? insights[0] : null;
  const scoreChange = getScoreChange();
  const scoreHistory = getScoreHistory();
  const chartConfig = createChartData();

  // Check if tenant has past due amount
  const hasPastDue = primaryInsight && primaryInsight.past_due > 0;
  const pastDueAmount = primaryInsight?.past_due || 0;

  // Debug logging
  console.log('TenantDashboard Debug:', {
    tenant,
    insights,
    primaryInsight,
    score: primaryInsight?.score,
    scoreChange,
    pastDue: primaryInsight?.past_due,
    hasPastDue,
    scoreHistory
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-blue-900 transition-colors">
      {/* Payment Success Notifications */}
      {paymentNotifications.length > 0 && (
        <div className="fixed top-4 right-4 z-50 space-y-2">
          {paymentNotifications.map((notification) => (
            <div
              key={notification.id}
              className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 shadow-lg max-w-sm animate-in slide-in-from-right duration-300"
            >
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-semibold text-green-800 dark:text-green-300">
                    Payment Successful!
                  </h4>
                  <p className="text-sm text-green-700 dark:text-green-400 mt-1">
                    {notification.amount > 0 
                      ? `Your payment of ${formatCurrency(notification.amount)} has been processed.`
                      : 'Your payment has been processed successfully.'
                    }
                  </p>
                  <p className="text-xs text-green-600 dark:text-green-500 mt-1">
                    {notification.timestamp.toLocaleTimeString()}
                  </p>
                </div>
                <button
                  onClick={() => removeNotification(notification.id)}
                  className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300 flex-shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 dark:bg-blue-500 rounded-lg flex items-center justify-center">
                <Home className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-blue-600 dark:text-blue-400">Tenant Portal</h1>
                <p className="text-xs text-gray-500 dark:text-gray-400">Powered by Havyn</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Welcome, <span className="font-medium">{tenant?.name}</span>
              </span>
              <button
                onClick={toggleDarkMode}
                className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
              <button
                onClick={signOut}
                className="flex items-center gap-2 px-3 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span className="text-sm">Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Welcome back, {tenant?.name}!
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Here's your rental information and account details.
          </p>
        </div>

        {/* Past Due Alert */}
        {hasPastDue && (
          <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="text-red-800 dark:text-red-300 font-semibold">Payment Required</h3>
                <p className="text-red-700 dark:text-red-400 text-sm mt-1">
                  You have a past due balance of <span className="font-bold">{formatCurrency(pastDueAmount)}</span>. 
                  Please make a payment to bring your account current.
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {formatCurrency(pastDueAmount)}
                </div>
                <div className="text-xs text-red-500 dark:text-red-400">Past Due</div>
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="space-y-6">
          {/* Tenant Score Card */}
          {primaryInsight && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center gap-3 mb-6">
                <Star className="w-6 h-6 text-yellow-500" />
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Your Tenant Score</h3>
              </div>
              
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <div className={`text-4xl font-bold ${getScoreColor(primaryInsight.score)}`}>
                      {primaryInsight.score}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">out of 100</div>
                  </div>
                  <div className="h-12 w-px bg-gray-200 dark:bg-gray-700"></div>
                  <div>
                    <div className={`text-lg font-semibold ${getScoreColor(primaryInsight.score)}`}>
                      {getScoreLabel(primaryInsight.score)}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Performance Rating
                    </div>
                  </div>
                </div>
                
                {/* Score Change Indicator - FIXED */}
                <div className="flex items-center gap-2">
                  {scoreChange && (
                    <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${
                      scoreChange.isIncrease 
                        ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400' 
                        : scoreChange.isDecrease 
                        ? 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-400'
                    }`}>
                      {scoreChange.isIncrease && <ArrowUp className="w-4 h-4" />}
                      {scoreChange.isDecrease && <ArrowDown className="w-4 h-4" />}
                      {scoreChange.isStable && <Minus className="w-4 h-4" />}
                      <span>
                        {scoreChange.change === 0 
                          ? 'No change' 
                          : `${scoreChange.change > 0 ? '+' : ''}${scoreChange.change} points`
                        }
                      </span>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                    <TrendingUp className="w-5 h-5" />
                    <span className="text-sm font-medium">
                      {scoreChange?.isIncrease 
                        ? 'Great improvement!' 
                        : scoreChange?.isDecrease 
                        ? 'Let\'s improve together' 
                        : 'Keep up the great work!'
                      }
                    </span>
                  </div>
                </div>
              </div>

              {/* Score Progress Bar */}
              <div className="mb-6">
                <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
                  <span>Score Progress</span>
                  <span>{primaryInsight.score}%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                  <div 
                    className={`h-3 rounded-full transition-all duration-500 ${
                      primaryInsight.score >= 80 ? 'bg-green-500' :
                      primaryInsight.score >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${primaryInsight.score}%` }}
                  ></div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 mb-6">
                {/* View Recommendations Button */}
                <button
                  onClick={() => setShowRecommendations(!showRecommendations)}
                  className={`flex-1 flex items-center justify-between p-3 rounded-lg transition-colors border ${
                    hasPastDue 
                      ? 'bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 border-red-200 dark:border-red-800'
                      : 'bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 border-blue-200 dark:border-blue-800'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {hasPastDue ? (
                      <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                    ) : (
                      <Lightbulb className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    )}
                    <span className={`font-medium ${
                      hasPastDue 
                        ? 'text-red-700 dark:text-red-300' 
                        : 'text-blue-700 dark:text-blue-300'
                    }`}>
                      {hasPastDue ? 'View Action Plan' : 'View Recommendations'}
                    </span>
                  </div>
                  {showRecommendations ? (
                    <ChevronUp className={`w-5 h-5 ${
                      hasPastDue ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400'
                    }`} />
                  ) : (
                    <ChevronDown className={`w-5 h-5 ${
                      hasPastDue ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400'
                    }`} />
                  )}
                </button>

                {/* View Score History Button */}
                {scoreHistory.length > 1 && (
                  <button
                    onClick={() => setShowScoreHistory(!showScoreHistory)}
                    className="flex items-center gap-2 px-4 py-3 bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg transition-colors"
                  >
                    <BarChart3 className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    <span className="font-medium text-gray-700 dark:text-gray-300">Score History</span>
                    {showScoreHistory ? (
                      <ChevronUp className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    )}
                  </button>
                )}
              </div>

              {/* Recommendations Dropdown */}
              {showRecommendations && (
                <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                  <div className="flex items-center gap-2 mb-3">
                    <Target className={`w-5 h-5 ${
                      hasPastDue ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400'
                    }`} />
                    <h4 className="font-semibold text-gray-900 dark:text-white">
                      {hasPastDue ? 'Immediate Action Required' :
                       primaryInsight.score >= 80 ? 'Maintain Excellence' : 
                       primaryInsight.score >= 60 ? 'Improvement Tips' : 'Action Plan'}
                    </h4>
                  </div>
                  <ul className="space-y-2">
                    {getRecommendations(primaryInsight.score, hasPastDue).map((recommendation, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                        <CheckCircle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                          hasPastDue ? 'text-red-500' : 'text-green-500'
                        }`} />
                        <span>{recommendation}</span>
                      </li>
                    ))}
                  </ul>
                  
                  <div className={`mt-4 p-3 rounded-lg border ${
                    hasPastDue 
                      ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                      : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                  }`}>
                    <p className={`text-sm ${
                      hasPastDue 
                        ? 'text-red-700 dark:text-red-300' 
                        : 'text-blue-700 dark:text-blue-300'
                    }`}>
                      <strong>Need help?</strong> Contact the property management office to discuss your account 
                      {hasPastDue ? ' and payment options.' : ' and create an improvement plan.'}
                    </p>
                  </div>
                </div>
              )}

              {/* Score History Graph */}
              {showScoreHistory && scoreHistory.length > 1 && chartConfig && (
                <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                  <div className="flex items-center gap-2 mb-4">
                    <BarChart3 className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    <h4 className="font-semibold text-gray-900 dark:text-white">Score History</h4>
                  </div>
                  
                  {/* Interactive Chart */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                    <div className="h-64 w-full">
                      <Line data={chartConfig.chartData} options={chartConfig.chartOptions} />
                    </div>
                  </div>
                  
                  {/* Score Summary Stats */}
                  <div className="mt-4 grid grid-cols-3 gap-4">
                    <div className="text-center p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                      <div className="text-lg font-bold text-gray-900 dark:text-white">
                        {Math.max(...scoreHistory.map(s => s.score))}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Highest Score</div>
                    </div>
                    <div className="text-center p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                      <div className="text-lg font-bold text-gray-900 dark:text-white">
                        {Math.round(scoreHistory.reduce((sum, s) => sum + s.score, 0) / scoreHistory.length)}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Average Score</div>
                    </div>
                    <div className="text-center p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                      <div className={`text-lg font-bold ${
                        scoreChange?.isIncrease ? 'text-green-600 dark:text-green-400' :
                        scoreChange?.isDecrease ? 'text-red-600 dark:text-red-400' :
                        'text-gray-600 dark:text-gray-400'
                      }`}>
                        {scoreChange?.change ? (scoreChange.change > 0 ? '+' : '') + scoreChange.change : '0'}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Recent Change</div>
                    </div>
                  </div>
                  
                  <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      <strong>Track Your Progress:</strong> Your score is updated regularly based on payment history, 
                      lease compliance, and property care. Click on any point in the graph to see detailed information!
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Property Information - Now comes before Your Information */}
          {primaryInsight && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center gap-3 mb-6">
                <MapPin className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Property Details</h3>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Property</p>
                  <p className="text-lg font-medium text-gray-900 dark:text-white">
                    {cleanPropertyName(primaryInsight.property)}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Unit</p>
                    <p className="font-medium text-gray-900 dark:text-white">{primaryInsight.unit}</p>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <DollarSign className="w-4 h-4 text-green-600 dark:text-green-400" />
                      <p className="text-sm text-gray-600 dark:text-gray-400">Monthly Rent</p>
                    </div>
                    <p className="text-xl font-bold text-green-600 dark:text-green-400">
                      {formatCurrency(primaryInsight.rent_amount)}
                    </p>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Clock className={`w-4 h-4 ${hasPastDue ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'}`} />
                      <p className="text-sm text-gray-600 dark:text-gray-400">Past Due</p>
                    </div>
                    <p className={`text-xl font-bold ${
                      hasPastDue 
                        ? 'text-red-600 dark:text-red-400' 
                        : 'text-green-600 dark:text-green-400'
                    }`}>
                      {hasPastDue ? formatCurrency(pastDueAmount) : '$0.00'}
                    </p>
                    {hasPastDue && (
                      <p className="text-xs text-red-500 dark:text-red-400 mt-1">
                        Requires immediate attention
                      </p>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <p className="text-sm text-gray-600 dark:text-gray-400">Lease End Date</p>
                    </div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {formatDate(primaryInsight.lease_end_date)}
                    </p>
                  </div>
                </div>

                {/* Pay Rent Button */}
                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={() => setShowPaymentModal(true)}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    <CreditCard className="w-5 h-5" />
                    <span>Pay Rent</span>
                  </button>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    Secure payment processing via Stripe
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Your Information Card - Now comes after Property Details */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center gap-3 mb-6">
              <User className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Your Information</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Name</p>
                <p className="font-medium text-gray-900 dark:text-white">{tenant?.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Email</p>
                <p className="font-medium text-gray-900 dark:text-white">{tenant?.email}</p>
              </div>
              {tenant?.phone && (
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Phone</p>
                  <p className="font-medium text-gray-900 dark:text-white">{tenant.phone}</p>
                </div>
              )}
            </div>
          </div>

          {/* No Data Message */}
          {!primaryInsight && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center">
              <Home className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Property Information</h3>
              <p className="text-gray-600 dark:text-gray-400">
                We couldn't find any property information associated with your account. 
                Please contact the property management office for assistance.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Payment Modal */}
      {primaryInsight && (
        <RentPaymentModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          onPaymentSuccess={handlePaymentSuccess}
          tenantName={tenant?.name || ''}
          rentAmount={primaryInsight.rent_amount}
          pastDueAmount={pastDueAmount}
          property={cleanPropertyName(primaryInsight.property)}
          unit={primaryInsight.unit}
        />
      )}
    </div>
  );
}