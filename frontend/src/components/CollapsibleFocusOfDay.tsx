import DeleveSymbol from "./DeleveSymbol";
import { ArrowRight, Check, ChevronDown, Pencil, Target, Trash2, X } from "lucide-react";
import { FormEvent, useEffect, useRef, useState } from "react";

type DailyFocus = { text: string; completed: boolean };

export default function CollapsibleFocusOfDay({
  openEditorWhenEmpty = false,
  initiallyExpanded = false,
  onSaved,
  onCancel,
}: {
  openEditorWhenEmpty?: boolean;
  initiallyExpanded?: boolean;
  onSaved?: () => void;
  onCancel?: () => void;
}) {
  const [focus, setFocus] = useState<DailyFocus>({ text: "", completed: false });
  const [text, setText] = useState("");
  const [editing, setEditing] = useState(false);
  const [expanded, setExpanded] = useState(initiallyExpanded);
  const [saving, setSaving] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [error, setError] = useState("");
  const collapseTimer = useRef<number | null>(null);

  useEffect(() => {
    fetch("/api/health/focus/today")
      .then(response => response.json())
      .then((body: { focus: DailyFocus | null }) => {
        setFocus(body.focus ?? { text: "", completed: false });
        setText(body.focus?.text ?? "");
        if (openEditorWhenEmpty && !body.focus?.text) setEditing(true);
      })
      .catch(() => setError("Não foi possível carregar seu desafio de hoje."));
  }, [openEditorWhenEmpty]);

  useEffect(() => {
    if (initiallyExpanded) setExpanded(true);
  }, [initiallyExpanded]);

  useEffect(() => () => {
    if (collapseTimer.current !== null) window.clearTimeout(collapseTimer.current);
  }, []);

  async function save(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/health/focus/today", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }) });
      const body = await response.json().catch(() => ({})) as DailyFocus & { error?: string };
      if (!response.ok) throw new Error(body.error ?? "Não foi possível salvar seu desafio.");
      setFocus(body);
      setText(body.text);
      setEditing(false);
      setExpanded(true);
      onSaved?.();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível salvar seu desafio.");
    } finally {
      setSaving(false);
    }
  }

  async function toggle() {
    setSaving(true);
    setError("");
    try {
      const completed = !focus.completed;
      const response = await fetch("/api/health/focus/today", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ completed }) });
      const body = await response.json().catch(() => ({})) as { completed: boolean; error?: string };
      if (!response.ok) throw new Error(body.error ?? "Não foi possível atualizar seu desafio.");
      setFocus(current => ({ ...current, completed: body.completed }));
      if (body.completed) {
        if (collapseTimer.current !== null) window.clearTimeout(collapseTimer.current);
        collapseTimer.current = window.setTimeout(() => setExpanded(false), 1_200);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível atualizar seu desafio.");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/health/focus/today", { method: "DELETE" });
      if (!response.ok) throw new Error();
      setFocus({ text: "", completed: false });
      setText("");
      setEditing(false);
      setExpanded(false);
      setConfirmingDelete(false);
    } catch {
      setError("Não foi possível remover seu desafio.");
    } finally {
      setSaving(false);
    }
  }

  if (!focus.text && !editing) {
    return <button onClick={() => setEditing(true)} className="group relative mt-4 w-full overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-emerald-800 via-teal-700 to-cyan-600 text-left text-white shadow-lg shadow-emerald-900/10 outline-none transition hover:-translate-y-0.5 focus-visible:ring-4 focus-visible:ring-teal-200"><span className="relative block overflow-hidden rounded-[1.75rem] p-5"><span className="absolute -right-8 -top-12 size-32 rounded-full border border-white/10"/><span className="relative flex items-center gap-3"><span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-white/10 text-cyan-100 ring-1 ring-white/15"><Target size={22}/></span><span className="min-w-0 flex-1"><span className="flex items-center gap-1.5 text-[.64rem] font-bold uppercase tracking-[.18em] text-emerald-100"><DeleveSymbol size={12}/>Meu desafio de hoje</span><strong className="mt-1 block text-base tracking-tight sm:text-lg">Escolha um pequeno passo.</strong></span><ArrowRight size={18} className="shrink-0 text-white/70 transition group-hover:translate-x-1"/></span></span></button>;
  }

  if (editing) {
    return <section className="relative mt-4 overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-emerald-900 via-teal-800 to-cyan-700 p-5 text-white shadow-xl shadow-emerald-900/10"><span className="absolute -right-10 -top-16 size-40 rounded-full bg-cyan-400/20 blur-3xl"/><div className="relative flex items-center gap-3"><span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-white/15 text-cyan-50 ring-1 ring-white/15"><Target size={21}/></span><div className="min-w-0"><p className="text-[.64rem] font-bold uppercase tracking-[.18em] text-emerald-100">Meu desafio de hoje</p><h3 className="font-bold">Escolha um desafio possível</h3></div><button type="button" aria-label="Cancelar edição" onClick={() => { setEditing(false); setText(focus.text); setError(""); onCancel?.(); }} className="ml-auto grid size-10 shrink-0 place-items-center rounded-xl bg-white/10 text-white/70"><X size={17}/></button></div><form onSubmit={save} className="relative mt-4"><label className="sr-only" htmlFor="daily-focus">Seu desafio de hoje</label><textarea autoFocus id="daily-focus" required minLength={3} maxLength={100} rows={2} value={text} onChange={event => setText(event.target.value)} placeholder="Ex.: Ir à academia" className="block w-full resize-none rounded-2xl border border-white/10 bg-white/10 p-4 text-lg font-bold text-white outline-none placeholder:font-normal placeholder:text-white/35 focus:border-cyan-200 focus:ring-4 focus:ring-cyan-300/20"/><div className="mt-3 flex flex-wrap items-center justify-between gap-3"><span className="text-xs text-white/45">{text.length}/100 · simples e possível</span><button disabled={saving || text.trim().length < 3} className="flex min-h-11 items-center gap-2 rounded-xl bg-white px-4 text-sm font-bold text-teal-800 disabled:opacity-50">{saving ? "Salvando..." : "Salvar desafio"}<ArrowRight size={16}/></button></div>{error && <p role="alert" className="mt-3 text-sm text-rose-200">{error}</p>}</form></section>;
  }

  return <section className={`relative mt-4 overflow-hidden rounded-[1.75rem] shadow-lg transition duration-500 ${focus.completed ? "bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-100 text-emerald-950 shadow-emerald-900/10 ring-1 ring-emerald-200/70" : "bg-gradient-to-br from-emerald-800 via-teal-700 to-cyan-600 text-white shadow-emerald-900/10"}`}>
    <span className={`pointer-events-none absolute -right-12 -top-14 size-40 rounded-full border ${focus.completed ? "border-cyan-500/15" : "border-white/12"}`}/>
    <span className={`pointer-events-none absolute -right-3 -top-2 size-24 rounded-full border ${focus.completed ? "border-emerald-600/10" : "border-white/10"}`}/>
    <button type="button" aria-expanded={expanded} aria-controls="daily-focus-details" onClick={() => { setExpanded(value => !value); setConfirmingDelete(false); }} className={`relative flex min-h-24 w-full items-center gap-3 px-5 py-4 text-left outline-none transition focus-visible:ring-4 focus-visible:ring-inset ${focus.completed ? "hover:bg-emerald-900/5 focus-visible:ring-emerald-500/30" : "hover:bg-white/5 focus-visible:ring-white/30"}`}>
      <span className={`grid size-11 shrink-0 place-items-center rounded-2xl ring-1 ${focus.completed ? "bg-emerald-700 text-white ring-emerald-800/10" : "bg-white/10 text-cyan-50 ring-white/15"}`}>{focus.completed ? <Check size={20} strokeWidth={3}/> : <Target size={20}/>}</span>
      <span className="min-w-0 flex-1"><span className={`flex items-center gap-1.5 text-[.64rem] font-bold uppercase tracking-[.18em] ${focus.completed ? "text-emerald-700" : "text-white/70"}`}><DeleveSymbol size={12}/>{focus.completed ? "Concluído" : "Meu desafio de hoje"}</span><strong className={`mt-1 block truncate text-base leading-tight sm:text-lg ${focus.completed ? "line-through decoration-1 decoration-emerald-700/45" : ""}`}>{focus.text}</strong></span>
      <ChevronDown size={17} aria-hidden="true" className={`shrink-0 transition duration-300 ${focus.completed ? "text-emerald-700/70" : "text-white/65"} ${expanded ? "rotate-180" : ""}`}/>
    </button>
    <div id="daily-focus-details" className={`relative grid transition-[grid-template-rows,opacity] duration-300 ease-out ${expanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}><div className="overflow-hidden"><div className={`mx-5 border-t pb-5 pt-4 ${focus.completed ? "border-emerald-900/10" : "border-white/15"}`}>
      <div className="flex items-center gap-3"><button disabled={saving} onClick={toggle} aria-label={focus.completed ? "Marcar desafio como pendente" : "Concluir desafio"} className={`grid size-11 shrink-0 place-items-center rounded-full border-2 transition duration-300 ${focus.completed ? "border-emerald-700 bg-emerald-700 text-white" : "border-white/45 bg-white/10 text-transparent hover:border-white"}`}><Check size={21} strokeWidth={3}/></button><div><p className="text-sm font-bold">{focus.completed ? "Desafio concluído" : "Concluir desafio"}</p><p className={`mt-0.5 text-xs ${focus.completed ? "text-emerald-800/70" : "text-white/65"}`}>{focus.completed ? "Você conseguiu. Um passo de cada vez." : "Um passo de cada vez."}</p></div></div>
      {!confirmingDelete ? <div className="mt-4 flex gap-2"><button onClick={() => setEditing(true)} className={`flex min-h-10 items-center gap-2 rounded-xl px-3 text-xs font-semibold transition ${focus.completed ? "bg-emerald-900/5 text-emerald-800 hover:bg-emerald-900/10" : "bg-white/10 text-white/80 hover:bg-white/15"}`}><Pencil size={14}/>Editar</button><button onClick={() => setConfirmingDelete(true)} className={`flex min-h-10 items-center gap-2 rounded-xl px-3 text-xs font-semibold transition ${focus.completed ? "text-emerald-800/65 hover:bg-emerald-900/5 hover:text-emerald-900" : "text-white/55 hover:bg-white/10 hover:text-white"}`}><Trash2 size={14}/>Remover</button></div> : <div className={`mt-4 flex flex-wrap items-center gap-2 rounded-xl p-3 ${focus.completed ? "bg-emerald-900/5" : "bg-black/15"}`}><span className={`mr-auto text-xs ${focus.completed ? "text-emerald-900/80" : "text-white/80"}`}>Remover o desafio de hoje?</span><button onClick={() => setConfirmingDelete(false)} className={`min-h-9 rounded-lg px-3 text-xs font-semibold ${focus.completed ? "bg-emerald-900/10" : "bg-white/10"}`}>Cancelar</button><button disabled={saving} onClick={remove} className="min-h-9 rounded-lg bg-white px-3 text-xs font-bold text-rose-600">Remover</button></div>}
      {error && <p role="alert" className={`mt-3 text-sm ${focus.completed ? "text-rose-700" : "text-rose-100"}`}>{error}</p>}
    </div></div></div>
  </section>;
}
