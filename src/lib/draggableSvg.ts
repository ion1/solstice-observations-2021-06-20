// TODO: Where is this in Svelte?
type SvelteAction<T = never> = (
  node: Element,
  parameters?: T
) => {
  update?: (parameters: T) => void;
  destroy?: () => void;
};

export const draggableSvg: SvelteAction = (node: SVGGraphicsElement) => {
  if (!(node instanceof SVGGraphicsElement)) {
    throw new Error("Only SVGGraphicsElements are supported");
  }

  let original: DOMPoint;
  let previous: DOMPoint;

  function eventSvgCoords(event: PointerEvent): DOMPoint {
    return svgCoords(new DOMPoint(event.clientX, event.clientY));
  }

  function svgCoords(c: DOMPoint): DOMPoint {
    const ctm = node.getScreenCTM();
    return c.matrixTransform(ctm.inverse());
  }

  function handlePointerdown(event: PointerEvent) {
    node.setPointerCapture(event.pointerId);

    const position = eventSvgCoords(event);
    original = position;
    previous = position;

    node.dispatchEvent(
      new CustomEvent<SvgdragstartData>("svgdragstart", {
        detail: { position },
      })
    );

    window.addEventListener("pointermove", handlePointermove);
    window.addEventListener("pointerup", handlePointerup);
    window.addEventListener("pointercancel", handlePointercancel);
  }
  node.addEventListener("pointerdown", handlePointerdown);

  function handlePointermove(event: PointerEvent) {
    const position = eventSvgCoords(event);
    const delta = new DOMPoint(
      position.x - previous.x,
      position.y - previous.y
    );
    previous = position;

    node.dispatchEvent(
      new CustomEvent<SvgdragmoveData>("svgdragmove", {
        detail: { position, delta },
      })
    );
  }

  function handlePointerup(event: PointerEvent) {
    const position = eventSvgCoords(event);
    const delta = new DOMPoint(
      position.x - previous.x,
      position.y - previous.y
    );

    node.dispatchEvent(
      new CustomEvent<SvgdragendData>("svgdragend", {
        detail: { position, delta },
      })
    );

    window.removeEventListener("pointermove", handlePointermove);
    window.removeEventListener("pointerup", handlePointerup);
    window.removeEventListener("pointercancel", handlePointercancel);
  }

  function handlePointercancel() {
    const delta = new DOMPoint(
      original.x - previous.x,
      original.y - previous.y
    );

    node.dispatchEvent(
      new CustomEvent<SvgdragcancelData>("svgdragcancel", {
        detail: { original, delta },
      })
    );

    window.removeEventListener("pointermove", handlePointermove);
    window.removeEventListener("pointerup", handlePointerup);
    window.removeEventListener("pointercancel", handlePointercancel);
  }

  return {
    destroy: () => {
      node.removeEventListener("pointerdown", handlePointerdown);
      window.removeEventListener("pointermove", handlePointermove);
      window.removeEventListener("pointerup", handlePointerup);
      window.removeEventListener("pointercancel", handlePointercancel);
    },
  };
};

export default draggableSvg;
