import DeleveSymbol from "./DeleveSymbol";
import { exerciseSeconds, formatExerciseDuration } from "./exerciseDuration";
import { Activity, CalendarDays, Check, ChevronRight, Droplets, Flame, Gauge, Home, Minus, MoonStar, Pause, Play, Plus, Route, Scale, Sun, Target, Timer, TrendingDown, TrendingUp, X } from "lucide-react";
import { calorieLabel, calorieSuffix } from "./calorieLabels";
import { useCallback, useEffect, useRef, useState } from "react";
import ExerciseDialog, { ExerciseEntry, ExerciseWeek, ExerciseWeekDay } from "./ExerciseDialog";
import SleepDialog, { SleepEntry, SleepWeek } from "./SleepDialog";
import WeightDialog, { WeightSummary } from "./WeightDialog";
import WeeklyReport from "./WeeklyReport";
import WaterWeekDialog, { WaterWeek } from "./WaterWeekDialog";
import WaterAmountDialog from "./WaterAmountDialog";
import ProfileDialog from "./ProfileDialog";
import FocusOfDay from "./CollapsibleFocusOfDay";
import WaterAnimation from "./WaterAnimation";
import WaterGoalCelebration from "./WaterGoalCelebration";
import { WATER_GOAL_CELEBRATION_MS } from "./waterGoalMorph";
import { crossedWaterGoal, isWaterGoalReached } from "./waterGoal";
import ExerciseCelebration, { EXERCISE_CELEBRATION_MS } from "./ExerciseCelebration";
import SleepCelebration, { SLEEP_CELEBRATION_MS } from "./SleepCelebration";
import WeightCelebration, { WEIGHT_CELEBRATION_MS, type WeightCelebrationEvent } from "./WeightCelebration";
import WeightAward from "./WeightAward";
import { sleepMilestone, exerciseMilestone, weightRewardKind, weightChangeKg, isWeightGoalReached, type ExerciseSaveContext } from "./healthMilestones";

export type HealthProfile={waterPortionMl?:number;name:string;heightCm:string;weightKg:string;goal:string;goals:string[];sleepGoalHours:string;waterGoalMl:string;exerciseDaysWeek:string;targetWeightKg:string};
export type HealthShortcut="overview"|"water-panel"|"water"|"sleep"|"exercise"|"weight"|"challenge"|"profile";
export type HomeFeedback={kind:"water"|"sleep"|"exercise"|"weight"|"challenge";message:string;id:number};

type WaterResponse={totalMl:number;error?:string};
type LatestKind="water"|"sleep"|"exercise"|"weight";
type LatestActivity={kind:LatestKind;recordedAt:string;amountMl?:number};

