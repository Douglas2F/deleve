import { useId, useRef, useState, type ReactNode } from "react";
import { Activity, Bike, Check, Dumbbell, Flame, Footprints, Gauge, Minus, Route, Timer, X } from "lucide-react";
import type { ExerciseEntry } from "./ExerciseDialog";
import { calorieLabel } from "./calorieLabels";
import { exerciseSeconds, formatExerciseDuration } from "./exerciseDuration";

export type WeeklyExerciseDay = {
  date: string;
  isFuture: boolean;
  activityCount: number;
  totalSeconds?: number;
  totalMinutes: number;
  entries: ExerciseEntry[];
};

export default function WeeklyExerciseDays({ days }: { days: WeeklyExerciseDay[] }) {
  const [selected, setSelected] = useState<string | null>(null);
  const detailId = useId();
  const selectedButton = useRef<HTMLButtonElement>(null);
  const day = days.find(item => item.date === selected);
  return <div className="wr-exercise-days">
    <h4>Atividades por dia</h4>
    <div className="wr-days-track" role="group" aria-label="Exercício: consultar atividades por dia">
      {days.map((item, index) => <button key={item.date} type="button"
        ref={selected === item.date ? selectedButton : undefined}
        className={`wr-day${!item.isFuture && item.activityCount > 0 ? " has-record" : ""}`}
        disabled={item.isFuture} aria-pressed={selected === item.date}
        aria-expanded={selected === item.date} aria-controls={detailId}
        aria-label={`Exercício, ${formatDate(item.date)}: ${item.isFuture ? "dia futuro" : item.activityCount ? `exercício realizado, ${activityCount(item.activityCount)}` : "sem atividades registradas"}`}
        onClick={() => setSelected(current => current === item.date ? null : item.date)}>
        <span className="wr-day-dot" aria-hidden="true">{item.isFuture ? "·" : item.activityCount > 0 ? <Check size={15}/> : <Minus size={12}/>}</span>
        <span className="wr-day-label">{["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"][index]}</span>
      </button>)}
    </div>
    <div id={detailId}>
      <p className="wr-day-detail" aria-live="polite" aria-atomic="true">{day ? `${formatDate(day.date)} · ${day.activityCount ? `${activityCount(day.activityCount)} · ${formatExerciseDuration(exerciseSeconds(day.totalSeconds, day.totalMinutes))} no total` : "Nenhuma atividade registrada neste dia."}` : "Toque em um dia para conferir as atividades."}</p>
      {day && day.entries.length > 0 && <section className="wr-day-activities" aria-label={`Atividades de ${formatDate(day.date)}`}>
        <div className="wr-day-activities-heading"><span>Registros do dia</span><button type="button" aria-label="Recolher atividades do dia" onClick={() => { selectedButton.current?.focus(); setSelected(null); }}><X size={16}/></button></div>
        <ol>
          {day.entries.map((entry, index) => {
            const Icon = entry.type === "Ciclismo" ? Bike : entry.type === "Musculação" ? Dumbbell : entry.type === "Corrida" ? Footprints : Activity;
            return <li key={entry.id} className="wr-day-activity">
              <header><span className="wr-day-activity-icon"><Icon size={18} aria-hidden="true"/></span><div><span>Atividade {String(index + 1).padStart(2, "0")}</span><h5>{entry.type}</h5></div></header>
              <dl className="wr-day-activity-metrics">
                {entry.distanceKm != null && <Metric icon={<Route/>} label="Distância" value={`${formatNumber(entry.distanceKm)} km`}/>}
                {entry.paceSecondsPerKm != null && <Metric icon={<Gauge/>} label="Ritmo" value={`${formatPace(entry.paceSecondsPerKm)} /km`}/>}
                {entry.averageSpeedKmh != null && <Metric icon={<Gauge/>} label="Velocidade média" value={`${formatNumber(entry.averageSpeedKmh)} km/h`}/>}
                <Metric icon={<Timer/>} label="Tempo" value={formatExerciseDuration(exerciseSeconds(entry.durationSeconds, entry.durationMinutes))}/>
                {entry.caloriesBurned != null && <Metric icon={<Flame/>} label={calorieLabel(entry.calorieSource)} value={`${formatNumber(entry.caloriesBurned)} kcal`}/>}
              </dl>
              {entry.note && <p className="wr-day-activity-note">{entry.note}</p>}
            </li>;
          })}
        </ol>
      </section>}
    </div>
  </div>;
}

function Metric({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return <div><dt>{icon}{label}</dt><dd>{value}</dd></div>;
}
function formatDate(value: string) { return new Date(`${value}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }); }
function formatNumber(value: number) { return value.toLocaleString("pt-BR", { maximumFractionDigits: 2 }); }
function formatPace(value: number) { const seconds = Math.round(value); return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`; }
function activityCount(value: number) { return `${value} ${value === 1 ? "atividade" : "atividades"}`; }
