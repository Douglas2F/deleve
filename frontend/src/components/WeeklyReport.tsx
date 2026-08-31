import DeleveSymbol from "./DeleveSymbol";
import { exerciseSeconds, formatExerciseDuration } from "./exerciseDuration";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Activity, ArrowDownRight, ArrowLeft, ArrowRight, ArrowUpRight, Check, Droplets, Flame, Gauge, Minus, MoonStar, Route, Scale, Timer } from "lucide-react";
import "./weekly-report.css";
import Brand from "./Brand";
import WeeklyExerciseDays, { type WeeklyExerciseDay } from "./WeeklyExerciseDays";
import { buildWeeklyHighlight } from "./weeklyHighlight";
import { countComparisonText, weightComparisonText, type PreviousComparison } from "./weeklyComparison";
import { calorieLabel, type CalorieSource } from "./calorieLabels";

type Day = { date: string; value: number | null; isFuture: boolean; goalReached: boolean };
type DistanceTotal = { type: string; totalKm: number | null; totalSeconds?: number; totalMinutes: number; paceSecondsPerKm: number | null; averageSpeedKmh: number | null };
type WeeklyReportData = {
  previousComparison?: PreviousComparison | null;
  startDate: string; endDate: string; referenceDate: string; elapsedDays: number; recordedAreas: number; summary: string; weekOffset: number; isCurrentWeek: boolean;
  water: { totalMl: number; averageMl: number; goalMl: number; goalDays: number; recordedDays: number; days: Day[] };
  sleep: { averageMinutes: number; recordedDays: number; goalMinutes: number; goalDays: number; days: Day[] };
  exercise: { activityCount: number; byModality: DistanceTotal[]; completedDays: number; targetDays: number; totalSeconds?: number; totalMinutes: number; totalCalories: number; calorieSource: CalorieSource; modalities: string[]; distanceByModality: DistanceTotal[]; days: WeeklyExerciseDay[] };
  weight: { currentWeightKg: number | null; weeklyChangeKg: number; recordedDays: number; comparisonAvailable: boolean; initialWeightKg: number | null; initialDate: string | null; latestDate: string | null };
};

