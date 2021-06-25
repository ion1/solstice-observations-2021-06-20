<script type="ts">
  import { onMount } from "svelte";

  import observations from "./observations";
  import type { Observation } from "./observations";
  import * as d from "./diagram";

  let time: number = 0.0;

  let width = 0;
  let height = 0;

  $: earth = d.computeParameters(0.5 + 0.5 * Math.sin(0.2 * time));

  function surfacePath(earth: d.EarthParams): string {
    const north = earth.surfaceAt(90);
    const south = earth.surfaceAt(-90);

    if (earth.type === d.FLAT) {
      return [
        `M ${north.point.x} ${north.point.y}`,
        `L ${south.point.x} ${south.point.y}`,
      ].join(" ");
    } else {
      const r = earth.circleScale;
      const sweepFlag = earth.curvatureType === d.CONVEX ? 0 : 1;
      return [
        `M ${north.point.x} ${north.point.y}`,
        `A ${r} ${r} 0 0 ${sweepFlag} ${south.point.x} ${south.point.y}`,
      ].join(" ");
    }
  }

  let tickLatitudes = [];
  for (let l = -90; l <= 90; l += 10) {
    tickLatitudes.push(l);
  }

  function surfaceTickPath(surf: d.SurfaceAt): string {
    const tickLength = 0.05;
    return [
      `M ${surf.point.x} ${surf.point.y}`,
      `l ${-surf.normal.x * tickLength} ${-surf.normal.y * tickLength}`,
    ].join(" ");
  }

  function observationPath(surf: d.SurfaceAt, obs: Observation): string {
    const normal = d.rotate(surf.normal, obs.angle - 0.5 * Math.PI);
    const length = 10;

    return [
      `M ${surf.point.x} ${surf.point.y}`,
      `l ${normal.x * length} ${normal.y * length}`,
    ].join(" ");
  }

  let request: number;
  onMount(() => {
    let prevNow = performance.now();
    (function loop() {
      request = requestAnimationFrame(loop);
      const now = performance.now();
      const dt = (now - prevNow) / 1000;
      prevNow = now;
      time += dt;
      // render(time);
    })();
    return () => {
      cancelAnimationFrame(request);
    };
  });
</script>

<div
  class="diagram-container"
  bind:clientWidth={width}
  bind:clientHeight={height}
>
  <svg viewBox="-100 -100 200 200" preserveAspectRatio="xMidYMax meet">
    <!--
      <path d="M -100 -100 H 100 V 100 H -100 Z" style="stroke-width: 0.1px" />
    -->
    <g transform="scale(1 -1)">
      <g
        transform="translate(0 -70) scale(80) translate(0 {-0.5 *
          earth.height})"
      >
        <!--
        {#if earth.type === d.CURVED}
          <circle
            class="debug"
            cx={0}
            cy={earth.circleOffset}
            r={earth.circleScale}
          />
        {/if}
        -->

        <path class="surface" d={surfacePath(earth)} />

        {#each tickLatitudes as latitude}
          <path class="tick" d={surfaceTickPath(earth.surfaceAt(latitude))} />
        {/each}

        {#each observations as observation}
          <path
            class="observation"
            d={observationPath(
              earth.surfaceAt(observation.latitude),
              observation
            )}
          />
        {/each}
      </g>
    </g>
  </svg>
</div>

<style>
  .diagram-container {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
  }

  svg {
    overflow: visible;
    width: 100%;
    height: 100%;
  }

  svg * {
    vector-effect: non-scaling-stroke;
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

  .observation {
    stroke-width: 1px;
  }

  .debug {
    stroke-width: 0.1px;
  }
</style>
