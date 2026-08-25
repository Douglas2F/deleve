import { Activity, ChevronRight, Droplets, MoonStar, Plus, Scale } from "lucide-react";

export type HealthProfile={name:string;heightCm:string;weightKg:string;goal:string;sleepGoalHours:string;waterGoalMl:string};

export default function Dashboard({profile}:{profile:HealthProfile}){
 const firstName=profile.name.trim().split(" ")[0];
 return <main className="min-h-screen bg-[#f6f8f6] text-stone-900"><section className="mx-auto min-h-screen max-w-5xl px-5 pb-28 pt-7 md:px-10">
  <header className="flex items-center justify-between"><div><p className="text-sm text-stone-500">Olá, {firstName}</p><h1 className="text-2xl font-semibold tracking-tight">Seu dia, de leve.</h1></div><div className="grid size-11 place-items-center rounded-2xl bg-gradient-to-br from-emerald-700 to-cyan-500 font-bold text-white">D</div></header>
  <div className="mt-8 flex items-end justify-between"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-emerald-700">Saúde — Hoje</p><h2 className="mt-1 text-3xl font-semibold tracking-[-.04em]">Um passo de cada vez.</h2></div><span className="hidden text-sm text-stone-400 md:block">{profile.goal}</span></div>
  <section className="mt-6 grid gap-4 md:grid-cols-2">
   <article className="rounded-3xl bg-gradient-to-br from-sky-600 to-cyan-500 p-6 text-white shadow-xl shadow-sky-900/10"><div className="flex justify-between"><span className="grid size-11 place-items-center rounded-2xl bg-white/20"><Droplets/></span><button className="grid size-10 place-items-center rounded-full bg-white text-sky-700"><Plus/></button></div><p className="mt-8 text-sm text-sky-100">Água</p><p className="mt-1 text-3xl font-semibold">0 ml <span className="text-base font-medium text-sky-100">/ {profile.waterGoalMl} ml</span></p><div className="mt-4 h-2 rounded-full bg-white/20"><div className="h-full w-0 rounded-full bg-white"/></div><button className="mt-5 flex items-center gap-1 text-sm font-semibold">+ 1 copo <ChevronRight size={16}/></button></article>
   <div className="grid grid-cols-2 gap-4">
    <Mini icon={<MoonStar/>} title="Sono" value={`Meta ${profile.sleepGoalHours}h`} color="bg-indigo-100 text-indigo-700"/>
    <Mini icon={<Activity/>} title="Exercício" value="Não registrado" color="bg-rose-100 text-rose-700"/>
    <article className="col-span-2 flex items-center justify-between rounded-3xl bg-white p-5 shadow-sm ring-1 ring-stone-100"><div className="flex items-center gap-4"><span className="grid size-11 place-items-center rounded-2xl bg-amber-100 text-amber-700"><Scale/></span><div><p className="text-sm text-stone-500">Peso atual</p><b className="text-xl">{profile.weightKg} kg</b></div></div><ChevronRight className="text-stone-300"/></article>
   </div>
  </section>
  <section className="mt-5 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-stone-100"><div className="flex justify-between"><div><p className="text-sm text-stone-500">Progresso de hoje</p><h3 className="mt-1 text-xl font-semibold">Comece com um registro</h3></div><span className="text-sm font-semibold text-emerald-700">0 de 3</span></div><div className="mt-5 h-2 rounded-full bg-stone-100"><div className="h-full w-[4%] rounded-full bg-gradient-to-r from-emerald-600 to-cyan-500"/></div><p className="mt-4 text-sm text-stone-500">Sem pressão. Cada pequeno registro já conta.</p></section>
 </section></main>
}

function Mini({icon,title,value,color}:{icon:React.ReactNode;title:string;value:string;color:string}){return <button className="rounded-3xl bg-white p-4 text-left shadow-sm ring-1 ring-stone-100 transition hover:-translate-y-1"><span className={`grid size-10 place-items-center rounded-2xl ${color}`}>{icon}</span><p className="mt-5 text-sm text-stone-500">{title}</p><b className="mt-1 block text-sm">{value}</b></button>}
