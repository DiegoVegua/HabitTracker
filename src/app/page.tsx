import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Point d'entrée : redirige selon l'état d'authentification.
export default async function Home() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  redirect(user ? "/today" : "/login");
}
