import { useId } from "react";
import "./sleep-celebration.css";

export const SLEEP_CELEBRATION_MS = 4000;

export default function SleepCelebration({ durationLabel }: { durationLabel: string }) {
  const moonGradient = useId();
  return <span className="sleep-celebration">
    <span className="sleep-celebration-glow" aria-hidden="true"/>
    <svg className="sleep-celebration-sky" viewBox="0 0 96 72" aria-hidden="true">
      <defs><linearGradient id={moonGradient} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#ede9fe"/><stop offset="1" stopColor="#c4b5fd"/></linearGradient></defs>
      <path className="sleep-celebration-moon" transform="translate(5 2) scale(2.5)" d="M20.9 13.2A9 9 0 0 1 10.8 3.1 9 9 0 1 0 20.9 13.2Z" fill={`url(#${moonGradient})`} stroke="#8b5cf6" strokeWidth=".65" strokeLinejoin="round"/>
      <g className="sleep-celebration-star sleep-celebration-star-first" fill="#a78bfa"><path d="m75 10 1.8 3.6 4 .6-2.9 2.8.7 4-3.6-1.9-3.6 1.9.7-4-2.9-2.8 4-.6Z"/></g>
      <g className="sleep-celebration-star sleep-celebration-star-second" fill="#8b5cf6"><path d="m82 37 1.3 2.7 3 .4-2.2 2.1.5 3-2.6-1.4-2.6 1.4.5-3-2.2-2.1 3-.4Z"/></g>
      <circle className="sleep-celebration-star sleep-celebration-star-third" cx="66" cy="59" r="1.7" fill="#a78bfa"/>
    </svg>
    <span className="sleep-celebration-message"><strong>{durationLabel}</strong>{" "}<span>de descanso</span>{" "}<span className="sleep-celebration-achieved">Meta de sono atingida</span></span>
  </span>;
}
