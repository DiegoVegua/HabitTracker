"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarCheck, BarChart3, ListTodo, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { useRealtimeSync } from "@/hooks/use-habits";

const NAV = [
  { href: "/today", label: "Aujourd'hui", icon: CalendarCheck },
  { href: "/habits", label: "Habitudes", icon: ListTodo },
  { href: "/stats", label: "Stats", icon: BarChart3 },
] as const;

export function AppShell({
  email,
  children,
}: {
  email: string | null;
  children: React.ReactNode;
}) {
  // Monte l'abonnement temps réel une seule fois pour toute l'app.
  useRealtimeSync();
  const pathname = usePathname();

  return (
    <div className="min-h-dvh">
      {/* En-tête */}
      <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/today" className="flex items-center gap-2 font-semibold">
              <span className="text-lg">🌱</span>
              <span className="hidden sm:inline">Habitudes</span>
            </Link>
            {/* Nav desktop */}
            <nav className="hidden items-center gap-1 md:flex">
              {NAV.map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                      active
                        ? "bg-secondary text-secondary-foreground"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-1">
            <ThemeToggle />
            <form action="/auth/signout" method="post">
              <Button
                variant="ghost"
                size="icon"
                type="submit"
                aria-label="Se déconnecter"
                title={email ?? "Se déconnecter"}
              >
                <LogOut className="h-5 w-5" />
              </Button>
            </form>
          </div>
        </div>
      </header>

      {/* Contenu — padding bas pour laisser la place à la nav mobile */}
      <main className="container py-6 pb-24 md:pb-10">{children}</main>

      {/* Nav mobile (barre du bas) */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 backdrop-blur md:hidden">
        <div className="grid grid-cols-3">
          {NAV.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-1 py-2.5 text-xs font-medium transition-colors",
                  active ? "text-foreground" : "text-muted-foreground",
                )}
              >
                <item.icon
                  className={cn("h-5 w-5", active && "text-primary")}
                />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