export default function Dashboard({profile,onProfileUpdated,onBackHome,initialShortcut="overview"}:{profile:HealthProfile;onProfileUpdated:(profile:HealthProfile)=>void;onBackHome:(feedback?:HomeFeedback)=>void;initialShortcut?:HealthShortcut}){
 const firstName=profile.name.trim().split(" ")[0];
 const waterFocused=initialShortcut==="water-panel";
 const waterGoal=Math.max(Number(profile.waterGoalMl)||2000,1);
 const waterPortion=profile.waterPortionMl??250;
 const [waterTotal,setWaterTotal]=useState(0);
 const [waterError,setWaterError]=useState("");
 const [savingWater,setSavingWater]=useState(false);
 const [waterAmountOpen,setWaterAmountOpen]=useState(initialShortcut==="water");
 const waterRequest=useRef(false);
 const [waterMotionPaused,setWaterMotionPaused]=useState(false);
 const [waterCelebrating,setWaterCelebrating]=useState(false);
 const [sleepEntry,setSleepEntry]=useState<SleepEntry|null>(null);
 const [sleepDialogOpen,setSleepDialogOpen]=useState(initialShortcut==="sleep");
 const [sleepWeek,setSleepWeek]=useState<SleepWeek|null>(null);
 const [exerciseEntry,setExerciseEntry]=useState<ExerciseEntry|null>(null);
 const [exerciseDialogOpen,setExerciseDialogOpen]=useState(initialShortcut==="exercise");
 const [exerciseWeek,setExerciseWeek]=useState<ExerciseWeek|null>(null);
 const exerciseDay=exerciseWeek?.days.find(day=>day.isToday);
 const [weightSummary,setWeightSummary]=useState<WeightSummary|null>(null);
 const weightGoals=profile.goals??profile.goal.split(",").map(goal=>goal.trim());
 const weightTarget=profile.targetWeightKg?Number(profile.targetWeightKg):undefined;
 const weightGoalReached=weightSummary!==null&&isWeightGoalReached(weightSummary.currentWeightKg,weightGoals,weightTarget);
 const [weightDialogOpen,setWeightDialogOpen]=useState(initialShortcut==="weight");
 const [weeklyReportOpen,setWeeklyReportOpen]=useState(false);
 const [waterWeek,setWaterWeek]=useState<WaterWeek|null>(null);
 const [waterWeekOpen,setWaterWeekOpen]=useState(false);
 const [latestKind,setLatestKind]=useState<LatestKind>(()=>(localStorage.getItem("deleve-latest-health") as LatestKind)||"water");
 const [latestAt,setLatestAt]=useState("");
 const [latestWaterAmount,setLatestWaterAmount]=useState<number|null>(null);
 const [latestActivities,setLatestActivities]=useState<Partial<Record<LatestKind,LatestActivity>>>({});
 const [profileOpen,setProfileOpen]=useState(initialShortcut==="profile");
 const [weightCelebration,setWeightCelebration]=useState<WeightCelebrationEvent|null>(null);
 const finishWeightCelebration=useCallback(()=>setWeightCelebration(null),[]);
 const [exerciseCelebrationId,setExerciseCelebrationId]=useState<number|null>(null);
 const finishExerciseCelebration=useCallback(()=>setExerciseCelebrationId(null),[]);
 const [sleepCelebrationId,setSleepCelebrationId]=useState<number|null>(null);
 const finishSleepCelebration=useCallback(()=>setSleepCelebrationId(null),[]);
 const waterProgress=Math.min(100,Math.round((waterTotal/waterGoal)*100));
 const waterGoalReached=isWaterGoalReached(waterTotal,waterGoal);
 const completedRecords=(waterTotal>0?1:0)+(sleepEntry?1:0)+(exerciseEntry?1:0);

 useEffect(()=>{
  if(!waterFocused)return;
  const previousOverflow=document.body.style.overflow;
  const closeOnEscape=(event:KeyboardEvent)=>{if(event.key==="Escape")onBackHome()};
  document.body.style.overflow="hidden";
  window.addEventListener("keydown",closeOnEscape);
  return()=>{document.body.style.overflow=previousOverflow;window.removeEventListener("keydown",closeOnEscape)};
 },[waterFocused,onBackHome]);
 function markLatest(kind:LatestKind,amountMl?:number){const activity={kind,recordedAt:new Date().toISOString(),...(kind==="water"&&amountMl!==undefined?{amountMl}:{})};setLatestActivities(current=>({...current,[kind]:activity}));setLatestKind(kind);setLatestAt(activity.recordedAt);setLatestWaterAmount(kind==="water"?amountMl??null:null);localStorage.setItem("deleve-latest-health",kind)}
 const refreshLatestActivities=useCallback(()=>{
  fetch("/api/health/latest-activities").then(response=>response.ok?response.json():Promise.reject())
   .then((body:{activities:Partial<Record<LatestKind,LatestActivity>>})=>setLatestActivities(body.activities??{}))
   .catch(()=>undefined);
 },[]);
 function returnHomeFrom(shortcut:HomeFeedback["kind"]){
  if(initialShortcut!==shortcut)return;
  const messages={water:"Água adicionada",sleep:"Sono registrado",exercise:"Exercício registrado",weight:"Peso registrado",challenge:"Desafio salvo"};
  window.setTimeout(()=>onBackHome({kind:shortcut,message:messages[shortcut],id:Date.now()}),0);
 }

 function updateRecordedSleep(entry:SleepEntry){
  const goalMinutes=Number(profile.sleepGoalHours)*60;
  if(sleepMilestone(sleepEntry,entry,goalMinutes))setSleepCelebrationId(Date.now());
  else if(entry.durationMinutes<goalMinutes||!(goalMinutes>0))setSleepCelebrationId(null);
  setSleepEntry(entry);markLatest("sleep");
 }

 useEffect(()=>{setSleepCelebrationId(null)},[profile.sleepGoalHours]);
 useEffect(()=>{if(!sleepEntry)setSleepCelebrationId(null)},[sleepEntry]);

 function updateRecordedWeight(summary:WeightSummary){
  const reward=weightSummary?weightRewardKind(weightSummary.currentWeightKg,summary.currentWeightKg,weightGoals,weightTarget):null;
  if(weightSummary&&reward){
   setWeightCelebration({id:Date.now(),changeKg:weightChangeKg(weightSummary.currentWeightKg,summary.currentWeightKg),kind:reward});
  }else setWeightCelebration(null);
  setWeightSummary(summary);markLatest("weight");
 }

 useEffect(()=>{setWeightCelebration(null)},[profile.goal,profile.targetWeightKg]);

 function updateCorrectedWeight(summary:WeightSummary){
  setWeightCelebration(null);setWeightSummary(summary);
  refreshLatestActivities();
  fetch("/api/health/latest-activity").then(response=>response.ok?response.json():Promise.reject())
   .then((body:{activity:LatestActivity|null})=>{
    setLatestKind(body.activity?.kind??"water");setLatestAt(body.activity?.recordedAt??"");setLatestWaterAmount(body.activity?.kind==="water"?body.activity.amountMl??null:null);
    if(body.activity)localStorage.setItem("deleve-latest-health",body.activity.kind);
    else localStorage.removeItem("deleve-latest-health");
   }).catch(()=>undefined);
 }

 useEffect(()=>{
  if(!waterCelebrating)return;
  const timer=window.setTimeout(()=>setWaterCelebrating(false),WATER_GOAL_CELEBRATION_MS);
  return ()=>window.clearTimeout(timer);
 },[waterCelebrating]);

 // Only saved user actions celebrate; loading the page or changing goals does not.
 function updateCorrectedWater(total:number){
  setWaterTotal(total);setWaterCelebrating(false);
  refreshLatestActivities();
  fetch("/api/health/latest-activity").then(response=>response.ok?response.json():Promise.reject())
   .then((body:{activity:LatestActivity|null})=>{
    setLatestKind(body.activity?.kind??"water");setLatestAt(body.activity?.recordedAt??"");setLatestWaterAmount(body.activity?.kind==="water"?body.activity.amountMl??null:null);
    if(body.activity)localStorage.setItem("deleve-latest-health",body.activity.kind);
    else localStorage.removeItem("deleve-latest-health");
   }).catch(()=>undefined);
 }

 function updateRecordedWater(total:number){
  if(crossedWaterGoal(waterTotal,total,waterGoal))setWaterCelebrating(true);
  else if(total<waterGoal)setWaterCelebrating(false);
  setWaterTotal(total);
 }

 function updateExerciseWeek(week:ExerciseWeek,saved?:ExerciseSaveContext){
  const today=week.days.find(day=>day.isToday);
  if(exerciseMilestone(today,saved))setExerciseCelebrationId(Date.now());
  else if(!saved||exerciseSeconds(today?.totalSeconds,today?.totalMinutes??0)<1800)setExerciseCelebrationId(null);
  setExerciseWeek(week);
  const entries=week.days.find(day=>day.isToday)?.entries??[];
  const latest=[...entries].sort((a,b)=>b.recordedAt.localeCompare(a.recordedAt)||b.id-a.id)[0]??null;
  setExerciseEntry(latest);
  refreshLatestActivities();
  fetch("/api/health/latest-activity").then(response=>response.ok?response.json():Promise.reject())
   .then((body:{activity:LatestActivity|null})=>{
    if(body.activity){setLatestKind(body.activity.kind);setLatestAt(body.activity.recordedAt);setLatestWaterAmount(body.activity.kind==="water"?body.activity.amountMl??null:null);localStorage.setItem("deleve-latest-health",body.activity.kind)}
    else{setLatestKind("water");setLatestAt("");setLatestWaterAmount(null);localStorage.setItem("deleve-latest-health","water")}
   }).catch(()=>undefined);
 }

 useEffect(()=>{
  fetch("/api/health/latest-activity")
   .then(async response=>response.ok?response.json():Promise.reject())
   .then((body:{activity:LatestActivity|null})=>{if(body.activity){setLatestKind(body.activity.kind);setLatestAt(body.activity.recordedAt);setLatestWaterAmount(body.activity.kind==="water"?body.activity.amountMl??null:null)}else{setLatestKind("water");setLatestAt("");setLatestWaterAmount(null);localStorage.removeItem("deleve-latest-health")}})
   .catch(()=>undefined);
 },[]);

 useEffect(()=>{refreshLatestActivities()},[refreshLatestActivities]);

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

 async function saveWaterPortion(amountMl:number):Promise<boolean>{
  if(waterRequest.current)return false;
  waterRequest.current=true;setSavingWater(true);setWaterError("");
  try{
   const response=await fetch("/api/health/water/portion",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({amountMl})});
   const body=await response.json();
   if(!response.ok)throw new Error(body.error??"Não foi possível salvar o tamanho.");
   onProfileUpdated(body);return true;
  }catch(caught){setWaterError(caught instanceof Error?caught.message:"Não foi possível salvar o tamanho.");return false}
  finally{waterRequest.current=false;setSavingWater(false)}
 }

 async function addGlass(amountMl=waterPortion):Promise<boolean>{
  if(waterRequest.current)return false;
  waterRequest.current=true;
  setSavingWater(true);setWaterError("");
  try{
   const response=await fetch("/api/health/water",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({amountMl})});
   const body=await response.json().catch(()=>({})) as WaterResponse;
   if(!response.ok)throw new Error(body.error??"Não foi possível registrar a água.");
   updateRecordedWater(body.totalMl);
   markLatest("water",amountMl);
   refreshWaterWeek();
   return true;
  }catch(caught){
   setWaterError(caught instanceof Error?caught.message:"Não foi possível registrar a água.");
   return false;
  }finally{waterRequest.current=false;setSavingWater(false)}
 }

 async function removeLastGlass(){
  if(waterRequest.current||waterTotal<=0)return;
  waterRequest.current=true;
  setSavingWater(true);setWaterError("");
  try{
   const response=await fetch("/api/health/water/latest",{method:"DELETE"});
   const body=await response.json().catch(()=>({})) as WaterResponse;
   if(!response.ok)throw new Error(body.error??"Não foi possível desfazer o último registro.");
   updateCorrectedWater(body.totalMl);
   refreshWaterWeek();
  }catch(caught){
   setWaterError(caught instanceof Error?caught.message:"Não foi possível desfazer o último registro.");
  }finally{waterRequest.current=false;setSavingWater(false)}
 }

 return <main className="min-h-screen bg-[#f6f8f6] text-stone-900"><section className="mx-auto min-h-screen max-w-5xl px-5 pb-28 pt-7 md:px-10">
  <header className="flex items-center justify-between gap-3"><div className="flex min-w-0 items-center gap-3"><button type="button" onClick={()=>onBackHome()} aria-label="Voltar para o início" className="grid size-11 shrink-0 place-items-center rounded-2xl bg-white text-emerald-800 shadow-sm ring-1 ring-stone-200 outline-none transition hover:bg-emerald-50 focus-visible:ring-4 focus-visible:ring-emerald-200"><Home size={19} aria-hidden="true"/></button><div className="min-w-0"><p className="text-sm text-stone-500">Olá, {firstName}</p><h1 className="truncate text-2xl font-semibold tracking-tight">Seu dia, de leve.</h1></div></div><button onClick={()=>setProfileOpen(true)} aria-label="Abrir perfil e metas" className="grid size-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-emerald-700 to-cyan-500 font-bold text-white shadow-lg shadow-emerald-900/10 outline-none transition hover:scale-105 focus-visible:ring-4 focus-visible:ring-emerald-200">{firstName.charAt(0).toUpperCase()}</button></header>
  <div className="mt-8 flex items-end justify-between"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-emerald-700">{waterFocused?"Hidratação — Hoje":"Saúde — Hoje"}</p><h2 className="mt-1 text-3xl font-semibold tracking-[-.04em]">{waterFocused?"Sua água de hoje.":"Um passo de cada vez."}</h2></div>{!waterFocused&&<span className="hidden text-sm text-stone-400 md:block">{profile.goal}</span>}</div>
  {!waterFocused&&<FocusOfDay openEditorWhenEmpty={initialShortcut==="challenge"} initiallyExpanded={initialShortcut==="challenge"} onSaved={()=>returnHomeFrom("challenge")} onCancel={initialShortcut==="challenge"?()=>returnHomeFrom("challenge"):undefined}/>}
  <section role={waterFocused?"dialog":undefined} aria-modal={waterFocused?"true":undefined} aria-labelledby={waterFocused?"water-panel-title":undefined} className={waterFocused?"fixed inset-0 z-50 flex overflow-y-auto bg-stone-950/55 p-3 backdrop-blur-sm sm:p-6":"mt-6 grid gap-4 md:grid-cols-2"}>
   <div className={waterFocused?"m-auto w-full max-w-3xl rounded-[2rem] bg-white p-3 shadow-2xl sm:p-5":"contents"}>
   {waterFocused&&<header className="flex items-center justify-between gap-4 px-2 pb-3 pt-1 sm:px-1"><div><p className="text-xs font-bold uppercase tracking-[.14em] text-sky-600">Hidratação</p><h2 id="water-panel-title" className="mt-0.5 text-xl font-semibold tracking-tight text-stone-900">Água de hoje</h2></div><button type="button" autoFocus onClick={()=>onBackHome()} aria-label="Fechar painel de água" className="grid size-11 shrink-0 place-items-center rounded-2xl bg-stone-100 text-stone-600 outline-none transition hover:bg-stone-200 hover:text-stone-900 focus-visible:ring-4 focus-visible:ring-sky-200"><X size={20} aria-hidden="true"/></button></header>}
   <article aria-label="Água de hoje" data-celebrating={waterCelebrating} data-goal-reached={waterGoalReached} className="water-card rounded-3xl bg-gradient-to-br from-sky-600 to-cyan-500 p-6 text-white shadow-xl shadow-sky-900/10">
    <WaterAnimation progress={waterProgress} paused={waterMotionPaused} celebrating={waterCelebrating}/>
    <div className="water-goal-announcement" role="status" aria-live="polite" aria-atomic="true" data-paused={waterMotionPaused}>
     {waterCelebrating&&<WaterGoalCelebration paused={waterMotionPaused}/>}
    </div>
    <div className="water-card-content">
    <div className="flex justify-between"><button type="button" aria-label={waterMotionPaused?"Retomar animação da água":"Pausar animação da água"} title={waterMotionPaused?"Retomar animação":"Pausar animação"} onClick={()=>setWaterMotionPaused(value=>!value)} className="water-motion-control grid size-11 place-items-center rounded-2xl bg-white/20 outline-none hover:bg-white/30 focus-visible:ring-2 focus-visible:ring-white"><Droplets aria-hidden="true"/><span className="water-motion-indicator">{waterMotionPaused?<Play size={10} aria-hidden="true"/>:<Pause size={10} aria-hidden="true"/>}</span></button><span aria-hidden="true" className="water-static-icon size-11 place-items-center rounded-2xl bg-white/20"><Droplets/></span><div className="flex gap-2"><button aria-label="Desfazer último registro de água" disabled={savingWater||waterTotal<=0} onClick={removeLastGlass} className="grid size-10 place-items-center rounded-full bg-white/20 text-white transition hover:bg-white/30 focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-white disabled:opacity-40"><Minus/></button><button aria-label={`Adicionar ${waterPortion} ml de água`} disabled={savingWater} onClick={()=>void addGlass()} className="grid size-10 place-items-center rounded-full bg-white text-sky-700 transition hover:scale-105 focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-white disabled:opacity-60"><Plus/></button></div></div>
    <p className="mt-2 text-right text-[10px] font-medium text-white/80">{waterPortion.toLocaleString("pt-BR")} ml por toque</p>
    <div className="water-card-readings"><div className="water-card-label"><p className="text-sm text-sky-100">Água</p>{waterGoalReached&&<span className="water-goal-badge"><Check size={13} strokeWidth={2.5} aria-hidden="true"/>Meta atingida</span>}</div><button type="button" disabled={savingWater} onClick={()=>{setWaterError("");setWaterAmountOpen(true)}} aria-label={`Escolher quantidade de água. Total de hoje: ${formatMilliliters(waterTotal)}`} aria-haspopup="dialog" className="mt-1 flex min-h-11 items-center gap-2 rounded-xl text-left text-3xl font-semibold outline-none hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white disabled:opacity-60">{formatMilliliters(waterTotal)}<ChevronRight size={17} className="opacity-60" aria-hidden="true"/></button>
    {latestActivities.water&&<p className="mt-1 text-xs font-medium text-white/75">Último registro · <strong className="font-semibold text-white">+{formatMilliliters(latestActivities.water.amountMl??latestWaterAmount??waterPortion)}</strong> · <time>{formatLatestTime(latestActivities.water.recordedAt)}</time></p>}
    <div className="mt-4 h-2 rounded-full bg-white/20"><div className="h-full rounded-full bg-white transition-[width] duration-300" style={{width:`${waterProgress}%`}}/></div>
    <WaterMetrics total={waterTotal} goal={waterGoal} week={waterWeek} colored/></div><div className="mt-3 flex items-center justify-end"><button onClick={()=>setWaterWeekOpen(true)} className="min-h-11 rounded-xl px-3 text-xs font-bold text-white outline-none hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white">Ver semana</button></div>
    {waterError&&<p role="alert" className="mt-3 rounded-xl bg-white/15 p-3 text-sm">{waterError}</p>}
    </div>
   </article>
   {!waterFocused&&<div className={`grid gap-4 ${exerciseDay&&exerciseDay.activityCount>1?"grid-cols-1":"grid-cols-2"}`}>
    <SleepCard entry={sleepEntry} week={sleepWeek} goalHours={profile.sleepGoalHours} latestAt={latestActivities.sleep?.recordedAt??""} celebrationId={sleepCelebrationId} celebrationBlocked={sleepDialogOpen||exerciseDialogOpen||weightDialogOpen||profileOpen||weeklyReportOpen||waterWeekOpen} onCelebrationDone={finishSleepCelebration} onClick={()=>{finishSleepCelebration();setSleepDialogOpen(true)}}/>
    <ExerciseCard entry={exerciseEntry} day={exerciseDay} week={exerciseWeek} latestAt={latestActivities.exercise?.recordedAt??""} celebrationId={exerciseCelebrationId} celebrationBlocked={exerciseDialogOpen||sleepDialogOpen||weightDialogOpen||profileOpen||weeklyReportOpen||waterWeekOpen} onCelebrationDone={finishExerciseCelebration} onClick={()=>{finishExerciseCelebration();setExerciseDialogOpen(true)}}/>
    <WeightCard summary={weightSummary} fallbackWeight={Number(profile.weightKg)} latestAt={latestActivities.weight?.recordedAt??""} goalReached={weightGoalReached} celebration={weightCelebration} celebrationBlocked={weightDialogOpen||sleepDialogOpen||exerciseDialogOpen||profileOpen||weeklyReportOpen||waterWeekOpen} onCelebrationDone={finishWeightCelebration} onClick={()=>{finishWeightCelebration();setWeightDialogOpen(true)}}/>
   </div>}
   </div>
  </section>
  {!waterFocused&&<section className="mt-5 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-stone-100"><div className="flex justify-between"><div><p className="text-sm text-stone-500">Progresso de hoje</p><h3 className="mt-1 text-xl font-semibold">{completedRecords?`${completedRecords} registro${completedRecords>1?"s":""} concluído${completedRecords>1?"s":""}`:"Comece com um registro"}</h3></div><span className="text-sm font-semibold text-emerald-700">{completedRecords} de 3</span></div><div className="mt-5 h-2 rounded-full bg-stone-100"><div className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-cyan-500 transition-[width] duration-300" style={{width:`${completedRecords?Math.round((completedRecords/3)*100):4}%`}}/></div><p className="mt-4 text-sm text-stone-500">Sem pressão. Cada pequeno registro já conta.</p><button onClick={()=>setWeeklyReportOpen(true)} className="mt-5 flex min-h-12 w-full items-center justify-between rounded-2xl bg-emerald-50 px-4 text-sm font-bold text-emerald-800 outline-none transition hover:bg-emerald-100 focus-visible:ring-4 focus-visible:ring-emerald-200"><span className="flex items-center gap-2"><CalendarDays size={18}/>Ver relatório semanal</span><ChevronRight size={18}/></button></section>}
 </section><WaterAmountDialog open={waterAmountOpen} busy={savingWater} error={waterError} onClose={()=>initialShortcut==="water"?onBackHome():setWaterAmountOpen(false)} onAdd={async amount=>{const saved=await addGlass(amount);if(saved)returnHomeFrom("water");return saved}} portion={waterPortion} onSavePortion={saveWaterPortion}/><ProfileDialog open={profileOpen} profile={profile} onClose={()=>initialShortcut==="profile"?onBackHome():setProfileOpen(false)} onSaved={onProfileUpdated}/><SleepDialog open={sleepDialogOpen} onClose={()=>initialShortcut==="sleep"?onBackHome():setSleepDialogOpen(false)} onSaved={entry=>{updateRecordedSleep(entry);returnHomeFrom("sleep")}} onDeletedToday={()=>{setSleepEntry(null);refreshLatestActivities()}} onWeekChanged={setSleepWeek} initialEntry={sleepEntry}/><ExerciseDialog open={exerciseDialogOpen} onClose={()=>initialShortcut==="exercise"?onBackHome():setExerciseDialogOpen(false)} onChanged={(week,saved)=>{updateExerciseWeek(week,saved);if(saved)returnHomeFrom("exercise")}}/><WeightDialog open={weightDialogOpen} onClose={()=>initialShortcut==="weight"?onBackHome():setWeightDialogOpen(false)} onSaved={summary=>{updateRecordedWeight(summary);returnHomeFrom("weight")}} onCorrected={summary=>{updateCorrectedWeight(summary);returnHomeFrom("weight")}} summary={weightSummary} fallbackWeight={profile.weightKg}/><WaterWeekDialog open={waterWeekOpen} onClose={()=>setWaterWeekOpen(false)} week={waterWeek} onWeekChanged={setWaterWeek} onTodayChanged={(total,deleted)=>{if(deleted)updateCorrectedWater(total);else{updateRecordedWater(total);markLatest("water")}}}/><WeeklyReport open={weeklyReportOpen} onClose={()=>setWeeklyReportOpen(false)}/></main>
}

