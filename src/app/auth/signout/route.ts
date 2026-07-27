import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Déconnexion : détruit la session Supabase puis redirige vers /login.
export async function POST(request: Request) {
  const supabase = createClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/login", request.url), {
    status: 302,
  });
}
