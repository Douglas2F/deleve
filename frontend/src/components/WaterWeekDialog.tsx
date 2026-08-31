import { Check, Droplets, Plus, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export type WaterWeekDay = {
  date: string;
  isToday: boolean;
  isFuture: boolean;
  totalMl: number;
  metGoal: boolean;
  entries?: {id:number;amountMl:number}[];
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
  onTodayChanged: (totalMl: number, deleted?:boolean) => void;
};

export default function WaterWeekDialog({
  open,
  onClose,
  week: initialWeek,
  onWeekChanged,
  onTodayChanged,
}: WaterWeekDialogProps) {
  const [selectedDate, setSelectedDate] = useState("");
  const [amountMl, setAmountMl] = useState("250");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [week, setWeek] = useState<WaterWeek|null>(null);
  const [loading,setLoading] = useState(false);
  const [notice,setNotice] = useState("");
  const [confirmingReset,setConfirmingReset] = useState(false);
  const dateRequest = useRef(0);
  const mutation = useRef(false);
  const today = localDate();

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    setConfirmingReset(false);
    setSelectedDate(today);setAmountMl("250");setError("");setNotice("");setWeek(initialWeek);setLoading(true);
    fetch("/api/health/water/week",{signal:controller.signal})
      .then(async response=>{if(!response.ok)throw new Error();return response.json()})
      .then((body:WaterWeek)=>{if(!controller.signal.aborted){setWeek(body);onWeekChanged(body)}})
      .catch(()=>{if(!controller.signal.aborted){setWeek(null);setError("Não foi possível carregar a semana. Selecione a data novamente.")}})
      .finally(()=>{if(!controller.signal.aborted)setLoading(false)});
    return ()=>{controller.abort();dateRequest.current++};
  }, [open]);

  if (!open) return null;

  const selectedDay = week?.days.find((day) => day.date === selectedDate);
  const validAmount = amountMl.trim()!=="" && Number.isInteger(Number(amountMl)) && Number(amountMl)>=50 && Number(amountMl)<=2000;
  const currentWeek = week?.days.some(day=>day.isToday);

  async function readWeek(value?:string):Promise<WaterWeek>{
    const response=await fetch(`/api/health/water/week${value?`?date=${encodeURIComponent(value)}`:""}`);
    if(!response.ok)throw new Error("Não foi possível carregar a semana. Selecione a data novamente.");
    return response.json();
  }

  async function chooseDate(value:string){
    if(mutation.current||loading)return;
    if(!value||value>today){setError("Escolha hoje ou uma data anterior.");return}
    setSelectedDate(value);setError("");setNotice("");
    setConfirmingReset(false);
    if(!error&&week?.days.some(day=>day.date===value))return;
    const requestId=++dateRequest.current;
    setLoading(true);setWeek(null);
    try{const body=await readWeek(value);if(requestId===dateRequest.current)setWeek(body)}
    catch(caught){if(requestId===dateRequest.current)setError(caught instanceof Error?caught.message:"Não foi possível carregar a semana.")}
    finally{if(requestId===dateRequest.current)setLoading(false)}
  }

  async function addWaterToSelectedDay() {
    if (!selectedDay || loading || mutation.current || !validAmount) return;
    mutation.current=true;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/health/water", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountMl: Number(amountMl), waterDate: selectedDate }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error ?? "Não foi possível registrar a água.");
      if (body.waterDate === localDate()) onTodayChanged(body.totalMl);
      setAmountMl("");
      setNotice(`${body.amountMl.toLocaleString("pt-BR")} ml registrados em ${formatSelectedDate(body.waterDate)}.`);
      setWeek(previous=>previous?{...previous,days:previous.days.map(day=>day.date===body.waterDate?{...day,totalMl:body.totalMl,metGoal:previous.goalMl>0&&body.totalMl>=previous.goalMl}:day)}:previous);
      try{
        const [selectedWeek, refreshedWeek] = await Promise.all([readWeek(selectedDate),readWeek()]);
        setWeek(selectedWeek);onWeekChanged(refreshedWeek);
      }catch{setError("Água já registrada. Não foi possível atualizar o resumo; selecione a data novamente.")}
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível registrar a água.");
    } finally {
      setSaving(false);
      mutation.current=false;
    }
  }

  async function resetDay(){
    if(mutation.current||loading||!selectedDay)return;
    mutation.current=true;setSaving(true);setError("");setNotice("");
    try{
      const response=await fetch(`/api/health/water/day/${selectedDate}`,{method:"DELETE",headers:{"Content-Type":"application/json"},body:JSON.stringify({confirmed:true,expectedTotalMl:selectedDay.totalMl})});
      const body=await response.json();
      if(!response.ok)throw new Error(body.error??"Não foi possível excluir o registro.");
      setConfirmingReset(false);
      setWeek(previous=>previous?{...previous,days:previous.days.map(day=>day.date===body.waterDate?{...day,totalMl:body.totalMl,metGoal:previous.goalMl>0&&body.totalMl>=previous.goalMl,entries:[]}:day)}:previous);
      if(body.waterDate===today)onTodayChanged(body.totalMl,true);
      setNotice("Água deste dia zerada.");
      try{const [selected,current]=await Promise.all([readWeek(selectedDate),readWeek()]);setWeek(selected);onWeekChanged(current)}
      catch{setError("Água zerada. Selecione a data novamente para atualizar o resumo.")}
    }catch(caught){setError(caught instanceof Error?caught.message:"Não foi possível confirmar a exclusão. Reabra a data para conferir.")}
    finally{mutation.current=false;setSaving(false)}
  }

  return (
    <div className="health-dialog-overlay fixed inset-0 z-50 bg-stone-950/45 p-0 backdrop-blur-sm sm:p-5">
      <section role="dialog" aria-modal="true" aria-labelledby="water-week-title" className="health-dialog-panel w-full max-w-lg rounded-t-[2rem] bg-white p-6 shadow-2xl sm:rounded-[2rem] sm:p-7">
        <header className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-2xl bg-sky-100 text-sky-700"><Droplets size={21} /></span>
            <div><p className="text-xs font-semibold text-sky-600">{currentWeek?"Água nesta semana":"Histórico de água"}</p><h2 id="water-week-title" className="text-xl font-bold">Sua média diária</h2></div>
          </div>
          <button disabled={saving} onClick={onClose} aria-label="Fechar semana de água" className="grid size-10 place-items-center rounded-xl bg-stone-100 text-stone-600 outline-none focus-visible:ring-4 focus-visible:ring-sky-200"><X size={19} /></button>
        </header>

        <div className="mt-5 flex items-end gap-2"><label className="min-w-0 flex-1 text-xs font-semibold text-stone-600">Data do consumo<input type="date" max={today} value={selectedDate} disabled={saving||loading} onInput={event=>void chooseDate(event.currentTarget.value)} className="mt-2 block min-h-11 w-full min-w-0 rounded-xl border border-stone-200 bg-stone-50 px-3 text-base text-stone-900 outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-100"/></label>{selectedDate!==today&&<button type="button" disabled={saving||loading} onClick={()=>void chooseDate(today)} className="min-h-11 rounded-xl bg-sky-50 px-3 text-sm font-bold text-sky-700">Hoje</button>}</div>
        {loading&&<p role="status" className="mt-4 text-sm text-stone-500">Carregando sua semana…</p>}
        {notice&&<p role="status" className="mt-4 rounded-xl bg-sky-50 p-3 text-sm text-sky-800">{notice}</p>}
        {error&&<p role="alert" className="mt-3 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
        {week && week.days.length===7 && <>
          <section className="mt-6 rounded-3xl bg-gradient-to-br from-sky-600 to-cyan-500 p-5 text-white">
            <p className="text-sm text-sky-100">{currentWeek?"Média de segunda até hoje":`Semana de ${formatCalendarDate(week.days[0].date)} a ${formatCalendarDate(week.days[6].date)}`}</p>
            <p className="mt-1 text-3xl font-bold">{formatLiters(week.averageMl)} <span className="text-base font-medium text-sky-100">por dia</span></p>
            <p className="mt-3 text-sm text-sky-100">{formatLiters(week.totalMl)} acumulados · meta em {week.goalDays} dia{week.goalDays === 1 ? "" : "s"}</p>
          </section>

          <section aria-label="Consumo de água por dia" className="mt-5">
            <p className="mb-3 text-xs font-semibold text-stone-500">Esqueceu um registro? Toque no dia.</p>
            <div className="grid grid-cols-7 gap-1">
              {week.days.map((day, index) => <button
                key={day.date}
                type="button"
                disabled={day.isFuture||saving||loading}
                aria-pressed={selectedDate === day.date}
                aria-label={`${dayLabels[index]} ${formatCalendarDate(day.date)}, ${formatCompact(day.totalMl)}${day.isToday?", hoje":""}`}
                onClick={() => void chooseDate(day.date)}
                className={`flex min-h-14 min-w-0 flex-col items-center justify-center rounded-xl px-1 py-1 text-center outline-none transition focus-visible:ring-2 focus-visible:ring-sky-200 ${day.isFuture ? "cursor-default bg-stone-50 text-stone-300" : selectedDate === day.date ? "bg-sky-100 text-sky-900 ring-1 ring-inset ring-sky-400" : day.metGoal ? "bg-sky-600 text-white" : "bg-sky-50 text-sky-800"}`}
              >
                <span className="text-[10px] font-bold">{dayLabels[index]}</span>
                <span className="mt-2 text-[10px] font-bold sm:text-xs">{day.isFuture ? "—" : day.metGoal ? <Check size={15} strokeWidth={3} /> : <>{day.totalMl>=1000?formatCompact(day.totalMl):day.totalMl}{day.totalMl>0&&day.totalMl<1000&&<span className="block text-[9px] font-normal">ml</span>}</>}</span>
              </button>)}
            </div>

            {selectedDay && <div className="mt-4 rounded-2xl bg-sky-50 p-4">
              <p className="text-sm font-bold text-stone-800">Adicionar em {formatSelectedDate(selectedDay.date)}</p>
              <p className="mt-1 text-xs text-stone-500">Já registrado: {formatLiters(selectedDay.totalMl)}</p>
              <div className="mt-3 flex items-end gap-2">
                <label className="min-w-0 flex-1 text-xs font-semibold text-stone-600">Quantidade
                  <div className="mt-1 flex min-h-12 items-center rounded-xl bg-white px-3 ring-1 ring-stone-200 focus-within:ring-2 focus-within:ring-sky-400">
                    <input disabled={saving||loading} value={amountMl} onChange={(event) => setAmountMl(event.target.value)} inputMode="numeric" type="number" min="50" max="2000" step="1" className="min-w-0 flex-1 bg-transparent text-base font-bold outline-none" />
                    <span className="text-sm text-stone-400">ml</span>
                  </div>
                </label>
                <button type="button" onClick={addWaterToSelectedDay} disabled={saving||loading||!validAmount} className="flex min-h-12 items-center gap-1 rounded-xl bg-sky-600 px-4 text-sm font-bold text-white outline-none transition hover:bg-sky-700 focus-visible:ring-4 focus-visible:ring-sky-200 disabled:opacity-50"><Plus size={17} />{saving ? "Salvando" : "Adicionar"}</button>
              </div>
            </div>}

            {selectedDay&&selectedDay.totalMl>0&&<div className="mt-2">
              {!confirmingReset?<button type="button" disabled={saving||loading} onClick={()=>{setConfirmingReset(true);setError("")}} className="min-h-11 rounded-lg px-1 text-xs text-stone-500 hover:text-sky-700 focus-visible:ring-2 focus-visible:ring-sky-300">Zerar</button>
              :<div role="group" aria-label="Confirmar zerar água" className="rounded-xl bg-stone-50 p-3">
                <p className="text-sm text-stone-700">Zerar a água de {formatSelectedDate(selectedDate)}?</p>
                <p className="mt-1 text-xs text-stone-500">Os outros dias serão mantidos. Não há botão para desfazer.</p>
                <div className="mt-2 flex gap-3"><button type="button" disabled={saving} onClick={()=>setConfirmingReset(false)} className="min-h-11 rounded-lg px-2 text-sm text-stone-600">Cancelar</button><button type="button" disabled={saving} onClick={()=>void resetDay()} className="min-h-11 rounded-lg px-3 text-sm font-semibold text-sky-700 hover:bg-sky-50">{saving?"Zerando…":"Zerar"}</button></div>
              </div>}
            </div>}

            <p className="mt-4 text-xs leading-5 text-stone-500">{currentWeek?`A média considera ${week.elapsedDays} dia${week.elapsedDays===1?"":"s"}: de segunda-feira até hoje.`:"A média considera os 7 dias desta semana."}</p>
          </section>
        </>}
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

function formatCalendarDate(value:string){return new Date(`${value}T12:00:00`).toLocaleDateString("pt-BR",{day:"2-digit",month:"2-digit"})}

function localDate() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}
