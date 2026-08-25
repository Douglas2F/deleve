import { Activity, ArrowRight, BookOpen, Check, Droplets, MoonStar, Sparkles, Target } from "lucide-react";
import Brand from "./Brand";

type LandingPageProps = { onStart: () => void };

const benefits = [
  { icon: Droplets, title: "Registre em segundos", text: "Água, sono, peso e exercícios sem formulários cansativos." },
  { icon: Target, title: "Metas que fazem sentido", text: "Você escolhe seus objetivos e vê somente o que importa agora." },
  { icon: Sparkles, title: "Evolução sem pressão", text: "Acompanhe o progresso com clareza, no seu ritmo e sem cobranças." },
];

export default function LandingPage({ onStart }: LandingPageProps) {
  return (
    <main className="overflow-hidden bg-[#f7f9f7] text-stone-900">
      <header className="relative z-30 mx-auto flex max-w-7xl items-center justify-between px-5 py-5 md:px-10">
        <Brand />
        <nav className="hidden items-center gap-8 text-sm font-semibold text-stone-500 md:flex" aria-label="Navegação da apresentação">
          <a href="#recursos" className="transition hover:text-emerald-700">Recursos</a>
          <a href="#como-funciona" className="transition hover:text-emerald-700">Como funciona</a>
        </nav>
        <button onClick={onStart} className="rounded-full bg-stone-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-emerald-800 md:px-5">
          Começar
        </button>
      </header>

      <section className="relative mx-auto grid min-h-[calc(100vh-80px)] max-w-7xl items-center gap-12 px-5 pb-20 pt-12 md:grid-cols-[1.05fr_.95fr] md:px-10 md:pb-28 md:pt-16">
        <div className="pointer-events-none absolute -right-60 -top-52 size-[38rem] rounded-full bg-gradient-to-br from-emerald-200/60 via-cyan-100/35 to-transparent blur-3xl" />
        <div className="relative z-10 max-w-2xl animate-rise">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-200/80 bg-white/80 px-3.5 py-2 text-xs font-bold text-emerald-800 shadow-sm backdrop-blur">
            <span className="relative flex size-2"><span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60" /><span className="relative inline-flex size-2 rounded-full bg-emerald-600" /></span>
            Mais constância, menos complicação
          </div>
          <h1 className="max-w-[11ch] text-[clamp(3.6rem,9vw,7.4rem)] font-semibold leading-[.88] tracking-[-.07em]">
            Sua rotina pode ser mais <span className="bg-gradient-to-r from-emerald-700 via-teal-600 to-cyan-500 bg-clip-text text-transparent">leve.</span>
          </h1>
          <p className="mt-7 max-w-xl text-pretty text-lg leading-8 text-stone-600 md:text-xl">
            Um assistente pessoal para transformar objetivos em pequenas ações que realmente cabem no seu dia.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <button onClick={onStart} className="group flex min-h-14 items-center justify-between rounded-2xl bg-emerald-800 px-5 font-semibold text-white shadow-xl shadow-emerald-900/15 transition hover:-translate-y-0.5 hover:bg-emerald-900 sm:min-w-64">
              Criar minha rotina <ArrowRight size={20} className="transition group-hover:translate-x-1" />
            </button>
            <a href="#como-funciona" className="flex min-h-14 items-center justify-center rounded-2xl border border-stone-200 bg-white/70 px-5 font-semibold text-stone-700 backdrop-blur transition hover:bg-white">
              Ver como funciona
            </a>
          </div>
          <div className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-sm text-stone-500">
            {['Configuração rápida', 'Metas personalizadas', 'Você controla os lembretes'].map(item => <span className="flex items-center gap-1.5" key={item}><Check size={15} className="text-emerald-700" />{item}</span>)}
          </div>
        </div>

        <ProductPreview />
      </section>

      <section id="recursos" className="bg-white py-20 md:py-28">
        <div className="mx-auto max-w-7xl px-5 md:px-10">
          <div className="max-w-2xl"><p className="text-xs font-bold uppercase tracking-[.18em] text-emerald-700">Feito para a vida real</p><h2 className="mt-3 text-4xl font-semibold tracking-[-.045em] md:text-6xl">Organizar sem virar mais uma obrigação.</h2></div>
          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {benefits.map(({ icon: Icon, title, text }, index) => (
              <article className="group rounded-[1.75rem] border border-stone-100 bg-[#f8faf8] p-6 transition hover:-translate-y-1 hover:border-emerald-100 hover:shadow-xl hover:shadow-emerald-900/5 md:p-8" key={title}>
                <div className="flex items-start justify-between"><span className="grid size-12 place-items-center rounded-2xl bg-emerald-100 text-emerald-800"><Icon size={22} /></span><span className="text-xs font-bold text-stone-300">0{index + 1}</span></div>
                <h3 className="mt-10 text-xl font-semibold">{title}</h3><p className="mt-3 leading-7 text-stone-500">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="como-funciona" className="bg-stone-950 py-20 text-white md:py-28">
        <div className="mx-auto grid max-w-7xl gap-14 px-5 md:grid-cols-2 md:px-10">
          <div><p className="text-xs font-bold uppercase tracking-[.18em] text-emerald-400">Do seu jeito</p><h2 className="mt-3 max-w-xl text-4xl font-semibold tracking-[-.045em] md:text-6xl">Comece pequeno. Evolua com clareza.</h2><p className="mt-6 max-w-lg text-lg leading-8 text-stone-400">A Deleve pergunta somente o necessário e monta uma experiência alinhada ao que você quer melhorar agora.</p></div>
          <div className="space-y-3">
            {[['01','Escolha sua prioridade','Comece por Saúde e ative outros módulos quando fizer sentido.'],['02','Defina objetivos reais','As metas aparecem somente quando ajudam no objetivo escolhido.'],['03','Registre e acompanhe','Poucos toques para entender seu dia e sua evolução.']].map(([number,title,text])=><article className="flex gap-4 rounded-3xl border border-white/10 bg-white/[.04] p-5" key={number}><span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-emerald-400/10 text-sm font-bold text-emerald-400">{number}</span><div><h3 className="font-semibold">{title}</h3><p className="mt-1 text-sm leading-6 text-stone-400">{text}</p></div></article>)}
          </div>
        </div>
      </section>

      <section className="bg-white px-5 py-20 md:px-10 md:py-28">
        <div className="relative mx-auto max-w-5xl overflow-hidden rounded-[2rem] bg-gradient-to-br from-emerald-800 via-teal-700 to-cyan-600 px-6 py-12 text-center text-white shadow-2xl shadow-emerald-900/20 md:px-16 md:py-20">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,.2),transparent_40%)]" />
          <div className="relative"><p className="text-sm font-semibold text-emerald-100">Sua rotina não precisa ser perfeita.</p><h2 className="mx-auto mt-3 max-w-3xl text-4xl font-semibold tracking-[-.05em] md:text-6xl">Ela só precisa começar.</h2><button onClick={onStart} className="mx-auto mt-8 flex min-h-14 min-w-60 items-center justify-between rounded-2xl bg-white px-5 font-semibold text-emerald-900 shadow-lg transition hover:-translate-y-0.5">Começar agora <ArrowRight size={20} /></button></div>
        </div>
      </section>

      <footer className="border-t border-stone-100 bg-white px-5 py-8 md:px-10"><div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 text-center text-xs text-stone-400 sm:flex-row sm:text-left"><Brand showTagline={false} /><p>Informação para acompanhamento, não diagnóstico médico.</p><p>© 2026 Deleve</p></div></footer>
    </main>
  );
}

function ProductPreview() {
  return (
    <div className="relative z-10 mx-auto w-full max-w-md animate-rise md:max-w-lg">
      <div className="absolute -inset-6 rounded-[3rem] bg-gradient-to-br from-emerald-300/30 to-cyan-300/20 blur-2xl" />
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
