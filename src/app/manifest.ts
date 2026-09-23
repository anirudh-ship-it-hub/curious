import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Curious",
    short_name: "Curious",
    description: "Go from zero to one on whatever you're wondering about.",
    start_url: "/",
    display: "standalone",
    background_color: "#f5f6f7",
    theme_color: "#212529",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
