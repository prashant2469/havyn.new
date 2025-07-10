import React, { useState } from 'react';
import { MessageSquare, Loader2, Mail, Phone } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { parsePhoneNumber, parseEmails } from '../utils/formatters';
import { useAuth } from '../contexts/AuthContext';

interface MessageTenantButtonProps {
  tenantName: string;
  tenantId: string;
  phoneNumber: string | null;
  email: string | null;
  isDelinquent?: boolean;
  leaseEndingSoon?: boolean;
}

export function MessageTenantButton({
  tenantName,
  tenantId,
  phoneNumber,
  email,
  isDelinquent,
  leaseEndingSoon
}: MessageTenantButtonProps) {
  const { user } = useAuth(); // Only show for authenticated owners
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [messageType, setMessageType] = useState<'email' | 'sms' | 'both'>('both');

  const phones = phoneNumber ? parsePhoneNumber(phoneNumber) : [];
  const emails = email ? parseEmails(email) : [];

  const getDefaultMessage = () => {
    if (isDelinquent) {
      return `Dear ${tenantName},\n\nOur records show that your account has an outstanding balance. Please contact our office to discuss payment arrangements.\n\nBest regards,\nProperty Management`;
    }
    if (leaseEndingSoon) {
      return `Dear ${tenantName},\n\nYour lease will be ending soon. Please contact our office to discuss your renewal options.\n\nBest regards,\nProperty Management`;
    }
    return '';
  };

  const [message, setMessage] = useState(getDefaultMessage());

  const handleSend = async () => {
    if (!message) {
      setError('Please enter a message');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${supabase.supabaseUrl}/functions/v1/send-notification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabase.supabaseKey}`
        },
        body: JSON.stringify({
          type: messageType,
          tenant_id: tenantId,
          message,
          subject: isDelinquent ? 'Important: Account Balance Notice' : 
                  leaseEndingSoon ? 'Important: Lease Renewal Notice' : 
                  'Notice from Property Management',
          email: emails[0],
          phone: phones[0]
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      setSuccess(true);
      setTimeout(() => {
        setIsOpen(false);
        setSuccess(false);
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
    } finally {
      setLoading(false);
    }
  };

  // Only render for authenticated owners (not tenants)
  if (!user || (!phones.length && !emails.length)) {
    return null;
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-havyn-primary hover:bg-havyn-dark rounded-lg transition-colors"
      >
        <MessageSquare className="w-4 h-4" />
        <span>Message Tenant</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full mx-4">
            <div className="p-6">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Message {tenantName}
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Contact Methods
                  </label>
                  <div className="space-y-2">
                    {phones.map((phone, index) => (
                      <div key={`phone-${index}`} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <Phone className="w-4 h-4" />
                        <span>{phone}</span>
                      </div>
                    ))}
                    {emails.map((email, index) => (
                      <div key={`email-${index}`} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <Mail className="w-4 h-4" />
                        <span>{email}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Message Type
                  </label>
                  <select
                    value={messageType}
                    onChange={(e) => setMessageType(e.target.value as 'email' | 'sms' | 'both')}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                      text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700"
                  >
                    <option value="both">Email & SMS</option>
                    <option value="email">Email Only</option>
                    <option value="sms">SMS Only</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Message
                  </label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={6}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                      text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700"
                  />
                </div>

                {error && (
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 
                    rounded-md text-sm text-red-600 dark:text-red-400">
                    {error}
                  </div>
                )}

                {success && (
                  <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 
                    rounded-md text-sm text-green-600 dark:text-green-400">
                    Message sent successfully!
                  </div>
                )}
              </div>
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700 p-4 flex justify-end gap-4">
              <button
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 
                  hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSend}
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-havyn-primary 
                  hover:bg-havyn-dark rounded-lg transition-colors disabled:opacity-50 
                  flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Sending...</span>
                  </>
                ) : (
                  <>
                    <MessageSquare className="w-4 h-4" />
                    <span>Send Message</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}