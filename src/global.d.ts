/// <reference types="@sveltejs/kit" />

type SvgdragstartData = { position: DOMPoint };
type SvgdragmoveData = { position: DOMPoint; delta: DOMPoint };
type SvgdragendData = { position: DOMPoint; delta: DOMPoint };
type SvgdragcancelData = { original: DOMPoint; delta: DOMPoint };

declare namespace svelte.JSX {
  export interface SVGProps {
    onsvgdragstart?: (event: CustomEvent<SvgdragstartEvent>) => void;
    onsvgdragmove?: (event: CustomEvent<SvgdragmoveEvent>) => void;
    onsvgdragend?: (event: CustomEvent<SvgdragendEvent>) => void;
    onsvgdragcancel?: (event: CustomEvent<SvgdragcancelEvent>) => void;
  }
}