function ExerciseCard({entry,day,week,latestAt,onClick,celebrationId,celebrationBlocked,onCelebrationDone}:{entry:ExerciseEntry|null;day:ExerciseWeekDay|undefined;week:ExerciseWeek|null;latestAt:string;onClick:()=>void;celebrationId:number|null;celebrationBlocked:boolean;onCelebrationDone:()=>void}){
 const celebrationAnchorRef=useRef<HTMLSpanElement>(null);
 const [celebrating,setCelebrating]=useState(false);
 useEffect(()=>{
  setCelebrating(false);
  if(celebrationId===null||celebrationBlocked||!celebrationAnchorRef.current)return;
  let timer:number|undefined;
  // Wait until the form is closed and the card is visible; never celebrate behind it.
  const observer=new IntersectionObserver(entries=>{
   if(timer!==undefined||!entries.some(entry=>entry.isIntersecting&&entry.intersectionRatio>=.99))return;
   setCelebrating(true);
   observer.disconnect();
   timer=window.setTimeout(()=>{setCelebrating(false);onCelebrationDone()},EXERCISE_CELEBRATION_MS);
  },{threshold:.99});
  observer.observe(celebrationAnchorRef.current);
  return ()=>{observer.disconnect();window.clearTimeout(timer)};
 },[celebrationId,celebrationBlocked,onCelebrationDone]);
 // Teste visual isolado: false restaura o cartão claro sem desfazer outras melhorias.
 const darkPreview = false;
 return <div className="exercise-card-shell" data-celebrating={celebrating}>
 <span ref={celebrationAnchorRef} className="exercise-celebration-anchor" aria-hidden="true"/>
 <button onClick={onClick} className={`min-w-0 rounded-3xl p-4 text-left shadow-sm ring-1 outline-none transition hover:-translate-y-1 focus-visible:ring-4 focus-visible:ring-rose-200 ${darkPreview?"bg-black text-white ring-neutral-800 [&_strong]:text-white":"bg-white ring-stone-100"}`}>
  <span className="exercise-card-readings">
  <span className={`grid size-10 place-items-center rounded-2xl ${darkPreview?"bg-rose-400/15 text-rose-300":"bg-rose-100 text-rose-700"}`}><Activity/></span>
  <p className={`mt-5 text-sm ${darkPreview?"text-neutral-300":"text-stone-500"}`}>Exercício</p>
  {day&&day.activityCount>1?<><b className="mt-1 block text-base leading-tight">{day.activityCount} atividades</b>
   <span className="mt-2 flex flex-wrap gap-1.5"><Metric icon={<Timer/>} label="Tempo total" value={formatExerciseDuration(exerciseSeconds(day.totalSeconds,day.totalMinutes))} className="bg-rose-50 text-rose-700"/>{day.totalCalories>0&&<Metric icon={<Flame/>} label={calorieLabel(day.calorieSource)} value={formatCalories(day.totalCalories)} className="bg-rose-50 text-rose-700"/>}</span>
   {day.byModality.map(item=><span key={item.type} className="mt-3 block border-t border-rose-100 pt-2"><span className="block break-words text-xs font-semibold text-stone-700">{item.type}</span><span className="mt-1 flex flex-wrap gap-1.5">{item.totalKm!=null&&<Metric icon={<Route/>} label="Distância" value={formatDistance(item.totalKm)} className="bg-rose-50 text-rose-700"/>}<Metric icon={<Timer/>} label="Tempo" value={formatExerciseDuration(exerciseSeconds(item.totalSeconds,item.totalMinutes))} className="bg-rose-50 text-rose-700"/></span></span>)}
   <span className="mt-3 block text-xs font-semibold text-rose-700">Ver atividades →</span>
  </>:entry?<><b className="mt-1 block break-words text-base leading-tight">{entry.type}</b><ExerciseMetrics entry={entry} dark={darkPreview}/></>:<b className="mt-1 block text-sm">Fiz exercício</b>}
  <span className={`mt-3 block text-[11px] font-medium ${darkPreview?"text-neutral-400":"text-stone-400"}`}>Semana · {formatExerciseDuration(exerciseSeconds(week?.totalSeconds,week?.totalMinutes??0))}{week?.totalCalories?` · ${formatCalories(week.totalCalories)}${calorieSuffix(week.calorieSource)}`:""}</span>
  {latestAt&&<span className={`mt-1 block text-[11px] font-medium ${darkPreview?"text-neutral-400":"text-stone-400"}`}>Último registro · {formatLatestTime(latestAt)}</span>}
  </span>
 </button>
 <span className="exercise-card-celebration" role="status" aria-live="polite" aria-atomic="true">{celebrating&&<ExerciseCelebration totalSeconds={day?exerciseSeconds(day.totalSeconds,day.totalMinutes):exerciseSeconds(entry?.durationSeconds,entry?.durationMinutes??0)}/>}</span>
 </div>
}

