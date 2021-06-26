<script context="module" type="ts">
  export const router = false;
  export const prerender = true;
</script>

<script type="ts">
  import Diagram from "$lib/Diagram.svelte";
  import Info from "$lib/Info.svelte";
</script>

<svelte:head>
  <title>A Visualization of the 2021 Solstice Observations</title>
</svelte:head>

<Diagram />

<Info />
