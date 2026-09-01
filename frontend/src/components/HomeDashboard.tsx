import { Activity, CalendarCheck2, Check, Droplets, GraduationCap, HeartPulse, Landmark, MoonStar, RefreshCw, Scale, Sparkles, Target, WifiOff } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import Brand from "./Brand";
import type { HealthProfile, HealthShortcut, HomeFeedback } from "./Dashboard";

type HomeDashboardProps = {
  profile: HealthProfile;
  onOpenHealth: (shortcut?: HealthShortcut) => void;
  feedback: HomeFeedback | null;
  onFeedbackDone: () => void;
};

type HealthToday = {
  waterTotalMl: number;
  sleepMinutes: number | null;
  sleepGoalReached: boolean;
  exerciseSeconds: number;
  exerciseRecorded: boolean;
  weight: { initialWeightKg: number; currentWeightKg: number; changeKg: number } | null;
  challenge: { text: string; completed: boolean } | null;
};

const emptyHealthToday: HealthToday = {
  waterTotalMl: 0,
  sleepMinutes: null,
  sleepGoalReached: false,
  exerciseSeconds: 0,
  exerciseRecorded: false,
  weight: null,
  challenge: null,
};

const modules = [
  {
    id: "health",
    title: "Saúde",
    status: "Disponível",
    icon: HeartPulse,
    enabled: true,
    surface: "from-emerald-50 via-teal-50 to-cyan-100/80",
    iconSurface: "from-emerald-700 to-teal-500",
    glow: "bg-cyan-300/35",
  },
  {
    id: "studies",
    title: "Estudos",
    status: "Em breve",
    icon: GraduationCap,
    enabled: false,
    surface: "from-violet-50 via-indigo-50 to-violet-100/80",
    iconSurface: "from-indigo-600 to-violet-500",
    glow: "bg-violet-300/30",
  },
  {
    id: "finances",
    title: "Finanças",
    status: "Em breve",
    icon: Landmark,
    enabled: false,
    surface: "from-sky-50 via-blue-50 to-sky-100/80",
    iconSurface: "from-sky-700 to-blue-500",
    glow: "bg-sky-300/30",
  },
  {
    id: "routine",
    title: "Rotina",
    status: "Em breve",
    icon: CalendarCheck2,
    enabled: false,
    surface: "from-amber-50 via-orange-50 to-amber-100/80",
    iconSurface: "from-amber-600 to-orange-500",
    glow: "bg-amber-300/30",
  },
] as const;

