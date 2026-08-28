import WeightAward, { type WeightAwardKind } from "./WeightAward";
import { formatWeightChange } from "./healthMilestones";
import "./weight-celebration.css";

export const WEIGHT_CELEBRATION_MS = 4000;
export type WeightCelebrationEvent = { id: number; changeKg: number; kind: WeightAwardKind };

export default function WeightCelebration({ changeKg, kind }: { changeKg: number; kind: WeightAwardKind }) {
  const trophy = kind === "trophy";
  return <span className="weight-celebration" data-award={kind}>
    <span className="weight-celebration-glow" aria-hidden="true"/>
    <WeightAward kind={kind} className="weight-celebration-award"/>
    <span className="weight-celebration-copy"><strong>{trophy ? "Você chegou lá!" : formatWeightChange(changeKg)}</strong>{" "}<span>{trophy ? `${formatWeightChange(changeKg)} · Meta alcançada` : "Um passo importante."}</span></span>
  </span>;
}
