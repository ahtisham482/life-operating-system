import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/settings — Get the current user's app settings
 */
export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("user_settings")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (error && error.code !== "PGRST116") {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Return defaults if no settings exist yet
  if (!data) {
    return NextResponse.json({
      timezone: "Asia/Karachi",
    });
  }

  return NextResponse.json(data);
}

/**
 * PUT /api/settings — Update the current user's app settings
 */
export async function PUT(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  // Only allow known fields
  const allowed = ["timezone"];
  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  for (const key of allowed) {
    if (key in body) {
      updates[key] = body[key];
    }
  }

  const { error } = await supabase.from("user_settings").upsert(
    { user_id: user.id, ...updates },
    { onConflict: "user_id" }
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
