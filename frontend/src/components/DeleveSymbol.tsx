import type { SVGProps } from "react";

type DeleveSymbolProps = SVGProps<SVGSVGElement> & {
  size?: number | string;
};

/** Folha acolhida por uma curva: símbolo Abraço do Deleve. */
export default function DeleveSymbol({ size = 24, ...props }: DeleveSymbolProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true" focusable="false" {...props}>
      <path d="M35 10C24 13 22 22 28 30C39 27 43 18 35 10Z" fill="currentColor" />
      <path d="M11 29C13 43 23 52 35 49C46 47 52 38 53 27" stroke="currentColor" strokeWidth="7" strokeLinecap="round" />
    </svg>
  );
}