function ExerciseMetrics({entry,dark=false}:{entry:ExerciseEntry;dark?:boolean}){
 const base=dark?"bg-white/10 text-white/80":"bg-rose-50 text-rose-700";
 return <span className="mt-2 flex flex-wrap gap-1.5">
  {entry.distanceKm!=null&&<Metric icon={<Route/>} label="Distância" value={formatDistance(entry.distanceKm)} className={base}/>}
  {entry.paceSecondsPerKm!=null&&<Metric icon={<Gauge/>} label="Ritmo" value={formatPace(entry.paceSecondsPerKm)} className={base}/>}
  {entry.averageSpeedKmh!=null&&<Metric icon={<Gauge/>} label="Velocidade média" value={`${entry.averageSpeedKmh.toLocaleString("pt-BR",{maximumFractionDigits:1})} km/h`} className={base}/>}
  <Metric icon={<Timer/>} label="Tempo" value={formatExerciseDuration(exerciseSeconds(entry.durationSeconds,entry.durationMinutes))} className={base}/>
  {entry.caloriesBurned!=null&&<Metric icon={<Flame/>} label={calorieLabel(entry.calorieSource)} value={formatCalories(entry.caloriesBurned)} className={base}/>}
 </span>
}

function Metric({icon,label,value,className}:{icon:React.ReactNode;label:string;value:string;className:string}){return <span className={`inline-flex flex-col gap-1 rounded-xl px-2 py-1.5 ${className}`}><span className="flex items-center gap-1 text-[9px] font-medium"><span aria-hidden="true" className="[&>svg]:size-3">{icon}</span>{label}</span><strong className="whitespace-nowrap text-[11px] tabular-nums">{value}</strong></span>}

