"use client";

import * as React from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Heatmap } from "@/components/stats/heatmap";
import {
  useHabits,
  useLogs,
  useCompletedByHabit,
} from "@/hooks/use-habits";
import {
  completionRate,
  computeStreak,
  type CompletionStats,
} from "@/lib/streaks";
import { addDaysKey, startOfWeekKey, todayKey, toDateKey } from "@/lib/dates";
import { getColor } from "@/lib/colors";
import { frequencyLabel } from "@/lib/frequency";
import type { Habit } from "@/types/db";

export function StatsView() {
  const today = todayKey();
  const { data: habits, isLoading } = useHabits();
  const { data: logs, isLoading: logsLoading } = useLogs();
  const completedByHabit = useCompletedByHabit(logs);

  const [selectedId, setSelectedId] = React.useState<string | null>(null);

  const active = habits ?? [];
  const selected =
    active.find((h) => h.id === selectedId) ?? active[0] ?? null;

  if (isLoading || logsLoading) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (active.length === 0) {
    return (
      <div className="mx-auto max-w-2xl">
        <Card className="p-8 text-center text-muted-foreground">
          Pas encore de données. Crée une habitude et coche quelques jours.
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <h1 className="text-2xl font-semibold">Statistiques</h1>

      {/* Vue d'ensemble : comparer la régularité (30 derniers jours) */}
      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">
          Vue d&apos;ensemble · 30 derniers jours
        </h2>
        <Card>
          <CardContent className="divide-y p-0">
            {active.map((habit) => {
              const set = completedByHabit.get(habit.id) ?? new Set<string>();
              const stats = completionRate(
                habit,
                set,
                addDaysKey(today, -29),
                today,
              );
              const streak = computeStreak(habit, set, today);
              return (
                <div
                  key={habit.id}
                  className="flex items-center gap-3 px-4 py-3"
                >
                  <span className="text-lg">{habit.emoji}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium">
                        {habit.name}
                      </span>
                      <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                        {Math.round(stats.rate * 100)}%
                      </span>
                    </div>
                    <ProgressBar rate={stats.rate} colorToken={habit.color} />
                  </div>
                  <div className="w-16 shrink-0 text-right text-xs text-muted-foreground">
                    série {streak.current}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </section>

      {/* Détail par habitude */}
      {selected && (
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-medium text-muted-foreground">
              Détail par habitude
            </h2>
            <Select
              value={selected.id}
              onValueChange={(v) => setSelectedId(v)}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {active.map((h) => (
                  <SelectItem key={h.id} value={h.id}>
                    {h.emoji} {h.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <HabitDetail
            habit={selected}
            completed={completedByHabit.get(selected.id) ?? new Set()}
            today={today}
          />
        </section>
      )}
    </div>
  );
}

function HabitDetail({
  habit,
  completed,
  today,
}: {
  habit: Habit;
  completed: Set<string>;
  today: string;
}) {
  const streak = computeStreak(habit, completed, today);

  const week: CompletionStats = completionRate(
    habit,
    completed,
    startOfWeekKey(today),
    today,
  );
  const month: CompletionStats = completionRate(
    habit,
    completed,
    addDaysKey(today, -29),
    today,
  );
  const global: CompletionStats = completionRate(
    habit,
    completed,
    toDateKey(new Date(habit.created_at)),
    today,
  );

  const unitLabel = streak.unit === "weeks" ? "sem." : "j";

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <span className="text-lg">{habit.emoji}</span>
          {habit.name}
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          {frequencyLabel(habit)}
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Chiffres clés */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Série" value={`${streak.current} ${unitLabel}`} />
          <Stat label="Record" value={`${streak.best} ${unitLabel}`} />
          <Stat label="Semaine" value={`${Math.round(week.rate * 100)}%`} />
          <Stat label="30 jours" value={`${Math.round(month.rate * 100)}%`} />
        </div>

        <div className="text-xs text-muted-foreground">
          Depuis le début :{" "}
          <span className="font-medium text-foreground">
            {global.completed}
          </span>{" "}
          complétions ({Math.round(global.rate * 100)}%)
        </div>

        {/* Heatmap */}
        <Heatmap completed={completed} colorToken={habit.color} months={6} />
      </CardContent>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted/50 p-3">
      <div className="text-lg font-semibold tabular-nums">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function ProgressBar({
  rate,
  colorToken,
}: {
  rate: number;
  colorToken: string;
}) {
  const color = getColor(colorToken);
  return (
    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
      <div
        className="h-full rounded-full transition-all"
        style={{
          width: `${Math.round(rate * 100)}%`,
          backgroundColor: color.base,
        }}
      />
    </div>
  );
}
