import { NextResponse } from "next/server";
import { createServerSupabase } from "../../../lib/supabaseServer";

export async function GET() {
  const supabase = createServerSupabase();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: connections } = await supabase
    .from("ig_connections")
    .select("*")
    .eq("user_id", userData.user.id);

  const { data: rules } = await supabase
    .from("automation_rules")
    .select("*")
    .eq("user_id", userData.user.id);

  return NextResponse.json({ connections: connections || [], rules: rules || [] });
}

export async function POST(request) {
  const supabase = createServerSupabase();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await request.json();
  const { ig_connection_id, keyword, comment_reply, dm_message } = body;

  const { data, error } = await supabase
    .from("automation_rules")
    .insert({
      user_id: userData.user.id,
      ig_connection_id,
      keyword: keyword || "",
      comment_reply,
      dm_message
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ rule: data });
}

export async function DELETE(request) {
  const supabase = createServerSupabase();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await request.json();
  await supabase.from("automation_rules").delete().eq("id", id).eq("user_id", userData.user.id);
  return NextResponse.json({ ok: true });
}
