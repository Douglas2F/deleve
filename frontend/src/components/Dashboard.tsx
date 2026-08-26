import { Activity, CalendarDays, ChevronRight, Droplets, Minus, MoonStar, Plus, Scale } from "lucide-react";
import { useEffect, useState } from "react";
import ExerciseDialog, { ExerciseEntry, ExerciseWeek } from "./ExerciseDialog";
import SleepDialog, { SleepEntry, SleepWeek } from "./SleepDialog";
import WeightDialog, { WeightSummary } from "./WeightDialog";
import WeeklyReport from "./WeeklyReport";
import WaterWeekDialog, { WaterWeek } from "./WaterWeekDialog";

export type HealthProfile={name:string;heightCm:string;weightKg:string;goal:string;sleepGoalHours:string;waterGoalMl:string};

type WaterResponse={totalMl:number;error?:string};

export default function Dashboard({profile}:{profile:HealthProfile}){
 const firstName=profile.name.trim().split(" ")[0];
 const waterGoal=Math.max(Number(profile.waterGoalMl)||2000,1);
 const [waterTotal,setWaterTotal]=useState(0);
 const [waterError,setWaterError]=useState("");
 const [savingWater,setSavingWater]=useState(false);
 const [sleepEntry,setSleepEntry]=useState<SleepEntry|null>(null);
 const [sleepDialogOpen,setSleepDialogOpen]=useState(false);
 const [sleepWeek,setSleepWeek]=useState<SleepWeek|null>(null);
 const [exerciseEntry,setExerciseEntry]=useState<ExerciseEntry|null>(null);
 const [exerciseDialogOpen,setExerciseDialogOpen]=useState(false);
 const [exerciseWeek,setExerciseWeek]=useState<ExerciseWeek|null>(null);
 const [weightSummary,setWeightSummary]=useState<WeightSummary|null>(null);
 const [weightDialogOpen,setWeightDialogOpen]=useState(false);
 const [weeklyReportOpen,setWeeklyReportOpen]=useState(false);
 const [waterWeek,setWaterWeek]=useState<WaterWeek|null>(null);
 const [waterWeekOpen,setWaterWeekOpen]=useState(false);
 const waterProgress=Math.min(100,Math.round((waterTotal/waterGoal)*100));
 const completedRecords=(waterTotal>0?1:0)+(sleepEntry?1:0)+(exerciseEntry?1:0);

 useEffect(()=>{
  fetch("/api/health/water/today")
   .then(async response=>response.ok?response.json():Promise.reject())
   .then((body:WaterResponse)=>setWaterTotal(body.totalMl))
   .catch(()=>setWaterError("Não foi possível carregar a água de hoje."));
 },[]);

 function refreshWaterWeek(){
  fetch("/api/health/water/week")
   .then(async response=>response.ok?response.json():Promise.reject())
   .then((body:WaterWeek)=>setWaterWeek(body))
   .catch(()=>undefined);
 }

 useEffect(()=>{refreshWaterWeek()},[]);

 useEffect(()=>{
  fetch("/api/health/weight")
   .then(async response=>response.ok?response.json():Promise.reject())
   .then((body:WeightSummary)=>setWeightSummary(body))
   .catch(()=>undefined);
 },[]);

 useEffect(()=>{
  fetch("/api/health/exercise/today")
   .then(async response=>response.ok?response.json():Promise.reject())
   .then((body:{entry:ExerciseEntry|null})=>setExerciseEntry(body.entry))
   .catch(()=>undefined);
 },[]);

 useEffect(()=>{
  fetch("/api/health/exercise/week")
   .then(async response=>response.ok?response.json():Promise.reject())
   .then((body:ExerciseWeek)=>setExerciseWeek(body))
   .catch(()=>undefined);
 },[]);

 useEffect(()=>{
  fetch("/api/health/sleep/today")
   .then(async response=>response.ok?response.json():Promise.reject())
   .then((body:{entry:SleepEntry|null})=>setSleepEntry(body.entry))
   .catch(()=>undefined);
 },[]);

 useEffect(()=>{
  fetch("/api/health/sleep/week")
   .then(async response=>response.ok?response.json():Promise.reject())
   .then((body:SleepWeek)=>setSleepWeek(body))
   .catch(()=>undefined);
 },[]);

 async function addGlass(){
  if(savingWater)return;
  setSavingWater(true);setWaterError("");
  try{
   const response=await fetch("/api/health/water",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({amountMl:250})});
   const body=await response.json().catch(()=>({})) as WaterResponse;
   if(!response.ok)throw new Error(body.error??"Não foi possível registrar a água.");
   setWaterTotal(body.totalMl);
   refreshWaterWeek();
  }catch(caught){
   setWaterError(caught instanceof Error?caught.message:"Não foi possível registrar a água.");
  }finally{setSavingWater(false)}
 }

 async function removeLastGlass(){
  if(savingWater||waterTotal<=0)return;
  setSavingWater(true);setWaterError("");
  try{
   const response=await fetch("/api/health/water/latest",{method:"DELETE"});
   const body=await response.json().catch(()=>({})) as WaterResponse;
   if(!response.ok)throw new Error(body.error??"Não foi possível desfazer o último registro.");
   setWaterTotal(body.totalMl);
   refreshWaterWeek();
  }catch(caught){
   setWaterError(caught instanceof Error?caught.message:"Não foi possível desfazer o último registro.");
  }finally{setSavingWater(false)}
 }

 return <main className="min-h-screen bg-[#f6f8f6] text-stone-900"><section className="mx-auto min-h-screen max-w-5xl px-5 pb-28 pt-7 md:px-10">
  <header className="flex items-center justify-between"><div><p className="text-sm text-stone-500">Olá, {firstName}</p><h1 className="text-2xl font-semibold tracking-tight">Seu dia, de leve.</h1></div><div className="grid size-11 place-items-center rounded-2xl bg-gradient-to-br from-emerald-700 to-cyan-500 font-bold text-white">D</div></header>
  <div className="mt-8 flex items-end justify-between"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-emerald-700">Saúde — Hoje</p><h2 className="mt-1 text-3xl font-semibold tracking-[-.04em]">Um passo de cada vez.</h2></div><span className="hidden text-sm text-stone-400 md:block">{profile.goal}</span></div>
  <section className="mt-6 grid gap-4 md:grid-cols-2">
   <article className="rounded-3xl bg-gradient-to-br from-sky-600 to-cyan-500 p-6 text-white shadow-xl shadow-sky-900/10">
    <div className="flex justify-between"><span className="grid size-11 place-items-center rounded-2xl bg-white/20"><Droplets/></span><div className="flex gap-2"><button aria-label="Desfazer último registro de água" disabled={savingWater||waterTotal<=0} onClick={removeLastGlass} className="grid size-10 place-items-center rounded-full bg-white/20 text-white transition hover:bg-white/30 focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-white disabled:opacity-40"><Minus/></button><button aria-label="Adicionar um copo de água" disabled={savingWater} onClick={addGlass} className="grid size-10 place-items-center rounded-full bg-white text-sky-700 transition hover:scale-105 focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-white disabled:opacity-60"><Plus/></button></div></div>
    <p className="mt-8 text-sm text-sky-100">Água</p><p className="mt-1 text-3xl font-semibold">{waterTotal.toLocaleString("pt-BR")} ml <span className="text-base font-medium text-sky-100">/ {waterGoal.toLocaleString("pt-BR")} ml</span></p>
    <div className="mt-4 h-2 rounded-full bg-white/20"><div className="h-full rounded-full bg-white transition-[width] duration-300" style={{width:`${waterProgress}%`}}/></div>
    <p className="mt-3 text-xs font-medium text-sky-100">Semana · média {formatLiters(waterWeek?.averageMl??0)}/dia</p><div className="mt-3 flex items-center justify-between gap-3"><button disabled={savingWater} onClick={addGlass} className="flex min-h-11 items-center gap-1 rounded-xl px-2 text-sm font-semibold outline-none transition hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white disabled:opacity-60">{savingWater?"Registrando...":"+ 1 copo"}<ChevronRight size={16}/></button><button onClick={()=>setWaterWeekOpen(true)} className="min-h-11 rounded-xl px-3 text-xs font-bold text-white outline-none hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white">Ver semana</button></div>
    {waterError&&<p role="alert" className="mt-3 rounded-xl bg-white/15 p-3 text-sm">{waterError}</p>}
   </article>
   <div className="grid grid-cols-2 gap-4">
    <Mini icon={<MoonStar/>} title="Sono" value={sleepEntry?formatDuration(sleepEntry.durationMinutes):`Meta ${profile.sleepGoalHours}h`} detail={`Semana · média ${formatDuration(sleepWeek?.averageMinutes??0)}`} color="bg-indigo-100 text-indigo-700" onClick={()=>setSleepDialogOpen(true)}/>
    <Mini icon={<Activity/>} title="Exercício" value={exerciseEntry?`${exerciseEntry.type} · ${formatDuration(exerciseEntry.durationMinutes)}${exerciseEntry.distanceKm?` · ${formatDistance(exerciseEntry.distanceKm)}`:""}${formatExercisePerformance(exerciseEntry)}`:"Fiz exercício"} detail={`Semana · ${formatDuration(exerciseWeek?.totalMinutes??0)}`} color="bg-rose-100 text-rose-700" onClick={()=>setExerciseDialogOpen(true)}/>
    <button onClick={()=>setWeightDialogOpen(true)} className="col-span-2 flex items-center justify-between rounded-3xl bg-white p-5 text-left shadow-sm ring-1 ring-stone-100 outline-none transition hover:-translate-y-1 focus-visible:ring-4 focus-visible:ring-amber-200"><div className="flex items-center gap-4"><span className="grid size-11 place-items-center rounded-2xl bg-amber-100 text-amber-700"><Scale/></span><div><p className="text-sm text-stone-500">Peso atual</p><b className="text-xl">{formatWeight(weightSummary?.currentWeightKg??Number(profile.weightKg))} kg</b>{weightSummary&&weightSummary.changeKg!==0&&<p className="mt-1 text-xs text-stone-400">{weightSummary.changeKg>0?"+":""}{formatWeight(weightSummary.changeKg)} kg desde o início</p>}</div></div><ChevronRight className="text-stone-300"/></button>
   </div>
  </section>
  <section className="mt-5 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-stone-100"><div className="flex justify-between"><div><p className="text-sm text-stone-500">Progresso de hoje</p><h3 className="mt-1 text-xl font-semibold">{completedRecords?`${completedRecords} registro${completedRecords>1?"s":""} concluído${completedRecords>1?"s":""}`:"Comece com um registro"}</h3></div><span className="text-sm font-semibold text-emerald-700">{completedRecords} de 3</span></div><div className="mt-5 h-2 rounded-full bg-stone-100"><div className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-cyan-500 transition-[width] duration-300" style={{width:`${completedRecords?Math.round((completedRecords/3)*100):4}%`}}/></div><p className="mt-4 text-sm text-stone-500">Sem pressão. Cada pequeno registro já conta.</p><button onClick={()=>setWeeklyReportOpen(true)} className="mt-5 flex min-h-12 w-full items-center justify-between rounded-2xl bg-emerald-50 px-4 text-sm font-bold text-emerald-800 outline-none transition hover:bg-emerald-100 focus-visible:ring-4 focus-visible:ring-emerald-200"><span className="flex items-center gap-2"><CalendarDays size={18}/>Ver relatório semanal</span><ChevronRight size={18}/></button></section>
 </section><SleepDialog open={sleepDialogOpen} onClose={()=>setSleepDialogOpen(false)} onSaved={setSleepEntry} onDeletedToday={()=>setSleepEntry(null)} onWeekChanged={setSleepWeek} initialEntry={sleepEntry}/><ExerciseDialog open={exerciseDialogOpen} onClose={()=>setExerciseDialogOpen(false)} onSaved={setExerciseEntry} onDeletedToday={()=>setExerciseEntry(null)} onWeekChanged={setExerciseWeek} initialEntry={exerciseEntry}/><WeightDialog open={weightDialogOpen} onClose={()=>setWeightDialogOpen(false)} onSaved={setWeightSummary} summary={weightSummary} fallbackWeight={profile.weightKg}/><WaterWeekDialog open={waterWeekOpen} onClose={()=>setWaterWeekOpen(false)} week={waterWeek} onWeekChanged={setWaterWeek} onTodayChanged={setWaterTotal}/><WeeklyReport open={weeklyReportOpen} onClose={()=>setWeeklyReportOpen(false)}/></main>
}

