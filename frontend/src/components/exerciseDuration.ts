export function exerciseSeconds(seconds: number | null | undefined, minutes: number = 0) {
  return seconds ?? Math.round(minutes * 60);
}

export function getDurationSeconds(hours: string, minutes: string, seconds: string) {
  const parts = [hours, minutes, seconds].map(Number);
  if (!parts.every(Number.isInteger)) return null;
  const [h, m, s] = parts;
  if (h < 0 || h > 8 || m < 0 || m > 59 || s < 0 || s > 59) return null;
  const total = h * 3600 + m * 60 + s;
  return total >= 1 && total <= 28800 ? total : null;
}

export function durationParts(total: number) {
  return {
    hours: String(Math.floor(total / 3600)),
    minutes: String(Math.floor(total / 60) % 60),
    seconds: String(total % 60).padStart(2, "0"),
  };
}

export function formatExerciseDuration(total: number) {
  const seconds = Math.round(total);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor(seconds / 60) % 60;
  const remainder = seconds % 60;
  return [hours ? `${hours}h` : "", minutes ? `${minutes}min` : "", remainder ? `${remainder}s` : ""].filter(Boolean).join(" ") || "0min";
}

export function getPerformancePreview(type: string, seconds: number | null, distanceValue: string) {
  const distance = Number(distanceValue.replace(",", "."));
  if (!seconds || !Number.isFinite(distance) || distance < 0.1 || distance > 1000) return "";
  if (type === "Corrida") {
    const pace = Math.round(seconds / distance);
    return `Ritmo · ${Math.floor(pace / 60)}:${String(pace % 60).padStart(2, "0")} /km`;
  }
  if (type === "Ciclismo") {
    return `Velocidade média · ${(distance * 3600 / seconds).toLocaleString("pt-BR", {maximumFractionDigits: 1})} km/h`;
  }
  return "";
}
