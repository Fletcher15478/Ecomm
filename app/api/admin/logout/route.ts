import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = createServerSupabaseClient();
  await supabase.auth.signOut();
  // Use same origin as the request so logout works on any deployment (no localhost redirect)
  const url = new URL(request.url);
  const origin = url.origin;
  return NextResponse.redirect(new URL("/admin/login", origin), 302);
}