function Mini({icon,title,value,detail,color,onClick}:{icon:React.ReactNode;title:string;value:string;detail?:string;color:string;onClick?:()=>void}){return <button disabled={!onClick} onClick={onClick} className="rounded-3xl bg-white p-4 text-left shadow-sm ring-1 ring-stone-100 transition enabled:hover:-translate-y-1 enabled:focus-visible:outline-4 enabled:focus-visible:outline-offset-2 enabled:focus-visible:outline-indigo-200 disabled:cursor-default"><span className={`grid size-10 place-items-center rounded-2xl ${color}`}>{icon}</span><p className="mt-5 text-sm text-stone-500">{title}</p><b className="mt-1 block text-sm">{value}</b>{detail&&<span className="mt-1 block text-xs font-medium text-stone-400">{detail}</span>}</button>}

function formatDuration(minutes:number){const hours=Math.floor(minutes/60),remaining=minutes%60;return remaining?`${hours}h ${remaining}min`:`${hours}h`}
function formatWeight(value:number){return value.toLocaleString("pt-BR",{minimumFractionDigits:1,maximumFractionDigits:1})}
function formatDistance(value:number){return `${value.toLocaleString("pt-BR",{maximumFractionDigits:2})} km`}
function formatExercisePerformance(entry:ExerciseEntry){if(entry.paceSecondsPerKm){const minutes=Math.floor(entry.paceSecondsPerKm/60),seconds=String(entry.paceSecondsPerKm%60).padStart(2,"0");return ` · ${minutes}:${seconds} min/km`}if(entry.averageSpeedKmh)return ` · ${entry.averageSpeedKmh.toLocaleString("pt-BR",{maximumFractionDigits:1})} km/h`;return ""}
function formatLiters(value:number){return `${(value/1000).toLocaleString("pt-BR",{minimumFractionDigits:1,maximumFractionDigits:2})} L`}
