import { useEffect, useId, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { chartGeometry, type WeightPoint } from "./weightChartGeometry";
import type { WeightSummary } from "./WeightDialog";
import "./weight-chart.css";

type ChartData = { period: string; startDate: string; endDate: string; targetWeightKg: number | null; points: WeightPoint[] };
export default function WeightChart({ summary }: { summary: WeightSummary | null }) {
  const [period, setPeriod] = useState("30");
  const [data, setData] = useState<ChartData | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [index, setIndex] = useState(0);
  const headingId = useId();
  useEffect(() => {
    const controller = new AbortController();
    setData(null); setError("");
    fetch(`/api/health/weight/chart?period=${period}`, { signal: controller.signal, cache: "no-store" })
      .then(async response => { const body = await response.json(); if (!response.ok) throw new Error(body.error ?? "Não foi possível carregar o gráfico."); return body as ChartData; })
      .then(body => { if (!controller.signal.aborted) { setData(body); setIndex(Math.max(0, body.points.length - 1)); } })
      .catch(caught => { if (!controller.signal.aborted) setError(caught instanceof Error ? caught.message : "Não foi possível carregar o gráfico."); });
    return () => controller.abort();
  }, [period, summary, attempt]);
  const geometry = data ? chartGeometry(data.points, data.startDate, data.endDate, data.targetWeightKg) : null;
  const selected = geometry?.points[index];
  return <section className="weight-chart" aria-labelledby={headingId}>
    <header><h3 id={headingId}>Sua trajetória</h3><span>Peso · kg</span></header>
    <div className="weight-chart-periods" role="group" aria-label="Período do gráfico de peso">{[["30", "30 dias"], ["90", "90 dias"], ["all", "Tudo"]].map(([value, label]) => <button type="button" key={value} aria-pressed={period === value} onClick={() => setPeriod(value)}>{label}</button>)}</div>
    {error ? <div className="weight-chart-message" role="alert"><p>{error}</p><button type="button" onClick={() => setAttempt(value => value + 1)}>Tentar novamente</button></div>
      : !data || !geometry ? <p className="weight-chart-message" role="status">Carregando pesagens…</p>
      : data.points.length === 0 ? <p className="weight-chart-message">Nenhuma pesagem neste período. Registre seu peso ou escolha outro período para começar a ver sua trajetória.</p>
      : <>
        <div className="weight-chart-selection" aria-live="polite" aria-atomic="true"><strong>{number(selected?.weightKg ?? 0)}<span> kg</span></strong><span>{selected ? dateLabel(selected.recordedOn) : ""}</span></div>
        <svg className="weight-chart-plot" viewBox="0 0 340 192" role="img" aria-label="Evolução das pesagens reais. Use os controles abaixo para consultar cada ponto." onPointerDown={event => {
          const rect = event.currentTarget.getBoundingClientRect();
          const x = (event.clientX - rect.left) / rect.width * 340;
          let nearest = 0;
          geometry.points.forEach((point, position) => { if (Math.abs(point.x - x) < Math.abs(geometry.points[nearest].x - x)) nearest = position; });
          setIndex(nearest);
        }}>
          {[0, 1, 2].map(step => <g key={step}><line x1="46" x2="322" y1={20 + step * 70} y2={20 + step * 70} className="weight-chart-grid"/><text x="38" y={24 + step * 70} textAnchor="end">{number(geometry.max - (geometry.max - geometry.min) * step / 2)}</text></g>)}
          {geometry.targetY !== null && <line x1="46" x2="322" y1={geometry.targetY} y2={geometry.targetY} className="weight-chart-target"/>}
          {data.points.length > 1 && <path d={geometry.path} className="weight-chart-line"/>}
          {geometry.points.map((point, position) => <circle key={point.id} cx={point.x} cy={point.y} r={position === index ? 5 : 3} className={position === index ? "is-selected" : ""}/>) }
          <text x="46" y="184">{shortDate(data.startDate)}</text><text x="322" y="184" textAnchor="end">{shortDate(data.endDate)}</text>
        </svg>
        {data.targetWeightKg !== null && <p className="weight-chart-goal"><i aria-hidden="true"/>Meta atual · {number(data.targetWeightKg)} kg</p>}
        {data.points.length > 1 ? <div className="weight-chart-controls">
          <button type="button" aria-label="Pesagem anterior no gráfico" disabled={index === 0} onClick={() => setIndex(value => value - 1)}><ArrowLeft size={17}/></button>
          <input type="range" aria-label="Consultar pesagem no gráfico" min={0} max={data.points.length - 1} value={index} onChange={event => setIndex(Number(event.target.value))} aria-valuetext={selected ? `${dateLabel(selected.recordedOn)}: ${number(selected.weightKg)} kg` : undefined}/>
          <button type="button" aria-label="Próxima pesagem no gráfico" disabled={index === data.points.length - 1} onClick={() => setIndex(value => value + 1)}><ArrowRight size={17}/></button>
        </div> : <p className="weight-chart-note">Sua primeira pesagem neste período. A linha aparece a partir de duas.</p>}
        <p className="weight-chart-note">{data.points.length} {data.points.length === 1 ? "pesagem registrada" : "pesagens registradas"} · {dateLabel(data.startDate)} — {dateLabel(data.endDate)}</p>
      </>}
  </section>;
}
function number(value: number) { return value.toLocaleString("pt-BR", { maximumFractionDigits: 1, minimumFractionDigits: 1 }); }
function dateLabel(value: string) { return new Date(`${value}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" }); }
function shortDate(value: string) { return new Date(`${value}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }); }
