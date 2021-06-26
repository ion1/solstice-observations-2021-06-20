<script type="ts">
  import GrabIndicator from "./GrabIndicator.svelte";
  import { fade } from "svelte/transition";
  import { tweened } from "svelte/motion";
  import { cubicOut as easing } from "svelte/easing";

  import observations from "./observations";
  import type { Observation } from "./observations";
  import * as d from "./diagram";
  import draggableSvg from "./draggableSvg";

  let showGrabIndicator = true;

  const diagramScale = 500;
  const debug = false;

  let shape = tweened(0, {
    duration: 100,
    easing,
  });
  let shapeTarget = 0;

  let dragging = false;
  let shapeBeforeDrag = shapeTarget;
  let dragOrigin = 0;
  const dragScale = -2 / diagramScale;
  const dragSnapOffset = 0.1;

  function applyDrag(position: number): void {
    const deltaUnclamped = position - dragOrigin;
    const delta = clamp(
      deltaUnclamped,
      -1.0 / Math.abs(dragScale),
      1.0 / Math.abs(dragScale)
    );
    dragOrigin += deltaUnclamped - delta;

    shapeTarget = dragScale * delta;
    shape.set(shapeTarget, { duration: 0 });
  }

  function stopMotion() {
    // Set the current value as the target and stop motion.
    shapeTarget = $shape;
    shape.set(shapeTarget, { duration: 0 });
  }

  function clamp(n: number, min: number, max: number): number {
    return Math.min(Math.max(n, min), max);
  }

  function handleDragstart(event: CustomEvent<SvgdragstartData>): void {
    event.preventDefault();
    dragging = true;
    stopMotion();
    shapeBeforeDrag = shapeTarget;
    dragOrigin = event.detail.position.y - shapeTarget / dragScale;
  }

  function handleDragmove(event: CustomEvent<SvgdragmoveData>): void {
    showGrabIndicator = false;

    applyDrag(event.detail.position.y);
  }

  function handleDragend(event: CustomEvent<SvgdragendData>): void {
    dragging = false;
    applyDrag(event.detail.position.y);

    if (Math.abs(shapeTarget) < dragSnapOffset) {
      shapeTarget = 0;
      shape.set(shapeTarget);
    } else if (Math.abs(shapeTarget) > 1 - dragSnapOffset) {
      shapeTarget = Math.sign(shapeTarget) * 1;
      shape.set(shapeTarget);
    }
  }

  function handleDragcancel(event: CustomEvent<SvgdragcancelData>): void {
    dragging = false;
    shapeTarget = shapeBeforeDrag;
    shape.set(shapeTarget);
  }

  $: earth = d.computeParameters($shape);

  function surfacePath(earth: d.EarthParams): string {
    const north = d.scale(earth.surfaceAt(90).point, diagramScale);
    const south = d.scale(earth.surfaceAt(-90).point, diagramScale);

    if (earth.type === d.FLAT) {
      return [`M ${north.x} ${north.y}`, `L ${south.x} ${south.y}`].join(" ");
    } else {
      const r = earth.circleScale * diagramScale;
      const sweepFlag = earth.curvatureType === d.CONVEX ? 0 : 1;
      return [
        `M ${north.x} ${north.y}`,
        `A ${r} ${r} 0 0 ${sweepFlag} ${south.x} ${south.y}`,
      ].join(" ");
    }
  }

  let tickLatitudes = [];
  for (let l = -90; l <= 90; l += 10) {
    tickLatitudes.push(l);
  }

  function surfaceTickPath(surf: d.SurfaceAt): string {
    const tickLength = -0.05;

    const point = d.scale(surf.point, diagramScale);
    const vector = d.scale(surf.normal, tickLength * diagramScale);

    return [`M ${point.x} ${point.y}`, `l ${vector.x} ${vector.y}`].join(" ");
  }

  function latitudeTextPosition(surf: d.SurfaceAt): string {
    const latitudeTextDistance = -0.1;

    const point = d.scale(surf.point, diagramScale);
    const vector = d.scale(surf.normal, latitudeTextDistance * diagramScale);

    return `translate(${point.x + vector.x} ${point.y + vector.y})`;
  }

  function latitudeText(latitude: number): string {
    return [
      Math.abs(latitude),
      "°",
      ["S", "", "N"][Math.sign(latitude) + 1],
    ].join("");
  }

  function observationPath(surf: d.SurfaceAt, obs: Observation): string {
    const normal = d.rotate(surf.normal, obs.angle - 0.5 * Math.PI);
    const length = 10;

    const point = d.scale(surf.point, diagramScale);
    const vector = d.scale(normal, length * diagramScale);

    return [`M ${point.x} ${point.y}`, `l ${vector.x} ${vector.y}`].join(" ");
  }
</script>

<div class="diagram-container">
  <svg
    viewBox="-600 -600 1200 1200"
    preserveAspectRatio="xMidYMax meet"
    use:draggableSvg
    on:svgdragstart={handleDragstart}
    on:svgdragmove={handleDragmove}
    on:svgdragend={handleDragend}
    on:svgdragcancel={handleDragcancel}
    class:dragging
  >
    {#if debug}
      <path d="M -600 -600 H 600 V 600 H -600 Z" class="debug" />
    {/if}
    <g transform="scale(1 -1) translate(0 -300)">
      {#if debug}
        {#if earth.type === d.CURVED}
          <circle
            class="debug"
            cx={0}
            cy={earth.circleOffset * diagramScale}
            r={earth.circleScale * diagramScale}
          />
        {/if}
      {/if}

      <path class="surface" d={surfacePath(earth)} />

      {#each tickLatitudes as latitude}
        <path class="tick" d={surfaceTickPath(earth.surfaceAt(latitude))} />
        <g
          transform={`${latitudeTextPosition(
            earth.surfaceAt(latitude)
          )} scale(1 -1)`}
        >
          <text class="latitude">{latitudeText(latitude)}</text>
        </g>
      {/each}

      {#each observations as obs}
        <path
          class="observation"
          d={observationPath(earth.surfaceAt(obs.latitude), obs)}
          stroke-opacity={Math.exp(-0.8 * ((obs.error / Math.PI) * 180 - 0.1))}
        />
      {/each}
    </g>
  </svg>
</div>

{#if showGrabIndicator}
  <div class="grab-indicator" transition:fade>
    <GrabIndicator />
  </div>
{/if}

<style>
  .diagram-container {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
  }

  .grab-indicator {
    pointer-events: none;
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
  }

  svg {
    overflow: visible;
    width: 100%;
    height: 100%;
    cursor: move;
    cursor: grab;
    touch-action: none;
  }

  .dragging {
    cursor: grabbing;
  }

  svg * {
    vector-effect: non-scaling-stroke;
    touch-action: none;
  }

  text {
    user-select: none;
  }

  circle,
  path {
    fill: transparent;
    stroke: var(--foreground-color);
    stroke-width: 2px;
    stroke-linejoin: bevel;
  }

  .tick {
    stroke-width: 1px;
  }

  .latitude {
    font: 17.5px sans-serif;
    fill: var(--foreground-color);
    text-anchor: middle;
    dominant-baseline: middle;
  }

  .observation {
    stroke-width: 1px;
  }

  .debug {
    stroke-width: 0.1px;
  }
</style>
