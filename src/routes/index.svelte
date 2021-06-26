<script context="module" type="ts">
  export const router = false;
  export const prerender = true;
</script>

<script type="ts">
  import SvelteSeo from "svelte-seo";

  import Diagram from "$lib/Diagram.svelte";
  import Info from "$lib/Info.svelte";

  const title = "A Visualization of the 2021 Solstice Observations";
  const description =
    "An interactive visualization of the 2021 solstice sun angle observations organized by I Can Science That.";
  const canonicalUrl = "https://solstice2021.heh.fi/";
  const imageUrl = `${canonicalUrl}thumbnail.png`;
</script>

<SvelteSeo
  {title}
  {description}
  canonical={canonicalUrl}
  openGraph={{
    type: "website",
    title,
    description,
    images: [{ url: imageUrl }],
    url: canonicalUrl,
  }}
  twitter={{
    site: "@hajotus",
    title,
    description,
    image: imageUrl,
  }}
/>

<Diagram />

<Info />
