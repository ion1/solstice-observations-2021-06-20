<script context="module" type="ts">
  export type Motion = {
    pos: DOMPoint;
    prevPos: DOMPoint;
    delta: DOMPoint;
  };
</script>

<script type="ts">
  import { createEventDispatcher, onDestroy } from "svelte";
  import { tweened } from "svelte/motion";
  import { cubicOut as easing } from "svelte/easing";

  import { scaleRotate } from "./scaleRotate";

  const dispatch = createEventDispatcher<{
    dragstart: DOMPoint;
    dragend: DOMPoint;
    dragmove: Motion;
    panzoomstart: never;
    panzoomend: never;
  }>();

  let svgNode: SVGGraphicsElement;
  let transformNode: SVGGraphicsElement;

  export let viewBox: string;
  export let preserveAspectRatio: string;

  let svgInvScaleTarget = 1;
  let svgRotationTarget = 0;
  let svgTranslateXTarget = 0;
  let svgTranslateYTarget = 0;

  const tweenOptions = { duration: 150, easing };
  const svgInvScale = tweened(svgInvScaleTarget, tweenOptions);
  const svgRotation = tweened(svgRotationTarget, {
    ...tweenOptions,
    interpolate: (from, to) => {
      const pi = Math.PI;
      // https://stackoverflow.com/a/14498790
      const diff = ((((to - from) % (2 * pi)) + 3 * pi) % (2 * pi)) - pi;
      return (t) => from + diff * t;
    },
  });
  const svgTranslateX = tweened(svgTranslateXTarget, tweenOptions);
  const svgTranslateY = tweened(svgTranslateYTarget, tweenOptions);

  $: transformAttr = [
    `rotate(${180 * ($svgRotation / Math.PI)})`,
    `scale(${1 / $svgInvScale})`,
    `translate(${$svgTranslateX} ${$svgTranslateY})`,
  ].join(" ");

  /** Get the matrix equivalent to the transformation. */
  function getTransformMatrix(): DOMMatrix {
    const translate = new DOMMatrix().translateSelf(
      svgTranslateXTarget,
      svgTranslateYTarget
    );
    const scale = new DOMMatrix().scaleSelf(1 / svgInvScaleTarget);
    const rotate = new DOMMatrix().rotateSelf(
      180 * (svgRotationTarget / Math.PI)
    );

    return new DOMMatrix()
      .preMultiplySelf(translate)
      .preMultiplySelf(scale)
      .preMultiplySelf(rotate);
  }

  /**
   * Update the transform values based on matrix multiplication.
   */
  function updateTransform(matrix: DOMMatrix): void {
    const svgMatrix = getTransformMatrix();

    svgMatrix.multiplySelf(matrix);

    const [a, b, c, d, e, f] = [
      svgMatrix.a,
      svgMatrix.b,
      svgMatrix.c,
      svgMatrix.d,
      svgMatrix.e,
      svgMatrix.f,
    ];

    svgInvScaleTarget = 1 / Math.sqrt(a * a + b * b);
    svgRotationTarget = Math.atan2(b, a);

    // Since we are applying translation before scaling and rotation,

    // [a c] [x] = [e]
    // [b d] [y] = [f]

    // [a c | e], - c/d [b d | f]
    // [b d | f], - b/a [a c | e]

    // [a-bc/d      0 | e-fc/d], / (a-bc/d)
    // [     0 d-bc/a | f-be/a], / (d-bc/a)

    // [1 0 | (e-fc/d)/(a-bc/d)]
    // [0 1 | (f-be/a)/(d-bc/a)]

    // [1 0 | (de-fc)/(ad-bc)]
    // [0 1 | (af-be)/(ad-bc)]

    svgTranslateXTarget = (d * e - f * c) / (a * d - b * c);
    svgTranslateYTarget = (a * f - b * e) / (a * d - b * c);

    svgInvScale.set(svgInvScaleTarget);
    svgRotation.set(svgRotationTarget);
    svgTranslateX.set(svgTranslateXTarget);
    svgTranslateY.set(svgTranslateYTarget);
  }

  /**
   * Get the matrix mapping transformNode coordinates into screen coordinates.
   */
  function getScreenCTM(): DOMMatrix {
    // Do not use transformNode.getScreenCTM() because it can return
    // mid-interpolation values.
    const svgCTM = DOMMatrix.fromMatrix(svgNode.getScreenCTM());
    return svgCTM.multiplySelf(getTransformMatrix());
  }

  /**
   * Convert a position in the screen coordinate system to the SVG element's
   * coordinate system.
   */
  function svgPosition(pos: DOMPoint): DOMPoint {
    const ctmInv = getScreenCTM().inverse();
    return pos.matrixTransform(ctmInv);
  }

  /**
   * Convert motion in the screen coordinate system to the SVG element's
   * coordinate system.
   */
  function svgMotion(m: Motion): Motion {
    const ctmInv = getScreenCTM().inverse();
    const pos = m.pos.matrixTransform(ctmInv);
    const prevPos = m.prevPos.matrixTransform(ctmInv);
    const delta = new DOMPoint(pos.x - prevPos.x, pos.y - prevPos.y);
    return { pos, prevPos, delta };
  }

  type State = {
    name: string;
    enter: () => void;
    exit: () => void;
    move: (motions: Map<number, Motion>) => void;
  };

  class StateMachine {
    buttonMap: Map<number, number>;
    posMap: Map<number, { pos: DOMPoint; prevPos: DOMPoint }>;

    state: State;

    states: {
      idle: State;
      dragging: State;
      panning: State;
      pinching: State;
    };

    constructor() {
      this.buttonMap = new Map();
      this.posMap = new Map();

      this.states = {
        idle: {
          name: "idle",
          enter: () => {},
          exit: () => {},
          move: () => {},
        },
        dragging: {
          name: "dragging",
          enter: () => {
            const screenPos = [...this.posMap.values()][0].pos;
            const svgPos = svgPosition(screenPos);
            dispatch("dragstart", svgPos);
          },
          exit: () => {
            const screenPos = [...this.posMap.values()][0].pos;
            const svgPos = svgPosition(screenPos);
            dispatch("dragend", svgPos);
          },
          move: (motions) => {
            const screenMot = [...motions.values()][0];
            const svgMot = svgMotion(screenMot);
            dispatch("dragmove", svgMot);
          },
        },
        panning: {
          name: "panning",
          enter: () => {
            dispatch("panzoomstart");
          },
          exit: () => {
            dispatch("panzoomend");
          },
          move: (motions) => {
            const screenMot = [...motions.values()][0];
            const svgMot = svgMotion(screenMot);

            const translate = new DOMMatrix().translateSelf(
              svgMot.delta.x,
              svgMot.delta.y
            );
            updateTransform(translate);
          },
        },
        pinching: {
          name: "pinching",
          enter: () => {
            dispatch("panzoomstart");
          },
          exit: () => {
            // Rotate about the middle point between the fingers to the
            // closest multiple of 90 degrees.
            const positions = [...this.posMap.values()].map((p) =>
              svgPosition(p.pos)
            );

            const translateToOrigin = new DOMMatrix().translateSelf(
              -0.5 * (positions[0].x + positions[1].x),
              -0.5 * (positions[0].y + positions[1].y)
            );

            const newRotation =
              Math.round(svgRotationTarget / (0.5 * Math.PI)) * (0.5 * Math.PI);
            const angleDiff = newRotation - svgRotationTarget;
            const rotate = new DOMMatrix().rotateSelf(
              180 * (angleDiff / Math.PI)
            );

            const matrix = DOMMatrix.fromMatrix(translateToOrigin)
              .preMultiplySelf(rotate)
              .preMultiplySelf(translateToOrigin.inverse());
            updateTransform(matrix);

            dispatch("panzoomend");
          },
          move: (motions) => {
            const screenMots = [...motions.values()];
            const { pos: posA, prevPos: prevPosA } = svgMotion(screenMots[0]);
            const { pos: posB, prevPos: prevPosB } = svgMotion(screenMots[1]);

            const matrix = scaleRotate([
              { pin: prevPosA, prevPos: prevPosB, pos: posB },
              { pin: posB, prevPos: prevPosA, pos: posA },
            ]);
            updateTransform(matrix);
          },
        },
      };

      this.state = this.states.idle;
      this.state.enter();
      onDestroy(() => {
        this.state.exit();
        this.buttonMap = undefined;
        this.posMap = undefined;
        this.state = undefined;
        this.states = undefined;
      });
    }

    down(event: PointerEvent): void {
      svgNode.setPointerCapture(event.pointerId);
      this.dispatch(event);
    }

    up(event: PointerEvent): void {
      this.dispatch(event);
    }

    move(event: PointerEvent): void {
      this.dispatch(event);
      return this.state.move(this.motions());
    }

    wheel(event: WheelEvent): void {
      const pos = svgPosition(new DOMPoint(event.clientX, event.clientY));

      const translateToOrigin = new DOMMatrix().translateSelf(-pos.x, -pos.y);
      const scale = new DOMMatrix().scaleSelf(1 - 0.003 * event.deltaY);

      const matrix = DOMMatrix.fromMatrix(translateToOrigin)
        .preMultiplySelf(scale)
        .preMultiplySelf(translateToOrigin.inverse());
      updateTransform(matrix);
    }

    /**
     * Compute the motion for all pointers since the last time they were
     * computed.
     */
    motions(): Map<number, Motion> {
      const motions = new Map<number, Motion>();
      for (const pointerId of this.posMap.keys()) {
        motions.set(pointerId, this.motion(pointerId));
      }
      return motions;
    }

    /** Compute the motion for pointerId since the last time it was computed. */
    motion(pointerId: number): Motion {
      const entry = this.posMap.get(pointerId);
      if (entry == null) {
        throw new Error(
          `No entry for ${pointerId} in ${JSON.stringify([...this.posMap])}`
        );
      }

      const { pos, prevPos } = entry;
      const delta = new DOMPoint(pos.x - prevPos.x, pos.y - prevPos.y);

      // The next delta will be computed from the current position.
      entry.prevPos = pos;

      return { pos, prevPos, delta };
    }

    /**
     * Update the position and button maps and do a possible state transition.
     */
    dispatch(event: PointerEvent): void {
      // Update the buttons map to the position map gets updated as well.
      if (event.buttons !== 0) {
        this.buttonMap.set(event.pointerId, event.buttons);
      }

      this.updatePosMap(event);

      // Only delete from the buttons map after the position map update so the
      // exit event sees a position.
      if (event.buttons === 0) {
        this.buttonMap.delete(event.pointerId);
      }

      const nextState = this.computeNextState();
      if (nextState !== this.state) {
        console.debug(`State: ${this.state.name} -> ${nextState.name}`);

        this.state.exit();
        this.cleanupPosMap();
        this.state = nextState;
        this.state.enter();
      }
    }

    /** Compute the next state for a possible transition. */
    computeNextState(): State {
      if (this.buttonMap.size < 1 || this.buttonMap.size > 2) {
        return this.states.idle;
      }

      const buttons = [...this.buttonMap.values()];

      const button1Down = buttons.length === 1 && buttons[0] === 1;
      // Either button 2 or 3 counts.
      const button2Down = buttons.length === 1 && (buttons[0] & (2 | 4)) !== 0;
      const twoButton1sDown =
        buttons.length === 2 && buttons[0] === 1 && buttons[1] === 1;

      if (button1Down) {
        // If we are pinching and one finger is released, stay in panning
        // rather than switching to dragging.
        if (
          this.state === this.states.pinching ||
          this.state === this.states.panning
        ) {
          return this.states.panning;
        } else {
          return this.states.dragging;
        }
      } else if (button2Down) {
        return this.states.panning;
      } else if (twoButton1sDown) {
        return this.states.pinching;
      } else {
        return this.states.idle;
      }
    }

    /** Set or update the current position in posMap. */
    updatePosMap(event: PointerEvent) {
      if (!this.buttonMap.has(event.pointerId)) {
        // No button is pressed, exit early.
        return;
      }

      const pos = new DOMPoint(event.clientX, event.clientY);
      const entry = this.posMap.get(event.pointerId);
      if (entry == null) {
        this.posMap.set(event.pointerId, { pos, prevPos: pos });
      } else {
        entry.pos = pos;
      }
    }

    /** Remove any pointers whose button is not down from posMap. */
    cleanupPosMap(): void {
      for (const pointerId of this.posMap.keys()) {
        if (!this.buttonMap.has(pointerId)) {
          this.posMap.delete(pointerId);
        }
      }
    }
  }

  const stateMachine = new StateMachine();

  const handlePointerDown = (event: PointerEvent) => stateMachine.down(event);
  const handlePointerUp = (event: PointerEvent) => stateMachine.up(event);
  const handlePointerLeave = (event: PointerEvent) => stateMachine.up(event);
  const handlePointerCancel = (event: PointerEvent) => stateMachine.up(event);
  const handlePointerMove = (event: PointerEvent) => stateMachine.move(event);
  const handleWheel = (event: WheelEvent) => stateMachine.wheel(event);
</script>

<svg
  {viewBox}
  {preserveAspectRatio}
  bind:this={svgNode}
  on:pointerdown|capture|preventDefault|stopPropagation={handlePointerDown}
  on:pointerup|capture|preventDefault|stopPropagation={handlePointerUp}
  on:pointerleave|capture|preventDefault|stopPropagation={handlePointerLeave}
  on:pointercancel|capture|preventDefault|stopPropagation={handlePointerCancel}
  on:pointermove|capture|preventDefault|stopPropagation={handlePointerMove}
  on:wheel|nonpassive|capture|preventDefault|stopPropagation={handleWheel}
>
  <g bind:this={transformNode} transform={transformAttr}>
    <slot />
  </g>
</svg>

<style>
  svg {
    touch-action: none;
  }
</style>
