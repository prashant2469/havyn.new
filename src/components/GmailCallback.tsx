import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";

const POST_CONNECT_REDIRECT = "/dashboard?gmail=connected";

export default function GoogleGmailCallback() {
  const { user, loading } = useAuth();
  const [err, setErr] = useState<string | null>(null);
  const [didRun, setDidRun] = useState(false);

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
        return;
      }
      if (!code) {
        setErr("Missing code");
        return;
      }

      console.log("Invoking oauth-google-callback with", { code, userId: user.id });

      const { data, error } = await supabase.functions.invoke("oauth-google-callback", {
        body: { code, state, userId: user.id },
      });

      if (error || !data?.ok) {
        console.error("Callback error:", error, data);
        setErr(error?.message || data?.error || "Callback failed");
        return;
      }

      if (data.email) {
        localStorage.setItem("gmailConnectedEmail", data.email);
      }

      window.location.replace(POST_CONNECT_REDIRECT);
    })();
  }, [user?.id, loading, didRun]);

  return (
    <div style={{ padding: 24 }}>
      <h1>Connecting Gmail…</h1>
      {err && <pre style={{ color: "crimson", marginTop: 12 }}>{err}</pre>}
    </div>
  );
}
