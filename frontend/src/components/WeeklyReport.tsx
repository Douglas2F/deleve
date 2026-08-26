import { useEffect, useState } from "react";
import { Activity, ArrowLeft, Droplets, MoonStar, Scale } from "lucide-react";

type DistanceTotal = { type: string; totalKm: number; totalMinutes: number; paceSecondsPerKm: number | null; averageSpeedKmh: number | null };

type WeeklyReportData = {
  startDate: string;
  endDate: string;
  elapsedDays: number;
  recordedAreas: number;
  summary: string;
  water: { totalMl: number; averageMl: number; goalMl: number; goalDays: number };
  sleep: { averageMinutes: number; recordedDays: number; goalMinutes: number; goalDays: number };
  exercise: { completedDays: number; targetDays: number; totalMinutes: number; totalCalories: number; modalities: string[]; distanceByModality: DistanceTotal[] };
  weight: { currentWeightKg: number; weeklyChangeKg: number; recordedDays: number };
};

export default function WeeklyReport({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [report, setReport] = useState<WeeklyReportData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setError("");
    fetch("/api/health/report/week")
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error ?? "Não foi possível carregar o relatório.");
        return body;
      })
      .then((body: WeeklyReportData) => setReport(body))
      .catch((caught) => setError(caught instanceof Error ? caught.message : "Não foi possível carregar o relatório."));
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#f6f8f6] text-stone-900">
      <main className="mx-auto min-h-screen max-w-3xl px-5 pb-16 pt-6 md:px-10">
        <header className="flex items-center gap-4">
          <button onClick={onClose} aria-label="Voltar ao painel" className="grid size-11 place-items-center rounded-2xl bg-white shadow-sm ring-1 ring-stone-100 outline-none focus-visible:ring-4 focus-visible:ring-emerald-200"><ArrowLeft /></button>
          <div><p className="text-xs font-bold uppercase tracking-[.15em] text-emerald-700">Saúde</p><h1 className="text-2xl font-bold">Sua semana, de leve.</h1></div>
        </header>

        {error && <p role="alert" className="mt-6 rounded-2xl bg-rose-50 p-4 text-rose-700">{error}</p>}
        {!report && !error && <p className="mt-8 text-stone-500">Preparando seu relatório...</p>}
        {report && <>
          <section className="mt-7 rounded-[2rem] bg-gradient-to-br from-emerald-800 to-teal-600 p-6 text-white shadow-xl shadow-emerald-900/10">
            <p className="text-sm text-emerald-100">{formatPeriod(report.startDate, report.endDate)}</p>
            <h2 className="mt-3 text-2xl font-bold">{report.recordedAreas} de 4 áreas acompanhadas</h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-emerald-50">{report.summary}</p>
          </section>

          <section className="mt-5 grid gap-4 sm:grid-cols-2">
            <ReportCard icon={<Droplets />} color="bg-sky-100 text-sky-700" title="Água" main={`${formatNumber(report.water.averageMl)} ml por dia`} detail={`${formatNumber(report.water.totalMl)} ml na semana · meta em ${report.water.goalDays} dia${report.water.goalDays === 1 ? "" : "s"}`} />
            <ReportCard icon={<MoonStar />} color="bg-indigo-100 text-indigo-700" title="Sono" main={report.sleep.recordedDays ? `${formatDuration(report.sleep.averageMinutes)} em média` : "Sem registros"} detail={`${report.sleep.recordedDays} dia${report.sleep.recordedDays === 1 ? "" : "s"} registrado${report.sleep.recordedDays === 1 ? "" : "s"} · meta em ${report.sleep.goalDays}`} />
            <ReportCard icon={<Activity />} color="bg-rose-100 text-rose-700" title="Exercícios" main={`${formatDuration(report.exercise.totalMinutes)} na semana`} detail={`${report.exercise.completedDays}${report.exercise.targetDays ? ` de ${report.exercise.targetDays}` : ""} dias${report.exercise.totalCalories?` · ${formatNumber(report.exercise.totalCalories)} kcal`:""}${report.exercise.modalities.length ? ` · ${report.exercise.modalities.join(", ")}` : ""}${formatDistanceTotals(report.exercise.distanceByModality)}`} />
            <ReportCard icon={<Scale />} color="bg-amber-100 text-amber-700" title="Peso" main={`${formatWeight(report.weight.currentWeightKg)} kg`} detail={report.weight.recordedDays ? `${report.weight.recordedDays} registro${report.weight.recordedDays === 1 ? "" : "s"} · ${formatChange(report.weight.weeklyChangeKg)}` : "Sem pesagem nesta semana"} />
          </section>
          <p className="mt-6 text-center text-xs leading-5 text-stone-400">Este relatório serve para acompanhamento pessoal e não substitui orientação profissional.</p>
        </>}
      </main>
    </div>
  );
}

function ReportCard({ icon, color, title, main, detail }: { icon: React.ReactNode; color: string; title: string; main: string; detail: string }) {
  return <article className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-stone-100"><div className="flex items-center gap-3"><span className={`grid size-10 place-items-center rounded-2xl ${color}`}>{icon}</span><h3 className="font-bold">{title}</h3></div><p className="mt-5 text-xl font-bold">{main}</p><p className="mt-2 text-sm leading-5 text-stone-500">{detail}</p></article>;
}

function formatDuration(minutes: number) { if (!minutes) return "0min"; const hours = Math.floor(minutes / 60), remaining = minutes % 60; if (!hours) return `${remaining}min`; return remaining ? `${hours}h ${remaining}min` : `${hours}h`; }
function formatPeriod(start: string, end: string) { const options: Intl.DateTimeFormatOptions = { day: "2-digit", month: "short" }; return `${new Date(`${start}T12:00:00`).toLocaleDateString("pt-BR", options)} — ${new Date(`${end}T12:00:00`).toLocaleDateString("pt-BR", options)}`; }
function formatNumber(value: number) { return value.toLocaleString("pt-BR"); }
function formatWeight(value: number) { return value.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }); }
function formatChange(value: number) { if (value === 0) return "sem alteração"; return `${value > 0 ? "+" : ""}${formatWeight(value)} kg na semana`; }
function formatDistanceTotals(items: DistanceTotal[]) { if (!items.length) return ""; return ` · ${items.map((item) => `${item.type}: ${item.totalKm.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} km${formatPerformance(item)}`).join(" · ")}`; }
function formatPerformance(item: DistanceTotal) { if (item.paceSecondsPerKm) { const minutes = Math.floor(item.paceSecondsPerKm / 60), seconds = String(item.paceSecondsPerKm % 60).padStart(2, "0"); return ` (pace médio ${minutes}:${seconds} min/km)`; } if (item.averageSpeedKmh) return ` (velocidade média ${item.averageSpeedKmh.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} km/h)`; return ""; }
