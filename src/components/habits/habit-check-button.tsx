"use client";

import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { getColor } from "@/lib/colors";

/**
 * Cible de tap principale : bascule l'état « fait aujourd'hui » en 1 tap.
 * Purement présentationnel — le parent fournit `completed` et `onToggle`
 * (la mutation optimistic est câblée en amont).
 */
export function HabitCheckButton({
  completed,
  colorToken,
  onToggle,
  label,
}: {
  completed: boolean;
  colorToken: string;
  onToggle: () => void;
  label: string;
}) {
  const color = getColor(colorToken);

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={completed}
      aria-label={
        completed ? `${label} : fait, annuler` : `${label} : marquer comme fait`
      }
      className={cn(
        "flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 transition-all active:scale-90",
        completed
          ? "border-transparent text-white animate-pop"
          : "border-muted-foreground/30 text-transparent hover:border-muted-foreground/60",
      )}
      style={completed ? { backgroundColor: color.base } : undefined}
    >
      <Check className="h-5 w-5" strokeWidth={3} />
    </button>
  );
}
