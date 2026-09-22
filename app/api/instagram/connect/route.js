import { NextResponse } from "next/server";
import { buildFacebookOAuthUrl } from "../../../../lib/instagram";
import { createServerSupabase } from "../../../../lib/supabaseServer";

export async function GET() {
  const supabase = createServerSupabase();
  const { data } = await supabase.auth.getUser();
  if (!data?.user) {
    return NextResponse.redirect(process.env.NEXT_PUBLIC_APP_URL);
  }
  return NextResponse.redirect(buildFacebookOAuthUrl());
}
