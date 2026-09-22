import { NextResponse } from "next/server";
import { createAdminSupabase } from "../../../../lib/supabaseServer";
import { replyToComment, sendPrivateReply } from "../../../../lib/instagram";

// Meta calls this once when you save the webhook config to verify you own the endpoint.
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.IG_VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 });
  }
  return new NextResponse("Forbidden", { status: 403 });
}

// Meta calls this every time a subscribed event (e.g. a new comment) happens.
export async function POST(request) {
  const payload = await request.json();
  const supabase = createAdminSupabase();

  // Optional: keep a raw log for debugging.
  await supabase.from("webhook_logs").insert({ payload });

  try {
    const entries = payload.entry || [];
    for (const entry of entries) {
      const igUserId = entry.id; // the IG business account the comment happened on
      const changes = entry.changes || [];

      for (const change of changes) {
        if (change.field !== "comments") continue;

        const value = change.value;
        const commentId = value.id;
        const commentText = (value.text || "").toLowerCase();
        const commenterId = value.from?.id;

        // Don't reply to your own account's comments (avoids infinite loops).
        if (commenterId === igUserId) continue;

        // Find which of our users owns this IG account, and their access token.
        const { data: connection } = await supabase
          .from("ig_connections")
          .select("*")
          .eq("ig_user_id", igUserId)
          .single();

        if (!connection) continue;

        // Find matching automation rules for this account.
        const { data: rules } = await supabase
          .from("automation_rules")
          .select("*")
          .eq("ig_connection_id", connection.id)
          .eq("enabled", true);

        const matchedRule = (rules || []).find(
          (r) => r.keyword === "" || commentText.includes(r.keyword.toLowerCase())
        );

        if (!matchedRule) continue;

        await replyToComment(
          commentId,
          matchedRule.comment_reply,
          connection.access_token
        );

        await sendPrivateReply(
          connection.ig_user_id,
          commentId,
          matchedRule.dm_message,
          connection.access_token
        );
      }
    }
  } catch (e) {
    console.error("Webhook processing error:", e.message);
  }

  // Always return 200 quickly so Meta doesn't retry/disable the webhook.
  return new NextResponse("EVENT_RECEIVED", { status: 200 });
}
