"use client";

import { createClient } from "../lib/supabaseClient";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const supabase = createClient();
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) router.replace("/dashboard");
      else setChecking(false);
    });
  }, []);

  async function signInWithGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` }
    });
  }

  if (checking) return null;

  return (
    <div className="container">
      <h1>IG Comment Automation</h1>
      <p>Auto-reply and auto-DM everyone who comments on your Instagram reels.</p>
      <button onClick={signInWithGoogle}>Continue with Google</button>
    </div>
  );
}
