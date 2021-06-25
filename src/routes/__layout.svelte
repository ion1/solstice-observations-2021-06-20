<slot />

<style type="scss" global>
  @import "normalize.css";

  :root {
    --background-color: white;
    --foreground-color: black;
    --link-color: #0f62fe;
    --visited-link-color: #8a3ffc;

    background-color: var(--background-color);
    color: var(--foreground-color);
  }

  @media (prefers-color-scheme: dark) {
    :root {
      --background-color: #111;
      --foreground-color: white;
      --link-color: #78a9ff;
      --visited-link-color: #be95ff;
    }
  }

  body {
    font-family: sans-serif;
    padding: 1rem;
  }

  p {
    line-height: 1.5;
  }

  a:link,
  a:hover {
    color: var(--link-color);
  }
  a:visited,
  a:visited:hover {
    color: var(--visited-link-color);
  }
  a:focus,
  a:focus:hover,
  a:focus:visited,
  a:active,
  a:active:hover,
  a:active:visited {
    color: var(--foreground-color);
  }
</style>
