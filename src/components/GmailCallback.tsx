import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

const POST_CONNECT_REDIRECT = "/?gmail=connected"; // change to "/settings?gmail=connected" if you prefer

export default function GoogleGmailCallback() {
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const qs = new URLSearchParams(window.location.search);
      const code = qs.get("code");
      const state = qs.get("state");
      const googleError = qs.get("error");

      if (googleError) {
        setErr(`Google returned error: ${googleError}`);
        return;
      }
      if (!code) {
        setErr("Missing code");
        return;
      }

      // Exchange code server-side (adds Authorization header automatically)
      const { data, error } = await supabase.functions.invoke("oauth-google-callback", {
        body: { code, state },
      });

      if (error || !data?.ok) {
        setErr(error?.message || data?.error || "Callback failed");
        return;
      }

      if (data.email) {
        localStorage.setItem("gmailConnectedEmail", data.email);
      }

      // Bounce back to your app (Dashboard already looks for ?gmail=connected)
      window.location.replace(POST_CONNECT_REDIRECT);
    })();
  }, []);

  return (
    <div style={{ padding: 24 }}>
      <h1>Connecting Gmail…</h1>
      {err && (
        <pre style={{ color: "crimson", marginTop: 12 }}>
          {err}
        </pre>
      )}
    </div>
  );
}
