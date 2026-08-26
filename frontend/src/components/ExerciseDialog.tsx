import { FormEvent, useEffect, useState } from "react";
import { Activity, Check, X } from "lucide-react";

export type ExerciseEntry={date:string;type:string;durationMinutes:number;distanceKm:number|null;paceSecondsPerKm:number|null;averageSpeedKmh:number|null;note:string};
type ExerciseWeekDay={date:string;isToday:boolean;hasExercise:boolean;type:string|null;durationMinutes:number|null;distanceKm:number|null;paceSecondsPerKm:number|null;averageSpeedKmh:number|null;note:string};
type ExerciseDistanceTotal={type:string;totalKm:number;totalMinutes:number;paceSecondsPerKm:number|null;averageSpeedKmh:number|null};
export type ExerciseWeek={startDate:string|null;endDate:string|null;completedDays:number;targetDays:number;totalMinutes:number;distanceByModality:ExerciseDistanceTotal[];days:ExerciseWeekDay[]};

type ExerciseDialogProps={
 open:boolean;
 onClose:()=>void;
 onSaved:(entry:ExerciseEntry)=>void;
 onDeletedToday:()=>void;
 onWeekChanged:(week:ExerciseWeek)=>void;
 initialEntry:ExerciseEntry|null;
};

const exerciseTypes=["Musculação","Dança","Corrida","Ciclismo","Futebol","Outros"];
const distanceTypes=["Corrida","Ciclismo","Futebol"];

