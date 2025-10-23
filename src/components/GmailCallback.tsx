import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";

export default function GoogleGmailCallback() {
  const { user, loading } = useAuth();
  const [err, setErr] = useState<string | null>(null);
  const [didRun, setDidRun] = useState(false);
  const [status, setStatus] = useState<string>("Connecting Gmail...");

  useEffect(() => {
    if (loading || didRun) return;
    if (!user?.id) {
      setErr("Not logged in");
      return;
    }

    setDidRun(true);

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
          window.opener.postMessage({
            type: 'GMAIL_ERROR',
            error: `Google returned error: ${googleError}`
          }, window.location.origin);
        }
        return;
      }
      
      if (!code) {
        setErr("Missing authorization code");
        setStatus("Connection failed");
        
        // Send error message to parent window
        if (window.opener) {
          window.opener.postMessage({
            type: 'GMAIL_ERROR',
            error: "Missing authorization code"
          }, window.location.origin);
        }
        return;
      }

      setStatus("Processing authorization...");
      console.log("Invoking oauth-google-callback with", { code, userId: user.id });

      const { data, error } = await supabase.functions.invoke("oauth-google-callback", {
        body: { code, state, userId: user.id },
      });

      if (error || !data?.ok) {
        console.error("Callback error:", error, data);
        const errorMessage = error?.message || data?.error || "Callback failed";
        setErr(errorMessage);
        setStatus("Connection failed");
        
        // Send error message to parent window
        if (window.opener) {
          window.opener.postMessage({
            type: 'GMAIL_ERROR',
            error: errorMessage
          }, window.location.origin);
        }
        return;
      }

      setStatus("Gmail connected successfully!");
      
      if (data.email) {
        localStorage.setItem("gmailConnectedEmail", data.email);
      }

      // Send success message to parent window
      if (window.opener) {
        window.opener.postMessage({
          type: 'GMAIL_CONNECTED',
          email: data.email
        }, window.location.origin);
      }

      // Close the popup after a short delay
      setTimeout(() => {
        window.close();
      }, 1500);

    })();
  }, [user?.id, loading, didRun]);

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
