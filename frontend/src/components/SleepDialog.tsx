import { FormEvent, useEffect, useState } from "react";
import { Check, MoonStar, X } from "lucide-react";

export type SleepEntry={date:string;bedtime:string;wakeTime:string;durationMinutes:number};
type SleepWeekDay={date:string;isToday:boolean;hasSleep:boolean;bedtime:string|null;wakeTime:string|null;durationMinutes:number|null;metGoal:boolean};
export type SleepWeek={completedDays:number;goalDays:number;averageMinutes:number;goalMinutes:number;days:SleepWeekDay[]};

type SleepDialogProps={
 open:boolean;
 onClose:()=>void;
 onSaved:(entry:SleepEntry)=>void;
 onDeletedToday:()=>void;
 onWeekChanged:(week:SleepWeek)=>void;
 initialEntry:SleepEntry|null;
};

export default function SleepDialog({open,onClose,onSaved,onDeletedToday,onWeekChanged,initialEntry}:SleepDialogProps){
 const [bedtime,setBedtime]=useState("23:00");
 const [wakeTime,setWakeTime]=useState("07:00");
 const [selectedDate,setSelectedDate]=useState("");
 const [week,setWeek]=useState<SleepWeek|null>(null);
 const [saving,setSaving]=useState(false);
 const [deleting,setDeleting]=useState(false);
 const [confirmingDelete,setConfirmingDelete]=useState(false);
 const [error,setError]=useState("");
 const [weekError,setWeekError]=useState("");
 const today=getLocalToday();

 useEffect(()=>{
  if(!open)return;
  setBedtime(initialEntry?.bedtime??"23:00");
  setWakeTime(initialEntry?.wakeTime??"07:00");
  setError("");setWeekError("");setConfirmingDelete(false);
  fetch("/api/health/sleep/week")
   .then(async response=>response.ok?response.json():Promise.reject())
   .then((body:SleepWeek)=>{setWeek(body);onWeekChanged(body);const selected=body.days.find(day=>day.isToday)??body.days[0];if(selected)selectDay(selected)})
   .catch(()=>setWeekError("Não foi possível carregar esta semana."));
 },[open,initialEntry]);

 if(!open)return null;
 const preview=getDurationPreview(bedtime,wakeTime);
 const selectedDay=week?.days.find(day=>day.date===selectedDate);

 async function save(event:FormEvent){
  event.preventDefault();setSaving(true);setError("");
  try{
   const response=await fetch("/api/health/sleep",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({bedtime,wakeTime,sleepDate:selectedDate})});
   const body=await response.json().catch(()=>({})) as SleepEntry&{error?:string};
   if(!response.ok)throw new Error(body.error??"Não foi possível registrar o sono.");
   if(body.date===today)onSaved(body);
   fetch("/api/health/sleep/week").then(response=>response.json()).then((refreshed:SleepWeek)=>onWeekChanged(refreshed)).catch(()=>undefined);
   onClose();
  }catch(caught){setError(caught instanceof Error?caught.message:"Não foi possível registrar o sono.")}
  finally{setSaving(false)}
 }

 function selectDay(day:SleepWeekDay){
  if(day.date>today)return;
  setSelectedDate(day.date);
  setBedtime(day.bedtime??"23:00");
  setWakeTime(day.wakeTime??"07:00");
  setError("");setConfirmingDelete(false);
 }

 async function removeSelectedSleep(){
  if(!selectedDate)return;
  setDeleting(true);setError("");
  try{
   const response=await fetch(`/api/health/sleep/${encodeURIComponent(selectedDate)}`,{method:"DELETE"});
   const body=await response.json().catch(()=>({})) as {week?:SleepWeek;error?:string};
   if(!response.ok||!body.week)throw new Error(body.error??"Não foi possível excluir o sono.");
   if(selectedDate===today)onDeletedToday();
   setWeek(body.week);onWeekChanged(body.week);
   const refreshed=body.week.days.find(day=>day.date===selectedDate);if(refreshed)selectDay(refreshed);
  }catch(caught){setError(caught instanceof Error?caught.message:"Não foi possível excluir o sono.")}
  finally{setDeleting(false)}
 }

 return <div className="sleep-dialog-overlay fixed inset-0 z-50 bg-stone-950/45 p-0 backdrop-blur-sm sm:p-5">
  <section role="dialog" aria-modal="true" aria-labelledby="sleep-dialog-title" className="sleep-dialog-panel w-full max-w-lg rounded-t-[2rem] bg-white p-6 shadow-2xl sm:rounded-[2rem] sm:p-7">
   <header className="flex items-start justify-between gap-4"><div className="flex items-center gap-3"><span className="grid size-11 place-items-center rounded-2xl bg-indigo-100 text-indigo-700"><MoonStar size={21}/></span><div><p className="text-xs font-semibold text-indigo-600">{selectedDate&&selectedDate!==today?`Sono de ${formatSelectedDate(selectedDate)}`:"Sono de hoje"}</p><h2 id="sleep-dialog-title" className="text-xl font-bold">Quando você dormiu?</h2></div></div><button type="button" onClick={onClose} aria-label="Fechar registro de sono" className="grid size-10 place-items-center rounded-xl bg-stone-100 text-stone-600 outline-none focus-visible:ring-4 focus-visible:ring-indigo-200"><X size={19}/></button></header>
   {week&&<SleepWeekCalendar week={week} selectedDate={selectedDate} onSelect={selectDay}/>} 
   {weekError&&<p className="mt-4 text-sm text-stone-500">{weekError}</p>}
   <form onSubmit={save} className="mt-6"><div className="grid grid-cols-2 gap-3"><TimeField label="Hora de dormir" value={bedtime} onChange={setBedtime}/><TimeField label="Hora de acordar" value={wakeTime} onChange={setWakeTime}/></div><div className="mt-4 rounded-2xl bg-indigo-50 p-4"><p className="text-xs font-semibold text-indigo-600">Duração aproximada</p><p className="mt-1 text-2xl font-bold text-indigo-950">{preview}</p></div>{error&&<p role="alert" className="mt-4 rounded-2xl bg-rose-50 p-4 text-sm text-rose-700">{error}</p>}<button disabled={saving||!selectedDate} className="sleep-dialog-save mt-5 min-h-14 w-full rounded-2xl px-5 font-bold text-white outline-none transition focus-visible:ring-4 focus-visible:ring-indigo-200 disabled:opacity-60">{saving?"Salvando...":selectedDate===today?"Salvar sono":"Salvar neste dia"}</button></form>
   {selectedDay?.hasSleep&&!confirmingDelete&&<button type="button" onClick={()=>setConfirmingDelete(true)} className="mt-3 min-h-11 w-full rounded-xl text-sm font-semibold text-rose-700 outline-none hover:bg-rose-50 focus-visible:ring-4 focus-visible:ring-rose-200">Excluir sono deste dia</button>}
   {selectedDay?.hasSleep&&confirmingDelete&&<div role="alert" className="mt-3 rounded-2xl bg-rose-50 p-4"><p className="text-sm font-semibold text-rose-900">Excluir este registro de sono?</p><p className="mt-1 text-xs text-rose-700">O dia ficará vazio no calendário semanal.</p><div className="mt-3 grid grid-cols-2 gap-2"><button type="button" disabled={deleting} onClick={()=>setConfirmingDelete(false)} className="min-h-11 rounded-xl bg-white text-sm font-semibold text-stone-700">Cancelar</button><button type="button" disabled={deleting} onClick={removeSelectedSleep} className="min-h-11 rounded-xl bg-rose-700 text-sm font-bold text-white disabled:opacity-60">{deleting?"Excluindo...":"Confirmar exclusão"}</button></div></div>}
  </section>
 </div>
}

