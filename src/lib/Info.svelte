<script type="ts">
  import { onMount } from "svelte";
  import { fade, slide } from "svelte/transition";

  import Help32 from "carbon-icons-svelte/lib/Help32";
  import CloseOutline32 from "carbon-icons-svelte/lib/CloseOutline32";
  import LogoYouTube24 from "carbon-icons-svelte/lib/LogoYoutube24";

  import { browser } from "$app/env";

  import { historyStore } from "./historyStore";

  // Start with no modal background but the info box shown for static HTML.
  const infoModal = historyStore("infoModal", false);
  let infoShownStatic = true;
  let infoTransitionDuration = 0;
  onMount(() => {
    infoShownStatic = false;
    requestAnimationFrame(() => {
      infoTransitionDuration = 100;
    });
  });

  function toggleModal() {
    if ($infoModal) {
      hideModal();
    } else {
      showModal();
    }
  }

  function showModal() {
    if (!$infoModal) {
      infoModal.pushSet(true);
    }
  }

  function hideModal() {
    if ($infoModal) {
      history.back();
    }
  }

  function handleKeyDown(event: KeyboardEvent): void {
    if ($infoModal && event.key === "Escape") {
      event.preventDefault();
      hideModal();
    }
  }
</script>

<svelte:window on:keydown={handleKeyDown} />

{#if browser}
  <div class="info-button">
    <button on:click={toggleModal}
      ><Help32 title="Information about this page" /></button
    >
  </div>

  {#if $infoModal}
    <div
      class="info-background"
      on:click={hideModal}
      transition:fade={{ duration: 100 }}
    />
  {/if}
{/if}

{#if infoShownStatic || $infoModal}
  <div class="info" transition:slide={{ duration: infoTransitionDuration }}>
    {#if browser}
      <div class="close-button">
        <button on:click={hideModal}
          ><CloseOutline32 title="Close the information box" /></button
        >
      </div>
    {/if}

    <h1>Solstice Observations 2021</h1>
    <p>
      <em>I Can Science That</em> organized an effort to observe the sun angles at
      multiple latitudes at solar noon on 2021-06-20. This is an interactive visualization
      of the resulting data.
    </p>
    <p>
      Please see <a href="https://youtu.be/yDmmhmoixLI"
        ><LogoYouTube24 class="youtube-logo" />Solstice Observations – An
        Interactive Display</a
      >
      by <em>I Can Science That</em> for further explanation.
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

<style type="scss">
  button {
    background: transparent;
    color: var(--foreground-color);
    border-width: 0;
    margin: 0;
    padding: 0;
    cursor: pointer;
  }

  .info-button,
  .close-button {
    position: fixed;
    left: 1.0625rem;
    top: 1.0625rem;
    width: 2rem;
    height: 2rem;
    overflow: hidden;
    border-radius: 1rem;
    border: 0.0625rem solid var(--background-color);

    &:focus-within {
      border-color: var(--foreground-color);
    }
  }

  .info-background {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: #000a;
    cursor: pointer;
  }

  .info {
    position: absolute;
    top: 0;
    left: 0;
    margin: 0 1rem 1rem 0;
    padding: 0.5rem 1rem 0.75rem 4rem;
    border-radius: 0 0 0.25rem 0;
    border-style: none solid solid none;
    border-width: 0.0625rem;
    border-color: var(--foreground-color);
    max-width: 40rem;
  }

  .info-button,
  .info,
  .close-button {
    box-shadow: 0.0625rem 0.1875rem 0.625rem #000c;
    background-color: var(--background-color);
  }

  .info h1,
  .info p {
    margin-block: 0.5rem;
  }

  .info :global(svg) {
    vertical-align: bottom;
  }

  .info :global(.youtube-logo) {
    color: #f00;
    margin-right: 0.5ch;
  }
</style>
