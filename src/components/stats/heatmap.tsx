"use client";

import * as React from "react";
import { getColor } from "@/lib/colors";
import {
  addDaysKey,
  daysBetween,
  fromDateKey,
  startOfWeekKey,
  todayKey,
} from "@/lib/dates";
import { cn } from "@/lib/utils";

// Heatmap « contributions » : une colonne = une semaine (lundi→dimanche).
// Habitude binaire : jour complété = couleur pleine, sinon case discrète.

const MONTH_LABELS = [
  "Jan", "Fév", "Mar", "Avr", "Mai", "Jun",
  "Jui", "Aoû", "Sep", "Oct", "Nov", "Déc",
];

export function Heatmap({
  completed,
  colorToken,
  months = 6,
}: {
  completed: Set<string>;
  colorToken: string;
  months?: number;
}) {
  const color = getColor(colorToken);
  const today = todayKey();

  const weeks = React.useMemo(() => {
    const firstWeek = startOfWeekKey(addDaysKey(today, -months * 30));
    const cols: string[][] = [];
    let wk = firstWeek;
    while (daysBetween(wk, today) >= 0) {
      const days: string[] = [];
      for (let i = 0; i < 7; i++) days.push(addDaysKey(wk, i));
      cols.push(days);
      wk = addDaysKey(wk, 7);
    }
    return cols;
  }, [today, months]);

  return (
    <div className="space-y-2">
      {/* Étiquettes de mois */}
      <div className="flex gap-[3px] pl-6 text-[10px] text-muted-foreground">
        {weeks.map((week, i) => {
          const first = fromDateKey(week[0]);
          const prev = i > 0 ? fromDateKey(weeks[i - 1][0]) : null;
          const showLabel =
            i === 0 || (prev && first.getMonth() !== prev.getMonth());
          return (
            <div key={week[0]} className="w-[13px] shrink-0">
              {showLabel ? MONTH_LABELS[first.getMonth()] : ""}
            </div>
          );
        })}
      </div>

      <div className="flex gap-[3px] overflow-x-auto">
        {/* Étiquettes de jours */}
        <div className="mr-1 flex flex-col gap-[3px] text-[9px] text-muted-foreground">
          {["L", "", "M", "", "V", "", "D"].map((d, i) => (
            <div key={i} className="flex h-[10px] items-center">
              {d}
            </div>
          ))}
        </div>

        {weeks.map((week) => (
          <div key={week[0]} className="flex flex-col gap-[3px]">
            {week.map((day) => {
              const inFuture = daysBetween(day, today) < 0;
              const done = completed.has(day);
              return (
                <div
                  key={day}
                  title={`${formatDay(day)}${done ? " · fait" : ""}`}
                  className={cn(
                    "h-[10px] w-[10px] rounded-[2px]",
                    inFuture && "opacity-0",
                    !done && !inFuture && "bg-muted",
                  )}
                  style={done ? { backgroundColor: color.base } : undefined}
                />
              );
            })}
          </div>
        ))}
      </div>

      <div className="flex items-center justify-end gap-1.5 text-[10px] text-muted-foreground">
        <span>Moins</span>
        <div className="h-[10px] w-[10px] rounded-[2px] bg-muted" />
        <div
          className="h-[10px] w-[10px] rounded-[2px] opacity-50"
          style={{ backgroundColor: color.base }}
        />
        <div
          className="h-[10px] w-[10px] rounded-[2px]"
          style={{ backgroundColor: color.base }}
        />
        <span>Plus</span>
      </div>
    </div>
  );
}

function formatDay(key: string): string {
  return fromDateKey(key).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
  });
}
