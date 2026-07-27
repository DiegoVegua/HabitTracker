import type { Habit } from "@/types/db";
import { weekdayOf } from "@/lib/dates";

// ============================================================================
// « Cette habitude est-elle prévue ce jour-là ? »
// ----------------------------------------------------------------------------
//   daily          -> tous les jours.
//   specific_days  -> uniquement les jours de days_of_week (0=dim..6=sam).
//   weekly_count   -> N fois / semaine, jours libres : aucun jour n'est
//                     « obligatoire ». On considère l'habitude proposable tous
//                     les jours (l'utilisateur choisit quand), et l'objectif se
//                     mesure à la semaine (voir streaks.ts). isDueOn renvoie
//                     donc true chaque jour pour l'afficher dans « Aujourd'hui ».
// ============================================================================

export function isDueOn(habit: Habit, dateKey: string): boolean {
  switch (habit.frequency_type) {
    case "daily":
      return true;
    case "specific_days":
      return habit.days_of_week.includes(weekdayOf(dateKey));
    case "weekly_count":
      return true;
    default:
      return true;
  }
}

const WEEKDAY_LABELS = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

/** Libellé lisible de la fréquence, pour l'UI. */
export function frequencyLabel(habit: Habit): string {
  switch (habit.frequency_type) {
    case "daily":
      return "Tous les jours";
    case "weekly_count":
      return `${habit.weekly_target}× par semaine`;
    case "specific_days": {
      const days = [...habit.days_of_week].sort((a, b) => a - b);
      if (days.length === 0) return "Aucun jour";
      if (days.length === 7) return "Tous les jours";
      return days.map((d) => WEEKDAY_LABELS[d]).join(", ");
    }
    default:
      return "";
  }
}
