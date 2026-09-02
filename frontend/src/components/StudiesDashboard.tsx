import {
  BookOpen,
  CalendarDays,
  Check,
  ChevronRight,
  Clock3,
  GraduationCap,
  Home,
  ListTodo,
  Pencil,
  Pause,
  Play,
  Plus,
  Square,
  Target,
  Trash2,
  X,
} from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import type { HealthProfile } from "./Dashboard";

type Subject = { id: number; name: string; taskCount: number };
type StudyTask = {
  id: number;
  title: string;
  type: string;
  date: string;
  plannedMinutes: number;
  studiedSeconds: number;
  completed: boolean;
  subject: { id: number; name: string } | null;
};
type StudiesOverview = {
  date: string;
  tasks: StudyTask[];
  subjects: Subject[];
  completedCount: number;
  plannedMinutes: number;
  studiedSeconds: number;
  focusTask: StudyTask | null;
};

const emptyOverview: StudiesOverview = {
  date: localDateKey(),
  tasks: [],
  subjects: [],
  completedCount: 0,
  plannedMinutes: 0,
  studiedSeconds: 0,
  focusTask: null,
};

export default function StudiesDashboard({ profile, onBackHome }: { profile: HealthProfile; onBackHome: () => void }) {
  const firstName = profile.name.trim().split(" ")[0] || "você";
  const [overview, setOverview] = useState<StudiesOverview>(emptyOverview);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [taskDialog, setTaskDialog] = useState<StudyTask | "new" | null>(null);
  const [subjectDialogOpen, setSubjectDialogOpen] = useState(false);
  const [focusSession, setFocusSession] = useState<StudyTask | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [savingSession, setSavingSession] = useState(false);

  useEffect(() => {
    if (!focusSession || !timerRunning) return;
    const interval = window.setInterval(() => setElapsedSeconds(current => current + 1), 1000);
    return () => window.clearInterval(interval);
  }, [focusSession, timerRunning]);

  async function refresh() {
    setLoading(true);
    setError("");
    try {
      setOverview(await request<StudiesOverview>("/api/studies/overview"));
    } catch (caught) {
      setError(messageFrom(caught));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void refresh(); }, []);

  async function toggleTask(task: StudyTask) {
    setError("");
    try {
      await request(`/api/studies/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: !task.completed }),
      });
      await refresh();
    } catch (caught) {
      setError(messageFrom(caught));
    }
  }

  async function deleteSubject(subject: Subject) {
    if (!window.confirm(`Excluir a matéria “${subject.name}”?`)) return;
    setError("");
    try {
      await request(`/api/studies/subjects/${subject.id}`, { method: "DELETE" });
      await refresh();
    } catch (caught) {
      setError(messageFrom(caught));
    }
  }

  function startSession(task: StudyTask) {
    setElapsedSeconds(0);
    setFocusSession(task);
    setTimerRunning(true);
  }

  function leaveSession() {
    if (elapsedSeconds > 0 && !window.confirm("Sair sem salvar esta sessão de estudo?")) return;
    setFocusSession(null);
    setTimerRunning(false);
    setElapsedSeconds(0);
  }

  async function finishSession() {
    if (!focusSession || savingSession) return;
    setSavingSession(true);
    setTimerRunning(false);
    setError("");
    try {
      await request(`/api/studies/tasks/${focusSession.id}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ durationSeconds: Math.max(1, elapsedSeconds) }),
      });
      setFocusSession(null);
      setElapsedSeconds(0);
      await refresh();
    } catch (caught) {
      setError(messageFrom(caught));
      setTimerRunning(true);
    } finally {
      setSavingSession(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f3f6fa] text-stone-900">
      <section className="mx-auto min-h-screen w-full max-w-6xl px-5 pb-16 pt-7 sm:px-8 lg:px-12 lg:py-10">
        <header className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <button type="button" onClick={onBackHome} aria-label="Voltar para o início" className="grid size-11 shrink-0 place-items-center rounded-2xl bg-white text-blue-800 shadow-sm ring-1 ring-sky-100 outline-none transition hover:bg-sky-50 focus-visible:ring-4 focus-visible:ring-sky-200">
              <Home size={19} aria-hidden="true" />
            </button>
            <div className="min-w-0">
              <p className="text-sm text-stone-500">Olá, {firstName}</p>
              <h1 className="truncate text-2xl font-semibold tracking-tight">Estudos</h1>
            </div>
          </div>
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-blue-950 to-sky-600 text-white shadow-lg shadow-blue-950/15">
            <GraduationCap size={21} aria-hidden="true" />
          </span>
        </header>

        <div className="mt-9 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.16em] text-blue-700">Hoje</p>
            <h2 className="mt-1 text-3xl font-semibold tracking-[-.04em]">Seu plano de estudo.</h2>
          </div>
          <button type="button" onClick={() => setTaskDialog("new")} className="inline-flex min-h-11 items-center gap-2 rounded-2xl bg-blue-700 px-4 text-sm font-bold text-white shadow-lg shadow-blue-950/15 outline-none transition hover:bg-blue-800 focus-visible:ring-4 focus-visible:ring-sky-200 active:scale-[.98]">
            <Plus size={17} aria-hidden="true" /> Nova tarefa
          </button>
        </div>

        {error && <div role="alert" className="mt-5 flex items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-800"><span>{error}</span><button type="button" onClick={() => void refresh()} className="min-h-9 rounded-xl px-3 font-bold hover:bg-rose-100">Tentar novamente</button></div>}

        <section aria-label="Resumo de estudos" className="mt-6 grid gap-4 lg:grid-cols-[1.25fr_.75fr]">
          <article className="relative min-h-52 overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-slate-950 via-blue-950 to-sky-700 p-6 text-white shadow-xl shadow-blue-950/20 sm:p-7">
            <span aria-hidden="true" className="absolute -right-14 -top-20 size-52 rounded-full border border-white/15" />
            <span aria-hidden="true" className="absolute -right-2 -top-10 size-36 rounded-full border border-white/10" />
            <div className="relative flex h-full flex-col">
              <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.16em] text-white/75"><Target size={15} aria-hidden="true" />Foco de hoje</span>
              {loading ? <p className="mt-7 text-white/70">Organizando seu plano...</p> : overview.focusTask ? <>
                <h3 className="mt-7 max-w-xl text-2xl font-semibold leading-tight tracking-tight sm:text-3xl">{overview.focusTask.title}</h3>
                <p className="mt-2 text-sm text-white/75">{overview.focusTask.subject?.name ?? "Estudos"} · {formatMinutes(overview.focusTask.plannedMinutes)}</p>
                <div className="mt-auto flex flex-wrap gap-2">
                  <button type="button" onClick={() => startSession(overview.focusTask!)} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-white px-4 text-sm font-bold text-blue-950 outline-none transition hover:bg-sky-50 focus-visible:ring-2 focus-visible:ring-white"><Play size={16} fill="currentColor" aria-hidden="true" />Iniciar estudo</button>
                  <button type="button" onClick={() => setTaskDialog(overview.focusTask)} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-white/15 px-4 text-sm font-bold text-white outline-none transition hover:bg-white/25 focus-visible:ring-2 focus-visible:ring-white">Ver tarefa <ChevronRight size={16} aria-hidden="true" /></button>
                </div>
              </> : <>
                <h3 className="mt-7 text-2xl font-semibold tracking-tight">Seu dia está livre.</h3>
                <p className="mt-2 max-w-md text-sm leading-6 text-white/75">Adicione uma tarefa curta para definir o próximo passo.</p>
                <button type="button" onClick={() => setTaskDialog("new")} className="mt-auto inline-flex min-h-11 w-fit items-center gap-2 rounded-xl bg-white px-4 text-sm font-bold text-blue-800 outline-none transition hover:bg-sky-50 focus-visible:ring-2 focus-visible:ring-white"><Plus size={16} />Adicionar tarefa</button>
              </>}
            </div>
          </article>

          <article className="rounded-[1.75rem] bg-white p-6 shadow-sm ring-1 ring-sky-100/90">
            <span className="grid size-11 place-items-center rounded-2xl bg-sky-50 text-blue-800"><Clock3 size={20} aria-hidden="true" /></span>
            <p className="mt-6 text-sm text-stone-500">Planejado para hoje</p>
            <strong className="mt-1 block text-3xl font-semibold tracking-tight">{formatMinutes(overview.plannedMinutes)}</strong>
            {overview.studiedSeconds > 0 && <p className="mt-2 text-sm font-semibold text-blue-800">{formatStudyTime(overview.studiedSeconds)} estudados</p>}
            <div className="mt-6 h-2 rounded-full bg-sky-50"><div className="h-full rounded-full bg-gradient-to-r from-blue-800 to-sky-500 transition-[width]" style={{ width: `${overview.tasks.length ? Math.round((overview.completedCount / overview.tasks.length) * 100) : 0}%` }} /></div>
            <p className="mt-3 text-xs font-medium text-stone-500">{overview.completedCount} de {overview.tasks.length} tarefa{overview.tasks.length === 1 ? "" : "s"} concluída{overview.completedCount === 1 ? "" : "s"}</p>
          </article>
        </section>

        <section className="mt-7" aria-labelledby="study-plan-title">
          <div className="flex items-center justify-between gap-3">
            <div><p className="text-xs font-bold uppercase tracking-[.14em] text-stone-400">Organização</p><h2 id="study-plan-title" className="mt-1 text-xl font-semibold">Plano de hoje</h2></div>
            <CalendarDays size={20} className="text-sky-600" aria-hidden="true" />
          </div>
          <div className="mt-4 space-y-2">
            {!loading && overview.tasks.length === 0 && <div className="rounded-3xl border border-dashed border-sky-200 bg-white/70 p-6 text-center"><ListTodo className="mx-auto text-sky-400" /><p className="mt-3 text-sm font-semibold">Nenhuma tarefa para hoje</p><p className="mt-1 text-xs text-stone-500">Seu primeiro passo pode ser bem pequeno.</p></div>}
            {overview.tasks.map(task => <TaskRow key={task.id} task={task} onToggle={() => void toggleTask(task)} onEdit={() => setTaskDialog(task)} onStart={() => startSession(task)} />)}
          </div>
        </section>

        <section className="mt-8" aria-labelledby="subjects-title">
          <div className="flex items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.14em] text-stone-400">Organize por tema</p><h2 id="subjects-title" className="mt-1 text-xl font-semibold">Matérias e cursos</h2></div><button type="button" onClick={() => setSubjectDialogOpen(true)} className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-bold text-blue-800 outline-none hover:bg-sky-50 focus-visible:ring-4 focus-visible:ring-sky-100"><Plus size={17} />Adicionar</button></div>
          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3">
            {overview.subjects.map((subject, index) => <article key={subject.id} className={`group relative min-h-28 overflow-hidden rounded-2xl border p-4 ${subjectTone(index)}`}><BookOpen size={18} aria-hidden="true" /><strong className="mt-5 block truncate text-sm">{subject.name}</strong><p className="mt-1 text-[11px] opacity-70">{subject.taskCount} tarefa{subject.taskCount === 1 ? "" : "s"}</p><button type="button" onClick={() => void deleteSubject(subject)} aria-label={`Excluir matéria ${subject.name}`} className="absolute right-2 top-2 grid size-9 place-items-center rounded-xl opacity-0 outline-none transition hover:bg-white/60 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-current group-hover:opacity-100"><Trash2 size={14} /></button></article>)}
            {!loading && overview.subjects.length === 0 && <button type="button" onClick={() => setSubjectDialogOpen(true)} className="col-span-2 min-h-28 rounded-2xl border border-dashed border-sky-200 bg-white/70 p-4 text-sm font-semibold text-blue-800 outline-none hover:bg-sky-50 focus-visible:ring-4 focus-visible:ring-sky-100 md:col-span-1"><Plus className="mx-auto mb-2" />Criar primeira matéria</button>}
          </div>
        </section>
      </section>

      {taskDialog && <TaskDialog task={taskDialog === "new" ? null : taskDialog} subjects={overview.subjects} onClose={() => setTaskDialog(null)} onChanged={async () => { setTaskDialog(null); await refresh(); }} />}
      {subjectDialogOpen && <SubjectDialog onClose={() => setSubjectDialogOpen(false)} onCreated={async () => { setSubjectDialogOpen(false); await refresh(); }} />}
      {focusSession && <FocusMode task={focusSession} elapsedSeconds={elapsedSeconds} running={timerRunning} saving={savingSession} onToggle={() => setTimerRunning(current => !current)} onFinish={() => void finishSession()} onClose={leaveSession} />}
    </main>
  );
}

