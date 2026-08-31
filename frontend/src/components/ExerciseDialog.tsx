import { durationParts, exerciseSeconds, formatExerciseDuration, getDurationSeconds, getPerformancePreview } from "./exerciseDuration";
import { FormEvent, useEffect, useRef, useState } from "react";
import { calorieSuffix, type CalorieSource } from "./calorieLabels";
import { Activity, Check, Plus, X } from "lucide-react";
import ExerciseActivityCard from "./ExerciseActivityCard";
import type { ExerciseSaveContext } from "./healthMilestones";

import { displayedEffort, effortTitle, getEffortHint, getEffortOptions, type Effort } from "./exerciseEffort";
type CalorieEstimate={calories:number;weightKg:number;met:number;description:string};
export type ExerciseEntry={effort?:Effort|null;id:number;date:string;type:string;durationSeconds?:number;durationMinutes:number;distanceKm:number|null;caloriesBurned:number|null;paceSecondsPerKm:number|null;averageSpeedKmh:number|null;note:string;recordedAt:string;calorieSource:"estimated"|"manual"|"none";calorieEstimate:CalorieEstimate|null};
export type ExerciseModality={type:string;activityCount:number;totalSeconds?:number;totalMinutes:number;totalCalories:number;totalKm:number|null;paceSecondsPerKm:number|null;averageSpeedKmh:number|null};
export type ExerciseWeekDay={date:string;isToday:boolean;hasExercise:boolean;entries:ExerciseEntry[];activityCount:number;totalSeconds?:number;totalMinutes:number;totalCalories:number;calorieSource:CalorieSource;byModality:ExerciseModality[]};
export type ExerciseWeek={startDate:string|null;endDate:string|null;completedDays:number;targetDays:number;activityCount:number;totalSeconds?:number;totalMinutes:number;totalCalories:number;calorieSource:CalorieSource;byModality:ExerciseModality[];distanceByModality:ExerciseModality[];days:ExerciseWeekDay[]};
type ExerciseDialogProps={open:boolean;onClose:()=>void;onChanged:(week:ExerciseWeek,saved?:ExerciseSaveContext)=>void};


const exerciseTypes=["Musculação","Dança","Corrida","Ciclismo","Futebol","Outros"];
const distanceTypes=["Corrida","Ciclismo","Futebol"];