export default function ExerciseDialog({open,onClose,onSaved,onDeletedToday,onWeekChanged,initialEntry}:ExerciseDialogProps){
 const [type,setType]=useState("Dança");
 const [durationHours,setDurationHours]=useState("0");
 const [durationMinutes,setDurationMinutes]=useState("30");
 const [note,setNote]=useState("");
 const [customActivity,setCustomActivity]=useState("");
 const [distanceKm,setDistanceKm]=useState("");
 const [saving,setSaving]=useState(false);
 const [error,setError]=useState("");
 const [week,setWeek]=useState<ExerciseWeek|null>(null);
 const [weekError,setWeekError]=useState("");
 const [selectedDate,setSelectedDate]=useState("");
 const [deleting,setDeleting]=useState(false);
 const [confirmingDelete,setConfirmingDelete]=useState(false);
 const today=getLocalToday();

 useEffect(()=>{
  if(!open)return;
  setType(initialEntry?.type&&exerciseTypes.includes(initialEntry.type)?initialEntry.type:initialEntry?"Outros":"Dança");
  setDurationParts(initialEntry?.durationMinutes??30,setDurationHours,setDurationMinutes);
  setNote(initialEntry?.note??"");
  setCustomActivity(initialEntry&&!exerciseTypes.includes(initialEntry.type)?initialEntry.type:"");
  setDistanceKm(initialEntry?.distanceKm?.toString()??"");
  setError("");
  setWeekError("");
  setConfirmingDelete(false);
  fetch("/api/health/exercise/week")
   .then(async response=>response.ok?response.json():Promise.reject())
   .then((body:ExerciseWeek)=>{setWeek(body);onWeekChanged(body);const selected=body.days.find(day=>day.isToday)??body.days[0];if(selected)selectDay(selected)})
   .catch(()=>setWeekError("Não foi possível carregar esta semana."));
 },[open,initialEntry]);

 if(!open)return null;

 async function save(event:FormEvent){
  event.preventDefault();setSaving(true);setError("");
  try{
   const totalMinutes=(Number(durationHours)||0)*60+(Number(durationMinutes)||0);
   const response=await fetch("/api/health/exercise",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({type,durationMinutes:totalMinutes,distanceKm:distanceTypes.includes(type)?distanceKm:null,note,exerciseDate:selectedDate,customActivity})});
   const body=await response.json().catch(()=>({})) as ExerciseEntry&{error?:string};
   if(!response.ok)throw new Error(body.error??"Não foi possível registrar o exercício.");
   if(body.date===today)onSaved(body);
   fetch("/api/health/exercise/week").then(response=>response.json()).then((refreshed:ExerciseWeek)=>onWeekChanged(refreshed)).catch(()=>undefined);
   onClose();
  }catch(caught){setError(caught instanceof Error?caught.message:"Não foi possível registrar o exercício.")}
  finally{setSaving(false)}
 }

 function selectDay(day:ExerciseWeekDay){
  if(day.date>today)return;
  setSelectedDate(day.date);
  const knownType=day.type&&exerciseTypes.includes(day.type)?day.type:day.type?"Outros":"Dança";
  setType(knownType);
  setCustomActivity(knownType==="Outros"?(day.type??""):"");
  setDurationParts(day.durationMinutes??30,setDurationHours,setDurationMinutes);
  setDistanceKm(day.distanceKm?.toString()??"");
  setNote(day.note??"");
  setError("");
  setConfirmingDelete(false);
 }

 async function removeSelectedExercise(){
  if(!selectedDate)return;
  setDeleting(true);setError("");
  try{
   const response=await fetch(`/api/health/exercise/${encodeURIComponent(selectedDate)}`,{method:"DELETE"});
   const body=await response.json().catch(()=>({})) as {deleted?:boolean;date?:string;week?:ExerciseWeek;error?:string};
   if(!response.ok||!body.week)throw new Error(body.error??"Não foi possível excluir o exercício.");
   if(selectedDate===today)onDeletedToday();
   setWeek(body.week);
   onWeekChanged(body.week);
   const refreshed=body.week.days.find(day=>day.date===selectedDate);
   if(refreshed)selectDay(refreshed);
  }catch(caught){setError(caught instanceof Error?caught.message:"Não foi possível excluir o exercício.")}
  finally{setDeleting(false)}
 }

 const selectedDay=week?.days.find(day=>day.date===selectedDate);
 const performancePreview=getPerformancePreview(type,durationHours,durationMinutes,distanceKm);

 return <div className="health-dialog-overlay fixed inset-0 z-50 bg-stone-950/45 p-0 backdrop-blur-sm sm:p-5">
  <section role="dialog" aria-modal="true" aria-labelledby="exercise-dialog-title" className="health-dialog-panel w-full max-w-lg rounded-t-[2rem] bg-white p-6 shadow-2xl sm:rounded-[2rem] sm:p-7">
   <header className="flex items-start justify-between gap-4"><div className="flex items-center gap-3"><span className="grid size-11 place-items-center rounded-2xl bg-rose-100 text-rose-700"><Activity size={21}/></span><div><p className="text-xs font-semibold text-rose-600">{selectedDate&&selectedDate!==today?`Registro de ${formatSelectedDate(selectedDate)}`:"Movimento de hoje"}</p><h2 id="exercise-dialog-title" className="text-xl font-bold">O que você fez?</h2></div></div><button type="button" onClick={onClose} aria-label="Fechar registro de exercício" className="grid size-10 place-items-center rounded-xl bg-stone-100 text-stone-600 outline-none focus-visible:ring-4 focus-visible:ring-rose-200"><X size={19}/></button></header>
   {week&&<WeekCalendar week={week} selectedDate={selectedDate} onSelect={selectDay}/>} 
   {weekError&&<p className="mt-4 text-sm text-stone-500">{weekError}</p>}
   <form onSubmit={save} className="mt-6">
    <fieldset><legend className="text-sm font-bold text-stone-700">Tipo de exercício</legend><div className="mt-3 grid grid-cols-2 gap-2">{exerciseTypes.map(option=><button key={option} type="button" aria-pressed={type===option} onClick={()=>{setType(option);if(option!=="Outros")setCustomActivity("");if(!distanceTypes.includes(option))setDistanceKm("")}} className={`min-h-11 rounded-xl px-3 text-sm font-semibold outline-none transition focus-visible:ring-4 focus-visible:ring-rose-200 ${type===option?"bg-rose-600 text-white":"bg-stone-100 text-stone-700 hover:bg-stone-200"}`}>{option}</button>)}</div></fieldset>
    {type==="Outros"&&<label className="mt-4 block text-sm font-bold text-stone-700">Qual atividade?<input required minLength={2} maxLength={50} value={customActivity} onChange={event=>setCustomActivity(event.target.value)} placeholder="Ex.: Natação" className="mt-2 block h-14 w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 text-base outline-none focus:border-rose-500 focus:ring-4 focus:ring-rose-100"/></label>}
    <fieldset className="mt-5"><legend className="text-sm font-bold text-stone-700">Duração</legend><div className="mt-2 grid grid-cols-2 gap-3"><label className="text-xs font-semibold text-stone-500">Horas<input required type="number" min="0" max="8" inputMode="numeric" value={durationHours} onChange={event=>setDurationHours(event.target.value)} className="mt-1 block h-14 w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 text-base font-bold text-stone-900 outline-none focus:border-rose-500 focus:ring-4 focus:ring-rose-100"/></label><label className="text-xs font-semibold text-stone-500">Minutos<input required type="number" min="0" max="59" inputMode="numeric" value={durationMinutes} onChange={event=>setDurationMinutes(event.target.value)} className="mt-1 block h-14 w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 text-base font-bold text-stone-900 outline-none focus:border-rose-500 focus:ring-4 focus:ring-rose-100"/></label></div></fieldset>
    {distanceTypes.includes(type)&&<label className="mt-5 block text-sm font-bold text-stone-700">Distância <span className="font-normal text-stone-400">(opcional)</span><div className="mt-2 flex h-14 items-center rounded-2xl border border-stone-200 bg-stone-50 px-4 focus-within:border-rose-500 focus-within:ring-4 focus-within:ring-rose-100"><input type="number" min="0.1" max="1000" step="0.1" inputMode="decimal" value={distanceKm} onChange={event=>setDistanceKm(event.target.value)} placeholder="Ex.: 5,5" className="min-w-0 flex-1 bg-transparent text-base font-bold text-stone-900 outline-none"/><span className="text-sm font-semibold text-stone-400">km</span></div>{performancePreview&&<span className="mt-2 block rounded-xl bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">{performancePreview}</span>}</label>}
    <label className="mt-5 block text-sm font-bold text-stone-700">Observação <span className="font-normal text-stone-400">(opcional)</span><textarea maxLength={300} rows={2} value={note} onChange={event=>setNote(event.target.value)} placeholder="Como foi?" className="mt-2 block w-full resize-none rounded-2xl border border-stone-200 bg-stone-50 p-4 text-base outline-none focus:border-rose-500 focus:ring-4 focus:ring-rose-100"/></label>
    {error&&<p role="alert" className="mt-4 rounded-2xl bg-rose-50 p-4 text-sm text-rose-700">{error}</p>}
    <button disabled={saving||!selectedDate} className="exercise-dialog-save mt-5 min-h-14 w-full rounded-2xl px-5 font-bold text-white outline-none transition focus-visible:ring-4 focus-visible:ring-rose-200 disabled:opacity-60">{saving?"Salvando...":selectedDate===today?"Registrar exercício":"Registrar neste dia"}</button>
   </form>
   {selectedDay?.hasExercise&&!confirmingDelete&&<button type="button" onClick={()=>setConfirmingDelete(true)} className="mt-3 min-h-11 w-full rounded-xl text-sm font-semibold text-rose-700 outline-none hover:bg-rose-50 focus-visible:ring-4 focus-visible:ring-rose-200">Excluir registro deste dia</button>}
   {selectedDay?.hasExercise&&confirmingDelete&&<div role="alert" className="mt-3 rounded-2xl bg-rose-50 p-4"><p className="text-sm font-semibold text-rose-900">Excluir este exercício?</p><p className="mt-1 text-xs text-rose-700">O dia ficará vazio no calendário semanal.</p><div className="mt-3 grid grid-cols-2 gap-2"><button type="button" disabled={deleting} onClick={()=>setConfirmingDelete(false)} className="min-h-11 rounded-xl bg-white text-sm font-semibold text-stone-700">Cancelar</button><button type="button" disabled={deleting} onClick={removeSelectedExercise} className="min-h-11 rounded-xl bg-rose-700 text-sm font-bold text-white disabled:opacity-60">{deleting?"Excluindo...":"Confirmar exclusão"}</button></div></div>}
  </section>
 </div>
}