export default function WeeklyReport({ open, onClose }: { open: boolean; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [report, setReport] = useState<WeeklyReportData | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [weekOffset, setWeekOffset] = useState(0);

  useEffect(() => { if (!open) setWeekOffset(0); }, [open]);

  useEffect(() => {
    if (!open) return;
    const dialog = dialogRef.current;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    dialog?.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      dialog?.close();
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    setReport(null);
    setError("");
    fetch(`/api/health/report/week?weekOffset=${weekOffset}`, { signal: controller.signal })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error ?? "Não foi possível carregar o relatório.");
        return body;
      })
      .then((body: WeeklyReportData) => { if (!controller.signal.aborted) setReport(body); })
      .catch((caught) => { if (!controller.signal.aborted) setError(caught instanceof Error ? caught.message : "Não foi possível carregar o relatório."); });
    return () => controller.abort();
  }, [open, attempt, weekOffset]);

  if (!open) return null;
  const areas = report ? [report.water.recordedDays > 0, report.sleep.recordedDays > 0, report.exercise.completedDays > 0, report.weight.recordedDays > 0] : [];
  const highlight = report ? buildWeeklyHighlight(report) : null;
  const loading = !report && !error;

  function changeWeek(offset: number) {
    setReport(null);
    setError("");
    setWeekOffset(offset);
  }

  return <dialog ref={dialogRef} className="weekly-report" aria-labelledby="weekly-title" onCancel={(event) => { event.preventDefault(); onClose(); }} onKeyDown={(event) => { if (event.key === "Escape") { event.preventDefault(); onClose(); } }}>
    <div className="wr-page">
      <header className="wr-nav">
        <button type="button" className="wr-back" onClick={onClose} aria-label="Voltar ao painel"><ArrowLeft size={20} /></button>
        <Brand showTagline={false} />
        <span className="wr-kicker">Relatório semanal</span>
      </header>
      <nav className="wr-week-nav" aria-label="Escolher semana do relatório">
        <button type="button" className="wr-week-arrow" aria-label="Semana anterior" disabled={loading} onClick={() => changeWeek(weekOffset - 1)}><ArrowLeft size={18}/></button>
        <div className="wr-week-period" aria-live="polite" aria-atomic="true"><span>{weekOffset === 0 ? "Semana atual" : weekOffset === -1 ? "Semana anterior" : `${Math.abs(weekOffset)} semanas atrás`}</span><strong>{report ? formatPeriod(report.startDate, report.endDate) : loading ? "Carregando período…" : "Período indisponível"}</strong></div>
        <button type="button" className="wr-week-arrow" aria-label="Próxima semana" disabled={loading || weekOffset === 0} onClick={() => changeWeek(weekOffset + 1)}><ArrowRight size={18}/></button>
        {weekOffset < 0 && <button type="button" className="wr-week-current" disabled={loading} onClick={() => changeWeek(0)}>Voltar à atual</button>}
      </nav>
      {error ? <section className="wr-message" role="alert"><h1 id="weekly-title">Seu relatório não carregou.</h1><p>{error}</p><p>Verifique sua conexão e tente novamente.</p><button type="button" className="wr-retry" onClick={() => setAttempt((value) => value + 1)}>Tentar novamente</button></section>
        : !report ? <section className="wr-message" role="status"><h1 id="weekly-title">Preparando sua semana…</h1><p>Reunindo seus registros de saúde.</p></section>
        : <div key={report.startDate}>
          <section className="wr-hero">
            <div className="wr-intro">
              <h1 id="weekly-title">Sua semana,<br /><span>de leve.</span></h1>
              <p className="wr-summary">{report.summary}</p>
              <p className="wr-updated">{report.isCurrentWeek ? "Semana em andamento" : "Semana encerrada"} · até {formatDate(report.referenceDate)}</p>
            </div>
            <div className="wr-orbit-block">
              <div className="wr-orbit" role="img" aria-label={`${report.recordedAreas} de 4 áreas com registros nesta semana. Não representa metas concluídas.`}>
                <svg viewBox="0 0 160 160" aria-hidden="true">
                  {areas.map((recorded, index) => <circle key={index} className={`wr-arc wr-area-${index}${recorded ? " is-recorded" : ""}`} cx="80" cy="80" r="64" fill="none" strokeWidth="9" strokeLinecap="round" strokeDasharray="85 318" transform={`rotate(${-82 + index * 90} 80 80)`} />)}
                </svg>
                <div className="wr-orbit-value"><strong>{report.recordedAreas}<span>/4</span></strong><span>áreas registradas</span></div>
              </div>
              <div className="wr-area-legend" aria-hidden="true">{["Água", "Sono", "Exercício", "Peso"].map((name, index) => <span key={name} className={`wr-area-${index}`}><i className={areas[index] ? "is-recorded" : ""} />{name}</span>)}</div>
            </div>
          </section>
          <div className="wr-section-heading"><h2>Os detalhes do seu cuidado</h2><span>{report.elapsedDays} de 7 dias</span></div>
          {report.previousComparison && <p className="wr-comparison-period">Comparação dos mesmos dias: {formatComparisonPeriod(report.startDate, report.referenceDate)} × {formatComparisonPeriod(report.previousComparison.startDate, report.previousComparison.endDate)}</p>}
          <section className="wr-grid" aria-label="Registros por área">
            <ReportCard tone="water" icon={<Droplets size={21} />} title="Água" subtitle="Cada copo conta">
              <p className="wr-value">{report.water.recordedDays ? <>{formatNumber(report.water.averageMl)}<span>ml / dia</span></> : "Sem registros"}</p>
              <p className="wr-caption">Média nos {report.elapsedDays} dias decorridos</p>
              {report.water.goalMl > 0 && <div className="wr-progress-block"><div className="wr-progress-label"><span>Meta diária · {formatNumber(report.water.goalMl)} ml</span><strong>{Math.round(report.water.averageMl / report.water.goalMl * 100)}%</strong></div><progress max={100} value={Math.min(100, report.water.averageMl / report.water.goalMl * 100)} aria-label="Média de água em relação à meta diária" /></div>}
              <DayStrip days={report.water.days} area="Água" formatValue={(value) => `${formatNumber(value)} ml`} />
              <p className="wr-card-foot"><strong>{plural(report.water.goalDays, "dia", "dias")}</strong> com a meta alcançada <span>· {formatNumber(report.water.totalMl)} ml no total</span></p>
              <WeekComparison report={report} area="water"/>
            </ReportCard>
            <ReportCard tone="sleep" icon={<MoonStar size={21} />} title="Sono" subtitle="Seu tempo de descanso">
              <p className="wr-value">{report.sleep.recordedDays ? <>{formatDuration(report.sleep.averageMinutes)}<span>em média</span></> : "Sem registros"}</p>
              <p className="wr-caption">{plural(report.sleep.recordedDays, "noite registrada", "noites registradas")}{report.sleep.goalMinutes > 0 ? ` · meta de ${formatDuration(report.sleep.goalMinutes)}` : ""}</p>
              <DayStrip days={report.sleep.days} area="Sono" bars goal={report.sleep.goalMinutes} formatValue={formatDuration} />
              <p className="wr-card-foot"><strong>{plural(report.sleep.goalDays, "noite", "noites")}</strong> com a meta alcançada</p>
              <WeekComparison report={report} area="sleep"/>
            </ReportCard>
            <ReportCard tone="exercise" icon={<Activity size={21} />} title="Exercício" subtitle="Movimento no seu ritmo">
              <p className="wr-value">{report.exercise.completedDays}<span>{report.exercise.targetDays ? `de ${report.exercise.targetDays} dias planejados` : "dias de movimento"}</span></p>
              {report.exercise.completedDays ? <>
                <p className="wr-caption">{plural(report.exercise.activityCount, "atividade", "atividades")} · {report.exercise.modalities.join(" · ")}</p>
                <div className="wr-metrics"><Metric icon={<Timer />} label="Tempo total" value={formatExerciseDuration(exerciseSeconds(report.exercise.totalSeconds,report.exercise.totalMinutes))} />{report.exercise.totalCalories > 0 && <Metric icon={<Flame />} label={calorieLabel(report.exercise.calorieSource)} value={`${formatNumber(report.exercise.totalCalories)} kcal`} />}</div>
                <WeeklyExerciseDays days={report.exercise.days ?? []}/>
                {report.exercise.byModality.map((item) => <div className="wr-modality" key={item.type}><h4>{item.type}</h4><div className="wr-metrics">{item.totalKm != null && <Metric icon={<Route />} label="Distância" value={`${formatNumber(item.totalKm)} km`} />}<Metric icon={<Timer />} label="Tempo" value={formatExerciseDuration(exerciseSeconds(item.totalSeconds,item.totalMinutes))} />{item.paceSecondsPerKm != null && <Metric icon={<Gauge />} label="Ritmo" value={`${formatPace(item.paceSecondsPerKm)} /km`} />}{item.averageSpeedKmh != null && <Metric icon={<Gauge />} label="Velocidade média" value={`${formatNumber(item.averageSpeedKmh)} km/h`} />}</div></div>)}
              </> : <><p className="wr-empty">{report.isCurrentWeek ? "Sua próxima atividade pode começar esse resumo. Registre pelo painel quando quiser." : "Nenhuma atividade registrada neste período."}</p><WeeklyExerciseDays days={report.exercise.days ?? []}/></>}
              <WeekComparison report={report} area="exercise"/>
            </ReportCard>
            <ReportCard tone="weight" icon={<Scale size={21} />} title="Peso" subtitle="Acompanhar, sem julgamento">
              <p className="wr-value">{report.weight.currentWeightKg === null ? "Sem registros" : <>{formatWeight(report.weight.currentWeightKg)}<span>kg</span></>}</p>
              <p className="wr-caption">{report.weight.latestDate ? `Última pesagem · ${formatDate(report.weight.latestDate)}` : report.isCurrentWeek ? "Peso salvo no perfil · sem pesagem nesta semana" : "Nenhuma pesagem registrada nesse período"}</p>
              {report.weight.comparisonAvailable ? <>
                <div className="wr-weight-change">{report.weight.weeklyChangeKg < 0 ? <ArrowDownRight /> : report.weight.weeklyChangeKg > 0 ? <ArrowUpRight /> : <Minus />}<strong>{report.weight.weeklyChangeKg === 0 ? "Sem variação" : `${report.weight.weeklyChangeKg > 0 ? "+" : ""}${formatWeight(report.weight.weeklyChangeKg)} kg`}</strong></div>
                <p className="wr-caption">Em relação à primeira pesagem da semana</p>
                <div className="wr-weight-comparison"><div><span>{formatDate(report.weight.initialDate!)}</span><strong>{formatWeight(report.weight.initialWeightKg!)} kg</strong></div><ArrowRight size={18} aria-hidden="true" /><div><span>{formatDate(report.weight.latestDate!)}</span><strong>{formatWeight(report.weight.currentWeightKg!)} kg</strong></div></div>
              </> : <p className="wr-empty">{!report.isCurrentWeek ? report.weight.recordedDays ? "Uma pesagem no período. São necessárias duas datas para calcular a variação." : "Não há dados de peso para comparar nesta semana." : report.weight.recordedDays ? "Primeira pesagem registrada. Com outra pesagem em um novo dia, você verá a variação aqui." : "Registre seu peso no painel para começar a acompanhar a semana."}</p>}
              <p className="wr-card-foot">{plural(report.weight.recordedDays, "pesagem nesta semana", "pesagens nesta semana")}</p>
              <WeekComparison report={report} area="weight"/>
            </ReportCard>
          </section>
          <section className="wr-highlight"><span className="wr-highlight-icon"><DeleveSymbol size={23} /></span><div><p className="wr-kicker">{report.recordedAreas ? "Seu destaque foi…" : report.isCurrentWeek ? "Seu próximo passo" : "Sobre este período"}</p><h2>{highlight!.title}</h2><p>{highlight!.detail}</p></div></section>
          <footer className="wr-footer"><div className="wr-footer-brand"><Brand showTagline={false} /></div><p>Sua rotina, do seu jeito.</p><p>Metas calculadas com as configurações atuais do seu perfil.</p><small>Acompanhamento pessoal. Não substitui orientação profissional.</small></footer>
        </div>}
    </div>
  </dialog>;
}

