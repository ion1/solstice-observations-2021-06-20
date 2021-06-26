<script type="ts">
  import Touch_132 from "carbon-icons-svelte/lib/Touch_132";
</script>

<div class="grab-icon">
  <Touch_132 />
</div>

<style>
  .grab-icon {
    width: 4rem;
    height: 12rem;
  }

  .grab-icon :global(svg) {
    width: 4rem;
    height: 4rem;
    opacity: 0;
    will-change: opacity, transform;
    animation-delay: 2s;
    animation-duration: 8s;
    animation-name: wiggle;
    animation-timing-function: ease-in-out;
    animation-iteration-count: infinite;
  }

  @keyframes wiggle {
    0% {
      opacity: 0;
      transform: translateY(0);
    }

    5% {
      opacity: 1;
      transform: translateY(0);
    }

    15% {
      opacity: 1;
      transform: translateY(8rem);
    }

    25% {
      opacity: 1;
      transform: translateY(0);
    }

    35% {
      opacity: 1;
      transform: translateY(8rem);
    }

    45% {
      opacity: 1;
      transform: translateY(0);
    }

    50% {
      opacity: 0;
      transform: translateY(0);
    }

    to {
      opacity: 0;
      transform: translateY(0);
    }
  }
</style>
