import "./exercise-celebration.css";
import { formatExerciseDuration } from "./exerciseDuration";

export const EXERCISE_CELEBRATION_MS = 3800;

export default function ExerciseCelebration({ totalSeconds }: { totalSeconds: number }) {
  return <span className="exercise-celebration">
    <span className="exercise-celebration-glow" aria-hidden="true"/>
    <svg className="exercise-celebration-trace" viewBox="0 0 180 64" aria-hidden="true">
      <path className="exercise-celebration-track" d="M8 36H43Q47 36 49 31L59 12Q61 8 63 13L79 54Q81 59 84 52L102 19Q104 15 107 21L114 33Q116 36 121 36H172"/>
      <path className="exercise-celebration-line" pathLength="1" d="M8 36H43Q47 36 49 31L59 12Q61 8 63 13L79 54Q81 59 84 52L102 19Q104 15 107 21L114 33Q116 36 121 36H172"/>
    </svg>
    <span className="exercise-celebration-message"><strong>{formatExerciseDuration(totalSeconds)}</strong>{" "}<span>Atividade concluída</span></span>
  </span>;
}