const dayLabels=["SEG","TER","QUA","QUI","SEX","SÁB","DOM"];

function WeekCalendar({week,selectedDate,onSelect}:{week:ExerciseWeek;selectedDate:string;onSelect:(day:ExerciseWeekDay)=>void}){
 const selected=week.days.find(day=>day.date===selectedDate);
 const daysText=week.targetDays?`${week.completedDays} de ${week.targetDays} dias`:`${week.completedDays} dia${week.completedDays===1?"":"s"}`;
 const goalText=`${daysText} · ${formatDuration(week.totalMinutes)}`;
 const today=getLocalToday();
 return <section aria-label="Atividades desta semana" className="mt-5 rounded-2xl bg-rose-50/70 p-4"><div className="flex items-center justify-between"><h3 className="text-sm font-bold text-stone-800">Esta semana</h3><span className="text-xs font-semibold text-rose-700">{goalText}</span></div><div className="mt-3 grid grid-cols-7 gap-1">{week.days.map((day,index)=>{const future=day.date>today;return <button key={day.date} type="button" disabled={future} onClick={()=>onSelect(day)} aria-label={`${dayLabels[index]} ${formatCalendarDate(day.date)}${day.hasExercise?", exercício registrado":""}${day.isToday?", hoje":""}${future?", indisponível":""}`} aria-pressed={selectedDate===day.date} className={`flex min-h-12 flex-col items-center justify-center rounded-xl text-[10px] font-bold outline-none transition focus-visible:ring-4 focus-visible:ring-rose-200 disabled:cursor-not-allowed disabled:opacity-40 ${selectedDate===day.date?"ring-2 ring-rose-400":day.hasExercise?"bg-rose-600 text-white":day.isToday?"bg-white text-rose-700 ring-2 ring-rose-300":"bg-white/70 text-stone-500"} ${day.hasExercise?"bg-rose-600 text-white":""}`}><span>{dayLabels[index]}</span><span className="mt-1 grid h-4 place-items-center">{day.hasExercise?<Check size={14} strokeWidth={3}/>:new Date(`${day.date}T12:00:00`).getDate()}</span></button>})}</div><div className="mt-3 min-h-9 rounded-xl bg-white px-3 py-2 text-xs">{selected?.hasExercise?<p><b>{selected.type}</b> · {formatDuration(selected.durationMinutes??0)}{selected.distanceKm&&<span> · {formatDistance(selected.distanceKm)}</span>}{selected.note&&<span className="text-stone-500"> · {selected.note}</span>}</p>:<p className="text-stone-500">{selected?.isToday?"Hoje ainda não há exercício registrado.":"Nenhum exercício neste dia. Você pode registrar abaixo."}</p>}</div>{week.distanceByModality.length>0&&<div className="mt-3 flex flex-wrap gap-2">{week.distanceByModality.map(item=><span key={item.type} className="rounded-full bg-white px-3 py-1 text-xs font-bold text-rose-700">{item.type} · {formatDistance(item.totalKm)}</span>)}</div>}</section>
}

