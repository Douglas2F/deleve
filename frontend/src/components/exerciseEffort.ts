export type Effort = "light" | "moderate" | "intense";
type EffortOption = { value: Effort; label: string; bars: number };

const threeLevels: EffortOption[] = [
  { value: "light", label: "Leve", bars: 1 },
  { value: "moderate", label: "Moderado", bars: 2 },
  { value: "intense", label: "Intenso", bars: 3 },
];

export function getEffortOptions(type: string, distance: string): EffortOption[] {
  if (type === "Musculação") return [
    { value: "moderate", label: "Habitual", bars: 2 },
    { value: "intense", label: "Intenso", bars: 3 },
  ];
  if (type === "Futebol") return [
    { value: "moderate", label: "Recreativo", bars: 2 },
    { value: "intense", label: "Competitivo", bars: 3 },
  ];
  if (type === "Dança" || (type === "Ciclismo" && !distance.trim())) return threeLevels;
  return [];
}

// Old light entries share the moderate reference in these two modalities.
// Normalize only the selection/label, not the stored value or calorie snapshot.
export function displayedEffort(type: string, effort: Effort | null): Effort | null {
  return effort === "light" && (type === "Musculação" || type === "Futebol")
    ? "moderate" : effort;
}

export function effortTitle(type: string) {
  return type === "Futebol" ? "Como foi o jogo?" : "Como foi o esforço?";
}

export function effortSummary(type: string, effort: Effort) {
  const selected = displayedEffort(type, effort);
  if (type === "Musculação") return selected === "intense" ? "Treino: intenso" : "Treino: habitual";
  if (type === "Futebol") return selected === "intense" ? "Jogo: competitivo" : "Jogo: recreativo";
  return `Esforço: ${threeLevels.find(option => option.value === effort)?.label.toLowerCase()}`;
}

export function getEffortHint(type: string, effort: Effort | null) {
  const selected = displayedEffort(type, effort);
  if (!selected) return "Opcional. Toque novamente na opção para desmarcar.";
  const hints: Record<string, Partial<Record<Effort, string>>> = {
    "Musculação": {
      moderate: "Treino habitual, com pausas entre as séries.",
      intense: "Treino vigoroso, com séries exigentes.",
    },
    "Dança": {
      light: "Referência: passos lentos, como dança de salão.",
      moderate: "Referência: aula de dança moderna, balé ou jazz.",
      intense: "Referência: dança vigorosa, como uma apresentação.",
    },
    "Futebol": {
      moderate: "Partida recreativa, sem ritmo de competição.",
      intense: "Partida competitiva, em ritmo intenso.",
    },
    "Ciclismo": {
      light: "Pedalada tranquila, em ritmo confortável.",
      moderate: "Pedalada constante, com esforço moderado.",
      intense: "Pedalada vigorosa, exigindo bastante esforço.",
    },
  };
  return hints[type]?.[selected] ?? "";
}
