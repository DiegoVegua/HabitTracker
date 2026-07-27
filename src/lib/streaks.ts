import type { Habit } from "@/types/db";
import {
  addDaysKey,
  dateRange,
  daysBetween,
  startOfWeekKey,
  toDateKey,
  weekdayOf,
} from "@/lib/dates";

// ============================================================================
// CALCUL DES STREAKS ET STATISTIQUES — source de vérité : les habit_logs
// ----------------------------------------------------------------------------
// Rien n'est stocké : on reçoit l'ensemble des dates complétées (Set de clés
// "YYYY-MM-DD") et on dérive tout. Trois régimes selon la fréquence :
//
//  • daily          → une série = des jours civils consécutifs complétés.
//  • specific_days  → seuls les jours planifiés comptent ; une série = des
//                     occurrences planifiées consécutives complétées.
//  • weekly_count   → on raisonne en SEMAINES : une semaine « réussie » atteint
//                     weekly_target complétions ; une série = des semaines
//                     réussies consécutives.
//
// RÈGLE DE GRÂCE (anti-culpabilisation) : le jour/la semaine EN COURS, s'il
// n'est pas encore complété, ne CASSE PAS la série — on l'ignore simplement.
// La série ne se rompt que sur un jour/semaine PASSÉ raté. Ainsi, ouvrir l'app
// le matin ne montre jamais « série perdue » alors que la journée commence.
// ============================================================================

export interface StreakResult {
  /** Série en cours (jours pour daily/specific_days, semaines pour weekly_count). */
  current: number;
  /** Meilleure série historique, même unité. */
  best: number;
  /** "days" | "weeks" — pour l'affichage du libellé. */
  unit: "days" | "weeks";
}

/** Première date à considérer pour l'historique (création de l'habitude). */
function startKey(habit: Habit): string {
  return toDateKey(new Date(habit.created_at));
}

// --- daily ------------------------------------------------------------------
function dailyStreak(
  completed: Set<string>,
  today: string,
  start: string,
): StreakResult {
  // Série courante : on part d'aujourd'hui ; si aujourd'hui n'est pas fait,
  // on applique la grâce et on démarre à hier.
  let cursor = completed.has(today) ? today : addDaysKey(today, -1);
  let current = 0;
  while (completed.has(cursor) && daysBetween(start, cursor) >= 0) {
    current++;
    cursor = addDaysKey(cursor, -1);
  }

  // Meilleure série : plus long run de jours consécutifs sur [start, today].
  let best = 0;
  let run = 0;
  for (const key of dateRange(start, today)) {
    if (completed.has(key)) {
      run++;
      best = Math.max(best, run);
    } else {
      run = 0;
    }
  }

  return { current, best: Math.max(best, current), unit: "days" };
}

// --- specific_days ----------------------------------------------------------
function specificDaysStreak(
  habit: Habit,
  completed: Set<string>,
  today: string,
  start: string,
): StreakResult {
  const scheduled = new Set(habit.days_of_week);
  const isScheduled = (key: string) => scheduled.has(weekdayOf(key));

  // Série courante : on remonte les jours planifiés depuis aujourd'hui.
  // Si aujourd'hui est planifié mais pas fait → grâce, on l'ignore.
  let current = 0;
  let cursor = today;
  if (isScheduled(cursor) && !completed.has(cursor)) {
    cursor = addDaysKey(cursor, -1);
  }
  while (daysBetween(start, cursor) >= 0) {
    if (isScheduled(cursor)) {
      if (completed.has(cursor)) current++;
      else break;
    }
    cursor = addDaysKey(cursor, -1);
  }

  // Meilleure série sur les occurrences planifiées de [start, today].
  let best = 0;
  let run = 0;
  for (const key of dateRange(start, today)) {
    if (!isScheduled(key)) continue;
    if (completed.has(key)) {
      run++;
      best = Math.max(best, run);
    } else {
      run = 0;
    }
  }

  return { current, best: Math.max(best, current), unit: "days" };
}

