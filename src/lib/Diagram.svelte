<script type="ts">
  import GrabIndicator from "./GrabIndicator.svelte";
  import { fade } from "svelte/transition";
  import { tweened } from "svelte/motion";
  import { cubicOut as easing } from "svelte/easing";

  import type { Matrix, Vector } from "vec-la-fp";
  import { vAdd, vRotate, vScale, vTransform } from "vec-la-fp";

  import observations from "./observations";
  import type { Observation } from "./observations";
  import * as d from "./diagram";
  import draggableSvg from "./draggableSvg";
  import { onMount } from "svelte";

  const diagramScale = 500;
  // prettier-ignore
  const diagramTransform: Matrix = [
    diagramScale, 0,             0,
    0,            -diagramScale, 0,
    0,            0,             1,
  ];
  const debug = false;

  let shape = tweened(0, {
    duration: 100,
    easing,
  });
  let shapeTarget = 0;

  let loaded = false;
  let showGrabIndicator = false;
  onMount(() => {
    loaded = true;
    showGrabIndicator = true;
  });
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

  function lineSegmentPath(start: Vector, end: Vector): string {
    const sT = vTransform(diagramTransform, start);
    const eT = vTransform(diagramTransform, end);
    return [`M ${sT[0]} ${sT[1]}`, `L ${eT[0]} ${eT[1]}`].join(" ");
  }

  function surfacePath(earth: d.EarthParams): string {
    const north = earth.surfaceAt(90).point;
    const south = earth.surfaceAt(-90).point;

    if (earth.type === d.FLAT) {
      return lineSegmentPath(north, south);
    } else {
      const northT = vTransform(diagramTransform, north);
      const southT = vTransform(diagramTransform, south);

      const r = earth.circleScale * diagramScale;
      const sweepFlag = earth.curvatureType === d.CONVEX ? 1 : 0;
      return [
        `M ${northT[0]} ${northT[1]}`,
        `A ${r} ${r} 0 0 ${sweepFlag} ${southT[0]} ${southT[1]}`,
      ].join(" ");
    }
  }

  let tickLatitudes = [];
  for (let l = -90; l <= 90; l += 10) {
    tickLatitudes.push(l);
  }

  function surfaceTickPath(surf: d.SurfaceAt): string {
    const tickLength = -0.05;

    return lineSegmentPath(
      surf.point,
      vAdd(surf.point, vScale(tickLength, surf.normal))
    );
  }

  function latitudeTextPosition(surf: d.SurfaceAt): string {
    const latitudeTextDistance = -0.1;

    const point = vTransform(
      diagramTransform,
      vAdd(surf.point, vScale(latitudeTextDistance, surf.normal))
    );

    return `translate(${point[0]} ${point[1]})`;
  }

  function latitudeText(latitude: number): string {
    return [
      Math.abs(latitude),
      "°",
      ["S", "", "N"][Math.sign(latitude) + 1],
    ].join("");
  }

  const verticalLines = [
    { id: "tropic-south", label: "Tropic of Capricorn", latitude: -23.4365 },
    { id: "equator", label: "Equator", latitude: 0 },
    { id: "tropic-north", label: "Tropic of Cancer", latitude: 23.4365 },
  ];

  function verticalLinePath(
    earth: d.EarthParams,
    latitude: number,
    pathType: "up" | "down" | "label"
  ): string {
    const textDistance = 0.15;

    const surf = earth.surfaceAt(latitude);

    // Limit the length to avoid going beyond the center of the circle.
    const length =
      earth.type === d.CURVED &&
      earth.curvatureType === (pathType === "up" ? d.CONCAVE : d.CONVEX)
        ? Math.min(10, earth.circleScale)
        : 10;

    if (pathType === "up") {
      return lineSegmentPath(
        surf.point,
        vAdd(surf.point, vScale(length, surf.normal))
      );
    } else if (pathType === "down") {
      return lineSegmentPath(
        surf.point,
        vAdd(surf.point, vScale(-length, surf.normal))
      );
    } else if (pathType === "label") {
      // Start at the far end, end a bit before reaching the ground.
      return lineSegmentPath(
        vAdd(surf.point, vScale(-length, surf.normal)),
        vAdd(surf.point, vScale(-textDistance, surf.normal))
      );
    } else {
      const impossible: never = pathType;
      throw new Error(`Impossible path type: ${impossible}`);
    }
  }

  function observationPath(surf: d.SurfaceAt, obs: Observation): string {
    const direction = vRotate(obs.angle - 0.5 * Math.PI, surf.normal);
    const length = 10;

    return lineSegmentPath(
      surf.point,
      vAdd(surf.point, vScale(length, direction))
    );
  }
</script>

<svg
  viewBox="-600 -600 1200 1200"
  preserveAspectRatio="xMidYMax meet"
  use:draggableSvg
  on:svgdragstart={handleDragstart}
  on:svgdragmove={handleDragmove}
  on:svgdragend={handleDragend}
  on:svgdragcancel={handleDragcancel}
  class="diagram"
  class:loading={!loaded}
  class:draggable={loaded}
  class:dragging
>
  {#if debug}
    <path d="M -600 -600 H 600 V 600 H -600 Z" class="debug" />
  {/if}
  <g transform="translate(0 300)">
    {#if debug}
      {#if earth.type === d.CURVED}
        <circle
          class="debug"
          cx={0}
          cy={vTransform(diagramTransform, [0, earth.circleOffset])[1]}
          r={earth.circleScale * diagramScale}
        />
      {/if}
    {/if}

    <path class="surface" d={surfacePath(earth)} />

    {#each tickLatitudes as latitude}
      <path class="tick" d={surfaceTickPath(earth.surfaceAt(latitude))} />
      <g transform={latitudeTextPosition(earth.surfaceAt(latitude))}>
        <text class="latitude">{latitudeText(latitude)}</text>
      </g>
    {/each}

    {#each verticalLines as line}
      <!--
        Draw a line down and a line up separately so their dash pattern starts
        from the ground.
      -->
      <path
        class="vertical-line"
        d={verticalLinePath(earth, line.latitude, "down")}
      />
      <path
        class="vertical-line"
        d={verticalLinePath(earth, line.latitude, "up")}
      />
      <path
        class="vertical-line-text-path"
        id={`${line.id}-path`}
        d={verticalLinePath(earth, line.latitude, "label")}
      />
      <text class="vertical-line-text" dy="-7.5">
        <textPath href={`#${line.id}-path`} startOffset="100%">
          {line.label}
        </textPath>
      </text>
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

{#if showGrabIndicator}
  <div class="grab-indicator" transition:fade>
    <GrabIndicator />
  </div>
{/if}

<style>
  .diagram {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    overflow: hidden;
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
    touch-action: none;
  }

  .loading {
    cursor: progress;
  }

  .draggable {
    cursor: move;
    cursor: grab;
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

  .latitude,
  .vertical-line-text {
    font: 17.5px sans-serif;
    fill: var(--foreground-color);
  }

  .latitude {
    text-anchor: middle;
    dominant-baseline: middle;
  }

  .vertical-line {
    stroke-width: 0.25px;

    --dash-size: 5px;
    stroke-dasharray: var(--dash-size);
    stroke-dashoffset: calc(var(--dash-size) / 2);
  }

  .vertical-line-text-path {
    stroke: none;
  }

  .vertical-line-text {
    text-anchor: end;
  }

  .observation {
    stroke-width: 1px;
  }

  .debug {
    stroke-width: 0.1px;
  }
</style>
