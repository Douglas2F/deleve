const words = ["Saúde", "Sono", "Movimento", "Água", "Constância", "Seu ritmo"];

export default function KineticStrip() {
  const repeatedWords = [...words, ...words];

  return (
    <div className="kinetic-strip overflow-hidden border-y border-emerald-900/10 bg-emerald-800 py-3 text-white" aria-hidden="true">
      <div className="kinetic-track flex w-max items-center">
        {repeatedWords.map((word, index) => (
          <span className="flex items-center gap-5 whitespace-nowrap px-5 text-xs font-bold uppercase tracking-[.2em]" key={`${word}-${index}`}>
            {word}<i className="size-1.5 rounded-full bg-cyan-300" />
          </span>
        ))}
      </div>
    </div>
  );
}
