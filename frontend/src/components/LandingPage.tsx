import DeleveSymbol from "./DeleveSymbol";
import { Activity, ArrowRight, BookOpen, Check, Droplets, GraduationCap, HeartPulse, Home, MoonStar } from "lucide-react";
import Brand from "./Brand";

type LandingPageProps = { onStart: () => void };

export default function LandingPage({ onStart }: LandingPageProps) {
  return (
    <main className="min-h-screen overflow-hidden bg-[#e9efec] p-0 text-stone-900 lg:p-4">
      <div className="mx-auto flex min-h-screen max-w-[1480px] overflow-hidden bg-[#f7f9f7] shadow-2xl shadow-emerald-950/10 lg:min-h-[calc(100vh-2rem)] lg:rounded-[2rem] lg:border lg:border-white">
        <aside className="hidden w-64 shrink-0 flex-col border-r border-stone-200/70 bg-white px-5 py-6 lg:flex">
          <Brand />

          <nav className="mt-12" aria-label="Áreas do aplicativo">
            <p className="px-3 text-[.68rem] font-bold uppercase tracking-[.18em] text-stone-400">Seu espaço</p>
            <div className="mt-3 flex items-center gap-3 rounded-2xl bg-emerald-50 px-3 py-3 text-sm font-bold text-emerald-800">
              <span className="grid size-9 place-items-center rounded-xl bg-emerald-700 text-white"><Home size={18} /></span>
              Início
            </div>
          </nav>

          <section className="mt-9" aria-labelledby="module-list-title">
            <p id="module-list-title" className="px-3 text-[.68rem] font-bold uppercase tracking-[.18em] text-stone-400">Módulos</p>
            <div className="mt-3 space-y-1.5">
              <ModuleItem icon={<HeartPulse size={18} />} name="Saúde" detail="Disponível agora" active />
              <ModuleItem icon={<GraduationCap size={18} />} name="Estudos" detail="Em breve" />
              <ModuleItem icon={<BookOpen size={18} />} name="Leitura" detail="Em breve" />
            </div>
          </section>

          <div className="mt-auto rounded-2xl bg-stone-950 p-4 text-white">
            <DeleveSymbol size={19} className="text-emerald-400" />
            <p className="mt-3 text-sm font-semibold">Comece do seu jeito.</p>
            <p className="mt-1 text-xs leading-5 text-stone-400">Ative somente o que deseja acompanhar agora.</p>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center justify-between border-b border-stone-200/70 bg-white/75 px-5 py-4 backdrop-blur md:px-8 lg:px-10">
            <div className="lg:hidden"><Brand /></div>
            <div className="app-desktop-label">
              <p className="text-xs font-semibold text-stone-400">Seu espaço</p>
              <p className="font-bold">Início</p>
            </div>
            <span className="rounded-full bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800">Primeiro acesso</span>
          </header>

          <section className="relative flex flex-1 items-center overflow-hidden px-5 py-6 md:px-8 lg:px-10" aria-labelledby="welcome-title">
            <div className="pointer-events-none absolute -right-52 -top-48 size-[38rem] rounded-full bg-gradient-to-br from-emerald-200/60 via-cyan-100/40 to-transparent blur-3xl" />
            <div className="app-welcome-grid relative mx-auto w-full max-w-6xl items-center gap-8">
              <div className="max-w-xl animate-rise">
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-3.5 py-2 text-xs font-bold text-emerald-800 shadow-sm">
                  <span className="relative flex size-2"><span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60" /><span className="relative inline-flex size-2 rounded-full bg-emerald-600" /></span>
                  Seu espaço começa aqui
                </div>

                <h1 id="welcome-title" className="hero mt-6">
                  Sua rotina, <span className="kinetic-gradient bg-gradient-to-r from-emerald-700 via-teal-600 to-cyan-500 bg-clip-text text-transparent">do seu jeito.</span>
                </h1>
                <p className="mt-6 max-w-lg text-lg leading-8 text-stone-600">
                  Configure o módulo Saúde e comece a acompanhar seu dia com poucos toques.
                </p>

                <div className="mt-8 rounded-3xl border border-stone-200/80 bg-white p-5 shadow-lg shadow-stone-900/5 md:p-6">
                  <div className="flex items-center gap-3">
                    <span className="grid size-11 place-items-center rounded-2xl bg-emerald-100 text-emerald-800"><HeartPulse size={21} /></span>
                    <div><p className="text-xs font-semibold text-stone-400">Primeiro passo</p><h2 className="font-bold">Configure sua rotina de saúde</h2></div>
                  </div>
                  <div className="mt-5 grid gap-3 text-sm text-stone-600 sm:grid-cols-2">
                    <span className="flex items-center gap-2"><Check size={16} className="text-emerald-700" />Somente 3 etapas</span>
                    <span className="flex items-center gap-2"><Check size={16} className="text-emerald-700" />Você pode alterar depois</span>
                  </div>
                  <button onClick={onStart} className="group mt-6 flex min-h-14 w-full items-center justify-between rounded-2xl bg-emerald-800 px-5 font-bold text-white outline-none transition hover:bg-emerald-900 focus-visible:ring-4 focus-visible:ring-emerald-300">
                    Começar configuração <ArrowRight size={20} className="transition group-hover:translate-x-1" />
                  </button>
                </div>

                <p className="mt-4 text-center text-xs leading-5 text-stone-400 sm:text-left">Leva cerca de 2 minutos. Solicitaremos apenas os dados necessários.</p>
              </div>

              <div className="app-preview-frame">
                <ProductPreview />
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function ModuleItem({ icon, name, detail, active = false }: { icon: React.ReactNode; name: string; detail: string; active?: boolean }) {
  return (
    <div className={"flex items-center gap-3 rounded-2xl px-3 py-3 " + (active ? "text-stone-800" : "text-stone-400")}>
      <span className={"grid size-9 place-items-center rounded-xl " + (active ? "bg-cyan-50 text-cyan-700" : "bg-stone-100")}>{icon}</span>
      <span><b className="block text-sm">{name}</b><small className="text-[.68rem] font-medium">{detail}</small></span>
    </div>
  );
}

function ProductPreview() {
  return (
    <div className="kinetic-float relative z-10 mx-auto w-full max-w-md animate-rise md:max-w-lg">
      <div className="absolute -inset-6 rounded-[3rem] bg-gradient-to-br from-emerald-300/30 to-cyan-300/20 blur-2xl" />
      <div className="kinetic-orbit pointer-events-none absolute -inset-8 rounded-[3rem] border border-emerald-400/20"><span className="absolute -top-1 left-1/2 size-2 rounded-full bg-emerald-500 shadow-[0_0_18px_rgba(16,185,129,.8)]" /></div>
      <div className="relative rounded-[2rem] border border-white/80 bg-white/80 p-4 shadow-2xl shadow-stone-900/15 backdrop-blur-xl md:p-6">
        <div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[.15em] text-stone-400">Saúde — Hoje</p><h2 className="mt-1 text-2xl font-semibold tracking-tight">Bom dia, Douglas</h2></div><span className="grid size-11 place-items-center rounded-2xl bg-emerald-100 text-emerald-800"><Activity size={21} /></span></div>
        <div className="mt-6 rounded-3xl bg-gradient-to-br from-sky-600 to-cyan-500 p-5 text-white"><div className="flex justify-between"><span className="grid size-10 place-items-center rounded-2xl bg-white/20"><Droplets size={20} /></span><b className="text-sm">60%</b></div><p className="mt-7 text-sm text-sky-100">Água</p><p className="mt-1 text-3xl font-semibold">1,2 L <span className="text-sm font-medium text-sky-100">/ 2 L</span></p><div className="mt-4 h-2 rounded-full bg-white/20"><div className="h-full w-3/5 rounded-full bg-white" /></div></div>
        <div className="mt-3 grid grid-cols-2 gap-3"><PreviewCard icon={<MoonStar size={19} />} title="Sono" value="7h 20min" color="bg-indigo-100 text-indigo-700" /><PreviewCard icon={<Activity size={19} />} title="Movimento" value="Caminhada" color="bg-rose-100 text-rose-700" /></div>
        <div className="mt-3 flex items-center justify-between rounded-2xl bg-stone-900 p-4 text-white"><div><p className="text-xs text-stone-400">Seu dia</p><b className="text-sm">2 de 3 registros</b></div><div className="grid size-10 place-items-center rounded-full bg-emerald-400/15 text-emerald-400"><BookOpen size={18} /></div></div>
      </div>
    </div>
  );
}

function PreviewCard({ icon, title, value, color }: { icon: React.ReactNode; title: string; value: string; color: string }) {
  return <div className="rounded-2xl bg-white p-4 ring-1 ring-stone-100"><span className={`grid size-9 place-items-center rounded-xl ${color}`}>{icon}</span><p className="mt-4 text-xs text-stone-400">{title}</p><b className="text-sm">{value}</b></div>;
}
