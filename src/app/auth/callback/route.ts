import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Callback OAuth / confirmation email : échange le code contre une session,
// puis redirige vers l'app.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/today";

  if (code) {
    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Échec : retour au login avec un indicateur d'erreur.
  return NextResponse.redirect(`${origin}/login?error=auth`);
}
