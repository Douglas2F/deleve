import { useRef, useState } from "react";
import { ChevronDown, Pencil, Trash2 } from "lucide-react";
import type { WeightHistoryEntry, WeightSummary } from "./WeightDialog";
import "./weight-history.css";

export default function WeightHistory({ entries, disabled, onChanged, onBusy }: {
  entries: WeightHistoryEntry[]; disabled: boolean; onChanged: (summary: WeightSummary) => void; onBusy: (busy: boolean) => void;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const [mode, setMode] = useState<"actions" | "edit" | "delete">("actions");
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [visibleCount, setVisibleCount] = useState(12);
  const inFlight = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const rowButton = useRef<HTMLButtonElement>(null);

  function select(entry: WeightHistoryEntry) {
    setSelected(current => current === entry.id ? null : entry.id ?? null);
    setMode("actions"); setValue(String(entry.weightKg)); setError(""); setNotice("");
  }
  function cancel() { setMode("actions"); setError(""); rowButton.current?.focus(); }
  async function submit(entry: WeightHistoryEntry, deleting: boolean) {
    if (!entry.id || inFlight.current) return;
    inFlight.current = true; setBusy(true); onBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch(`/api/health/weight/${entry.id}`, {
        method: deleting ? "DELETE" : "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(deleting ? { confirmed: true } : { weightKg: value }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Não foi possível alterar a pesagem.");
      onChanged(body); setSelected(null); setMode("actions");
      setNotice(deleting ? "Pesagem excluída. Resumo atualizado." : "Pesagem corrigida. Resumo atualizado.");
      heading.current?.focus();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Não foi possível confirmar a alteração. Feche e reabra o histórico para conferir."); }
    finally { inFlight.current = false; setBusy(false); onBusy(false); }
  }

  return <section className="weight-history">
    <h3 ref={heading} tabIndex={-1}>Histórico de pesagens</h3>
    <p className="weight-history-hint">Toque em uma pesagem para editar ou excluir.</p>
    {notice && <p role="status" className="weight-history-notice">{notice}</p>}
    <ul>{entries.slice(0,visibleCount).map(entry => <li key={entry.id ?? `initial-${entry.recordedOn}`}>
      {entry.id != null && !entry.isInitial ? <button ref={selected === entry.id ? rowButton : undefined} type="button" className="weight-history-row" disabled={disabled || busy} aria-expanded={selected === entry.id} aria-controls={`weight-actions-${entry.id}`} onClick={() => select(entry)} aria-label={`Pesagem de ${dateLabel(entry.recordedOn)}, ${weightLabel(entry.weightKg)} kg`}>
        <span>{dateLabel(entry.recordedOn)}</span><strong>{weightLabel(entry.weightKg)} kg</strong><ChevronDown size={16} aria-hidden="true"/>
      </button> : <div className="weight-history-initial"><span>{dateLabel(entry.recordedOn)}<small>Peso inicial do perfil</small></span><strong>{weightLabel(entry.weightKg)} kg</strong></div>}
      {selected !== null && selected === entry.id && <div id={`weight-actions-${entry.id}`} className="weight-history-actions">
        {mode === "actions" && <div className="weight-history-buttons"><button type="button" onClick={() => { setMode("edit"); setValue(String(entry.weightKg)); }}><Pencil size={15}/>Editar</button><button type="button" onClick={() => setMode("delete")}><Trash2 size={15}/>Excluir</button></div>}
        {mode === "edit" && <form onSubmit={event => { event.preventDefault(); void submit(entry, false); }}>
          <label>Peso corrigido (kg)<input autoFocus required type="number" min="20" max="400" step="0.1" inputMode="decimal" disabled={busy} value={value} onChange={event => setValue(event.target.value)}/></label>
          <p>A data de {dateLabel(entry.recordedOn)} será mantida.</p>
          <div className="weight-history-buttons"><button type="button" disabled={busy} onClick={cancel}>Cancelar</button><button className="weight-history-save" disabled={busy}>{busy ? "Salvando…" : "Salvar correção"}</button></div>
        </form>}
        {mode === "delete" && <div>
          <p><strong>Excluir {weightLabel(entry.weightKg)} kg de {dateLabel(entry.recordedOn)}?</strong></p><p>Não há botão para desfazer. As outras pesagens e seu peso inicial serão mantidos.</p>
          <div className="weight-history-buttons"><button autoFocus type="button" disabled={busy} onClick={cancel}>Cancelar</button><button type="button" className="weight-history-delete" disabled={busy} onClick={() => void submit(entry, true)}>{busy ? "Excluindo…" : "Confirmar exclusão"}</button></div>
        </div>}
        {error && <p role="alert" className="weight-history-error">{error}</p>}
      </div>}
    </li>)}</ul>
    {entries.length>visibleCount&&<button type="button" disabled={disabled||busy} onClick={()=>setVisibleCount(count=>count+12)} className="min-h-11 w-full rounded-xl text-sm font-semibold text-amber-800">Ver pesagens anteriores</button>}
  </section>;
}
function dateLabel(value: string) { return new Date(`${value}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" }); }
function weightLabel(value: number) { return value.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }); }