// --- weekly_count -----------------------------------------------------------
function weeklyCountStreak(
  habit: Habit,
  completed: Set<string>,
  today: string,
  start: string,
): StreakResult {
  // Compte des complétions par semaine (clé = lundi de la semaine).
  const perWeek = new Map<string, number>();
  for (const key of completed) {
    const wk = startOfWeekKey(key);
    perWeek.set(wk, (perWeek.get(wk) ?? 0) + 1);
  }
  const succeeded = (weekStart: string) =>
    (perWeek.get(weekStart) ?? 0) >= habit.weekly_target;

  const currentWeek = startOfWeekKey(today);
  const startWeek = startOfWeekKey(start);

  // Série courante : depuis la semaine en cours vers le passé.
  // La semaine en cours pas encore réussie → grâce (on part de la précédente).
  let current = 0;
  let wk = succeeded(currentWeek) ? currentWeek : addDaysKey(currentWeek, -7);
  while (daysBetween(startWeek, wk) >= 0 && succeeded(wk)) {
    current++;
    wk = addDaysKey(wk, -7);
  }

  // Meilleure série : plus long run de semaines réussies consécutives.
  let best = 0;
  let run = 0;
  for (let w = startWeek; daysBetween(w, currentWeek) >= 0; w = addDaysKey(w, 7)) {
    if (succeeded(w)) {
      run++;
      best = Math.max(best, run);
    } else {
      run = 0;
    }
  }

  return { current, best: Math.max(best, current), unit: "weeks" };
}

/** Point d'entrée : calcule la série courante et la meilleure série. */
export function computeStreak(
  habit: Habit,
  completed: Set<string>,
  today: string,
): StreakResult {
  const start = startKey(habit);
  switch (habit.frequency_type) {
    case "specific_days":
      return specificDaysStreak(habit, completed, today, start);
    case "weekly_count":
      return weeklyCountStreak(habit, completed, today, start);
    case "daily":
    default:
      return dailyStreak(completed, today, start);
  }
}

// ============================================================================
// Taux de complétion
// ----------------------------------------------------------------------------
// Rapport complétions / occurrences prévues sur une fenêtre [from, to].
//   daily          → dénominateur = nombre de jours de la fenêtre.
//   specific_days  → dénominateur = nombre de jours planifiés.
//   weekly_count   → dénominateur = nombre de semaines couvertes × weekly_target.
// ============================================================================

export interface CompletionStats {
  completed: number;
  total: number;
  rate: number; // 0..1
}

export function completionRate(
  habit: Habit,
  completed: Set<string>,
  from: string,
  to: string,
): CompletionStats {
  const keys = dateRange(from, to);

  if (habit.frequency_type === "weekly_count") {
    const weeks = new Set(keys.map(startOfWeekKey));
    const total = weeks.size * habit.weekly_target;
    let done = 0;
    for (const key of keys) if (completed.has(key)) done++;
    return {
      completed: done,
      total,
      rate: total === 0 ? 0 : Math.min(1, done / total),
    };
  }

  const scheduled =
    habit.frequency_type === "specific_days"
      ? keys.filter((k) => habit.days_of_week.includes(weekdayOf(k)))
      : keys;

  let done = 0;
  for (const key of scheduled) if (completed.has(key)) done++;

  return {
    completed: done,
    total: scheduled.length,
    rate: scheduled.length === 0 ? 0 : done / scheduled.length,
  };
}

// ============================================================================
// Paliers de streak (motivation légère, non intrusive)
// ============================================================================
export const STREAK_MILESTONES = [7, 30, 100, 365] as const;

/** Le plus haut palier atteint par la série courante (0 si aucun). */
export function reachedMilestone(current: number): number {
  let reached = 0;
  for (const m of STREAK_MILESTONES) if (current >= m) reached = m;
  return reached;
}

/** Prochain palier à viser (undefined si tous atteints). */
export function nextMilestone(current: number): number | undefined {
  return STREAK_MILESTONES.find((m) => m > current);
}

/** Vrai si la série courante atteint pile un palier (feedback visuel discret). */
export function isOnMilestone(current: number): boolean {
  return (STREAK_MILESTONES as readonly number[]).includes(current);
}
