import { FormEvent, useEffect, useState } from "react";
import { Scale, TrendingDown, TrendingUp, X } from "lucide-react";

export type WeightHistoryEntry={recordedOn:string;weightKg:number};
export type WeightSummary={initialDate?:string;initialWeightKg:number;currentWeightKg:number;changeKg:number;history:WeightHistoryEntry[]};

type WeightDialogProps={open:boolean;onClose:()=>void;onSaved:(summary:WeightSummary)=>void;summary:WeightSummary|null;fallbackWeight:string};

export default function WeightDialog({open,onClose,onSaved,summary,fallbackWeight}:WeightDialogProps){
 const [weight,setWeight]=useState(fallbackWeight);
 const [saving,setSaving]=useState(false);
 const [error,setError]=useState("");

 useEffect(()=>{
  if(!open)return;
  setWeight(String(summary?.currentWeightKg??fallbackWeight));
  setError("");
 },[open,summary,fallbackWeight]);

 if(!open)return null;

 async function save(event:FormEvent){
  event.preventDefault();setSaving(true);setError("");
  try{
   const response=await fetch("/api/health/weight",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({weightKg:weight})});
   const body=await response.json().catch(()=>({})) as WeightSummary&{error?:string};
   if(!response.ok)throw new Error(body.error??"Não foi possível registrar o peso.");
   onSaved(body);onClose();
  }catch(caught){setError(caught instanceof Error?caught.message:"Não foi possível registrar o peso.")}
  finally{setSaving(false)}
 }

 const change=summary?.changeKg??0;
 const initialDate=summary?(summary.initialDate??summary.history[summary.history.length-1]?.recordedOn):undefined;
 return <div className="health-dialog-overlay fixed inset-0 z-50 bg-stone-950/45 p-0 backdrop-blur-sm sm:p-5">
  <section role="dialog" aria-modal="true" aria-labelledby="weight-dialog-title" className="health-dialog-panel w-full max-w-lg rounded-t-[2rem] bg-white p-6 shadow-2xl sm:rounded-[2rem] sm:p-7">
   <header className="flex items-start justify-between gap-4"><div className="flex items-center gap-3"><span className="grid size-11 place-items-center rounded-2xl bg-amber-100 text-amber-700"><Scale size={21}/></span><div><p className="text-xs font-semibold text-amber-700">Acompanhamento</p><h2 id="weight-dialog-title" className="text-xl font-bold">Registrar peso</h2></div></div><button type="button" onClick={onClose} aria-label="Fechar registro de peso" className="grid size-10 place-items-center rounded-xl bg-stone-100 text-stone-600 outline-none focus-visible:ring-4 focus-visible:ring-amber-200"><X size={19}/></button></header>
   <form onSubmit={save} className="mt-6"><label className="block text-sm font-bold text-stone-700">Peso de hoje (kg)<input required autoFocus type="number" min="20" max="400" step="0.1" inputMode="decimal" value={weight} onChange={event=>setWeight(event.target.value)} className="mt-2 block h-14 w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 text-xl font-bold outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-100"/></label>{error&&<p role="alert" className="mt-4 rounded-2xl bg-rose-50 p-4 text-sm text-rose-700">{error}</p>}<button disabled={saving} className="weight-dialog-save mt-5 min-h-14 w-full rounded-2xl px-5 font-bold text-white outline-none transition focus-visible:ring-4 focus-visible:ring-amber-200 disabled:opacity-60">{saving?"Salvando...":"Salvar peso"}</button></form>
   {summary&&<section className="mt-6 border-t border-stone-100 pt-5"><div className="grid grid-cols-2 gap-3"><Summary label="Peso inicial" value={`${formatWeight(summary.initialWeightKg)} kg`} detail={`Início · ${formatInitialDate(initialDate)}`}/><Summary label="Evolução" value={change===0?"Sem alteração":`${change>0?"+":""}${formatWeight(change)} kg`} icon={change>0?<TrendingUp size={16}/>:change<0?<TrendingDown size={16}/>:undefined}/></div><h3 className="mt-6 text-sm font-bold text-stone-800">Histórico recente</h3><ul className="mt-2 divide-y divide-stone-100">{summary.history.slice(0,5).map(entry=><li key={entry.recordedOn} className="flex items-center justify-between py-3 text-sm"><span className="text-stone-500">{formatDate(entry.recordedOn)}</span><b>{formatWeight(entry.weightKg)} kg</b></li>)}</ul></section>}
  </section>
 </div>
}

function Summary({label,value,detail,icon}:{label:string;value:string;detail?:string;icon?:React.ReactNode}){return <div className="rounded-2xl bg-amber-50 p-4"><p className="text-xs font-semibold text-amber-700">{label}</p><p className="mt-1 flex items-center gap-1 text-base font-bold text-stone-900">{icon}{value}</p>{detail&&<p className="mt-1 text-[11px] text-stone-500">{detail}</p>}</div>}
function formatWeight(value:number){return value.toLocaleString("pt-BR",{minimumFractionDigits:1,maximumFractionDigits:1})}
function formatDate(value:string){return new Date(`${value}T12:00:00`).toLocaleDateString("pt-BR",{day:"2-digit",month:"short"})}
function formatInitialDate(value?:string){if(!value)return "data não disponível";const parsed=new Date(`${value}T12:00:00`);if(Number.isNaN(parsed.getTime()))return "data não disponível";return parsed.toLocaleDateString("pt-BR",{day:"2-digit",month:"short",year:"numeric"})}
