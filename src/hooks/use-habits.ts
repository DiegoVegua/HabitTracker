"use client";

import * as React from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Habit, HabitInput, HabitLog } from "@/types/db";

// ============================================================================
// Accès aux données — React Query + Supabase Realtime + Optimistic UI
// ----------------------------------------------------------------------------
// • useHabits / useArchivedHabits : liste des habitudes.
// • useLogs : TOUS les habit_logs de l'utilisateur (les RLS limitent déjà aux
//   siens). On charge tout l'historique : suffisant à l'échelle perso et ça
//   permet de calculer streaks + heatmap sans requêtes supplémentaires.
// • useToggleLog : coche/décoche un jour en OPTIMISTIC — le cache est mis à jour
//   immédiatement, la requête serveur part en arrière-plan, rollback si échec.
// • useRealtimeSync : écoute les changements Postgres et rafraîchit le cache
//   (synchro temps réel entre appareils).
// ============================================================================

const KEYS = {
  user: ["user"] as const,
  habits: ["habits"] as const,
  logs: ["logs"] as const,
};

/** Id de l'utilisateur connecté (nécessaire pour renseigner user_id à l'insert). */
export function useUserId() {
  const supabase = React.useMemo(() => createClient(), []);
  return useQuery({
    queryKey: KEYS.user,
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      return user?.id ?? null;
    },
    staleTime: Infinity,
  });
}

export function useHabits() {
  const supabase = React.useMemo(() => createClient(), []);
  return useQuery({
    queryKey: KEYS.habits,
    queryFn: async (): Promise<Habit[]> => {
      const { data, error } = await supabase
        .from("habits")
        .select("*")
        .eq("archived", false)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as Habit[];
    },
  });
}

export function useArchivedHabits() {
  const supabase = React.useMemo(() => createClient(), []);
  return useQuery({
    queryKey: [...KEYS.habits, "archived"],
    queryFn: async (): Promise<Habit[]> => {
      const { data, error } = await supabase
        .from("habits")
        .select("*")
        .eq("archived", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Habit[];
    },
  });
}

export function useLogs() {
  const supabase = React.useMemo(() => createClient(), []);
  return useQuery({
    queryKey: KEYS.logs,
    queryFn: async (): Promise<HabitLog[]> => {
      const { data, error } = await supabase.from("habit_logs").select("*");
      if (error) throw error;
      return data as HabitLog[];
    },
  });
}

/** Regroupe les dates complétées par habitude : habit_id -> Set("YYYY-MM-DD"). */
export function useCompletedByHabit(logs: HabitLog[] | undefined) {
  return React.useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const log of logs ?? []) {
      if (!log.completed) continue;
      let set = map.get(log.habit_id);
      if (!set) {
        set = new Set();
        map.set(log.habit_id, set);
      }
      set.add(log.date);
    }
    return map;
  }, [logs]);
}

// --- Mutations --------------------------------------------------------------

export function useCreateHabit() {
  const supabase = React.useMemo(() => createClient(), []);
  const qc = useQueryClient();
  const { data: userId } = useUserId();

  return useMutation({
    mutationFn: async (input: HabitInput) => {
      if (!userId) throw new Error("Utilisateur non authentifié");
      const { data, error } = await supabase
        .from("habits")
        .insert({ ...input, user_id: userId })
        .select()
        .single();
      if (error) throw error;
      return data as Habit;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.habits }),
  });
}

export function useUpdateHabit() {
  const supabase = React.useMemo(() => createClient(), []);
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      input,
    }: {
      id: string;
      input: Partial<HabitInput>;
    }) => {
      const { error } = await supabase
        .from("habits")
        .update(input)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.habits }),
  });
}

/** Archive ou désarchive une habitude (soft delete, jamais de suppression dure ici). */
export function useSetArchived() {
  const supabase = React.useMemo(() => createClient(), []);
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      archived,
    }: {
      id: string;
      archived: boolean;
    }) => {
      const { error } = await supabase
        .from("habits")
        .update({ archived })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.habits }),
  });
}

export function useDeleteHabit() {
  const supabase = React.useMemo(() => createClient(), []);
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("habits").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.habits });
      qc.invalidateQueries({ queryKey: KEYS.logs });
    },
  });
}

/**
 * Coche/décoche une habitude pour une date — OPTIMISTIC.
 * `completed` = état ACTUEL (true si déjà fait ce jour-là). On bascule vers
 * l'inverse. Décocher supprime la ligne (présence = fait).
 */
export function useToggleLog() {
  const supabase = React.useMemo(() => createClient(), []);
  const qc = useQueryClient();
  const { data: userId } = useUserId();

  return useMutation({
    mutationFn: async ({
      habitId,
      dateKey,
      completed,
    }: {
      habitId: string;
      dateKey: string;
      completed: boolean;
    }) => {
      if (!userId) throw new Error("Utilisateur non authentifié");
      if (completed) {
        const { error } = await supabase
          .from("habit_logs")
          .delete()
          .eq("habit_id", habitId)
          .eq("date", dateKey);
        if (error) throw error;
      } else {
        // upsert : évite un doublon si la ligne existe déjà (contrainte unique).
        const { error } = await supabase
          .from("habit_logs")
          .upsert(
            { habit_id: habitId, user_id: userId, date: dateKey, completed: true },
            { onConflict: "habit_id,date" },
          );
        if (error) throw error;
      }
    },

    onMutate: async ({ habitId, dateKey, completed }) => {
      await qc.cancelQueries({ queryKey: KEYS.logs });
      const previous = qc.getQueryData<HabitLog[]>(KEYS.logs) ?? [];

      let next: HabitLog[];
      if (completed) {
        next = previous.filter(
          (l) => !(l.habit_id === habitId && l.date === dateKey),
        );
      } else {
        const optimistic: HabitLog = {
          id: `optimistic-${habitId}-${dateKey}`,
          habit_id: habitId,
          user_id: userId ?? "",
          date: dateKey,
          completed: true,
          created_at: new Date().toISOString(),
        };
        next = [...previous, optimistic];
      }
      qc.setQueryData<HabitLog[]>(KEYS.logs, next);
      return { previous };
    },

    onError: (_err, _vars, context) => {
      // Rollback si la requête serveur échoue.
      if (context?.previous) qc.setQueryData(KEYS.logs, context.previous);
    },

    onSettled: () => {
      // Resynchronise avec le serveur (récupère les vrais id, etc.).
      qc.invalidateQueries({ queryKey: KEYS.logs });
    },
  });
}

/**
 * Abonnement Realtime : à monter une fois haut dans l'arbre (layout de l'app).
 * Toute modification des tables invalide le cache → synchro entre appareils.
 */
export function useRealtimeSync() {
  const supabase = React.useMemo(() => createClient(), []);
  const qc = useQueryClient();

  React.useEffect(() => {
    const channel = supabase
      .channel("habits-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "habits" },
        () => qc.invalidateQueries({ queryKey: KEYS.habits }),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "habit_logs" },
        () => qc.invalidateQueries({ queryKey: KEYS.logs }),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, qc]);
}
