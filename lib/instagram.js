const GRAPH = "https://graph.facebook.com/v19.0";

// Step 1 of OAuth: URL the user is sent to on Facebook to grant access.
export function buildFacebookOAuthUrl() {
  const params = new URLSearchParams({
    client_id: process.env.META_APP_ID,
    redirect_uri: process.env.META_REDIRECT_URI,
    scope: [
      "instagram_basic",
      "instagram_manage_comments",
      "instagram_manage_messages",
      "pages_show_list",
      "pages_manage_metadata",
      "pages_messaging"
    ].join(","),
    response_type: "code"
  });
  return `https://www.facebook.com/v19.0/dialog/oauth?${params.toString()}`;
}

// Step 2: exchange the ?code= Facebook sent back for a short-lived user access token.
export async function exchangeCodeForToken(code) {
  const params = new URLSearchParams({
    client_id: process.env.META_APP_ID,
    client_secret: process.env.META_APP_SECRET,
    redirect_uri: process.env.META_REDIRECT_URI,
    code
  });
  const res = await fetch(`${GRAPH}/oauth/access_token?${params.toString()}`);
  const data = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(data));
  return data.access_token;
}

// Exchange short-lived token for a long-lived one (~60 days).
export async function getLongLivedToken(shortToken) {
  const params = new URLSearchParams({
    grant_type: "fb_exchange_token",
    client_id: process.env.META_APP_ID,
    client_secret: process.env.META_APP_SECRET,
    fb_exchange_token: shortToken
  });
  const res = await fetch(`${GRAPH}/oauth/access_token?${params.toString()}`);
  const data = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(data));
  return data.access_token; // has .expires_in too
}

// List the Facebook Pages this user manages.
export async function getUserPages(userToken) {
  const res = await fetch(`${GRAPH}/me/accounts?access_token=${userToken}`);
  const data = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(data));
  return data.data; // [{ id, name, access_token }, ...]
}

// Given a Page, find the Instagram professional account linked to it.
export async function getIgBusinessAccount(pageId, pageToken) {
  const params = new URLSearchParams({
    fields: "instagram_business_account{id,username}",
    access_token: pageToken
  });
  const res = await fetch(`${GRAPH}/${pageId}?${params.toString()}`);
  const data = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(data));
  return data.instagram_business_account; // { id, username } or undefined
}

// Public reply posted under the comment itself.
export async function replyToComment(commentId, message, accessToken) {
  const res = await fetch(`${GRAPH}/${commentId}/replies`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, access_token: accessToken })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(data));
  return data;
}

// Private DM sent to the commenter, referencing their comment ("private reply").
// NOTE: Meta's exact endpoint/shape for this has moved between API versions -
// verify against the current "Send Private Replies" docs for your app type
// (Instagram API with Instagram Login vs. with Facebook Login) before going live.
export async function sendPrivateReply(igUserId, commentId, message, accessToken) {
  const res = await fetch(`${GRAPH}/${igUserId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      recipient: { comment_id: commentId },
      message: { text: message },
      access_token: accessToken
    })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(data));
  return data;
}