function ReportCard({ tone, icon, title, subtitle, children }: { tone: string; icon: ReactNode; title: string; subtitle: string; children: ReactNode }) {
  return <article className={`wr-card wr-${tone}`}><header className="wr-card-heading"><span className="wr-icon" aria-hidden="true">{icon}</span><div><h3>{title}</h3><p>{subtitle}</p></div></header>{children}</article>;
}

function WeekComparison({ report, area }: { report: WeeklyReportData; area: "water" | "sleep" | "exercise" | "weight" }) {
  const comparison = report.previousComparison;
  const value = comparison?.[area];
  const weight = comparison?.weight;
  const needsGoal = area === "water" ? report.water.goalMl <= 0 : area === "sleep" && report.sleep.goalMinutes <= 0;
  return <div className="wr-week-comparison" aria-label="Comparação com a semana anterior">
    <strong>{area === "weight" ? weightComparisonText(weight) : countComparisonText(comparison?.[area], area)}</strong>
    {(!value?.available || area === "weight" || value.difference !== 0) && <span>{value?.available ? area === "weight" && weight ? `Pesagens: ${formatDate(weight.previousDate!)} → ${formatDate(weight.currentDate!)}` : "Em relação à semana anterior" : needsGoal ? "Configure sua meta para comparar." : "Precisamos de registros nos dois períodos."}</span>}
    {area === "weight" && weight?.available && weight.difference !== null && weight.difference * weight.goalDirection > 0 && <span>Na direção do seu objetivo</span>}
  </div>;
}