function SleepCard({entry,week,goalHours,latestAt,onClick,celebrationId,celebrationBlocked,onCelebrationDone}:{entry:SleepEntry|null;week:SleepWeek|null;goalHours:string;latestAt:string;onClick:()=>void;celebrationId:number|null;celebrationBlocked:boolean;onCelebrationDone:()=>void}){
 const celebrationAnchorRef=useRef<HTMLSpanElement>(null);
 const [celebrating,setCelebrating]=useState(false);
 useEffect(()=>{
  setCelebrating(false);
  if(celebrationId===null||celebrationBlocked||!celebrationAnchorRef.current)return;
  let timer:number|undefined;
  const observer=new IntersectionObserver(entries=>{
   if(timer!==undefined||!entries.some(entry=>entry.isIntersecting&&entry.intersectionRatio>=.99))return;
   setCelebrating(true);observer.disconnect();
   timer=window.setTimeout(()=>{setCelebrating(false);onCelebrationDone()},SLEEP_CELEBRATION_MS);
  },{threshold:.99});
  observer.observe(celebrationAnchorRef.current);
  return ()=>{observer.disconnect();window.clearTimeout(timer)};
 },[celebrationId,celebrationBlocked,onCelebrationDone]);
 return <div className="sleep-card-shell" data-celebrating={celebrating}>
 <span ref={celebrationAnchorRef} className="sleep-celebration-anchor" aria-hidden="true"/>
 <button onClick={onClick} className="min-w-0 rounded-3xl bg-white p-4 text-left shadow-sm ring-1 ring-stone-100 outline-none transition hover:-translate-y-1 focus-visible:ring-4 focus-visible:ring-indigo-200">
  <span className="sleep-card-readings">
  <span className="grid size-10 place-items-center rounded-2xl bg-indigo-100 text-indigo-700"><MoonStar/></span>
  <p className="mt-5 text-sm text-stone-500">Sono</p>
  <b className="mt-1 block text-base leading-tight">{entry?formatDuration(entry.durationMinutes):"Registrar sono"}</b>
  {entry?<SleepMetrics entry={entry}/>:<span className="mt-2 flex flex-wrap gap-1.5"><Metric icon={<Target/>} label="Meta de sono" value={`${goalHours}h`} className="bg-indigo-50 text-indigo-700"/></span>}
  {week&&week.completedDays>0&&<span className="mt-3 block text-[11px] font-medium text-stone-400">Semana · média {formatDuration(week.averageMinutes)}</span>}
  {latestAt&&<span className="mt-1 block text-[11px] font-medium text-stone-400">Último registro · {formatLatestTime(latestAt)}</span>}
  </span>
 </button>
 <span className="sleep-card-celebration" role="status" aria-live="polite" aria-atomic="true">{celebrating&&entry&&<SleepCelebration durationLabel={formatDuration(entry.durationMinutes)}/>}</span>
 </div>
}

