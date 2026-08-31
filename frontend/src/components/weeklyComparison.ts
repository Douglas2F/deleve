export type CountComparison = { available: boolean; current: number; previous: number; difference: number | null };
export type WeightComparison = { available: boolean; difference: number | null; currentDate: string | null; previousDate: string | null; goalDirection: number };
export type PreviousComparison = {
  startDate: string; endDate: string;
  water: CountComparison; sleep: CountComparison; exercise: CountComparison; weight: WeightComparison;
};

export function countComparisonText(value: CountComparison | undefined, area: "water" | "sleep" | "exercise") {
  if (!value?.available || value.difference === null) return "Ainda sem comparação";
  if (value.difference === 0) return "Igual à semana anterior";
  const amount = Math.abs(value.difference);
  const unit = area === "sleep" ? (amount === 1 ? "noite com meta atingida" : "noites com meta atingida")
    : area === "water" ? (amount === 1 ? "dia com meta atingida" : "dias com meta atingida")
    : amount === 1 ? "dia ativo" : "dias ativos";
  return `${amount} ${unit} a ${value.difference > 0 ? "mais" : "menos"}`;
}

export function weightComparisonText(value: WeightComparison | undefined) {
  if (!value?.available || value.difference === null) return "Ainda sem comparação";
  if (value.difference === 0) return "Sem variação entre as pesagens";
  const amount = Math.abs(value.difference).toLocaleString("pt-BR", { maximumFractionDigits: 1 });
  return `${value.difference < 0 ? "−" : "+"}${amount} kg em relação à semana anterior`;
}
