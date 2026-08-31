import { useEffect, useRef, useState } from "react";
import { Droplets, X } from "lucide-react";
import "./water-amount-dialog.css";

export default function WaterAmountDialog({ open, busy, error, portion, onClose, onAdd, onSavePortion }: {
  open: boolean; busy: boolean; error: string; portion: number; onClose: () => void; onAdd: (amount: number) => Promise<boolean>; onSavePortion: (amount: number) => Promise<boolean>;
}) {
  const [amount, setAmount] = useState("250");
  const [mode, setMode] = useState<"register" | "portion">("register");
  const dialog = useRef<HTMLDialogElement>(null);
  const submitting = useRef(false);
  useEffect(() => {
    if (!open) return;
    setAmount(String(portion));setMode("register");
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.current?.showModal();
    return () => { dialog.current?.close(); document.body.style.overflow = overflow; previousFocus?.focus(); };
  }, [open]);
  if (!open) return null;
  const value = Number(amount);
  const valid = amount.trim() !== "" && Number.isInteger(value) && value >= 50 && value <= 2000;
  function close() { if (!busy && !submitting.current) onClose(); }
  return <dialog ref={dialog} className="water-amount-dialog" aria-labelledby="water-amount-title" onCancel={event => { event.preventDefault(); close(); }}>
    <header><span className="water-amount-icon"><Droplets size={23} aria-hidden="true"/></span><div><p>Água</p><h2 id="water-amount-title">{mode === "portion" ? "Meu copo ou garrafa" : "Quanto você bebeu?"}</h2></div><button type="button" aria-label="Fechar quantidade de água" disabled={busy} onClick={close}><X size={20}/></button></header>
    <div className="water-amount-modes" role="group" aria-label="Registrar água ou configurar recipiente"><button type="button" disabled={busy} aria-pressed={mode === "register"} onClick={()=>{setMode("register");setAmount(String(portion))}}>Registrar água</button><button type="button" disabled={busy} aria-pressed={mode === "portion"} onClick={()=>{setMode("portion");setAmount(String(portion))}}>Meu copo ou garrafa</button></div>
    <form onSubmit={async event => {
      event.preventDefault();
      if (!valid || busy || submitting.current) return;
      submitting.current = true;
      try { if (await (mode === "portion" ? onSavePortion(value) : onAdd(value))) onClose(); } finally { submitting.current = false; }
    }}>
      <div className="water-amount-options" role="group" aria-label="Quantidades rápidas de água">{[250, 500, 750].map(preset => <button key={preset} type="button" disabled={busy} aria-pressed={value === preset} onClick={() => setAmount(String(preset))}>{preset} ml</button>)}</div>
      <label>{mode === "portion" ? "Tamanho do recipiente (ml)" : "Quantidade (ml)"}<input type="number" inputMode="numeric" required min="50" max="2000" step="1" disabled={busy} value={amount} onChange={event => setAmount(event.target.value)} aria-describedby="water-amount-hint"/></label>
      <p id="water-amount-hint" className="water-amount-hint">{mode === "portion" ? "O + usará esse tamanho. Salvar não registra consumo." : "Ou digite outra quantidade, de 50 a 2.000 ml."}</p>
      {error && <p className="water-amount-error" role="alert">{error}</p>}
      <footer><button type="button" disabled={busy} onClick={close}>Cancelar</button><button type="submit" disabled={busy || !valid}>{busy ? "Salvando…" : mode === "portion" ? "Salvar tamanho" : valid ? `Adicionar ${value.toLocaleString("pt-BR")} ml` : "Adicionar água"}</button></footer>
    </form>
  </dialog>;
}