export default function HomeDashboard({ profile, onOpenHealth, feedback, onFeedbackDone }: HomeDashboardProps) {
  const firstName = profile.name.trim().split(" ")[0] || "você";
  const waterGoalMl = Math.max(Number(profile.waterGoalMl) || 2_000, 1);
  const sleepGoalMinutes = Math.max(Number(profile.sleepGoalHours) || 8, 1) * 60;
  const [initialHealth] = useState(readCachedHealthToday);
  const [healthToday, setHealthToday] = useState<HealthToday>(initialHealth ?? emptyHealthToday);
  const [healthHasData, setHealthHasData] = useState(initialHealth !== null);
  const [healthLoading, setHealthLoading] = useState(true);
  const [healthUnavailable, setHealthUnavailable] = useState(false);
  const [healthRefresh, setHealthRefresh] = useState(0);
  const [achievementMessages, setAchievementMessages] = useState<Partial<Record<CareTone, string>>>({});
  const [challengeCelebrating, setChallengeCelebrating] = useState(false);
  const achievementTimer = useRef<number | null>(null);
  const challengeTimer = useRef<number | null>(null);

  useEffect(() => {
    if (!feedback) return;
    const timer = window.setTimeout(onFeedbackDone, 2_400);
    return () => window.clearTimeout(timer);
  }, [feedback?.id]);

  useEffect(() => {
    const controller = new AbortController();
    let retryTimer: number | null = null;
    setHealthLoading(true);
    const read = async <T,>(url: string): Promise<T> => {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) throw new Error(`Falha ao atualizar ${url}`);
      return (await response.json()) as T;
    };

    Promise.all([
      read<{ totalMl: number }>("/api/health/water/today"),
      read<{ entry: { date: string; durationMinutes: number } | null }>("/api/health/sleep/today"),
      read<{ entry: unknown | null; totalSeconds?: number; totalMinutes: number }>("/api/health/exercise/today"),
      read<{ focus: { text: string; completed: boolean } | null }>("/api/health/focus/today"),
      read<{ initialWeightKg: number; currentWeightKg: number; changeKg: number }>("/api/health/weight"),
    ]).then(([water, sleep, exercise, focus, weight]) => {
      if (controller.signal.aborted) return;
      const sleepMinutes = sleep?.entry?.durationMinutes ?? null;
      const sleepGoalReached = sleepMinutes !== null && sleepMinutes >= sleepGoalMinutes;
      const exerciseSeconds = exercise?.totalSeconds ?? Math.round((exercise?.totalMinutes ?? 0) * 60);
      const exerciseRecorded = Boolean(exercise?.entry);
      const nextHealth: HealthToday = {
        waterTotalMl: water?.totalMl ?? 0,
        sleepMinutes,
        sleepGoalReached,
        exerciseSeconds,
        exerciseRecorded,
        weight,
        challenge: focus?.focus ?? null,
      };
      setHealthToday(nextHealth);
      setHealthHasData(true);
      setHealthUnavailable(false);
      localStorage.setItem("deleve-health-today-cache", JSON.stringify({ date: localDateKey(), data: nextHealth }));

      const messages: Partial<Record<CareTone, string>> = {};
      const today = localDateKey();
      const announceOnce = (tone: CareTone, achieved: boolean, message: string, signature: string) => {
        if (!achieved) return;
        const key = `deleve-home-achievement:${tone}:${signature}`;
        if (localStorage.getItem(key)) return;
        localStorage.setItem(key, "seen");
        messages[tone] = message;
      };
      const fetchedWeightProgress = getWeightProgress(profile, weight);
      announceOnce("water", (water?.totalMl ?? 0) >= waterGoalMl, "Meta atingida", `${today}:${waterGoalMl}`);
      announceOnce("sleep", sleepGoalReached, "Meta atingida", `${sleep?.entry?.date ?? today}:${sleepGoalMinutes}`);
      announceOnce("exercise", exerciseRecorded, "Treino concluído", `${today}:done`);
      announceOnce("weight", fetchedWeightProgress.favorable, fetchedWeightProgress.announcement, `${weight?.currentWeightKg ?? profile.weightKg}`);
      if (focus?.focus?.completed) {
        const challengeKey = `deleve-home-challenge-v2:${today}:${focus.focus.text}`;
        if (!localStorage.getItem(challengeKey)) {
          localStorage.setItem(challengeKey, "seen");
          setChallengeCelebrating(true);
          if (challengeTimer.current !== null) window.clearTimeout(challengeTimer.current);
          challengeTimer.current = window.setTimeout(() => setChallengeCelebrating(false), 1600);
        }
      }
      setAchievementMessages(messages);
      if (Object.keys(messages).length) {
        if (achievementTimer.current !== null) window.clearTimeout(achievementTimer.current);
        achievementTimer.current = window.setTimeout(() => setAchievementMessages({}), 2400);
      }
      setHealthLoading(false);
    }).catch(() => {
      if (controller.signal.aborted) return;
      setHealthUnavailable(true);
      setHealthLoading(false);
      retryTimer = window.setTimeout(() => setHealthRefresh(value => value + 1), 10_000);
    });

    return () => {
      controller.abort();
      if (achievementTimer.current !== null) window.clearTimeout(achievementTimer.current);
      if (challengeTimer.current !== null) window.clearTimeout(challengeTimer.current);
      if (retryTimer !== null) window.clearTimeout(retryTimer);
    };
  }, [profile, sleepGoalMinutes, waterGoalMl, healthRefresh]);

  const weightProgress = getWeightProgress(profile, healthToday.weight);

  function openHealth(shortcut: HealthShortcut = "overview") {
    localStorage.setItem("deleve-last-module", "health");
    onOpenHealth(shortcut);
  }

  function retryHealth() {
    setHealthLoading(true);
    setHealthRefresh(value => value + 1);
  }

  return (
    <main className="min-h-screen bg-[#f4f7f5] text-stone-900">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-5 pb-10 pt-6 sm:px-8 lg:px-12 lg:py-10">
        <header className="flex items-center justify-between" aria-label="Cabeçalho principal">
          <Brand />
          <button
            type="button"
            onClick={() => openHealth("profile")}
            aria-label={`Abrir perfil de ${firstName}`}
            className="grid size-11 place-items-center rounded-2xl border border-emerald-900/10 bg-white text-sm font-bold text-emerald-800 shadow-[0_8px_20px_rgba(20,58,48,.08)] outline-none transition hover:-translate-y-0.5 hover:bg-emerald-50 hover:shadow-[0_12px_25px_rgba(20,58,48,.12)] focus-visible:ring-4 focus-visible:ring-emerald-200 active:scale-95"
          >
            {firstName.charAt(0).toUpperCase()}
          </button>
        </header>

        <section className="mt-12 lg:mt-16" aria-labelledby="home-title">
          <p className="text-sm font-medium text-stone-500">Bom dia, {firstName}</p>
          <h1 id="home-title" className="mt-2 text-3xl font-semibold tracking-[-0.045em] text-emerald-950 sm:text-4xl">
            Sua rotina
          </h1>
        </section>

        <section className="mt-8 grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(16rem,1fr)]" aria-label="Módulos do Deleve">
          <article
            className="group relative overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-100/80 p-5 text-left shadow-[0_14px_34px_rgba(20,58,48,.08)] transition duration-200 hover:-translate-y-1 hover:shadow-[0_20px_42px_rgba(20,58,48,.13)] active:translate-y-0 sm:p-6"
          >
            <button type="button" onClick={() => openHealth("overview")} className="absolute inset-0 z-0 rounded-[1.75rem] outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-emerald-500" aria-label="Abrir painel completo de Saúde" />
            <span className="pointer-events-none absolute -right-12 -top-14 size-36 rounded-full bg-cyan-300/35 blur-2xl transition duration-500 group-hover:scale-125" />
            <span className="pointer-events-none relative z-10 flex items-center gap-3">
              <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-emerald-700 to-teal-500 text-white shadow-lg shadow-stone-900/10">
                <HeartPulse size={22} aria-hidden="true" />
              </span>
              <strong className="text-xl font-semibold tracking-tight text-stone-900">Saúde</strong>
            </span>

            <span className="pointer-events-none relative z-10 mt-5 block border-t border-emerald-900/10 pt-4" aria-live="polite">
              <span className="flex items-center justify-between gap-3">
                <strong className="text-xs font-bold uppercase tracking-[.12em] text-emerald-900/65">Hoje</strong>
                {(healthLoading && !healthHasData || healthUnavailable) && <span className="text-xs font-bold text-emerald-900">
                  {healthLoading && !healthHasData ? "Atualizando" : "Últimos dados"}
                </span>}
              </span>
              {healthUnavailable && <span role="status" className="mt-3 flex min-h-11 items-center gap-2 rounded-xl border border-amber-200/80 bg-amber-50/90 px-3 py-2 text-amber-900 shadow-sm">
                <WifiOff size={16} aria-hidden="true" className="shrink-0 text-amber-700" />
                <span className="min-w-0 flex-1 text-xs font-semibold">{healthHasData ? "Não foi possível atualizar." : "Dados temporariamente indisponíveis."}</span>
                <button type="button" onClick={retryHealth} disabled={healthLoading} className="pointer-events-auto flex min-h-8 shrink-0 items-center gap-1.5 rounded-lg px-2 text-xs font-bold text-amber-800 outline-none transition hover:bg-amber-100 focus-visible:ring-2 focus-visible:ring-amber-500 disabled:opacity-55">
                  <RefreshCw size={13} aria-hidden="true" className={healthLoading ? "animate-spin" : ""} />
                  {healthLoading ? "Tentando" : "Tentar novamente"}
                </button>
              </span>}
              <button type="button" onClick={() => openHealth("challenge")} aria-label="Abrir desafio de hoje" data-completed={Boolean(healthToday.challenge?.completed)} data-celebrating={challengeCelebrating||feedback?.kind==="challenge"} className="home-challenge pointer-events-auto relative mt-3 flex min-h-16 w-full items-center gap-3 overflow-hidden rounded-xl px-2 py-2.5 text-left text-emerald-950 outline-none transition hover:bg-white/35 focus-visible:ring-2 focus-visible:ring-violet-500 active:scale-[.99]">
                <span className="home-challenge-icon relative z-10 grid size-10 shrink-0 place-items-center rounded-2xl bg-violet-100 text-violet-700">
                  <Target size={17} aria-hidden="true" />
                </span>
                <span className="relative z-10 min-w-0 flex-1">
                  <span role={feedback?.kind==="challenge"?"status":undefined} className={`home-challenge-label block text-[.64rem] font-bold uppercase tracking-[.14em] ${healthToday.challenge?.completed ? "text-emerald-700" : "text-violet-700"}`}>{feedback?.kind==="challenge"?feedback.message:healthToday.challenge?.completed ? "Concluído" : "Desafio de hoje"}</span>
                  <strong className="home-challenge-text relative mt-0.5 block w-fit max-w-full truncate pr-0.5 text-sm font-semibold text-stone-900 sm:text-base">
                    {healthHasData ? healthToday.challenge?.text || "Nenhum desafio definido" : healthLoading ? "Atualizando..." : "—"}
                    {healthToday.challenge?.completed && <span aria-hidden="true" className="home-challenge-strike absolute inset-x-0 top-1/2 h-px origin-left rounded-full bg-emerald-600/55" />}
                  </strong>
                </span>
                <span aria-hidden="true" className="home-challenge-line absolute inset-x-2 bottom-0 h-px origin-left" />
                {challengeCelebrating && <span aria-hidden="true" className="home-challenge-sweep absolute inset-y-0 -left-1/3 w-1/3" />}
              </button>
              <span className="mt-2 grid grid-cols-2 gap-2 text-xs text-stone-700 sm:grid-cols-4">
                <HealthCareRow icon={Droplets} label="Água" value={healthHasData ? formatWaterProgress(healthToday.waterTotalMl, waterGoalMl) : healthLoading ? "..." : "—"} done={healthHasData&&healthToday.waterTotalMl >= waterGoalMl} tone="water" announcement={feedback?.kind==="water"?feedback.message:achievementMessages.water} onClick={() => openHealth("water")} />
                <HealthCareRow icon={MoonStar} label="Sono" value={!healthHasData ? healthLoading ? "..." : "—" : healthToday.sleepGoalReached ? formatCompactDuration(healthToday.sleepMinutes ?? 0) : "Pendente"} done={healthHasData&&healthToday.sleepGoalReached} tone="sleep" announcement={feedback?.kind==="sleep"?feedback.message:achievementMessages.sleep} onClick={() => openHealth("sleep")} />
                <HealthCareRow icon={Activity} label="Exercício" value={!healthHasData ? healthLoading ? "..." : "—" : healthToday.exerciseRecorded ? formatCompactDuration(healthToday.exerciseSeconds / 60) : "Pendente"} done={healthHasData&&healthToday.exerciseRecorded} tone="exercise" announcement={feedback?.kind==="exercise"?feedback.message:achievementMessages.exercise} onClick={() => openHealth("exercise")} />
                <HealthCareRow icon={Scale} label="Peso" value={healthHasData ? weightProgress.value : healthLoading ? "..." : "—"} done={healthHasData&&weightProgress.favorable} tone="weight" announcement={feedback?.kind==="weight"?feedback.message:achievementMessages.weight} onClick={() => openHealth("weight")} />
              </span>
            </span>
          </article>

          <div className="grid gap-3" aria-label="Demais módulos">
            {modules.filter(module => module.id !== "health").map(module => {
              const Icon = module.icon;
              return (
                <article key={module.id} aria-label={`${module.title}, em breve`} className={`relative flex min-h-20 items-center gap-3 overflow-hidden rounded-2xl bg-gradient-to-br ${module.surface} p-4 shadow-[0_9px_24px_rgba(20,58,48,.06)]`}>
                  <span className={`pointer-events-none absolute -right-10 -top-10 size-24 rounded-full ${module.glow} blur-xl`} />
                  <span className={`relative grid size-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${module.iconSurface} text-white shadow-md shadow-stone-900/10`}>
                    <Icon size={19} aria-hidden="true" />
                  </span>
                  <strong className="relative min-w-0 flex-1 text-base font-semibold tracking-tight">{module.title}</strong>
                  <small className="relative shrink-0 rounded-full bg-white/75 px-2.5 py-1 text-[.65rem] font-bold text-stone-500">Em breve</small>
                </article>
              );
            })}
          </div>
        </section>

        <footer className="mt-auto pt-10">
          <p className="flex items-center gap-2 text-xs font-medium text-stone-400">
            <Sparkles size={14} aria-hidden="true" className="text-emerald-600" />
            Novos módulos serão liberados aos poucos.
          </p>
        </footer>
      </div>
    </main>
  );
}

