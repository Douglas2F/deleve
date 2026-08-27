import { useEffect, useRef } from "react";
import { waterGoalMorph } from "./waterGoalMorph";

export default function WaterGoalCelebration({ paused }: { paused: boolean }) {
  const pathRef = useRef<SVGPathElement>(null);
  const startedAt = useRef<number | null>(null);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const start = startedAt.current ?? performance.now();
    startedAt.current = start;
    let frame = 0;
    function draw(progress: number) {
      const shape = waterGoalMorph(progress);
      pathRef.current?.setAttribute("d", shape.path);
      pathRef.current?.setAttribute("stroke-width", String(shape.strokeWidth));
    }
    function tick(now: number) {
      const progress = Math.max(0, Math.min(1, (now - start - 700) / 850));
      draw(progress);
      if (progress < 1) frame = requestAnimationFrame(tick);
    }
    function syncMotion() {
      cancelAnimationFrame(frame);
      if (paused || media.matches) draw(1);
      else tick(performance.now());
    }
    syncMotion();
    media.addEventListener("change", syncMotion);
    return () => {
      cancelAnimationFrame(frame);
      media.removeEventListener("change", syncMotion);
    };
  }, [paused]);

  return <div className="water-goal-message">
    <div className="water-goal-symbol" aria-hidden="true">
      <span className="water-goal-ripple" />
      <svg className="water-goal-morph" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" focusable="false">
        <path ref={pathRef} d={waterGoalMorph(0).path} />
        <path className="water-goal-leaf" d="M35 10C24 13 22 22 28 30C39 27 43 18 35 10Z" fill="currentColor" stroke="none" />
      </svg>
    </div>
    <strong>Meta atingida!</strong>
  </div>;
}
