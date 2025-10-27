import { useEffect, useState, useRef } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";

export default function GoogleGmailCallback() {
  const { user, loading } = useAuth();
  const [err, setErr] = useState<string | null>(null);
  const didRunRef = useRef(false);
  const [status, setStatus] = useState<string>("Connecting Gmail...");

  useEffect(() => {
    if (didRunRef.current) return;
    
    // Don't wait for loading - check if we have user in localStorage or URL state
    let userId = user?.id;
    
    // If user context isn't available yet, try to get it from the OAuth state parameter
    if (!userId) {
      const qs = new URLSearchParams(window.location.search);
      const state = qs.get("state");
      
      // The state parameter contains the user ID directly from oauth-google-start
      if (state) {
        userId = state; // State is just the plain userId
        console.log("Got userId from OAuth state:", userId);
      }
      
      // Fallback: check if opener window has user data
      if (!userId && window.opener) {
        try {
          // Try to get user from opener's localStorage
          const openerUserId = window.opener.localStorage?.getItem('supabase.auth.token');
          if (openerUserId) {
            const authData = JSON.parse(openerUserId);
            userId = authData?.currentSession?.user?.id;
          }
        } catch (e) {
          // Ignore CORS errors
        }
      }
    }
    
    if (!userId && loading) {
      // Still loading auth, wait a bit more
      return;
    }
    
    if (!userId) {
      setErr("Not logged in - please close this window and try again from the dashboard");
      setStatus("Connection failed");
      
      // Send error message to parent window
      if (window.opener) {
        try {
          window.opener.postMessage({
            type: 'GMAIL_ERROR',
            error: "Authentication required - please try again"
          }, window.location.origin);
        } catch (e) {
          console.log('Could not send auth error to parent (COOP restriction)');
        }
        
        // Close after showing error
        setTimeout(() => {
          try { window.close(); } catch (e) {}
        }, 2000);
      }
      return;
    }

    didRunRef.current = true;

    (async () => {
      const qs = new URLSearchParams(window.location.search);
      const code = qs.get("code");
      const state = qs.get("state");
      const googleError = qs.get("error");

      if (googleError) {
        setErr(`Google returned error: ${googleError}`);
        setStatus("Connection failed");
        
        // Send error message to parent window
        if (window.opener) {
          try {
            window.opener.postMessage({
              type: 'GMAIL_ERROR',
              error: `Google returned error: ${googleError}`
            }, window.location.origin);
          } catch (e) {
            console.log('Could not send Google error to parent (COOP restriction)');
          }
        }
        return;
      }
      
      if (!code) {
        setErr("Missing authorization code");
        setStatus("Connection failed");
        
        // Send error message to parent window
        if (window.opener) {
          try {
            window.opener.postMessage({
              type: 'GMAIL_ERROR',
              error: "Missing authorization code"
            }, window.location.origin);
          } catch (e) {
            console.log('Could not send code error to parent (COOP restriction)');
          }
        }
        return;
      }

      setStatus("Processing authorization...");
      console.log("Invoking oauth-google-callback with", { code, userId });

      // Try to get more error details from the Edge Function
      let response;
      try {
        response = await supabase.functions.invoke("oauth-google-callback", {
          body: { code, state, userId },
        });
        console.log("Raw response:", response);
      } catch (invokeError) {
        console.error("Invoke error:", invokeError);
        response = { error: invokeError, data: null };
      }

      const { data, error } = response;

      if (error || !data?.ok) {
        console.error("Callback error:", error, data);
        console.error("Full error details:", JSON.stringify(error));
        console.error("Full data:", JSON.stringify(data));
        
        // Try to extract more error info
        let errorMessage = error?.message || data?.error || "Callback failed";
        
        // Check if there's a response body we can read
        if (error?.context) {
          console.error("Error context:", error.context);
        }
        
        setErr(`${errorMessage} - Check Supabase Edge Function logs for details`);
        setStatus("Connection failed");
        
        // Send error message to parent window
        if (window.opener) {
          try {
            window.opener.postMessage({
              type: 'GMAIL_ERROR',
              error: errorMessage
            }, window.location.origin);
          } catch (e) {
            console.log('Could not send error message to parent (COOP restriction)');
          }
        }
        return;
      }

      setStatus("Gmail connected successfully!");
      
      if (data.email) {
        localStorage.setItem("gmailConnectedEmail", data.email);
      }

      // Send success message to parent window
      if (window.opener) {
        try {
          window.opener.postMessage({
            type: 'GMAIL_CONNECTED',
            email: data.email
          }, window.location.origin);
        } catch (e) {
          console.log('Could not send success message to parent (COOP restriction)');
        }
      }

      // Close the popup after a brief delay to ensure message is sent
      setTimeout(() => {
        try {
          window.close();
        } catch (e) {
          // Ignore errors - Chrome may have restrictions
          console.log('Window close attempted');
        }
      }, 200);

    })();
  }, [user?.id, loading]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{ 
      padding: 24, 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center',
      minHeight: '400px',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ marginBottom: 16, color: '#333' }}>{status}</h1>
        {err && (
          <div style={{ 
            color: "crimson", 
            marginTop: 12, 
            padding: 12, 
            backgroundColor: '#ffe6e6',
            borderRadius: 8,
            border: '1px solid #ffcccc'
          }}>
            {err}
          </div>
        )}
        {!err && status === "Gmail connected successfully!" && (
          <div style={{ 
            color: "green", 
            marginTop: 12, 
            padding: 12, 
            backgroundColor: '#e6ffe6',
            borderRadius: 8,
            border: '1px solid #ccffcc'
          }}>
            You can now close this window.
          </div>
        )}
      </div>
    </div>
  );
}