function DayStrip({ days, area, formatValue, bars = false, goal = 0 }: { days: Day[]; area: string; formatValue: (value: number) => string; bars?: boolean; goal?: number }) {
  const [selected, setSelected] = useState<string | null>(null);
  const selectedDay = days.find((day) => day.date === selected);
  const maxValue = Math.max(goal, ...days.map((day) => day.value ?? 0), 1);
  return <div className={`wr-days${bars ? " wr-days-bars" : ""}`}>
    <div className="wr-days-track" role="group" aria-label={`${area}: consultar os dias da semana`}>
      {days.map((day, index) => <button type="button" key={day.date} disabled={day.isFuture} aria-pressed={selected === day.date} aria-label={`${area}, ${formatDate(day.date)}: ${day.isFuture ? "dia futuro" : day.value === null ? "sem registro" : formatValue(day.value)}${day.goalReached ? ", meta alcançada" : ""}`} className={`wr-day${day.value !== null ? " has-record" : ""}${day.goalReached ? " reached-goal" : ""}`} onClick={() => setSelected(day.date)}>
        {bars ? <span className="wr-day-bar" style={{ "--day-height": `${day.value === null ? 0 : Math.max(8, day.value / maxValue * 100)}%` } as CSSProperties}><i />{day.goalReached && <Check size={12} />}</span> : <span className="wr-day-dot">{day.goalReached ? <Check size={15} /> : day.isFuture ? <span>·</span> : day.value !== null ? <Droplets size={15} /> : <Minus size={12} />}</span>}
        <span className="wr-day-label">{["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"][index]}</span>
      </button>)}
    </div>
    <p className="wr-day-detail" aria-live="polite">{selectedDay ? `${formatDate(selectedDay.date)} · ${selectedDay.value === null ? "Sem registro" : formatValue(selectedDay.value)}${selectedDay.goalReached ? " · Meta alcançada" : ""}` : "Toque em um dia para ver o registro."}</p>
  </div>;
}

