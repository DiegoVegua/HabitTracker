// Palette de couleurs d'habitudes. On stocke un TOKEN (ex: "emerald") en base
// et on résout les valeurs concrètes ici — pratique pour changer la palette
// sans migration. Chaque token fournit une teinte pour le point d'accent et une
// échelle pour la heatmap (du plus clair au plus intense).

export interface HabitColor {
  token: string;
  label: string;
  /** Couleur d'accent (point, coche). */
  base: string;
  /** Couleur de fond légère pour surbrillance. */
  soft: string;
  /**
   * Échelle heatmap à 4 niveaux d'intensité (0 = vide géré à part).
   * Index 0 = 1 complétion faible … index 3 = intense.
   */
  scale: [string, string, string, string];
}

export const HABIT_COLORS: HabitColor[] = [
  {
    token: "emerald",
    label: "Émeraude",
    base: "#10b981",
    soft: "#10b98122",
    scale: ["#bbf7d0", "#6ee7b7", "#34d399", "#059669"],
  },
  {
    token: "sky",
    label: "Ciel",
    base: "#0ea5e9",
    soft: "#0ea5e922",
    scale: ["#bae6fd", "#7dd3fc", "#38bdf8", "#0284c7"],
  },
  {
    token: "violet",
    label: "Violet",
    base: "#8b5cf6",
    soft: "#8b5cf622",
    scale: ["#ddd6fe", "#c4b5fd", "#a78bfa", "#7c3aed"],
  },
  {
    token: "rose",
    label: "Rose",
    base: "#f43f5e",
    soft: "#f43f5e22",
    scale: ["#fecdd3", "#fda4af", "#fb7185", "#e11d48"],
  },
  {
    token: "amber",
    label: "Ambre",
    base: "#f59e0b",
    soft: "#f59e0b22",
    scale: ["#fde68a", "#fcd34d", "#fbbf24", "#d97706"],
  },
  {
    token: "slate",
    label: "Ardoise",
    base: "#64748b",
    soft: "#64748b22",
    scale: ["#cbd5e1", "#94a3b8", "#64748b", "#475569"],
  },
];

const BY_TOKEN = new Map(HABIT_COLORS.map((c) => [c.token, c]));

export function getColor(token: string): HabitColor {
  return BY_TOKEN.get(token) ?? HABIT_COLORS[0];
}
