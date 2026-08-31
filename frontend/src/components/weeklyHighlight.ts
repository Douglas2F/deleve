type HighlightReport = {
  isCurrentWeek: boolean;
  recordedAreas: number;
  water: { recordedDays: number; goalDays: number; goalMl: number };
  sleep: { recordedDays: number; goalDays: number; goalMinutes: number };
  exercise: { completedDays: number; targetDays: number };
  weight: { recordedDays: number };
};

/** Weekly plan completion first; then daily goals; otherwise acknowledge recording consistency. */
export function buildWeeklyHighlight(report: HighlightReport) {
  if (!report.isCurrentWeek && !report.recordedAreas) return {
    title: "Uma semana sem registros.",
    detail: "Isso indica apenas ausência de dados no Deleve, não falta de cuidado. Você pode consultar outro período.",
  };

  const { completedDays, targetDays } = report.exercise;
  if (targetDays > 0 && completedDays >= targetDays) return {
    title: "Seu plano de movimento, cumprido.",
    detail: `Você cumpriu ${targetDays === 1 ? "o dia de exercício planejado" : `os ${targetDays} dias de exercício planejados`}.${completedDays > targetDays ? ` Ao todo, você se movimentou em ${plural(completedDays, "dia", "dias")} nesta semana.` : ""}`,
  };

  const waterDays = report.water.goalMl > 0 ? report.water.goalDays : 0;
  const sleepDays = report.sleep.goalMinutes > 0 ? report.sleep.goalDays : 0;
  if (waterDays > 0 && waterDays === sleepDays) return {
    title: "Conquistas na água e no descanso.",
    detail: `Você alcançou sua meta de água em ${plural(waterDays, "dia", "dias")} e sua meta de sono em ${plural(sleepDays, "noite", "noites")}.`,
  };
  if (waterDays > sleepDays) return {
    title: "Sua hidratação ganhou constância.",
    detail: `Sua meta de água foi alcançada em ${plural(waterDays, "dia", "dias")} nesta semana.`,
  };
  if (sleepDays > 0) return {
    title: "Tempo reservado para descansar.",
    detail: `Sua meta de sono foi alcançada em ${plural(sleepDays, "noite", "noites")} nesta semana.`,
  };

  const entries = [
    { days: report.water.recordedDays, title: "Dar espaço à hidratação.", detail: `Você registrou água em ${plural(report.water.recordedDays, "dia", "dias")} desta semana.` },
    { days: report.sleep.recordedDays, title: "Olhar para o seu descanso.", detail: `Você acompanhou ${plural(report.sleep.recordedDays, "noite de sono", "noites de sono")} nesta semana.` },
    { days: completedDays, title: "Encontrar tempo para se mover.", detail: `Você registrou atividades em ${plural(completedDays, "dia", "dias")} desta semana. Cada registro ajuda a conhecer sua rotina.` },
    { days: report.weight.recordedDays, title: "Conhecer melhor o seu ritmo.", detail: `Você fez ${plural(report.weight.recordedDays, "pesagem", "pesagens")} nesta semana, construindo seu histórico.` },
  ].sort((a, b) => b.days - a.days);
  if (!entries[0].days) return { title: "Começar com um pequeno registro.", detail: "Água, sono, movimento ou peso: escolha uma área no painel. Sem precisar fazer tudo de uma vez." };
  if (entries.filter(entry => entry.days === entries[0].days).length > 1) return { title: "Cuidar de mais de uma parte de você.", detail: `${report.recordedAreas} áreas acompanhadas nesta semana. Cada registro ajuda a conhecer sua rotina.` };
  return { title: entries[0].title, detail: entries[0].detail };
}

function plural(value: number, singular: string, pluralForm: string) { return `${value} ${value === 1 ? singular : pluralForm}`; }
