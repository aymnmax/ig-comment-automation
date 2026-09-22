"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabaseClient";

export default function Dashboard() {
  const supabase = createClient();
  const router = useRouter();

  const [user, setUser] = useState(null);
  const [connections, setConnections] = useState([]);
  const [rules, setRules] = useState([]);
  const [form, setForm] = useState({
    ig_connection_id: "",
    keyword: "",
    comment_reply: "",
    dm_message: ""
  });

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data?.user) {
        router.replace("/");
        return;
      }
      setUser(data.user);
      loadRules();
    });
  }, []);

  async function loadRules() {
    const res = await fetch("/api/rules");
    const data = await res.json();
    setConnections(data.connections || []);
    setRules(data.rules || []);
    if (data.connections?.length && !form.ig_connection_id) {
      setForm((f) => ({ ...f, ig_connection_id: data.connections[0].id }));
    }
  }

  async function createRule(e) {
    e.preventDefault();
    await fetch("/api/rules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });
    setForm((f) => ({ ...f, keyword: "", comment_reply: "", dm_message: "" }));
    loadRules();
  }

  async function deleteRule(id) {
    await fetch("/api/rules", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id })
    });
    loadRules();
  }

  async function signOut() {
    await supabase.auth.signOut();
    router.replace("/");
  }

  if (!user) return null;

  return (
    <div className="container">
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <h1>Dashboard</h1>
        <button onClick={signOut}>Sign out</button>
      </div>
      <p>Signed in as {user.email}</p>

      <div className="card">
        <h3>1. Connect your Instagram account</h3>
        {connections.length === 0 ? (
          <a className="btn" href="/api/instagram/connect">
            Connect Instagram
          </a>
        ) : (
          <ul>
            {connections.map((c) => (
              <li key={c.id}>@{c.ig_username || c.ig_user_id}</li>
            ))}
          </ul>
        )}
      </div>

      <div className="card">
        <h3>2. Create an automation rule</h3>
        {connections.length === 0 ? (
          <p>Connect an Instagram account first.</p>
        ) : (
          <form onSubmit={createRule}>
            <label>Instagram account</label>
            <select
              value={form.ig_connection_id}
              onChange={(e) => setForm({ ...form, ig_connection_id: e.target.value })}
            >
              {connections.map((c) => (
                <option key={c.id} value={c.id}>
                  @{c.ig_username || c.ig_user_id}
                </option>
              ))}
            </select>

            <label>Trigger keyword (leave blank to match every comment)</label>
            <input
              value={form.keyword}
              onChange={(e) => setForm({ ...form, keyword: e.target.value })}
              placeholder="e.g. price"
            />

            <label>Public comment reply</label>
            <textarea
              required
              value={form.comment_reply}
              onChange={(e) => setForm({ ...form, comment_reply: e.target.value })}
              placeholder="Thanks! Check your DMs 🙌"
            />

            <label>DM message</label>
            <textarea
              required
              value={form.dm_message}
              onChange={(e) => setForm({ ...form, dm_message: e.target.value })}
              placeholder="Hey! Here's the info you asked about..."
            />

            <button type="submit">Save rule</button>
          </form>
        )}
      </div>

      <div className="rule-list">
        <h3>Your rules</h3>
        {rules.length === 0 && <p>No rules yet.</p>}
        {rules.map((r) => (
          <div className="card" key={r.id}>
            <p>
              <strong>Keyword:</strong> {r.keyword || "(any comment)"}
            </p>
            <p>
              <strong>Reply:</strong> {r.comment_reply}
            </p>
            <p>
              <strong>DM:</strong> {r.dm_message}
            </p>
            <button onClick={() => deleteRule(r.id)}>Delete</button>
          </div>
        ))}
      </div>
    </div>
  );
}
