/// <reference types="@sveltejs/kit" />

type SvgdragstartData = { position: DOMPoint };
type SvgdragmoveData = { position: DOMPoint; delta: DOMPoint };
type SvgdragendData = { position: DOMPoint; delta: DOMPoint };
type SvgdragcancelData = { original: DOMPoint; delta: DOMPoint };

declare namespace svelte.JSX {
  export interface SVGProps {
    onsvgdragstart?: (event: CustomEvent<SvgdragstartData>) => void;
    onsvgdragmove?: (event: CustomEvent<SvgdragmoveData>) => void;
    onsvgdragend?: (event: CustomEvent<SvgdragendData>) => void;
    onsvgdragcancel?: (event: CustomEvent<SvgdragcancelData>) => void;
  }
}