function SleepMetrics({entry,dark=false}:{entry:SleepEntry;dark?:boolean}){
 const base=dark?"bg-white/10 text-white/80":"bg-indigo-50 text-indigo-700";
 return <span className="mt-2 flex flex-wrap gap-1.5">
  <Metric icon={<MoonStar/>} label="Deitei às" value={entry.bedtime} className={base}/>
  <Metric icon={<Sun/>} label="Acordei às" value={entry.wakeTime} className={base}/>
 </span>
}

function WaterMetrics({total,goal,week,dark=false,colored=false}:{total:number;goal:number;week:WaterWeek|null;dark?:boolean;colored?:boolean}){
 const base=dark?"bg-white/10 text-white/80":colored?"bg-sky-950/20 text-white":"bg-sky-50 text-sky-700";
 const remaining=Math.max(0,goal-total);
 return <span className="mt-2 flex flex-wrap gap-1.5">
  <Metric icon={<Target/>} label="Meta diária" value={formatMilliliters(goal)} className={base}/>
  <Metric icon={<Droplets/>} label={remaining>0?"Faltam hoje":"Meta atingida"} value={remaining>0?formatMilliliters(remaining):"100%"} className={base}/>
  {week&&<Metric icon={<CalendarDays/>} label="Média semanal" value={`${formatLiters(week.averageMl)}/dia`} className={base}/>}
 </span>
}