function Metric({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return <div className="wr-metric"><span>{icon}{label}</span><strong>{value}</strong></div>;
}

function formatDuration(minutes: number) { const rounded = Math.round(minutes); const hours = Math.floor(rounded / 60), remaining = rounded % 60; return hours ? `${hours}h${remaining ? ` ${remaining}min` : ""}` : `${remaining}min`; }
function formatDate(value: string) { return new Date(`${value}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }); }
function formatPeriod(start: string, end: string) { const startYear = start.slice(0, 4), endYear = end.slice(0, 4); return `${formatDate(start)}${startYear !== endYear ? ` ${startYear}` : ""} — ${formatDate(end)} ${endYear}`; }
function formatComparisonPeriod(start: string, end: string) { return start === end ? `${formatDate(start)} ${start.slice(0, 4)}` : formatPeriod(start, end); }
function formatNumber(value: number) { return value.toLocaleString("pt-BR", { maximumFractionDigits: 2 }); }
function formatWeight(value: number) { return value.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }); }
function formatPace(seconds: number) { const rounded = Math.round(seconds); return `${Math.floor(rounded / 60)}:${String(rounded % 60).padStart(2, "0")}`; }
function plural(value: number, singular: string, pluralForm: string) { return `${value} ${value === 1 ? singular : pluralForm}`; }
