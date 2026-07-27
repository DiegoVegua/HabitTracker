"use client";

import { Flame } from "lucide-react";
import { cn } from "@/lib/utils";
import { isOnMilestone } from "@/lib/streaks";

/**
 * Affiche la série en cours. Discret par défaut ; légèrement mis en avant
 * quand la série atteint un palier (7, 30, 100, 365) — sans rien de clignotant.
 */
export function StreakBadge({
  current,
  unit,
  className,
}: {
  current: number;
  unit: "days" | "weeks";
  className?: string;
}) {
  if (current <= 0) {
    return (
      <span className={cn("text-xs text-muted-foreground", className)}>
        Nouveau départ
      </span>
    );
  }

  const milestone = isOnMilestone(current);
  const unitLabel = unit === "weeks" ? "sem." : "j";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs font-medium tabular-nums",
        milestone ? "text-amber-500" : "text-muted-foreground",
        className,
      )}
      title={`Série en cours : ${current} ${unit === "weeks" ? "semaines" : "jours"}`}
    >
      <Flame className={cn("h-3.5 w-3.5", milestone && "fill-amber-500/20")} />
      {current} {unitLabel}
    </span>
  );
}