function TaskRow({ task, onToggle, onEdit, onStart }: { task: StudyTask; onToggle: () => void; onEdit: () => void; onStart: () => void }) {
  return <article className={`flex min-h-20 items-center gap-3 rounded-2xl border bg-white p-3 shadow-sm transition ${task.completed ? "border-emerald-200/80" : "border-sky-100"}`}>
    <button type="button" onClick={onToggle} aria-label={task.completed ? `Marcar ${task.title} como pendente` : `Concluir ${task.title}`} aria-pressed={task.completed} className={`grid size-11 shrink-0 place-items-center rounded-2xl outline-none transition focus-visible:ring-4 ${task.completed ? "bg-emerald-600 text-white focus-visible:ring-emerald-200" : "bg-sky-50 text-blue-700 hover:bg-sky-100 focus-visible:ring-sky-200"}`}>{task.completed ? <Check size={19} strokeWidth={3} /> : <span className="size-4 rounded-full border-2 border-current" />}</button>
    <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="text-[10px] font-bold uppercase tracking-[.12em] text-blue-700">{task.type}</span>{task.subject && <span className="truncate text-[10px] font-semibold text-stone-400">· {task.subject.name}</span>}</div><strong className={`mt-1 block truncate text-sm ${task.completed ? "text-stone-400 line-through decoration-emerald-500/60 decoration-1" : "text-stone-900"}`}>{task.title}</strong><span className="mt-1 block text-[11px] text-stone-400">{formatMinutes(task.plannedMinutes)}</span></div>
    <button type="button" onClick={onStart} aria-label={`Iniciar estudo de ${task.title}`} className="grid size-11 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-800 outline-none hover:bg-blue-100 focus-visible:ring-4 focus-visible:ring-sky-100"><Play size={16} fill="currentColor" /></button>
    <button type="button" onClick={onEdit} aria-label={`Editar tarefa ${task.title}`} className="grid size-11 shrink-0 place-items-center rounded-xl text-stone-400 outline-none hover:bg-stone-50 hover:text-blue-700 focus-visible:ring-4 focus-visible:ring-sky-100"><Pencil size={16} /></button>
  </article>;
}

