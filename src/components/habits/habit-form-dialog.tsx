"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { HABIT_COLORS } from "@/lib/colors";
import type { FrequencyType, Habit, HabitInput } from "@/types/db";
import { useCreateHabit, useUpdateHabit } from "@/hooks/use-habits";
import { Loader2 } from "lucide-react";

const EMOJI_PRESETS = [
  "✅", "🏃", "📚", "💧", "🧘", "💪", "🥗", "😴",
  "✍️", "🎸", "🧹", "☎️", "🌱", "🚭", "💊", "☀️",
];

// Ordre d'affichage lundi→dimanche, valeurs alignées sur Date.getDay().
const WEEKDAYS: { value: number; label: string }[] = [
  { value: 1, label: "L" },
  { value: 2, label: "M" },
  { value: 3, label: "M" },
  { value: 4, label: "J" },
  { value: 5, label: "V" },
  { value: 6, label: "S" },
  { value: 0, label: "D" },
];

const EMPTY: HabitInput = {
  name: "",
  emoji: "✅",
  color: "emerald",
  frequency_type: "daily",
  weekly_target: 3,
  days_of_week: [],
};

export function HabitFormDialog({
  habit,
  open,
  onOpenChange,
}: {
  habit?: Habit;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const isEdit = Boolean(habit);
  const createHabit = useCreateHabit();
  const updateHabit = useUpdateHabit();
  const pending = createHabit.isPending || updateHabit.isPending;

  const [form, setForm] = React.useState<HabitInput>(EMPTY);
  const [error, setError] = React.useState<string | null>(null);

  // Réinitialise le formulaire à chaque ouverture.
  React.useEffect(() => {
    if (!open) return;
    setError(null);
    setForm(
      habit
        ? {
            name: habit.name,
            emoji: habit.emoji,
            color: habit.color,
            frequency_type: habit.frequency_type,
            weekly_target: habit.weekly_target,
            days_of_week: habit.days_of_week,
          }
        : EMPTY,
    );
  }, [open, habit]);

  function set<K extends keyof HabitInput>(key: K, value: HabitInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function toggleDay(day: number) {
    setForm((f) => ({
      ...f,
      days_of_week: f.days_of_week.includes(day)
        ? f.days_of_week.filter((d) => d !== day)
        : [...f.days_of_week, day],
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.name.trim()) {
      setError("Donnez un nom à l'habitude.");
      return;
    }
    if (
      form.frequency_type === "specific_days" &&
      form.days_of_week.length === 0
    ) {
      setError("Choisissez au moins un jour.");
      return;
    }

    try {
      const payload: HabitInput = { ...form, name: form.name.trim() };
      if (habit) {
        await updateHabit.mutateAsync({ id: habit.id, input: payload });
      } else {
        await createHabit.mutateAsync(payload);
      }
      onOpenChange(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Impossible d'enregistrer.",
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Modifier l'habitude" : "Nouvelle habitude"}
          </DialogTitle>
          <DialogDescription>
            Choisissez un rythme réaliste — vous pourrez l'ajuster plus tard.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Nom + emoji */}
          <div className="space-y-1.5">
            <Label htmlFor="habit-name">Nom</Label>
            <div className="flex gap-2">
              <Input
                aria-label="Emoji"
                value={form.emoji}
                onChange={(e) => set("emoji", e.target.value.slice(0, 4))}
                className="w-14 text-center text-lg"
                maxLength={4}
              />
              <Input
                id="habit-name"
                autoFocus
                placeholder="Boire de l'eau"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                maxLength={80}
              />
            </div>
            <div className="flex flex-wrap gap-1 pt-1">
              {EMOJI_PRESETS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => set("emoji", emoji)}
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-md text-base transition-colors hover:bg-accent",
                    form.emoji === emoji && "bg-secondary ring-1 ring-ring",
                  )}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Couleur */}
          <div className="space-y-1.5">
            <Label>Couleur</Label>
            <div className="flex flex-wrap gap-2">
              {HABIT_COLORS.map((c) => (
                <button
                  key={c.token}
                  type="button"
                  aria-label={c.label}
                  onClick={() => set("color", c.token)}
                  className={cn(
                    "h-8 w-8 rounded-full transition-transform hover:scale-110",
                    form.color === c.token &&
                      "ring-2 ring-offset-2 ring-offset-background",
                  )}
                  style={{
                    backgroundColor: c.base,
                    boxShadow:
                      form.color === c.token ? `0 0 0 2px ${c.base}` : undefined,
                  }}
                />
              ))}
            </div>
          </div>

          {/* Fréquence */}
          <div className="space-y-1.5">
            <Label>Fréquence</Label>
            <Select
              value={form.frequency_type}
              onValueChange={(v) => set("frequency_type", v as FrequencyType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Tous les jours</SelectItem>
                <SelectItem value="weekly_count">X fois par semaine</SelectItem>
                <SelectItem value="specific_days">
                  Jours précis de la semaine
                </SelectItem>
              </SelectContent>
            </Select>

            {form.frequency_type === "weekly_count" && (
              <div className="flex items-center gap-2 pt-1">
                <Label htmlFor="weekly-target" className="text-muted-foreground">
                  Objectif :
                </Label>
                <Input
                  id="weekly-target"
                  type="number"
                  min={1}
                  max={7}
                  value={form.weekly_target}
                  onChange={(e) =>
                    set(
                      "weekly_target",
                      Math.max(1, Math.min(7, Number(e.target.value) || 1)),
                    )
                  }
                  className="w-16"
                />
                <span className="text-sm text-muted-foreground">
                  fois / semaine
                </span>
              </div>
            )}

            {form.frequency_type === "specific_days" && (
              <div className="flex gap-1.5 pt-1">
                {WEEKDAYS.map((d) => {
                  const active = form.days_of_week.includes(d.value);
                  return (
                    <button
                      key={d.value}
                      type="button"
                      onClick={() => toggleDay(d.value)}
                      className={cn(
                        "h-9 w-9 rounded-full text-sm font-medium transition-colors",
                        active
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-secondary-foreground hover:bg-accent",
                      )}
                    >
                      {d.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEdit ? "Enregistrer" : "Créer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
