import React, { useState, useEffect } from 'react';
import { CreditCard, Loader2, X, DollarSign, Calendar, Home, CheckCircle, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface RentPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPaymentSuccess: (amount: number, type: string) => void;
  tenantName: string;
  rentAmount: number;
  pastDueAmount: number;
  property: string;
  unit: string;
}

export function RentPaymentModal({
  isOpen,
  onClose,
  onPaymentSuccess,
  tenantName,
  rentAmount,
  pastDueAmount,
  property,
  unit
}: RentPaymentModalProps) {
  const [paymentAmount, setPaymentAmount] = useState(rentAmount + pastDueAmount);
  const [customAmount, setCustomAmount] = useState('');
  const [paymentType, setPaymentType] = useState<'full' | 'rent-only' | 'past-due-only' | 'custom'>('full');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string>('');
  const [checkoutSessionId, setCheckoutSessionId] = useState<string | null>(null);

  if (!isOpen) return null;

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
    });
  };

  const handlePaymentTypeChange = (type: 'full' | 'rent-only' | 'past-due-only' | 'custom') => {
    setPaymentType(type);
    setError(null);
    
    switch (type) {
      case 'full':
        setPaymentAmount(rentAmount + pastDueAmount);
        break;
      case 'rent-only':
        setPaymentAmount(rentAmount);
        break;
      case 'past-due-only':
        setPaymentAmount(pastDueAmount);
        break;
      case 'custom':
        setPaymentAmount(0);
        setCustomAmount('');
        break;
    }
  };

  const handleCustomAmountChange = (value: string) => {
    setCustomAmount(value);
    const amount = parseFloat(value);
    if (!isNaN(amount) && amount > 0) {
      setPaymentAmount(amount);
    } else {
      setPaymentAmount(0);
    }
  };

  const checkPaymentStatus = async (sessionId: string) => {
    try {
      console.log('Checking payment status for session:', sessionId);
      
      const response = await fetch(`${supabase.supabaseUrl}/functions/v1/check-payment-status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabase.supabaseKey}`
        },
        body: JSON.stringify({ session_id: sessionId }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Payment status response:', data);
        
        if (data.status === 'complete' || data.status === 'paid') {
          console.log('Payment confirmed as successful');
          setSuccess(true);
          setLoading(false);
          
          // Notify parent component about successful payment
          onPaymentSuccess(paymentAmount, paymentType);
          
          // Auto-close after 3 seconds
          setTimeout(() => {
            onClose();
          }, 3000);
          
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error('Error checking payment status:', error);
      return false;
    }
  };

  const handlePayment = async () => {
    if (paymentAmount <= 0) {
      setError('Please enter a valid payment amount');
      return;
    }

    if (paymentAmount > 10000) {
      setError('Payment amount cannot exceed $10,000');
      return;
    }

    setLoading(true);
    setError(null);
    setDebugInfo('Starting payment process...');

    try {
      console.log('Starting payment process for amount:', paymentAmount);
      setDebugInfo('Creating checkout session...');

      // Create checkout session using Supabase Edge Function
      const requestBody = {
        amount: Math.round(paymentAmount * 100), // Convert to cents
        currency: 'usd',
        success_url: `${window.location.origin}/tenant-login?payment=success`,
        cancel_url: `${window.location.origin}/tenant-login?payment=cancelled`,
        metadata: {
          tenant_name: tenantName,
          property: property,
          unit: unit,
          payment_type: paymentType,
          rent_amount: rentAmount,
          past_due_amount: pastDueAmount
        }
      };

      console.log('Request body:', requestBody);
      setDebugInfo('Sending request to edge function...');

      const response = await fetch(`${supabase.supabaseUrl}/functions/v1/create-checkout-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabase.supabaseKey}`
        },
        body: JSON.stringify(requestBody),
      });

      console.log('Checkout session response status:', response.status);
      setDebugInfo(`Response status: ${response.status}`);

      const responseText = await response.text();
      console.log('Raw response:', responseText);

      if (!response.ok) {
        let errorData;
        try {
          errorData = JSON.parse(responseText);
        } catch {
          errorData = { error: responseText };
        }
        console.error('Checkout session error:', errorData);
        throw new Error(errorData.error || `HTTP ${response.status}: ${responseText}`);
      }

      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch {
        throw new Error('Invalid JSON response from server');
      }

      console.log('Checkout session response:', responseData);
      setDebugInfo('Checkout session created successfully');

      const { checkout_url, session_id } = responseData;

      if (!checkout_url) {
        throw new Error('No checkout URL received from payment processor');
      }

      if (!session_id) {
        throw new Error('No session ID received from payment processor');
      }

      console.log('Checkout URL:', checkout_url);
      console.log('Session ID:', session_id);
      setCheckoutSessionId(session_id);
      setDebugInfo('Opening Stripe Checkout...');

      // Open Stripe Checkout in a new window/tab
      const stripeWindow = window.open(checkout_url, '_blank', 'width=800,height=600,scrollbars=yes,resizable=yes');
      
      if (!stripeWindow) {
        // Fallback: direct redirect if popup was blocked
        console.log('Popup blocked, using direct redirect');
        window.location.href = checkout_url;
      } else {
        setDebugInfo('Payment window opened. Monitoring for completion...');
        
        // Monitor the popup window and check payment status
        const checkInterval = setInterval(async () => {
          if (stripeWindow.closed) {
            clearInterval(checkInterval);
            setDebugInfo('Payment window closed. Checking payment status...');
            
            // Check if payment was successful
            const paymentSuccessful = await checkPaymentStatus(session_id);
            
            if (!paymentSuccessful) {
              setLoading(false);
              setDebugInfo('Payment window closed without completion');
            }
          }
        }, 1000);
        
        // Also check payment status periodically while window is open
        const statusCheckInterval = setInterval(async () => {
          if (!stripeWindow.closed) {
            const paymentSuccessful = await checkPaymentStatus(session_id);
            if (paymentSuccessful) {
              clearInterval(statusCheckInterval);
              clearInterval(checkInterval);
              stripeWindow.close();
            }
          } else {
            clearInterval(statusCheckInterval);
          }
        }, 3000);
        
        // Set a timeout to stop checking after 30 minutes
        setTimeout(() => {
          clearInterval(checkInterval);
          clearInterval(statusCheckInterval);
          if (!stripeWindow.closed) {
            stripeWindow.close();
          }
          if (!success) {
            setLoading(false);
            setDebugInfo('Payment session timed out');
          }
        }, 30 * 60 * 1000);
      }

    } catch (err) {
      console.error('Payment error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Payment failed';
      setError(errorMessage);
      setDebugInfo(`Error: ${errorMessage}`);
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md p-6 text-center">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Payment Successful!
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Your payment of {formatCurrency(paymentAmount)} has been processed successfully.
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Your account will be updated shortly. This window will close automatically.
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <CreditCard className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Pay Rent</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">Secure payment via Stripe</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Property Info */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <Home className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Property Details</span>
            </div>
            <div className="text-sm space-y-1">
              <p className="text-gray-600 dark:text-gray-400">{property}</p>
              <p className="text-gray-600 dark:text-gray-400">Unit {unit} • {tenantName}</p>
            </div>
          </div>

          {/* Payment Amount Options */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Payment Amount</h4>
            
            {/* Full Payment */}
            {(rentAmount + pastDueAmount) > 0 && (
              <label className="flex items-start gap-3 p-3 border border-gray-200 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                <input
                  type="radio"
                  name="paymentType"
                  checked={paymentType === 'full'}
                  onChange={() => handlePaymentTypeChange('full')}
                  className="text-blue-600 mt-0.5"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-900 dark:text-white text-sm">Full Amount Due</span>
                    <span className="font-bold text-gray-900 dark:text-white text-sm">
                      {formatCurrency(rentAmount + pastDueAmount)}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Rent: {formatCurrency(rentAmount)}
                    {pastDueAmount > 0 && ` + Past Due: ${formatCurrency(pastDueAmount)}`}
                  </div>
                </div>
              </label>
            )}

            {/* Rent Only */}
            <label className="flex items-start gap-3 p-3 border border-gray-200 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
              <input
                type="radio"
                name="paymentType"
                checked={paymentType === 'rent-only'}
                onChange={() => handlePaymentTypeChange('rent-only')}
                className="text-blue-600 mt-0.5"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-900 dark:text-white text-sm">Current Rent Only</span>
                  <span className="font-bold text-gray-900 dark:text-white text-sm">
                    {formatCurrency(rentAmount)}
                  </span>
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Monthly rent payment</div>
              </div>
            </label>

            {/* Past Due Only */}
            {pastDueAmount > 0 && (
              <label className="flex items-start gap-3 p-3 border border-gray-200 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                <input
                  type="radio"
                  name="paymentType"
                  checked={paymentType === 'past-due-only'}
                  onChange={() => handlePaymentTypeChange('past-due-only')}
                  className="text-blue-600 mt-0.5"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-900 dark:text-white text-sm">Past Due Only</span>
                    <span className="font-bold text-red-600 dark:text-red-400 text-sm">
                      {formatCurrency(pastDueAmount)}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Outstanding balance</div>
                </div>
              </label>
            )}

            {/* Custom Amount */}
            <label className="flex items-start gap-3 p-3 border border-gray-200 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
              <input
                type="radio"
                name="paymentType"
                checked={paymentType === 'custom'}
                onChange={() => handlePaymentTypeChange('custom')}
                className="text-blue-600 mt-0.5"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-gray-900 dark:text-white text-sm">Custom Amount</span>
                </div>
                {paymentType === 'custom' && (
                  <div className="relative">
                    <DollarSign className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                    <input
                      type="number"
                      placeholder="0.00"
                      value={customAmount}
                      onChange={(e) => handleCustomAmountChange(e.target.value)}
                      min="0.01"
                      max="10000"
                      step="0.01"
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                        text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 
                        focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>
                )}
              </div>
            </label>
          </div>

          {/* Payment Summary */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-blue-800 dark:text-blue-300">Total Payment</span>
              <span className="text-lg font-bold text-blue-900 dark:text-blue-200">
                {formatCurrency(paymentAmount)}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span className="text-xs text-blue-700 dark:text-blue-300">
                Opens Stripe's secure checkout in a new window
              </span>
            </div>
          </div>

          {/* Demo Notice */}
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
            <p className="text-xs text-yellow-800 dark:text-yellow-300">
              <strong>Demo Mode:</strong> This will open Stripe's test checkout page in a new window. Use test card 4242 4242 4242 4242 with any future expiry date and any 3-digit CVC.
            </p>
          </div>

          {/* Debug Info */}
          {debugInfo && (
            <div className="bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Status</span>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400 font-mono">{debugInfo}</p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
                <span className="text-sm font-medium text-red-700 dark:text-red-300">Payment Error</span>
              </div>
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 
              rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handlePayment}
            disabled={loading || paymentAmount <= 0}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 
              disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 text-sm font-medium"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <CreditCard className="w-4 h-4" />
                Pay {formatCurrency(paymentAmount)}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}