function FocusMode({ task, elapsedSeconds, running, saving, onToggle, onFinish, onClose }: { task: StudyTask; elapsedSeconds: number; running: boolean; saving: boolean; onToggle: () => void; onFinish: () => void; onClose: () => void }) {
  useEffect(() => {
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [onClose]);

  return <section role="dialog" aria-modal="true" aria-labelledby="focus-mode-title" className="study-focus-mode fixed inset-0 z-[70] overflow-y-auto bg-[#061426] text-white">
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden"><span className="absolute -right-32 -top-40 size-[30rem] rounded-full bg-sky-500/15 blur-3xl" /><span className="absolute -bottom-56 -left-44 size-[34rem] rounded-full bg-blue-700/20 blur-3xl" /></div>
    <div className="relative mx-auto flex min-h-full w-full max-w-3xl flex-col px-5 py-6 sm:px-10 sm:py-10">
      <header className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3"><span className={`size-2.5 rounded-full bg-sky-400 ${running ? "motion-safe:animate-pulse" : "opacity-40"}`} /><p className="text-xs font-bold uppercase tracking-[.18em] text-sky-100/75">Modo foco</p></div>
        <button type="button" onClick={onClose} aria-label="Sair do modo foco" className="grid size-11 place-items-center rounded-2xl bg-white/10 text-white outline-none transition hover:bg-white/15 focus-visible:ring-2 focus-visible:ring-sky-300"><X size={20} /></button>
      </header>

      <div className="flex flex-1 flex-col items-center justify-center py-12 text-center">
        <span className="grid size-14 place-items-center rounded-2xl bg-sky-400/10 text-sky-300 ring-1 ring-inset ring-sky-300/15"><BookOpen size={24} /></span>
        <p className="mt-7 text-sm font-medium text-sky-100/60">{task.subject?.name ?? task.type}</p>
        <h2 id="focus-mode-title" className="mt-2 max-w-xl text-2xl font-semibold leading-tight tracking-tight sm:text-4xl">{task.title}</h2>
        <p aria-live="off" className="mt-12 font-mono text-[clamp(3.5rem,18vw,7rem)] font-light leading-none tracking-[-.07em] tabular-nums text-white">{formatTimer(elapsedSeconds)}</p>
        <p aria-live="polite" className="mt-4 text-sm text-sky-100/55">{running ? "Tempo em andamento" : "Sessão pausada"} · planejado {formatMinutes(task.plannedMinutes)}</p>

        <div className="mt-12 flex w-full max-w-sm items-center justify-center gap-3">
          <button type="button" disabled={saving} onClick={onToggle} aria-label={running ? "Pausar cronômetro" : "Continuar cronômetro"} className="grid size-14 shrink-0 place-items-center rounded-2xl bg-white/10 text-white outline-none transition hover:bg-white/15 focus-visible:ring-2 focus-visible:ring-sky-300 disabled:opacity-50">{running ? <Pause size={21} fill="currentColor" /> : <Play size={21} fill="currentColor" />}</button>
          <button type="button" disabled={saving} onClick={onFinish} className="inline-flex min-h-14 flex-1 items-center justify-center gap-2 rounded-2xl bg-sky-500 px-5 text-sm font-bold text-slate-950 shadow-lg shadow-sky-950/25 outline-none transition hover:bg-sky-400 focus-visible:ring-4 focus-visible:ring-sky-300/40 active:scale-[.98] disabled:opacity-50"><Square size={16} fill="currentColor" />{saving ? "Salvando..." : "Finalizar estudo"}</button>
        </div>
      </div>
    </div>
  </section>;
}

function TaskDialog({ task, subjects, onClose, onChanged }: { task: StudyTask | null; subjects: Subject[]; onClose: () => void; onChanged: () => Promise<void> }) {
  const [title, setTitle] = useState(task?.title ?? "");
  const [type, setType] = useState(task?.type ?? "Estudo");
  const [subjectId, setSubjectId] = useState(task?.subject?.id ? String(task.subject.id) : "");
  const [date, setDate] = useState(task?.date ?? localDateKey());
  const [minutes, setMinutes] = useState(String(task?.plannedMinutes ?? 30));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  useEffect(() => {
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [onClose]);

  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      await request(task ? `/api/studies/tasks/${task.id}` : "/api/studies/tasks", { method: task ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title, type, subjectId: subjectId || null, date, plannedMinutes: Number(minutes), completed: task?.completed ?? false }) });
      await onChanged();
    } catch (caught) { setError(messageFrom(caught)); setBusy(false); }
  }

  async function remove() {
    if (!task) return; setBusy(true); setError("");
    try { await request(`/api/studies/tasks/${task.id}`, { method: "DELETE" }); await onChanged(); }
    catch (caught) { setError(messageFrom(caught)); setBusy(false); setConfirmingDelete(false); }
  }

  return <div className="fixed inset-0 z-50 flex overflow-y-auto bg-slate-950/55 p-3 backdrop-blur-sm sm:p-6"><section role="dialog" aria-modal="true" aria-labelledby="task-dialog-title" className="m-auto w-full max-w-xl rounded-[1.75rem] bg-white p-5 shadow-2xl sm:p-7"><header className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.14em] text-blue-700">Plano de estudos</p><h2 id="task-dialog-title" className="mt-1 text-2xl font-semibold">{task ? "Editar tarefa" : "Nova tarefa"}</h2></div><button type="button" onClick={onClose} aria-label="Fechar tarefa" className="grid size-11 place-items-center rounded-2xl bg-slate-100 text-slate-600 outline-none hover:bg-slate-200 focus-visible:ring-4 focus-visible:ring-sky-100"><X size={20} /></button></header>
    <form onSubmit={submit} className="mt-6 space-y-4"><label className="block text-sm font-bold text-slate-700">O que você vai fazer?<input autoFocus required maxLength={100} value={title} onChange={event => setTitle(event.target.value)} placeholder="Ex.: Revisar capítulo 3" className="mt-2 h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-base outline-none focus:border-sky-600 focus:ring-4 focus:ring-sky-100" /></label>
      <div className="grid gap-4 sm:grid-cols-2"><SelectField label="Tipo" value={type} onChange={setType} options={["Estudo", "Leitura", "Aula", "Exercícios", "Revisão"]} /><SelectField label="Matéria ou curso" value={subjectId} onChange={setSubjectId} options={["", ...subjects.map(subject => String(subject.id))]} labels={["Sem matéria", ...subjects.map(subject => subject.name)]} /></div>
      <div className="grid grid-cols-2 gap-4"><label className="block text-sm font-bold text-slate-700">Data<input required type="date" value={date} onChange={event => setDate(event.target.value)} className="mt-2 h-14 w-full min-w-0 rounded-2xl border border-slate-200 bg-slate-50 px-3 outline-none focus:border-sky-600 focus:ring-4 focus:ring-sky-100" /></label><label className="block text-sm font-bold text-slate-700">Duração<input required type="number" min="5" max="480" step="5" value={minutes} onChange={event => setMinutes(event.target.value)} className="mt-2 h-14 w-full min-w-0 rounded-2xl border border-slate-200 bg-slate-50 px-3 outline-none focus:border-sky-600 focus:ring-4 focus:ring-sky-100" /><span className="sr-only">minutos</span></label></div>
      {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
      {confirmingDelete ? <div className="rounded-2xl bg-rose-50 p-4"><p className="text-sm font-semibold text-rose-900">Excluir esta tarefa?</p><div className="mt-3 flex gap-2"><button type="button" onClick={() => setConfirmingDelete(false)} className="min-h-11 flex-1 rounded-xl bg-white text-sm font-bold text-slate-700">Cancelar</button><button type="button" disabled={busy} onClick={() => void remove()} className="min-h-11 flex-1 rounded-xl bg-rose-600 text-sm font-bold text-white">Excluir</button></div></div> : <footer className="flex gap-2 pt-2">{task && <button type="button" onClick={() => setConfirmingDelete(true)} className="grid size-12 shrink-0 place-items-center rounded-2xl bg-rose-50 text-rose-600 outline-none hover:bg-rose-100 focus-visible:ring-4 focus-visible:ring-rose-100" aria-label="Excluir tarefa"><Trash2 size={18} /></button>}<button disabled={busy} type="submit" className="min-h-12 flex-1 rounded-2xl bg-blue-700 px-4 text-sm font-bold text-white outline-none hover:bg-blue-800 focus-visible:ring-4 focus-visible:ring-sky-200 disabled:opacity-50">{busy ? "Salvando..." : task ? "Salvar alterações" : "Adicionar ao plano"}</button></footer>}
    </form></section></div>;
}

