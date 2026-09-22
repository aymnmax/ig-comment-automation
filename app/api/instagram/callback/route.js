import { NextResponse } from "next/server";
import {
  exchangeCodeForToken,
  getLongLivedToken,
  getUserPages,
  getIgBusinessAccount
} from "../../../../lib/instagram";
import { createServerSupabase } from "../../../../lib/supabaseServer";

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const err = searchParams.get("error");

  if (err) {
    return NextResponse.redirect(`${origin}/dashboard?ig_error=${err}`);
  }

  const supabase = createServerSupabase();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) {
    return NextResponse.redirect(`${origin}/`);
  }

  try {
    const shortToken = await exchangeCodeForToken(code);
    const longToken = await getLongLivedToken(shortToken);

    const pages = await getUserPages(longToken);

    let connected = 0;
    for (const page of pages) {
      const igAccount = await getIgBusinessAccount(page.id, page.access_token);
      if (!igAccount) continue;

      await supabase.from("ig_connections").insert({
        user_id: userData.user.id,
        page_id: page.id,
        ig_user_id: igAccount.id,
        ig_username: igAccount.username,
        access_token: page.access_token
      });
      connected++;
    }

    return NextResponse.redirect(
      `${origin}/dashboard?ig_connected=${connected}`
    );
  } catch (e) {
    return NextResponse.redirect(
      `${origin}/dashboard?ig_error=${encodeURIComponent(e.message)}`
    );
  }
}
