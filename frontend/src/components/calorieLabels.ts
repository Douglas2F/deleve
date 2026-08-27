export type CalorieSource = "estimated" | "manual" | "mixed" | "none";

export function calorieLabel(source?: CalorieSource) {
 return source==="estimated"?"Calorias estimadas":source==="mixed"?"Calorias mistas":"Calorias informadas";
}

export function calorieSuffix(source?: CalorieSource) {
 return source==="estimated"?" estimadas":source==="mixed"?" (inclui estimativas)":" informadas";
}
