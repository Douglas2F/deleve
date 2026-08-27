import { useState, type ReactNode } from "react";
import { Activity, Bike, Dumbbell, Ellipsis, Flame, Footprints, Gauge, Pencil, Route, Timer, Trash2, type LucideIcon } from "lucide-react";
import type { ExerciseEntry } from "./ExerciseDialog";
import { calorieLabel } from "./calorieLabels";
import { exerciseSeconds, formatExerciseDuration } from "./exerciseDuration";
import { effortSummary } from "./exerciseEffort";

type Props = {
  entry: ExerciseEntry;
  index: number;
  disabled: boolean;
  confirming: boolean;
  onEdit: () => void;
  onDelete: () => void;
  children?: ReactNode;
};

export default function ExerciseActivityCard({ entry, index, disabled, confirming, onEdit, onDelete, children }: Props) {
  const [pinned, setPinned] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [keyboardFocus, setKeyboardFocus] = useState(false);
  const actionsVisible = pinned || hovered || keyboardFocus || confirming;
  const Icon = entry.type === "Ciclismo" ? Bike : entry.type === "Musculação" ? Dumbbell : entry.type === "Corrida" ? Footprints : Activity;
  const label = `atividade ${index + 1}: ${entry.type}`;
  const actionsId = `exercise-actions-${entry.id}`;

  return <article className="exercise-entry" data-actions-visible={actionsVisible}
    onPointerEnter={event => { if (event.pointerType === "mouse") setHovered(true); }}
    onPointerLeave={() => setHovered(false)}
    onFocusCapture={event => { if (event.target.matches(":focus-visible")) setKeyboardFocus(true); }}
    onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) setKeyboardFocus(false); }}>
    <button type="button" className="exercise-entry-toggle" disabled={disabled}
      aria-label={`Opções da ${label}`} aria-expanded={actionsVisible} aria-controls={actionsId}
      onPointerDown={() => setKeyboardFocus(false)} onClick={() => setPinned(value => !value)} />
    <header className="exercise-entry-heading">
      <span className="exercise-entry-symbol"><Icon size={19} aria-hidden="true" /></span>
      <div className="min-w-0"><p className="exercise-entry-number">Atividade {String(index + 1).padStart(2, "0")}</p><h4>{entry.type}</h4></div>
      <Ellipsis className="exercise-entry-hint" size={21} aria-hidden="true" />
    </header>
    <div id={actionsId} className="exercise-entry-actions" aria-hidden={!actionsVisible}>
      <button type="button" disabled={disabled} tabIndex={actionsVisible ? 0 : -1} aria-label={`Editar ${label}`} title="Editar atividade" onClick={onEdit}><Pencil size={17} aria-hidden="true" /></button>
      <button type="button" disabled={disabled} tabIndex={actionsVisible ? 0 : -1} aria-label={`Excluir ${label}`} title="Excluir atividade" onClick={onDelete}><Trash2 size={17} aria-hidden="true" /></button>
    </div>
    <dl className="exercise-entry-metrics">
      {entry.distanceKm != null && <Metric icon={Route} label="Distância" value={`${entry.distanceKm.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} km`} />}
      {entry.paceSecondsPerKm != null && <Metric icon={Gauge} label="Ritmo" value={`${Math.floor(entry.paceSecondsPerKm / 60)}:${String(entry.paceSecondsPerKm % 60).padStart(2, "0")} /km`} />}
      {entry.averageSpeedKmh != null && <Metric icon={Gauge} label="Velocidade média" value={`${entry.averageSpeedKmh.toLocaleString("pt-BR")} km/h`} />}
      <Metric icon={Timer} label="Tempo" value={formatExerciseDuration(exerciseSeconds(entry.durationSeconds, entry.durationMinutes))} />
      {entry.caloriesBurned != null && <Metric icon={Flame} label={calorieLabel(entry.calorieSource)} value={`${entry.caloriesBurned.toLocaleString("pt-BR")} kcal`} />}
    </dl>
    {entry.effort && <p className="exercise-entry-note">{effortSummary(entry.type, entry.effort)}</p>}
    {entry.note && <p className="exercise-entry-note">{entry.note}</p>}
    {children && <div className="exercise-entry-confirmation">{children}</div>}
  </article>;
}

function Metric({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return <div className="exercise-entry-metric"><dt><Icon size={12} aria-hidden="true" /><span>{label}</span></dt><dd>{value}</dd></div>;
}
