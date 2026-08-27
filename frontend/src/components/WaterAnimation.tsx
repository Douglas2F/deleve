import "./water-animation.css";

/** Decorative only: the actual amount and goal remain in the card's text. */
export default function WaterAnimation({ progress, paused, celebrating = false }: { progress: number; paused: boolean; celebrating?: boolean }) {
  const level = Number.isFinite(progress) ? Math.max(0, Math.min(100, progress)) : 0;
  return <div className="water-animation" aria-hidden="true" data-paused={paused} data-empty={level === 0}>
    <div className="water-level" style={{ transform: `translateY(${100 - level}%)` }}>
      <div className="water-layer water-layer-back"><Wave /></div>
      <div className="water-layer water-layer-front"><Wave /></div>
    </div>
    {celebrating && !paused && <div className="water-goal-burst">
      <div className="water-goal-fill"><svg className="water-goal-surface" viewBox="0 0 1200 400" preserveAspectRatio="none" focusable="false"><path d="M0 32C100 0 200 0 300 32S500 64 600 32S800 0 900 32S1100 64 1200 32V400H0Z" /></svg></div>
      {[12, 25, 40, 61, 76, 88].map((left, index) => <span key={left} className="water-goal-drop" style={{ left: `${left}%`, animationDelay: `${.9 + index % 3 * .1}s` }} />)}
    </div>}
  </div>;
}

function Wave() {
  return <svg className="water-wave" viewBox="0 0 1200 48" preserveAspectRatio="none" focusable="false">
    <path d="M0 24 C100 0 200 0 300 24 S500 48 600 24 S800 0 900 24 S1100 48 1200 24 V48 H0Z" />
  </svg>;
}