export default function ExerciseDialog({open,onClose,onChanged}:ExerciseDialogProps){
 const [type,setType]=useState("Dança");
 const [effort,setEffort]=useState<Effort|null>(null);
 const [durationHours,setDurationHours]=useState("0");
 const [durationMinutes,setDurationMinutes]=useState("30");
 const [durationSeconds,setDurationSeconds]=useState("00");
 const [note,setNote]=useState("");
 const [customActivity,setCustomActivity]=useState("");
 const [distanceKm,setDistanceKm]=useState("");
 const [caloriesBurned,setCaloriesBurned]=useState("");
 const [calorieMode,setCalorieMode]=useState<"estimated"|"manual"|"none">("estimated");
 const [estimating,setEstimating]=useState(false);
 const [estimateMessage,setEstimateMessage]=useState("");
 const [saving,setSaving]=useState(false);
 const [error,setError]=useState("");
 const [week,setWeek]=useState<ExerciseWeek|null>(null);
 const [weekError,setWeekError]=useState("");
 const [selectedDate,setSelectedDate]=useState("");
 const [deleting,setDeleting]=useState(false);
 const [deleteTarget,setDeleteTarget]=useState<ExerciseEntry|null>(null);
 const [editingId,setEditingId]=useState<number|null>(null);
 const [formOpen,setFormOpen]=useState(false);
 const [loading,setLoading]=useState(false);
 const [notice,setNotice]=useState("");
 const formHeading=useRef<HTMLHeadingElement>(null);
 const dateRequest=useRef(0);
 const today=getLocalToday();

 useEffect(()=>{
  if(!open)return;
  const controller=new AbortController();
  setError("");setWeekError("");setNotice("");setWeek(null);setSelectedDate("");setFormOpen(false);setDeleteTarget(null);setLoading(true);
  fetch("/api/health/exercise/week",{signal:controller.signal})
   .then(async response=>{if(!response.ok)throw new Error();return response.json()})
   .then((body:ExerciseWeek)=>{if(controller.signal.aborted)return;setWeek(body);const selected=body.days.find(day=>day.isToday);if(selected)selectDay(selected)})
   .catch(()=>{if(!controller.signal.aborted)setWeekError("Não foi possível carregar esta semana. Feche e tente novamente.");})
   .finally(()=>{if(!controller.signal.aborted)setLoading(false)});
  return ()=>{controller.abort();dateRequest.current++};
 },[open]);

 useEffect(()=>{
  if(!open||!formOpen||calorieMode!=="estimated"){setEstimating(false);return}
  const controller=new AbortController();
  setCaloriesBurned("");setEstimateMessage("");
  const totalSeconds=getDurationSeconds(durationHours,durationMinutes,durationSeconds);
  if(!selectedDate||totalSeconds===null){setEstimating(false);return}
  setEstimating(true);
  const timer=window.setTimeout(()=>{
   fetch("/api/health/exercise/calorie-estimate",{
    method:"POST",headers:{"Content-Type":"application/json"},signal:controller.signal,
    body:JSON.stringify({type,durationSeconds:totalSeconds,distanceKm:distanceTypes.includes(type)?distanceKm:null,exerciseDate:selectedDate,entryId:editingId,effort})
   }).then(async response=>{if(!response.ok)throw new Error();return response.json()})
    .then((body:{estimate:CalorieEstimate|null})=>{
     if(controller.signal.aborted)return;
     setCaloriesBurned(body.estimate?String(body.estimate.calories):"");
     if(!body.estimate)setEstimateMessage("Sem estimativa para esses dados. Informe um valor ou deixe vazio.");
    }).catch(()=>{if(!controller.signal.aborted)setEstimateMessage("Não foi possível estimar. Informe um valor ou deixe vazio.");})
    .finally(()=>{if(!controller.signal.aborted)setEstimating(false)});
  },300);
  return ()=>{window.clearTimeout(timer);controller.abort()};
 },[open,formOpen,calorieMode,type,durationHours,durationMinutes,durationSeconds,distanceKm,selectedDate,editingId,effort]);

 if(!open)return null;

 function fillForm(entry?:ExerciseEntry,focus=false){
  setEditingId(entry?.id??null);
  const knownType=entry?exerciseTypes.includes(entry.type)?entry.type:"Outros":"Musculação";
  setEffort(entry?.effort??null);
  setType(knownType);setCustomActivity(knownType==="Outros"?(entry?.type??""):"");
  const parts=durationParts(entry?exerciseSeconds(entry.durationSeconds,entry.durationMinutes):1800);
  setDurationHours(parts.hours);setDurationMinutes(parts.minutes);setDurationSeconds(parts.seconds);
  setDistanceKm(entry?.distanceKm?.toString()??"");setCaloriesBurned(entry?.caloriesBurned?.toString()??"");
  setCalorieMode(entry?(entry.calorieSource??(entry.caloriesBurned!=null?"manual":"none")):"estimated");
  setEstimateMessage("");
  setNote(entry?.note??"");setError("");setDeleteTarget(null);setFormOpen(true);
  if(focus)requestAnimationFrame(()=>formHeading.current?.focus());
 }

 function selectDay(day:ExerciseWeekDay){
  if(day.date>today||saving||deleting)return;
  setSelectedDate(day.date);fillForm();setFormOpen(!day.hasExercise);setNotice("");
 }

 async function readWeek(value?:string):Promise<ExerciseWeek>{
  const response=await fetch(`/api/health/exercise/week${value?`?date=${encodeURIComponent(value)}`:""}`);
  if(!response.ok)throw new Error("Não foi possível carregar as atividades. Tente selecionar a data novamente.");
  return response.json();
 }

 async function chooseDate(value:string){
  if(saving||deleting||loading)return;
  if(!value||value>today){setError("Escolha hoje ou uma data anterior.");return}
  const existing=week?.days.find(day=>day.date===value);
  if(existing){selectDay(existing);return}
  const requestId=++dateRequest.current;
  setSelectedDate(value);setLoading(true);setWeek(null);setFormOpen(false);setDeleteTarget(null);setError("");setWeekError("");setNotice("");
  try{
   const body=await readWeek(value);
   if(requestId!==dateRequest.current)return;
   setWeek(body);
   const day=body.days.find(day=>day.date===value);
   if(day)selectDay(day);
  }catch(caught){if(requestId===dateRequest.current)setWeekError(caught instanceof Error?caught.message:"Não foi possível carregar as atividades.")}
  finally{if(requestId===dateRequest.current)setLoading(false)}
 }

 async function refreshWeek(saved?:ExerciseSaveContext){
  const [selectedWeek,currentWeek]=await Promise.all([readWeek(selectedDate),readWeek()]);
  setWeek(selectedWeek);onChanged(currentWeek,saved);
  return selectedWeek;
 }

 async function save(event:FormEvent){
  event.preventDefault();if(saving||deleting)return;setSaving(true);setError("");setNotice("");
  try{
   const totalSeconds=getDurationSeconds(durationHours,durationMinutes,durationSeconds);
   if(totalSeconds===null)throw new Error("Informe uma duração entre 1 segundo e 8 horas.");
   const response=await fetch(editingId===null?"/api/health/exercise":`/api/health/exercise/${editingId}`,{
    method:editingId===null?"POST":"PUT",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({type,durationSeconds:totalSeconds,distanceKm:distanceTypes.includes(type)?distanceKm:null,caloriesBurned,calorieSource:calorieMode,note,exerciseDate:selectedDate,customActivity,effort})
   });
   const body=await response.json().catch(()=>({})) as ExerciseEntry&{error?:string};
   if(!response.ok)throw new Error(body.error??"Não foi possível registrar a atividade.");
   // Switch to editing the saved ID before refreshing, so a retry cannot duplicate it.
   setEditingId(body.id);setFormOpen(false);
   setNotice(editingId===null?"Atividade adicionada. As anteriores foram mantidas.":"Atividade atualizada.");
   const previousDay=week?.days.find(day=>day.date===body.date);
   await refreshWeek({date:body.date,previousSeconds:exerciseSeconds(previousDay?.totalSeconds,previousDay?.totalMinutes??0)});
  }catch(caught){setError(caught instanceof Error?caught.message:"Não foi possível registrar a atividade.")}
  finally{setSaving(false)}
 }

 async function removeSelectedExercise(){
  if(!deleteTarget||saving||deleting)return;
  setDeleting(true);setError("");setNotice("");
  try{
   const response=await fetch(`/api/health/exercise/${deleteTarget.id}`,{method:"DELETE"});
   const body=await response.json().catch(()=>({})) as {week?:ExerciseWeek;error?:string};
   if(!response.ok||!body.week)throw new Error(body.error??"Não foi possível excluir a atividade.");
   setDeleteTarget(null);
   const refreshed=await refreshWeek();
   const remaining=refreshed.days.find(day=>day.date===selectedDate);
   if(!remaining?.hasExercise)fillForm();
   else if(editingId===deleteTarget.id){setFormOpen(false);setEditingId(null)}
   setNotice("Atividade excluída. Os outros registros foram mantidos.");
  }catch(caught){setError(caught instanceof Error?caught.message:"Não foi possível excluir a atividade.")}
  finally{setDeleting(false)}
 }

 const effortOptions=getEffortOptions(type,distanceKm);
 const selectedEffort=displayedEffort(type,effort);
 const selectedDay=week?.days.find(day=>day.date===selectedDate);
 const performancePreview=getPerformancePreview(type,getDurationSeconds(durationHours,durationMinutes,durationSeconds),distanceKm);

 return <div className="health-dialog-overlay fixed inset-0 z-50 bg-stone-950/45 p-0 backdrop-blur-sm sm:p-5">
  <section role="dialog" aria-modal="true" aria-labelledby="exercise-dialog-title" className="health-dialog-panel w-full max-w-lg rounded-t-[2rem] bg-white p-6 shadow-2xl sm:rounded-[2rem] sm:p-7">
   <header className="flex items-start justify-between gap-4"><div className="flex items-center gap-3"><span className="grid size-11 place-items-center rounded-2xl bg-rose-100 text-rose-700"><Activity size={21}/></span><div><p className="text-xs font-semibold text-rose-600">{selectedDate&&selectedDate!==today?`Registro de ${formatSelectedDate(selectedDate)}`:"Movimento de hoje"}</p><h2 id="exercise-dialog-title" className="text-xl font-bold">O que você fez?</h2></div></div><button type="button" disabled={saving||deleting} onClick={onClose} aria-label="Fechar registro de exercício" className="grid size-10 place-items-center rounded-xl bg-stone-100 text-stone-600 outline-none focus-visible:ring-4 focus-visible:ring-rose-200"><X size={19}/></button></header>
   <div className="mt-5 flex items-end gap-2"><label className="min-w-0 flex-1 text-xs font-semibold text-stone-600">Data da atividade<input type="date" max={today} value={selectedDate} disabled={saving||deleting||loading} onInput={event=>void chooseDate(event.currentTarget.value)} className="mt-2 block min-h-11 w-full min-w-0 rounded-xl border border-stone-200 bg-stone-50 px-3 text-base text-stone-900 outline-none focus:border-rose-500 focus:ring-4 focus:ring-rose-100"/></label>{selectedDate!==today&&<button type="button" disabled={saving||deleting||loading} onClick={()=>void chooseDate(today)} className="min-h-11 rounded-xl bg-rose-50 px-3 text-sm font-bold text-rose-700">Hoje</button>}</div>
   {loading&&<p role="status" className="mt-5 text-sm text-stone-500">Carregando atividades…</p>}
   {week&&<WeekCalendar week={week} selectedDate={selectedDate} onSelect={selectDay} disabled={saving||deleting}/>}
   {notice&&<p role="status" className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
   {selectedDay&&<section aria-label="Atividades do dia selecionado" className="mt-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="text-sm font-bold">Atividades do dia <span className="text-stone-400">({selectedDay.activityCount})</span></h3>{selectedDay.hasExercise&&!formOpen&&<button type="button" disabled={saving||deleting} onClick={()=>fillForm(undefined,true)} className="flex min-h-11 items-center gap-1 rounded-xl px-3 text-xs font-bold text-rose-700 outline-none hover:bg-rose-50 focus-visible:ring-4 focus-visible:ring-rose-200"><Plus size={15}/>Nova atividade</button>}</div>
    <div className="mt-2 space-y-3">{selectedDay.entries.map((entry,index)=><ExerciseActivityCard key={entry.id} entry={entry} index={index} disabled={saving||deleting} confirming={deleteTarget?.id===entry.id} onEdit={()=>fillForm(entry,true)} onDelete={()=>{setDeleteTarget(entry);setError("")}}>
     {deleteTarget?.id===entry.id&&<div role="alert" className="mt-3 rounded-xl bg-white p-3"><p className="text-sm font-semibold">Excluir esta atividade?</p><p className="mt-1 text-xs text-stone-500">As outras atividades deste dia serão mantidas.</p><div className="mt-3 flex flex-wrap gap-2"><button type="button" disabled={deleting} onClick={()=>setDeleteTarget(null)} className="min-h-11 rounded-xl bg-stone-100 px-3 text-sm">Cancelar exclusão</button><button type="button" disabled={deleting} onClick={removeSelectedExercise} className="min-h-11 rounded-xl bg-rose-700 px-3 text-sm font-bold text-white">{deleting?"Excluindo…":"Confirmar exclusão"}</button></div></div>}
    </ExerciseActivityCard>)}</div>
    {!selectedDay.hasExercise&&<p className="mt-2 text-sm text-stone-500">Nenhuma atividade neste dia. Adicione a primeira abaixo.</p>}
   </section>}
   {weekError&&<p className="mt-4 text-sm text-stone-500">{weekError}</p>}
   {formOpen&&<form onSubmit={save} className="mt-6 border-t border-stone-100 pt-5">
    <h3 ref={formHeading} tabIndex={-1} className="mb-4 text-base font-bold outline-none">{editingId!==null?"Editar atividade":selectedDay?.hasExercise?"Nova atividade":"Primeira atividade"}</h3>
    <fieldset disabled={saving||deleting}>
    <fieldset><legend className="text-sm font-bold text-stone-700">Tipo de exercício</legend><div className="mt-3 grid grid-cols-2 gap-2">{exerciseTypes.map(option=><button key={option} type="button" aria-pressed={type===option} onClick={()=>{setType(option);setEffort(null);if(option!=="Outros")setCustomActivity("");if(!distanceTypes.includes(option))setDistanceKm("")}} className={`min-h-11 rounded-xl px-3 text-sm font-semibold outline-none transition focus-visible:ring-4 focus-visible:ring-rose-200 ${type===option?"bg-rose-600 text-white":"bg-stone-100 text-stone-700 hover:bg-stone-200"}`}>{option}</button>)}</div></fieldset>
    {type==="Outros"&&<label className="mt-4 block text-sm font-bold text-stone-700">Qual atividade?<input required minLength={2} maxLength={50} value={customActivity} onChange={event=>setCustomActivity(event.target.value)} placeholder="Ex.: Natação" className="mt-2 block h-14 w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 text-base outline-none focus:border-rose-500 focus:ring-4 focus:ring-rose-100"/></label>}
    <fieldset className="mt-5"><legend className="text-sm font-bold text-stone-700">Duração</legend><div className="mt-2 grid grid-cols-3 gap-2"><label className="min-w-0 text-xs font-semibold text-stone-500">Horas<input required type="number" min="0" max="8" inputMode="numeric" value={durationHours} onChange={event=>setDurationHours(event.target.value)} className="mt-1 block h-14 w-full rounded-2xl border border-stone-200 bg-stone-50 px-3 text-base font-bold text-stone-900 outline-none focus:border-rose-500 focus:ring-4 focus:ring-rose-100"/></label><label className="min-w-0 text-xs font-semibold text-stone-500">Minutos<input required type="number" min="0" max="59" inputMode="numeric" value={durationMinutes} onChange={event=>setDurationMinutes(event.target.value)} className="mt-1 block h-14 w-full rounded-2xl border border-stone-200 bg-stone-50 px-3 text-base font-bold text-stone-900 outline-none focus:border-rose-500 focus:ring-4 focus:ring-rose-100"/></label><label className="min-w-0 text-xs font-semibold text-stone-500">Segundos<input type="number" min="0" max="59" step="1" inputMode="numeric" value={durationSeconds} onChange={event=>setDurationSeconds(event.target.value)} placeholder="00" className="mt-1 block h-14 w-full rounded-2xl border border-stone-200 bg-stone-50 px-3 text-base font-bold text-stone-900 outline-none focus:border-rose-500 focus:ring-4 focus:ring-rose-100"/></label></div></fieldset>
    {distanceTypes.includes(type)&&<label className="mt-5 block text-sm font-bold text-stone-700">Distância <span className="font-normal text-stone-400">(opcional)</span><div className="mt-2 flex h-14 items-center rounded-2xl border border-stone-200 bg-stone-50 px-4 focus-within:border-rose-500 focus-within:ring-4 focus-within:ring-rose-100"><input type="number" min="0.1" max="1000" step="0.01" inputMode="decimal" value={distanceKm} onChange={event=>setDistanceKm(event.target.value)} placeholder="Ex.: 5,5" className="min-w-0 flex-1 bg-transparent text-base font-bold text-stone-900 outline-none"/><span className="text-sm font-semibold text-stone-400">km</span></div>{performancePreview&&<span className="mt-2 block rounded-xl bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">{performancePreview}</span>}</label>}
    {effortOptions.length>0&&<fieldset className="mt-5" aria-describedby="exercise-effort-help">
     <legend className="text-sm font-bold text-stone-700">{effortTitle(type)} <span className="font-normal text-stone-400">(opcional)</span></legend>
     <div className={`mt-2 grid gap-2 ${effortOptions.length===2?"grid-cols-2":"grid-cols-3"}`}>{effortOptions.map(option=><button key={option.value} type="button" aria-pressed={selectedEffort===option.value} onClick={()=>setEffort(selectedEffort===option.value?null:option.value)} className={`flex min-h-11 items-center justify-center gap-2 rounded-xl border px-2 text-xs font-semibold outline-none transition focus-visible:ring-4 focus-visible:ring-rose-200 ${selectedEffort===option.value?"border-rose-600 bg-rose-600 text-white":"border-stone-200 bg-white text-stone-600 hover:bg-rose-50"}`}><span aria-hidden="true" className="flex h-3 items-end gap-0.5">{[0,1,2].map(level=><span key={level} className={`w-0.5 rounded-sm bg-current ${level<option.bars?"opacity-100":"opacity-25"}`} style={{height:4+level*4}}/>)}</span>{option.label}</button>)}</div>
     <p id="exercise-effort-help" className="mt-2 text-xs text-stone-500">{getEffortHint(type,effort)}</p>
    </fieldset>}
    <div className="mt-5">
     <label htmlFor="exercise-calories" className="block text-sm font-bold text-stone-700">{calorieMode==="estimated"?"Calorias estimadas":calorieMode==="manual"?"Calorias informadas":"Calorias"} <span className="font-normal text-stone-400">(opcional)</span></label>
     <div className="mt-2 flex h-14 items-center rounded-2xl border border-stone-200 bg-stone-50 px-4 focus-within:border-orange-500 focus-within:ring-4 focus-within:ring-orange-100">
      <input id="exercise-calories" type="number" min="1" max="10000" inputMode="numeric" aria-describedby="exercise-calories-help" value={caloriesBurned} onChange={event=>{setCaloriesBurned(event.target.value);setCalorieMode(event.target.value===""?"none":"manual");setEstimateMessage("")}} placeholder={estimating?"Calculando…":"Ex.: 420"} className="min-w-0 flex-1 bg-transparent text-base font-bold text-stone-900 outline-none"/>
      <span className="text-sm font-semibold text-orange-500">kcal</span>
     </div>
     <p id="exercise-calories-help" className="mt-2 text-xs text-stone-500">Você pode usar as calorias ativas do seu relógio ou app.</p>
     {calorieMode==="estimated"&&(estimating||estimateMessage)&&<p role="status" className="mt-2 text-xs text-stone-500">{estimating?"Calculando estimativa…":estimateMessage}</p>}
     {calorieMode!=="estimated"&&<button type="button" onClick={()=>setCalorieMode("estimated")} className="mt-1 min-h-11 rounded-lg px-1 text-xs font-semibold text-orange-700 outline-none focus-visible:ring-2 focus-visible:ring-orange-300">Usar estimativa</button>}
    </div>
    <label className="mt-5 block text-sm font-bold text-stone-700">Observação <span className="font-normal text-stone-400">(opcional)</span><textarea maxLength={300} rows={2} value={note} onChange={event=>setNote(event.target.value)} placeholder="Como foi?" className="mt-2 block w-full resize-none rounded-2xl border border-stone-200 bg-stone-50 p-4 text-base outline-none focus:border-rose-500 focus:ring-4 focus:ring-rose-100"/></label>
    <button disabled={saving||!selectedDate} className="exercise-dialog-save mt-5 min-h-14 w-full rounded-2xl px-5 font-bold text-white outline-none transition focus-visible:ring-4 focus-visible:ring-rose-200 disabled:opacity-60">{saving?"Salvando...":editingId===null?"Salvar atividade":"Salvar alterações"}</button>
    {selectedDay?.hasExercise&&<button type="button" disabled={saving||deleting} onClick={()=>{setFormOpen(false);setEditingId(null);setError("")}} className="mt-2 min-h-11 w-full rounded-xl text-sm text-stone-500">Cancelar</button>}
    </fieldset>
   </form>}
   {error&&<p role="alert" className="mt-4 rounded-2xl bg-rose-50 p-4 text-sm text-rose-700">{error}</p>}
  </section>
 </div>
}

const dayLabels=["SEG","TER","QUA","QUI","SEX","SÁB","DOM"];

function WeekCalendar({week,selectedDate,onSelect,disabled}:{week:ExerciseWeek;selectedDate:string;onSelect:(day:ExerciseWeekDay)=>void;disabled:boolean}){
 const selected=week.days.find(day=>day.date===selectedDate);
 const daysText=week.targetDays?`${week.completedDays} de ${week.targetDays} dias`:`${week.completedDays} dia${week.completedDays===1?"":"s"}`;
 const today=getLocalToday();
 return <section aria-label="Atividades desta semana" className="mt-5 rounded-2xl bg-rose-50/70 p-4">
  <div className="flex items-center justify-between gap-3"><h3 className="text-sm font-bold text-stone-800">{week.days.some(day=>day.isToday)?"Esta semana":`${formatCalendarDate(week.startDate!)} – ${formatCalendarDate(week.endDate!)}`}</h3><span className="text-right text-xs font-semibold text-rose-700">{daysText} · {formatExerciseDuration(exerciseSeconds(week.totalSeconds,week.totalMinutes))}</span></div>
  <div className="mt-3 grid grid-cols-7 gap-1">{week.days.map((day,index)=>{const future=day.date>today;return <button key={day.date} type="button" disabled={future||disabled} onClick={()=>onSelect(day)} aria-label={`${dayLabels[index]} ${formatCalendarDate(day.date)}${day.hasExercise?", exercício registrado":""}${day.isToday?", hoje":""}${future?", indisponível":""}`} aria-pressed={selectedDate===day.date} className={`flex min-h-12 flex-col items-center justify-center rounded-xl text-[10px] font-bold outline-none transition focus-visible:ring-4 focus-visible:ring-rose-200 disabled:cursor-not-allowed disabled:opacity-40 ${selectedDate===day.date?"ring-2 ring-rose-400":day.isToday?"ring-2 ring-rose-300":""} ${day.hasExercise?"bg-rose-600 text-white":"bg-white/70 text-stone-500"}`}><span>{dayLabels[index]}</span><span className="mt-1 grid h-4 place-items-center">{day.hasExercise?<Check size={14} strokeWidth={3}/>:new Date(`${day.date}T12:00:00`).getDate()}</span></button>})}</div>
  <div aria-label="Registro do dia selecionado" className="mt-3 rounded-xl bg-white p-3 text-xs">
   <p className="text-[10px] font-semibold text-stone-500">{selectedDate?`Registro de ${formatCalendarDate(selectedDate)}`:"Selecione um dia"}</p>
   {selected?.hasExercise?<><h4 className="mt-1 text-sm font-bold text-stone-800">{selected.activityCount} atividade{selected.activityCount===1?"":"s"} · {formatExerciseDuration(exerciseSeconds(selected.totalSeconds,selected.totalMinutes))}</h4>
    <p className="mt-1 text-stone-500">{selected.byModality.map(item=>item.type).join(" · ")}</p>
    {selected.totalCalories>0&&<p className="mt-2 text-rose-700">{selected.totalCalories.toLocaleString("pt-BR")} kcal{calorieSuffix(selected.calorieSource)}</p>}
   </>:<p className="mt-2 text-stone-500">Sem atividades registradas.</p>}

  </div>
 </section>
}

function formatCalendarDate(value:string){return new Date(`${value}T12:00:00`).toLocaleDateString("pt-BR",{day:"2-digit",month:"2-digit"})}
function formatSelectedDate(value:string){return new Date(`${value}T12:00:00`).toLocaleDateString("pt-BR",{weekday:"short",day:"2-digit",month:"2-digit"})}
function getLocalToday(){const now=new Date();const year=now.getFullYear(),month=String(now.getMonth()+1).padStart(2,"0"),day=String(now.getDate()).padStart(2,"0");return `${year}-${month}-${day}`}