function SubjectDialog({ onClose, onCreated }: { onClose: () => void; onCreated: () => Promise<void> }) {
  const [name, setName] = useState(""); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  async function submit(event: FormEvent) { event.preventDefault(); setBusy(true); setError(""); try { await request("/api/studies/subjects", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) }); await onCreated(); } catch (caught) { setError(messageFrom(caught)); setBusy(false); } }
  return <div className="fixed inset-0 z-50 flex bg-slate-950/55 p-3 backdrop-blur-sm"><section role="dialog" aria-modal="true" aria-labelledby="subject-title" className="m-auto w-full max-w-md rounded-[1.75rem] bg-white p-5 shadow-2xl sm:p-7"><header className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.14em] text-blue-700">Organização</p><h2 id="subject-title" className="mt-1 text-2xl font-semibold">Nova matéria</h2></div><button type="button" onClick={onClose} aria-label="Fechar matéria" className="grid size-11 place-items-center rounded-2xl bg-slate-100 text-slate-600 outline-none hover:bg-slate-200 focus-visible:ring-4 focus-visible:ring-sky-100"><X size={20} /></button></header><form onSubmit={submit} className="mt-6"><label className="block text-sm font-bold text-slate-700">Nome da matéria ou curso<input autoFocus required maxLength={50} value={name} onChange={event => setName(event.target.value)} placeholder="Ex.: Matemática" className="mt-2 h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 outline-none focus:border-sky-600 focus:ring-4 focus:ring-sky-100" /></label>{error && <p role="alert" className="mt-3 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}<button disabled={busy} className="mt-5 min-h-12 w-full rounded-2xl bg-blue-700 text-sm font-bold text-white outline-none hover:bg-blue-800 focus-visible:ring-4 focus-visible:ring-sky-200 disabled:opacity-50">{busy ? "Salvando..." : "Criar matéria"}</button></form></section></div>;
}

