import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password required" },
      { status: 400 }
    );
  }

  const supabase = createServerSupabaseClient();
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (authError || !authData.user) {
    return NextResponse.json(
      { error: "Invalid email or password" },
      { status: 401 }
    );
  }

  const admin = createSupabaseAdmin();
  const { data: roleRow } = await admin
    .from("admin_roles")
    .select("role")
    .eq("user_id", authData.user.id)
    .single();

  if (!roleRow?.role) {
    await supabase.auth.signOut();
    return NextResponse.json(
      { error: "Not an admin" },
      { status: 403 }
    );
  }

  return NextResponse.json({ ok: true });
}