function formatDuration(minutes:number){const hours=Math.floor(minutes/60),remaining=minutes%60;if(!hours)return `${remaining}min`;return remaining?`${hours}h ${remaining}min`:`${hours}h`}
function formatDistance(value:number){return `${value.toLocaleString("pt-BR",{maximumFractionDigits:2})} km`}
function formatPace(totalSeconds:number){const minutes=Math.floor(totalSeconds/60),seconds=String(totalSeconds%60).padStart(2,"0");return `${minutes}:${seconds} min/km`}
function getPerformancePreview(type:string,hours:string,minutes:string,distanceValue:string){const duration=(Number(hours)||0)*60+(Number(minutes)||0),distance=Number(distanceValue.replace(",","."));if(!duration||!distance)return "";if(type==="Corrida")return `Pace estimado · ${formatPace(Math.round(duration*60/distance))}`;if(type==="Ciclismo")return `Velocidade média estimada · ${(distance/(duration/60)).toLocaleString("pt-BR",{maximumFractionDigits:1})} km/h`;return ""}
function formatCalendarDate(value:string){return new Date(`${value}T12:00:00`).toLocaleDateString("pt-BR",{day:"2-digit",month:"2-digit"})}
function formatSelectedDate(value:string){return new Date(`${value}T12:00:00`).toLocaleDateString("pt-BR",{weekday:"short",day:"2-digit",month:"2-digit"})}
function getLocalToday(){const now=new Date();const year=now.getFullYear(),month=String(now.getMonth()+1).padStart(2,"0"),day=String(now.getDate()).padStart(2,"0");return `${year}-${month}-${day}`}
function setDurationParts(total:number,setHours:(value:string)=>void,setMinutes:(value:string)=>void){setHours(String(Math.floor(total/60)));setMinutes(String(total%60))}