function WeightCard({summary,fallbackWeight,latestAt,onClick,goalReached,celebration,celebrationBlocked,onCelebrationDone}:{summary:WeightSummary|null;fallbackWeight:number;latestAt:string;onClick:()=>void;goalReached:boolean;celebration:WeightCelebrationEvent|null;celebrationBlocked:boolean;onCelebrationDone:()=>void}){
 const celebrationAnchorRef=useRef<HTMLSpanElement>(null);
 const [celebrating,setCelebrating]=useState(false);
 useEffect(()=>{
  setCelebrating(false);
  if(!celebration||celebrationBlocked||!celebrationAnchorRef.current)return;
  let timer:number|undefined;
  const observer=new IntersectionObserver(entries=>{
   if(timer!==undefined||!entries.some(entry=>entry.isIntersecting&&entry.intersectionRatio>=.99))return;
   setCelebrating(true);observer.disconnect();
   timer=window.setTimeout(()=>{setCelebrating(false);onCelebrationDone()},WEIGHT_CELEBRATION_MS);
  },{threshold:.99});
  observer.observe(celebrationAnchorRef.current);
  return ()=>{observer.disconnect();window.clearTimeout(timer)};
 },[celebration,celebrationBlocked,onCelebrationDone]);
 return <div className="weight-card-shell" data-celebrating={celebrating} data-goal-reached={goalReached}>
  <span ref={celebrationAnchorRef} className="weight-celebration-anchor" aria-hidden="true"/>
  <button onClick={onClick} className="weight-card-surface min-w-0 rounded-3xl bg-white p-5 text-left shadow-sm ring-1 ring-stone-100 outline-none transition hover:-translate-y-1 focus-visible:ring-4 focus-visible:ring-amber-200">
   <span className="weight-card-readings"><span className="flex min-w-0 items-start gap-4"><span className="weight-card-icon grid size-11 shrink-0 place-items-center rounded-2xl bg-amber-100 text-amber-700">{goalReached?<WeightAward kind="trophy" className="weight-goal-trophy"/>:<Scale/>}</span><span className="min-w-0"><span className="weight-card-label"><span className="text-sm text-stone-500">Peso atual</span>{goalReached&&<span className="weight-goal-badge"><Check size={12} aria-hidden="true"/>Meta alcançada</span>}</span><b className="text-xl">{formatWeight(summary?.currentWeightKg??fallbackWeight)} kg</b><WeightMetrics summary={summary}/>{latestAt&&<span className="mt-1 block text-[11px] font-medium text-stone-400">Último registro · {formatLatestTime(latestAt)}</span>}</span></span><ChevronRight className="shrink-0 text-stone-300"/></span>
  </button>
  <span className="weight-card-celebration" role="status" aria-live="polite" aria-atomic="true">{celebrating&&celebration&&<WeightCelebration changeKg={celebration.changeKg} kind={celebration.kind}/>}</span>
 </div>
}

