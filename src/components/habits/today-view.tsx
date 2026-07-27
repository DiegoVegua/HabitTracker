"use client";

import * as React from "react";
import { Plus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { HabitCheckButton } from "@/components/habits/habit-check-button";
import { StreakBadge } from "@/components/habits/streak-badge";
import { HabitFormDialog } from "@/components/habits/habit-form-dialog";
import {
  useHabits,
  useLogs,
  useCompletedByHabit,
  useToggleLog,
} from "@/hooks/use-habits";
import {
  completionRate,
  computeStreak,
  isOnMilestone,
} from "@/lib/streaks";
import { isDueOn, frequencyLabel } from "@/lib/frequency";
import { todayKey, startOfWeekKey } from "@/lib/dates";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { Habit } from "@/types/db";

export function TodayView() {
  const today = todayKey();
  const { data: habits, isLoading: habitsLoading } = useHabits();
  const { data: logs, isLoading: logsLoading } = useLogs();
  const completedByHabit = useCompletedByHabit(logs);
  const toggle = useToggleLog();
  const [createOpen, setCreateOpen] = React.useState(false);

  const loading = habitsLoading || logsLoading;

  const dueToday = React.useMemo(
    () => (habits ?? []).filter((h) => isDueOn(h, today)),
    [habits, today],
  );

  const doneCount = dueToday.filter((h) =>
    completedByHabit.get(h.id)?.has(today),
  ).length;

  function handleToggle(habit: Habit) {
    const set = completedByHabit.get(habit.id) ?? new Set<string>();
    const currentlyDone = set.has(today);

    // Feedback de palier : uniquement quand on COCHE et qu'on atteint un palier.
    if (!currentlyDone) {
      const predicted = new Set(set);
      predicted.add(today);
      const streak = computeStreak(habit, predicted, today);
      if (isOnMilestone(streak.current)) {
        toast({
          variant: "success",
          title: `${habit.emoji} ${streak.current} ${
            streak.unit === "weeks" ? "semaines" : "jours"
          } d'affilée !`,
          description: "Beau palier. Continue à ton rythme.",
        });
      }
    }

    toggle.mutate({
      habitId: habit.id,
      dateKey: today,
      completed: currentlyDone,
    });
  }

  if (loading) return <TodaySkeleton />;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Aujourd&apos;hui</h1>
          <p className="text-sm text-muted-foreground">
            {formatToday()} ·{" "}
            {dueToday.length === 0
              ? "Rien de prévu"
              : `${doneCount}/${dueToday.length} fait`}
          </p>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Nouvelle habitude</span>
        </Button>
      </header>

      {(habits ?? []).length === 0 ? (
        <EmptyState onCreate={() => setCreateOpen(true)} />
      ) : dueToday.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          <Sparkles className="mx-auto mb-2 h-6 w-6" />
          Aucune habitude prévue aujourd&apos;hui. Repose-toi ou prends de
          l&apos;avance.
        </Card>
      ) : (
        <ul className="space-y-2">
          {dueToday.map((habit) => {
            const set = completedByHabit.get(habit.id) ?? new Set<string>();
            const done = set.has(today);
            const streak = computeStreak(habit, set, today);
            const weeklyLeft = weeklyRemaining(habit, set, today);

            return (
              <li key={habit.id}>
                <Card
                  className={cn(
                    "flex items-center gap-3 p-3 transition-colors",
                    done && "bg-muted/40",
                  )}
                >
                  <HabitCheckButton
                    completed={done}
                    colorToken={habit.color}
                    onToggle={() => handleToggle(habit)}
                    label={habit.name}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-lg leading-none">{habit.emoji}</span>
                      <span
                        className={cn(
                          "truncate font-medium",
                          done && "text-muted-foreground line-through",
                        )}
                      >
                        {habit.name}
                      </span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{frequencyLabel(habit)}</span>
                      {weeklyLeft !== null && !done && weeklyLeft > 0 && (
                        <span>· encore {weeklyLeft} cette semaine</span>
                      )}
                    </div>
                  </div>
                  <StreakBadge current={streak.current} unit={streak.unit} />
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      <HabitFormDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}

/** Pour weekly_count : nombre de complétions restantes cette semaine (sinon null). */
function weeklyRemaining(
  habit: Habit,
  completed: Set<string>,
  today: string,
): number | null {
  if (habit.frequency_type !== "weekly_count") return null;
  const week = startOfWeekKey(today);
  let count = 0;
  for (const key of completed) if (startOfWeekKey(key) === week) count++;
  return Math.max(0, habit.weekly_target - count);
}

function formatToday(): string {
  return new Date().toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <Card className="flex flex-col items-center gap-3 p-10 text-center">
      <div className="text-4xl">🌱</div>
      <div>
        <p className="font-medium">Commence par une seule habitude</p>
        <p className="text-sm text-muted-foreground">
          Petit et régulier bat gros et sporadique.
        </p>
      </div>
      <Button onClick={onCreate}>
        <Plus className="h-4 w-4" />
        Créer ma première habitude
      </Button>
    </Card>
  );
}

function TodaySkeleton() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Skeleton className="h-9 w-40" />
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[68px] w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}
