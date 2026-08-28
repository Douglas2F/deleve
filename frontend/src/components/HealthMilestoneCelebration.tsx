import { Activity, MoonStar, X } from "lucide-react";
import DeleveSymbol from "./DeleveSymbol";
import type { HealthMilestone } from "./healthMilestones";
import "./health-milestone.css";

const messages = {
  exercise: { title: "30 min de movimento!", detail: "Cada atividade do seu dia conta." },
  sleep: { title: "Meta de sono atingida!", detail: "Um momento para valorizar seu descanso." },
  weight: { title: "Na direção do seu objetivo!", detail: "Seu progresso, no seu ritmo." },
};

export default function HealthMilestoneCelebration({ milestone, onDismiss }: {
  milestone: { kind: HealthMilestone; id: number } | null;
  onDismiss: () => void;
}) {
  return <div className="health-milestone-region">
    <div role="status" aria-live="polite" aria-atomic="true">
      {milestone && <div key={milestone.id} className="health-milestone" data-kind={milestone.kind}>
        <span className="health-milestone-emblem" aria-hidden="true">
          <svg className="health-milestone-ring" viewBox="0 0 64 64"><circle cx="32" cy="32" r="28"/></svg>
          <span className="health-milestone-icon">{milestone.kind === "exercise" ? <Activity size={25}/> : milestone.kind === "sleep" ? <MoonStar size={25}/> : <DeleveSymbol size={29}/>}</span>
          <span className="health-milestone-particles"><i/><i/><i/><i/></span>
        </span>
        <span className="health-milestone-copy"><strong>{messages[milestone.kind].title}</strong><span>{messages[milestone.kind].detail}</span></span>
      </div>}
    </div>
    {milestone && <button type="button" className="health-milestone-dismiss" onClick={onDismiss} aria-label="Fechar incentivo"><X size={15}/></button>}
  </div>;
}