function SelectField({ label, value, onChange, options, labels = options }: { label: string; value: string; onChange: (value: string) => void; options: string[]; labels?: string[] }) {
  return <label className="block text-sm font-bold text-slate-700">{label}<select value={value} onChange={event => onChange(event.target.value)} className="mt-2 h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 outline-none focus:border-sky-600 focus:ring-4 focus:ring-sky-100">{options.map((option, index) => <option key={option || "empty"} value={option}>{labels[index]}</option>)}</select></label>;
}

function subjectTone(index: number) { return ["border-blue-200 bg-blue-50 text-blue-900", "border-cyan-200 bg-cyan-50 text-cyan-900", "border-slate-200 bg-slate-50 text-slate-800"][index % 3]; }
function formatMinutes(minutes: number) { const hours = Math.floor(minutes / 60); const rest = minutes % 60; if (hours && rest) return `${hours}h ${rest}min`; if (hours) return `${hours}h`; return `${minutes}min`; }
function formatStudyTime(seconds: number) { const minutes = Math.max(1, Math.round(seconds / 60)); return formatMinutes(minutes); }
function formatTimer(seconds: number) { const hours = Math.floor(seconds / 3600); const minutes = Math.floor((seconds % 3600) / 60); const rest = seconds % 60; return hours ? `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}` : `${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`; }
function localDateKey() { const now = new Date(); return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`; }
function messageFrom(caught: unknown) { return caught instanceof Error ? caught.message : "Não foi possível concluir. Tente novamente."; }
async function request<T = unknown>(url: string, options?: RequestInit): Promise<T> { const response = await fetch(url, options); const body = await response.json().catch(() => ({})) as T & { error?: string }; if (!response.ok) throw new Error(body.error ?? "Não foi possível concluir. Tente novamente."); return body; }
