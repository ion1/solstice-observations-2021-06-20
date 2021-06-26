<script type="ts">
  import { onMount } from "svelte";
  import { fade, slide } from "svelte/transition";

  import Help32 from "carbon-icons-svelte/lib/Help32";
  import CloseOutline24 from "carbon-icons-svelte/lib/CloseOutline24";
  import LogoYouTube24 from "carbon-icons-svelte/lib/LogoYoutube24";

  import { browser } from "$app/env";

  // Start with no modal background but the info box shown for static HTML.
  let backgroundShown = false;
  let infoShown = true;
  onMount(() => {
    infoShown = false;
    backgroundShown = infoShown;
  });
  function toggleInfo() {
    infoShown = !infoShown;
    backgroundShown = infoShown;
  }
  function hideInfo() {
    infoShown = false;
    backgroundShown = infoShown;
  }

  function handleKeyDown(event: KeyboardEvent): void {
    if (infoShown && event.key === "Escape") {
      event.preventDefault();
      hideInfo();
    }
  }
</script>

<svelte:window on:keydown={handleKeyDown} />

{#if browser}
  <div class="info-button">
    <button on:click={toggleInfo}
      ><Help32 title="Information about this page" /></button
    >
  </div>

  {#if backgroundShown}
    <div
      class="info-background"
      on:click={hideInfo}
      transition:fade={{ duration: 100 }}
    />
  {/if}
{/if}

{#if infoShown}
  <div class="info" transition:slide={{ duration: 100 }}>
    {#if browser}
      <div class="close-button">
        <button on:click={hideInfo}
          ><CloseOutline24 title="Close the information box" /></button
        >
      </div>
    {/if}

    <h1>Solstice Observations 2021</h1>
    <p>
      I Can Science That organized an effort to observe the sun angles at
      multiple latitudes at solar noon on 2021-06-20. This is an interactive
      visualization of the resulting data.
    </p>
    <p>
      <a href="https://youtu.be/KXjz16wRUq0"
        ><LogoYouTube24 /> Solstice Observations Raw Results</a
      > by I Can Science That
    </p>
    <p>
      Drag the diagram to change the hypothesis between a hollow Earth, a flat
      Earth and a globe Earth.
    </p>
    <p>
      For each angle measurement, an error is estimated by calculating the
      difference to a linear least squares fit of all the measurements. The
      measurements with a high error are shown with a less visible color.
    </p>
    <p>
      This visualization is made by <a
        href="https://github.com/ion1/solstice-observations-2021-06-20">ion</a
      >.
    </p>
  </div>
{/if}

<style>
  button {
    background: transparent;
    color: var(--foreground-color);
    border-width: 0;
    margin: 0;
    padding: 0;
    cursor: pointer;
  }

  .info-button {
    position: absolute;
  }

  .info-background {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: #000c;
    cursor: pointer;
  }

  .info {
    position: absolute;
    top: 0;
    left: 0;
    margin: 1rem;
    padding: 1rem;
    max-width: 40rem;
    box-shadow: 0.0625rem 0.1875rem 0.625rem #000c;
    border: 0.0625rem solid var(--foreground-color);
    border-radius: 0.25rem;
    background-color: var(--background-color);
  }

  .info :global(svg) {
    vertical-align: bottom;
  }

  .close-button {
    float: right;
  }
</style>
