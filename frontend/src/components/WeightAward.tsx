import { useId } from "react";

export type WeightAwardKind = "medal" | "trophy";

/** The approved Deleve awards, shared by the celebration and the persistent prize. */
export default function WeightAward({ kind, className }: { kind: WeightAwardKind; className?: string }) {
  const id = useId();
  const ref = (name: string) => `url(#${id}-${name})`;
  const trophy = kind === "trophy";
  return <svg className={className} data-weight-award={kind} viewBox="0 0 200 204" fill="none" aria-hidden="true" focusable="false">
    <defs>
      <linearGradient id={`${id}-metal`} x1="0" y1="0" x2=".95" y2="1">
        <stop stopColor="#ffedb0"/><stop offset=".23" stopColor="#efdba5"/><stop offset=".4" stopColor="#b88b3b"/><stop offset=".57" stopColor="#ffeabb"/><stop offset=".79" stopColor="#bd9144"/><stop offset="1" stopColor="#efd293"/>
      </linearGradient>
      <linearGradient id={`${id}-edge`} x1="0" y1="0" x2=".8" y2="1">
        <stop stopColor="#fff0bc"/><stop offset=".26" stopColor="#d6ae55"/><stop offset=".52" stopColor="#fae9a8"/><stop offset=".8" stopColor="#a67729"/><stop offset="1" stopColor="#e6c77e"/>
      </linearGradient>
      <linearGradient id={`${id}-face`} x1="0" y1="0" x2="1" y2="1">
        <stop stopColor="#fff7d9"/><stop offset=".4" stopColor="#efdaa4"/><stop offset=".72" stopColor="#d9b56b"/><stop offset="1" stopColor="#f0d797"/>
      </linearGradient>
      <linearGradient id={`${id}-leaf`} x1="0" y1="0" x2=".75" y2="1">
        <stop stopColor="#fff7d8"/><stop offset=".28" stopColor="#e8c677"/><stop offset=".6" stopColor="#b1873d"/><stop offset="1" stopColor="#e7c681"/>
      </linearGradient>
      {/* Match the emerald → teal → cyan gradient used by Brand. */}
      <linearGradient id={`${id}-ribbon`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="var(--color-emerald-700, #047857)"/><stop offset=".5" stopColor="var(--color-teal-600, #0d9488)"/><stop offset="1" stopColor="var(--color-cyan-500, #06b6d4)"/></linearGradient>
      <linearGradient id={`${id}-base`} x1="0" x2="1"><stop stopColor="#152e24"/><stop offset=".32" stopColor="#34523e"/><stop offset=".72" stopColor="#253c2c"/><stop offset="1" stopColor="#15291e"/></linearGradient>
      <linearGradient id={`${id}-top`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#76856a"/><stop offset="1" stopColor="#284332"/></linearGradient>
      <linearGradient id={`${id}-flash`}><stop stopColor="#fff" stopOpacity="0"/><stop offset=".5" stopColor="#fff" stopOpacity=".8"/><stop offset="1" stopColor="#fff" stopOpacity="0"/></linearGradient>
      <radialGradient id={`${id}-shadow`}><stop stopColor="#5b4427" stopOpacity=".2"/><stop offset="1" stopColor="#5b4427" stopOpacity="0"/></radialGradient>
      <clipPath id={`${id}-medal-clip`}><circle cx="100" cy="113" r="62"/></clipPath>
    </defs>
    {trophy ? <>
      <ellipse cx="100" cy="193" rx="73" ry="10" fill={ref("shadow")}/>
      <path d="M91 116H108L115 160H84Z" fill={ref("metal")}/>
      <rect x="47" y="158" width="106" height="30" rx="8" fill={ref("base")}/>
      <ellipse cx="100" cy="158" rx="53" ry="8" fill={ref("top")}/>
      <path d="M69 158H130" stroke="#e1c17c" strokeWidth="3" strokeLinecap="round"/>
      <path d="M57 182H143" stroke="#486045" strokeWidth=".8"/>
      <g transform="translate(27 10) scale(2.2)" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round">
        <g transform="translate(1.4 1.4)" stroke="#8d6428"><LeafPaths/></g>
        <g stroke={ref("metal")}><LeafPaths/></g>
        <path d="M11 28.5C13 42.5 23 51.5 35 48.5C46 46.5 52 37.5 53 26.5" stroke="#fff1c2" strokeWidth=".55"/>
      </g>
      <ellipse className="weight-award-glint" cx="107" cy="36" rx="2" ry="7" fill="#fff2ce"/>
    </> : <>
      <ellipse cx="100" cy="188" rx="65" ry="9" fill={ref("shadow")}/>
      <path d="M58 10H83L108 58 88 72Z M117 10H142L112 72 92 58Z" fill={ref("ribbon")}/>
      <path d="M65 10 95 65M135 10 105 65" stroke="var(--color-teal-200, #99f6e4)" strokeOpacity=".6" strokeWidth="1"/>
      <rect x="91" y="49" width="18" height="16" rx="5" fill="#b78a3e" stroke="#f0d28f" strokeWidth="3"/>
      <circle cx="100" cy="116" r="65" fill="#a67a32"/>
      <circle cx="100" cy="113" r="65" fill={ref("edge")}/>
      <circle cx="100" cy="113" r="59" fill={ref("face")} stroke="#b58c42" strokeWidth=".8"/>
      <circle className="weight-award-rim" cx="100" cy="113" r="54" stroke="#fff2c6" strokeWidth="1.2" pathLength="1"/>
      <g transform="translate(65 77) scale(1.12)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="7">
        <g transform="translate(0 1.5)" stroke="#967034"><LeafPaths/></g>
        <g stroke={ref("leaf")}><LeafPaths/></g>
      </g>
      <g clipPath={ref("medal-clip")}><path className="weight-award-sheen" d="M45 45H79L127 183H93Z" fill={ref("flash")}/></g>
    </>}
  </svg>;
}

function LeafPaths() {
  return <><path d="M35 10C24 13 22 22 28 30C39 27 43 18 35 10Z"/><path d="M11 29C13 43 23 52 35 49C46 47 52 38 53 27"/></>;
}
