import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/layout/app-shell";

// Layout protégé : toutes les routes de (app) exigent une session.
// Le middleware redirige déjà les visiteurs non connectés ; double sécurité ici.
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return <AppShell email={user.email ?? null}>{children}</AppShell>;
}