const dayLabels=["SEG","TER","QUA","QUI","SEX","SÁB","DOM"];

function SleepWeekCalendar({week,selectedDate,onSelect}:{week:SleepWeek;selectedDate:string;onSelect:(day:SleepWeekDay)=>void}){
 const today=getLocalToday();
 const selected=week.days.find(day=>day.date===selectedDate);
 return <section aria-label="Sono desta semana" className="mt-5 rounded-2xl bg-indigo-50/70 p-4"><div className="flex items-center justify-between gap-3"><h3 className="text-sm font-bold">Esta semana</h3><span className="text-right text-xs font-semibold text-indigo-700">{week.completedDays} dia{week.completedDays===1?"":"s"} · média {formatDuration(week.averageMinutes)}</span></div><div className="mt-3 grid grid-cols-7 gap-1">{week.days.map((day,index)=>{const future=day.date>today;return <button key={day.date} type="button" disabled={future} onClick={()=>onSelect(day)} aria-label={`${dayLabels[index]} ${formatCalendarDate(day.date)}${day.hasSleep?", sono registrado":""}${day.isToday?", hoje":""}${future?", indisponível":""}`} aria-pressed={selectedDate===day.date} className={`flex min-h-12 flex-col items-center justify-center rounded-xl text-[10px] font-bold outline-none transition focus-visible:ring-4 focus-visible:ring-indigo-200 disabled:cursor-not-allowed disabled:opacity-40 ${day.hasSleep?"bg-indigo-600 text-white":"bg-white/70 text-stone-500"} ${selectedDate===day.date?"ring-2 ring-indigo-400":""}`}><span>{dayLabels[index]}</span><span className="mt-1 grid h-4 place-items-center">{day.hasSleep?<Check size={14} strokeWidth={3}/>:new Date(`${day.date}T12:00:00`).getDate()}</span></button>})}</div><div className="mt-3 min-h-9 rounded-xl bg-white px-3 py-2 text-xs">{selected?.hasSleep?<p><b>{formatDuration(selected.durationMinutes??0)}</b> · {selected.bedtime} às {selected.wakeTime}{selected.metGoal&&<span className="text-indigo-600"> · meta alcançada</span>}</p>:<p className="text-stone-500">{selected?.isToday?"Hoje ainda não há sono registrado.":"Nenhum sono neste dia. Você pode registrar abaixo."}</p>}</div></section>
}

