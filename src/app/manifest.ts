import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: siteConfig.name,
    short_name: siteConfig.shortName,
    description: siteConfig.description,
    start_url: "/?source=pwa",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: siteConfig.theme.background,
    theme_color: siteConfig.theme.themeColor,
    categories: ["shopping", "lifestyle"],
    // Placeholder monogram icons — replace with the official logo when supplied.
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Your cart", url: "/cart", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Contact", url: "/contact", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
