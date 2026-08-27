import DeleveSymbol from "./DeleveSymbol";
type BrandProps = {
  inverse?: boolean;
  showTagline?: boolean;
};

export default function Brand({ inverse = false, showTagline = true }: BrandProps) {
  return (
    <div className="flex items-center gap-3" aria-label="Deleve">
      <span className="grid size-10 place-items-center rounded-[.9rem] bg-gradient-to-br from-emerald-700 via-teal-600 to-cyan-500 text-white shadow-lg shadow-emerald-900/20 ring-1 ring-white/60">
        <DeleveSymbol size={28} className="shrink-0" />
      </span>
      <div>
        <b className={`block text-[1.12rem] leading-none tracking-[-.04em] ${inverse ? "text-white" : "text-stone-800"}`}>
          De<span className="bg-gradient-to-r from-emerald-600 via-teal-500 to-cyan-400 bg-clip-text text-transparent">leve</span>
        </b>
        {showTagline && (
          <small className={`mt-1 block text-[.62rem] font-semibold tracking-wide ${inverse ? "text-white/55" : "text-stone-400"}`}>
            Sua rotina, do seu jeito.
          </small>
        )}
      </div>
    </div>
  );
}
