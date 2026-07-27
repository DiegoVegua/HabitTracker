// ============================================================================
// Helpers de date — CHOIX TECHNIQUE IMPORTANT
// ----------------------------------------------------------------------------
// La frontière de journée est calculée dans le FUSEAU LOCAL du navigateur.
// Une habitude « faite aujourd'hui » = une ligne habit_logs dont `date` est la
// date locale du jour (ex: "2026-07-24"). On stocke donc une DATE nue (sans
// heure ni timezone) pour éviter les décalages : à 23h ou à 1h du matin, tant
// que c'est le même jour civil local, c'est le même `date`.
//
// Conséquence assumée : si l'utilisateur voyage entre deux fuseaux, la journée
// suit l'horloge de l'appareil. C'est le comportement attendu pour un tracker
// d'habitudes (« ai-je fait ça aujourd'hui, là où je suis ? »).
// ============================================================================

/** Renvoie la date locale au format "YYYY-MM-DD" (sans conversion UTC). */
export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Clé de la date d'aujourd'hui (fuseau local). */
export function todayKey(): string {
  return toDateKey(new Date());
}

/** Parse "YYYY-MM-DD" en Date locale à minuit (évite le parsing UTC de new Date(str)). */
export function fromDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Ajoute (ou retranche) un nombre de jours à une clé de date. */
export function addDaysKey(key: string, days: number): string {
  const d = fromDateKey(key);
  d.setDate(d.getDate() + days);
  return toDateKey(d);
}

/** Jour de la semaine d'une clé : 0 = dimanche ... 6 = samedi. */
export function weekdayOf(key: string): number {
  return fromDateKey(key).getDay();
}

/**
 * Clé du lundi de la semaine contenant `key` (semaines ISO, commencent lundi).
 * Utilisé pour le calcul des streaks « N fois par semaine ».
 */
export function startOfWeekKey(key: string): string {
  const d = fromDateKey(key);
  const day = d.getDay(); // 0..6, 0 = dimanche
  const diff = day === 0 ? -6 : 1 - day; // ramène au lundi
  d.setDate(d.getDate() + diff);
  return toDateKey(d);
}

/** Différence en jours entre deux clés (b - a). */
export function daysBetween(a: string, b: string): number {
  const ms = fromDateKey(b).getTime() - fromDateKey(a).getTime();
  return Math.round(ms / 86_400_000);
}

/** Liste des clés de dates de `from` à `to` inclus (ordre chronologique). */
export function dateRange(from: string, to: string): string[] {
  const out: string[] = [];
  let cur = from;
  while (daysBetween(cur, to) >= 0) {
    out.push(cur);
    cur = addDaysKey(cur, 1);
  }
  return out;
}