function TimeField({label,value,onChange}:{label:string;value:string;onChange:(value:string)=>void}){return <label className="text-sm font-bold text-stone-700">{label}<input required type="time" value={value} onChange={event=>onChange(event.target.value)} className="mt-2 block h-14 w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 text-base outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"/></label>}
function getDurationPreview(bedtime:string,wakeTime:string){const [bedHour,bedMinute]=bedtime.split(":").map(Number),[wakeHour,wakeMinute]=wakeTime.split(":").map(Number);if([bedHour,bedMinute,wakeHour,wakeMinute].some(Number.isNaN))return "Revise os horários";let minutes=(wakeHour*60+wakeMinute)-(bedHour*60+bedMinute);if(minutes<=0)minutes+=24*60;if(minutes<60||minutes>960)return "Revise os horários";return formatDuration(minutes)}
function formatDuration(minutes:number){if(!minutes)return "0min";const hours=Math.floor(minutes/60),remaining=minutes%60;if(!hours)return `${remaining}min`;return remaining?`${hours}h ${remaining}min`:`${hours}h`}
function formatCalendarDate(value:string){return new Date(`${value}T12:00:00`).toLocaleDateString("pt-BR",{day:"2-digit",month:"2-digit"})}
function formatSelectedDate(value:string){return new Date(`${value}T12:00:00`).toLocaleDateString("pt-BR",{weekday:"short",day:"2-digit",month:"2-digit"})}
function getLocalToday(){const now=new Date();const year=now.getFullYear(),month=String(now.getMonth()+1).padStart(2,"0"),day=String(now.getDate()).padStart(2,"0");return `${year}-${month}-${day}`}
