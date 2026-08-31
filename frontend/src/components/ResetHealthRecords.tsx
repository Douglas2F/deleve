import { useEffect, useRef, useState } from "react";
import { Download, Trash2, X } from "lucide-react";
import "./reset-health-records.css";

type Preview = { revision: string; profileName: string; profileWeightKg: number; counts: Record<string, number> };
const areas = { water: "Água", sleep: "Sono", exercise: "Exercícios", weight: "Pesagens", focus: "Desafios" };

export default function ResetHealthRecords({ disabled = false }: { disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [confirmation, setConfirmation] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState<"backup" | "reset" | null>(null);
  const [stale, setStale] = useState(false);
  const [success, setSuccess] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const requestInFlight = useRef(false);

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    setPreview(null); setConfirmation(""); setAcknowledged(false); setError(""); setNotice(""); setStale(false); setSuccess(false);
    dialog.current?.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    fetch("/api/health/records", { signal: controller.signal, cache: "no-store" })
      .then(async response => { const body = await response.json(); if (!response.ok) throw new Error(body.error ?? "Não foi possível consultar seus registros."); return body as Preview; })
      .then(value => { if (!controller.signal.aborted) setPreview(value); })
      .catch(caught => { if (!controller.signal.aborted) setError(caught instanceof Error ? caught.message : "Não foi possível consultar seus registros."); });
    return () => { controller.abort(); dialog.current?.close(); document.body.style.overflow = overflow; trigger.current?.focus(); };
  }, [open]);

  function close() { if (!requestInFlight.current) { if (success) window.location.reload(); else setOpen(false); } }

  async function backup() {
    if (requestInFlight.current) return;
    requestInFlight.current = true; setBusy("backup"); setError(""); setNotice("");
    try {
      const response = await fetch("/api/health/records/backup", { cache: "no-store" });
      if (!response.ok) throw new Error("Não foi possível gerar o backup. Tente novamente antes de apagar.");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url; link.download = `deleve-saude-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.append(link); link.click(); link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 60000);
      setNotice("Download solicitado. Confira se o arquivo foi salvo antes de continuar.");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Não foi possível baixar o backup."); }
    finally { requestInFlight.current = false; setBusy(null); }
  }

  async function reset() {
    if (!preview || stale || !acknowledged || confirmation !== "APAGAR" || requestInFlight.current) return;
    requestInFlight.current = true; setBusy("reset"); setError("");
    try {
      const response = await fetch("/api/health/records/reset", { method: "POST", headers: { "Content-Type": "application/json", "X-Deleve-Action": "reset-records" }, body: JSON.stringify({ confirmation, revision: preview.revision }) });
      const body = await response.json();
      if (!response.ok) { if (response.status === 409) setStale(true); throw new Error(body.error ?? "Não foi possível limpar os registros."); }
      setSuccess(true);
    } catch (caught) {
      // The response may have been lost after deletion: require a fresh preview, never retry blindly.
      setStale(true);
      setError(`${caught instanceof Error ? caught.message : "Não foi possível confirmar a limpeza."} Feche e reabra para conferir o estado atual.`);
    } finally { requestInFlight.current = false; setBusy(null); }
  }

  const total = preview ? Object.values(preview.counts).reduce((sum, value) => sum + value, 0) : 0;
  return <section className="reset-records-settings">
    <h3>Seus dados</h3><p>Remova os registros de teste sem refazer seu perfil.</p>
    <button ref={trigger} type="button" disabled={disabled} onClick={() => setOpen(true)}><Trash2 size={17} aria-hidden="true"/>Limpar registros e recomeçar</button>
    {open && <dialog ref={dialog} className="reset-records-dialog" aria-labelledby="reset-records-title" onCancel={event => { event.preventDefault(); close(); }}>
      <header><h2 id="reset-records-title">{success ? "Tudo pronto para recomeçar" : "Limpar seus registros?"}</h2><button type="button" aria-label="Fechar limpeza de registros" disabled={!!busy} onClick={close}><X size={20}/></button></header>
      {success ? <><p role="status">Os registros foram apagados. Seu perfil e suas metas foram preservados.</p><button type="button" className="reset-records-return" onClick={close}>Voltar ao painel</button></> : <>
        <p>Esta ação apaga todo o histórico das áreas abaixo, não apenas os registros de hoje.</p>
        {!preview && !error && <p role="status">Consultando seus registros…</p>}
        {preview && <>
          <dl className="reset-records-counts">{Object.entries(areas).map(([key, label]) => <div key={key}><dt>{label}</dt><dd>{preview.counts[key] ?? 0}</dd></div>)}</dl>
          <p><strong>Será mantido:</strong> perfil de {preview.profileName}, suas metas e o peso inicial de {preview.profileWeightKg.toLocaleString("pt-BR")} kg informado no perfil.</p>
          <button type="button" className="reset-records-backup" disabled={!!busy} onClick={backup}><Download size={18} aria-hidden="true"/>{busy === "backup" ? "Gerando backup…" : "Baixar backup antes"}</button>
          <p className="reset-records-hint">Arquivo JSON com dados pessoais. Guarde em local seguro. A restauração automática ainda não está disponível.</p>
          {notice && <p role="status">{notice}</p>}
          {total > 0 ? <>
            <label className="reset-records-ack"><input type="checkbox" checked={acknowledged} disabled={!!busy} onChange={event => setAcknowledged(event.target.checked)}/><span>Entendo que não há botão para desfazer esta limpeza.</span></label>
            <label className="reset-records-confirm">Digite <strong>APAGAR</strong> para confirmar<input autoComplete="off" spellCheck={false} value={confirmation} disabled={!!busy} onChange={event => setConfirmation(event.target.value)} /></label>
          </> : <p role="status">Você já está sem registros para apagar.</p>}
        </>}
        {error && <p role="alert" className="reset-records-error">{error}</p>}
        <footer><button type="button" disabled={!!busy} onClick={close}>Cancelar</button><button type="button" className="reset-records-delete" disabled={!preview || total === 0 || stale || !!busy || !acknowledged || confirmation !== "APAGAR"} onClick={reset}>{busy === "reset" ? "Apagando…" : "Apagar registros"}</button></footer>
      </>}
    </dialog>}
  </section>;
}
