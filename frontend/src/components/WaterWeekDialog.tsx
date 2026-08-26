import { Check, Droplets, Plus, X } from "lucide-react";
import { useEffect, useState } from "react";

export type WaterWeekDay = {
  date: string;
  isToday: boolean;
  isFuture: boolean;
  totalMl: number;
  metGoal: boolean;
};

export type WaterWeek = {
  averageMl: number;
  totalMl: number;
  goalDays: number;
  elapsedDays: number;
  goalMl: number;
  days: WaterWeekDay[];
};

type WaterWeekDialogProps = {
  open: boolean;
  onClose: () => void;
  week: WaterWeek | null;
  onWeekChanged: (week: WaterWeek) => void;
  onTodayChanged: (totalMl: number) => void;
};

export default function WaterWeekDialog({
  open,
  onClose,
  week,
  onWeekChanged,
  onTodayChanged,
}: WaterWeekDialogProps) {
  const [selectedDate, setSelectedDate] = useState("");
  const [amountMl, setAmountMl] = useState("250");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) {
      setSelectedDate("");
      setAmountMl("250");
      setError("");
    }
  }, [open]);

  if (!open) return null;

  const selectedDay = week?.days.find((day) => day.date === selectedDate);

  async function addWaterToSelectedDay() {
    if (!selectedDate || saving) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/health/water", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountMl: Number(amountMl), waterDate: selectedDate }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error ?? "Não foi possível registrar a água.");
      const weekResponse = await fetch("/api/health/water/week");
      if (!weekResponse.ok) throw new Error("A água foi registrada, mas não foi possível atualizar a semana.");
      const refreshedWeek = (await weekResponse.json()) as WaterWeek;
      onWeekChanged(refreshedWeek);
      if (body.waterDate === localDate()) onTodayChanged(body.totalMl);
      setSelectedDate("");
      setAmountMl("250");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível registrar a água.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="health-dialog-overlay fixed inset-0 z-50 bg-stone-950/45 p-0 backdrop-blur-sm sm:p-5">
      <section role="dialog" aria-modal="true" aria-labelledby="water-week-title" className="health-dialog-panel w-full max-w-lg rounded-t-[2rem] bg-white p-6 shadow-2xl sm:rounded-[2rem] sm:p-7">
        <header className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-2xl bg-sky-100 text-sky-700"><Droplets size={21} /></span>
            <div><p className="text-xs font-semibold text-sky-600">Água nesta semana</p><h2 id="water-week-title" className="text-xl font-bold">Sua média diária</h2></div>
          </div>
          <button onClick={onClose} aria-label="Fechar semana de água" className="grid size-10 place-items-center rounded-xl bg-stone-100 text-stone-600 outline-none focus-visible:ring-4 focus-visible:ring-sky-200"><X size={19} /></button>
        </header>

        {week ? <>
          <section className="mt-6 rounded-3xl bg-gradient-to-br from-sky-600 to-cyan-500 p-5 text-white">
            <p className="text-sm text-sky-100">Média de segunda até hoje</p>
            <p className="mt-1 text-3xl font-bold">{formatLiters(week.averageMl)} <span className="text-base font-medium text-sky-100">por dia</span></p>
            <p className="mt-3 text-sm text-sky-100">{formatLiters(week.totalMl)} acumulados · meta em {week.goalDays} dia{week.goalDays === 1 ? "" : "s"}</p>
          </section>

          <section aria-label="Consumo de água por dia" className="mt-5">
            <p className="mb-3 text-xs font-semibold text-stone-500">Esqueceu um registro? Toque no dia.</p>
            <div className="grid grid-cols-7 gap-1">
              {week.days.map((day, index) => <button
                key={day.date}
                type="button"
                disabled={day.isFuture}
                aria-pressed={selectedDate === day.date}
                aria-label={`${dayLabels[index]}, ${formatCompact(day.totalMl)}`}
                onClick={() => { setSelectedDate(day.date); setError(""); }}
                className={`flex min-h-20 flex-col items-center justify-center rounded-xl px-1 text-center outline-none transition focus-visible:ring-4 focus-visible:ring-sky-200 ${day.isFuture ? "cursor-default bg-stone-50 text-stone-300" : selectedDate === day.date ? "bg-stone-900 text-white ring-2 ring-stone-900 ring-offset-2" : day.metGoal ? "bg-sky-600 text-white" : "bg-sky-50 text-sky-800"}`}
              >
                <span className="text-[10px] font-bold">{dayLabels[index]}</span>
                <span className="mt-2 text-xs font-bold">{day.isFuture ? "—" : day.metGoal ? <Check size={15} strokeWidth={3} /> : formatCompact(day.totalMl)}</span>
              </button>)}
            </div>

            {selectedDay && <div className="mt-4 rounded-2xl bg-sky-50 p-4">
              <p className="text-sm font-bold text-stone-800">Adicionar em {formatSelectedDate(selectedDay.date)}</p>
              <p className="mt-1 text-xs text-stone-500">Já registrado: {formatLiters(selectedDay.totalMl)}</p>
              <div className="mt-3 flex items-end gap-2">
                <label className="min-w-0 flex-1 text-xs font-semibold text-stone-600">Quantidade
                  <div className="mt-1 flex min-h-12 items-center rounded-xl bg-white px-3 ring-1 ring-stone-200 focus-within:ring-2 focus-within:ring-sky-400">
                    <input value={amountMl} onChange={(event) => setAmountMl(event.target.value)} inputMode="numeric" type="number" min="50" max="2000" step="50" className="min-w-0 flex-1 bg-transparent text-base font-bold outline-none" />
                    <span className="text-sm text-stone-400">ml</span>
                  </div>
                </label>
                <button type="button" onClick={addWaterToSelectedDay} disabled={saving || Number(amountMl) < 50 || Number(amountMl) > 2000} className="flex min-h-12 items-center gap-1 rounded-xl bg-sky-600 px-4 text-sm font-bold text-white outline-none transition hover:bg-sky-700 focus-visible:ring-4 focus-visible:ring-sky-200 disabled:opacity-50"><Plus size={17} />{saving ? "Salvando" : "Adicionar"}</button>
              </div>
            </div>}

            {error && <p role="alert" className="mt-3 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
            <p className="mt-4 text-xs leading-5 text-stone-500">A média considera {week.elapsedDays} dia{week.elapsedDays === 1 ? "" : "s"}: de segunda-feira até hoje. Dias futuros não entram no cálculo.</p>
          </section>
        </> : <p className="mt-6 text-stone-500">Carregando sua semana...</p>}
      </section>
    </div>
  );
}

const dayLabels = ["SEG", "TER", "QUA", "QUI", "SEX", "SÁB", "DOM"];

function formatLiters(value: number) {
  return `${(value / 1000).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 2 })} L`;
}

function formatCompact(value: number) {
  if (!value) return "0";
  return value >= 1000 ? `${(value / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}L` : `${value}ml`;
}

function formatSelectedDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "2-digit", month: "2-digit", timeZone: "UTC" }).format(new Date(`${value}T12:00:00Z`));
}

function localDate() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}