function WeightMetrics({summary,dark=false}:{summary:WeightSummary|null;dark?:boolean}){
 if(!summary)return <span className={`mt-2 block text-xs ${dark?"text-white/55":"text-stone-400"}`}>Registre para acompanhar sua evolução</span>;
 const base=dark?"bg-white/10 text-white/80":"bg-amber-50 text-amber-800";
 const change=summary.changeKg;
 return <span className="mt-2 flex flex-wrap gap-1.5">
  <Metric icon={<Scale/>} label="Peso inicial" value={`${formatWeight(summary.initialWeightKg)} kg`} className={base}/>
  <Metric icon={change<0?<TrendingDown/>:change>0?<TrendingUp/>:<Minus/>} label="Desde o início" value={`${change>0?"+":""}${formatWeight(change)} kg`} className={base}/>
 </span>
}

function formatDuration(minutes:number){const hours=Math.floor(minutes/60),remaining=minutes%60;if(!hours)return `${remaining}min`;return remaining?`${hours}h ${remaining}min`:`${hours}h`}
function formatWeight(value:number){return value.toLocaleString("pt-BR",{minimumFractionDigits:1,maximumFractionDigits:1})}
function formatDistance(value:number){return `${value.toLocaleString("pt-BR",{maximumFractionDigits:2})} km`}
function formatPace(totalSeconds:number){const minutes=Math.floor(totalSeconds/60),seconds=String(totalSeconds%60).padStart(2,"0");return `${minutes}:${seconds} /km`}
function formatMilliliters(value:number){return `${value.toLocaleString("pt-BR")} ml`}
function formatLiters(value:number){return `${(value/1000).toLocaleString("pt-BR",{minimumFractionDigits:1,maximumFractionDigits:2})} L`}
function formatCalories(value:number){return `${value.toLocaleString("pt-BR")}\u00a0kcal`}
function formatLatestTime(value:string){const normalized=value.includes("T")?value:`${value.replace(" ","T")}Z`;const date=new Date(normalized);return Number.isNaN(date.getTime())?"":`Hoje, ${date.toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})}`}