const careTones = {
  water: { card: "border-sky-200/70 bg-sky-50/80", icon: "bg-sky-100 text-sky-700", message: "bg-sky-600" },
  sleep: { card: "border-violet-200/70 bg-violet-50/80", icon: "bg-violet-100 text-violet-700", message: "bg-violet-600" },
  exercise: { card: "border-rose-200/70 bg-rose-50/80", icon: "bg-rose-100 text-rose-600", message: "bg-rose-600" },
  weight: { card: "border-amber-200/70 bg-amber-50/80", icon: "bg-amber-100 text-amber-700", message: "bg-amber-700" },
} as const;
type CareTone = keyof typeof careTones;

function HealthCareRow({ icon: Icon, label, value, done, tone, announcement, onClick }: { icon: typeof Droplets; label: string; value: string; done: boolean; tone: CareTone; announcement?: string; onClick: () => void }) {
  const colors = careTones[tone];
  return (
    <button type="button" onClick={onClick} aria-label={`Abrir registro de ${label.toLocaleLowerCase("pt-BR")}`} data-tone={tone} data-achieved={done} data-celebrating={Boolean(announcement)} className={`home-care-tile pointer-events-auto relative flex min-h-20 flex-col justify-between overflow-hidden rounded-xl border p-3 text-left outline-none transition hover:-translate-y-0.5 hover:shadow-md focus-visible:ring-2 focus-visible:ring-emerald-600 active:scale-[.98] ${colors.card} ${done ? "border-emerald-500/45 shadow-[0_7px_18px_rgba(5,150,105,.09)]" : ""}`}>
      <span className="flex items-center gap-2 pr-5">
        <span className={`grid size-7 shrink-0 place-items-center rounded-lg ${colors.icon}`}>
          <Icon size={14} aria-hidden="true" />
        </span>
        <span className="font-medium text-stone-600">{label}</span>
      </span>
      {done && <span aria-label="Concluído" className="absolute right-2.5 top-2.5 grid size-5 place-items-center rounded-full bg-emerald-700 text-white"><Check size={11} strokeWidth={3} aria-hidden="true" /></span>}
      <b className="home-care-value mt-2 block leading-tight text-stone-900">{value}</b>
      {done && <span aria-hidden="true" className="absolute inset-x-3 bottom-1 h-0.5 rounded-full bg-emerald-500/60" />}
      {announcement && <span role="status" className={`home-care-achievement absolute inset-x-1.5 bottom-1.5 rounded-lg px-1.5 py-1 text-center text-[.65rem] font-bold text-white shadow-sm ${colors.message}`}>{announcement}</span>}
    </button>
  );
}

