// Types du domaine, alignés sur le schéma SQL (supabase/migrations/0001_init.sql).

export type FrequencyType = "daily" | "weekly_count" | "specific_days";

/** 0 = dimanche ... 6 = samedi (aligné sur Date.getDay()). */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface Habit {
  id: string;
  user_id: string;
  name: string;
  emoji: string;
  color: string; // token de palette — voir src/lib/colors.ts
  frequency_type: FrequencyType;
  weekly_target: number; // utilisé si frequency_type === "weekly_count"
  days_of_week: number[]; // utilisé si frequency_type === "specific_days"
  sort_order: number;
  archived: boolean;
  created_at: string;
}

export interface HabitLog {
  id: string;
  habit_id: string;
  user_id: string;
  date: string; // "YYYY-MM-DD" (date locale)
  completed: boolean;
  created_at: string;
}

/** Champs éditables via le formulaire de création/édition. */
export interface HabitInput {
  name: string;
  emoji: string;
  color: string;
  frequency_type: FrequencyType;
  weekly_target: number;
  days_of_week: number[];
}