function getWeightProgress(profile: HealthProfile, weight: HealthToday["weight"]) {
  const current = weight?.currentWeightKg ?? (Number(profile.weightKg) || 0);
  const change = weight?.changeKg ?? 0;
  const goals = profile.goals?.length ? profile.goals : profile.goal.split(",").map(goal => goal.trim());
  const wantsToLose = goals.includes("Perder peso");
  const wantsToGain = goals.includes("Ganhar peso");
  const direction = wantsToLose === wantsToGain ? 0 : wantsToLose ? -1 : 1;
  const favorable = direction !== 0 && change * direction > 0;
  const target = Number(profile.targetWeightKg);
  const reachedTarget = Number.isFinite(target) && target > 0 && (direction === -1 ? current <= target : direction === 1 && current >= target);
  const announcement = reachedTarget ? "Meta alcançada" : "Rumo à meta";

  if (favorable) return { favorable, value: formatSignedWeight(change), announcement };
  if (direction === 0 && Math.abs(change) <= 0.5) return { favorable: false, value: "Peso estável", announcement };
  if (change !== 0) return { favorable: false, value: formatSignedWeight(change), announcement };
  return { favorable: false, value: `${current.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} kg atual`, announcement };
}

function formatCompactDuration(totalMinutes: number) {
  const roundedMinutes = Math.max(0, Math.round(totalMinutes));
  const hours = Math.floor(roundedMinutes / 60);
  const minutes = roundedMinutes % 60;
  if (hours && minutes) return `${hours}h ${minutes}min`;
  if (hours) return `${hours}h`;
  return `${minutes}min`;
}

function localDateKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function readCachedHealthToday(): HealthToday | null {
  try {
    const cached = JSON.parse(localStorage.getItem("deleve-health-today-cache") ?? "null") as { date?: string; data?: HealthToday } | null;
    return cached?.date === localDateKey() && cached.data ? cached.data : null;
  } catch {
    return null;
  }
}

function formatSignedWeight(value: number) {
  const sign = value < 0 ? "−" : value > 0 ? "+" : "";
  return `${sign}${Math.abs(value).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} kg`;
}

function formatWaterProgress(amountMl: number, goalMl: number) {
  if (goalMl >= 1_000) {
    const formatLiters = (value: number) => (value / 1_000).toLocaleString("pt-BR", { maximumFractionDigits: 1 });
    return `${formatLiters(amountMl)} de ${formatLiters(goalMl)} L`;
  }
  return `${amountMl.toLocaleString("pt-BR")} de ${goalMl.toLocaleString("pt-BR")} ml`;
}

function formatWater(amountMl: number) {
  if (amountMl < 1_000) return `${amountMl.toLocaleString("pt-BR")} ml`;
  return `${(amountMl / 1_000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} L`;
}
