/**
 * Central image registry.
 *
 * All photography is referenced from here so the business owner can swap in
 * original product photos by replacing the file in /public/images/catalogue
 * (or pointing `src` at Supabase Storage) without touching components.
 *
 * Current images are free stock photos from Unsplash (Unsplash License),
 * each checked to contain clothing and footwear only — no people, faces,
 * hands or body parts. They are illustrative and are NOT company inventory.
 */

import type { ProductImage } from "@/types/product";

interface RegisteredImage extends ProductImage {
  credit: { photographer: string; source: string };
}

function unsplash(
  file: string,
  alt: string,
  width: number,
  height: number,
  photographer: string,
  id: string,
): RegisteredImage {
  return {
    src: `/images/catalogue/${file}.jpg`,
    alt,
    width,
    height,
    credit: { photographer, source: `https://unsplash.com/photos/${id}` },
  };
}

export const images = {
  heroRack: unsplash(
    "hero-rack",
    "Pastel baby bodysuits and rompers on wooden hangers above small shoes",
    1400, 933, "jackson kondili", "x5VhI538fII",
  ),
  aboutShelves: unsplash(
    "about-shelves",
    "Baby clothing hanging on a rail with shoes and keepsake boxes on shelves",
    1400, 2100, "jackson kondili", "wFHaSqNxHm4",
  ),
  babywearOnesies: unsplash(
    "babywear-onesies",
    "Printed baby bodysuits draped over wooden hangers",
    1400, 1749, "Uby Yanes", "Cbe9I1QDxJo",
  ),
  bodysuitPink: unsplash(
    "bodysuit-pink",
    "White short-sleeve bodysuit flat lay with soft booties on a pink background",
    1400, 1052, "Mediamodifier", "PKdcZz-o6bw",
  ),
  bootiesCrochet: unsplash(
    "booties-crochet",
    "Coral crochet baby booties with a button strap",
    1400, 870, "Janko Ferlič", "jjDqU0P0-SM",
  ),
  bootiesPink: unsplash(
    "booties-pink",
    "Pale pink baby booties with ribbon ties on a wooden bench",
    1400, 933, "Mon Petit Chou Photography", "b2ADHvvhC5Y",
  ),
  boysFlatlay: unsplash(
    "boys-flatlay",
    "White baby bodysuit flat lay with star-print socks on a cream background",
    1400, 1052, "Mediamodifier", "fdPlZXc-ZwU",
  ),
  crochetShoe: unsplash(
    "crochet-shoe",
    "Charcoal crochet baby shoe with a satin bow",
    1400, 933, "Murphy Stay", "wP8SHAIh0kU",
  ),
  girlsDress: unsplash(
    "girls-dress",
    "Ivory textured baby dress on a hanger with small leather sandals",
    1400, 2100, "Céline Druguet", "jH6nZse9o6E",
  ),
  shoesField: unsplash(
    "shoes-field",
    "Powder-blue baby lace-up shoes resting in a wheat field",
    1400, 2100, "Luise and Nic", "9BMvbnkwVZ0",
  ),
  shoesTealTop: unsplash(
    "shoes-teal-top",
    "Teal floral baby sneakers viewed from above on terracotta fabric",
    1400, 933, "Kawê Rodrigues", "QaQGrLDRSFQ",
  ),
  shoesTeal: unsplash(
    "shoes-teal",
    "Teal floral baby sneakers on terracotta fabric",
    1400, 2100, "Kawê Rodrigues", "GpQzF1AjVN0",
  ),
  sneakersFloral: unsplash(
    "sneakers-floral",
    "Blue floral high-top baby sneakers with lilac collars",
    1400, 913, "Rakesh Sitnoor", "24UV2VJnwT8",
  ),
  summerTee: unsplash(
    "summer-tee",
    "White short-sleeve baby t-shirt flat lay with socks and a headband",
    1400, 1052, "Mediamodifier", "tzX4q7oJlxc",
  ),
  teePink: unsplash(
    "tee-pink",
    "White baby t-shirt flat lay with a knitted bobble hat and socks",
    1400, 1052, "Mediamodifier", "VoXqvbLAPjM",
  ),
  summerCrochet: unsplash(
    "summer-crochet-line",
    "Crochet sundress, sun hat and sandals hanging on a line",
    1400, 934, "Lucia Durdos", "LCG4kSIteMA",
  ),
  winterKnit: unsplash(
    "winter-knit-set",
    "Pink knitted baby hat with a pompom beside crochet pieces",
    1400, 631, "Brenda Ortega", "-Xrh6OiO1uE",
  ),
} satisfies Record<string, RegisteredImage>;

export type ImageKey = keyof typeof images;

/** Strip the credit for use as a product/category image. */
export function img(key: ImageKey, alt?: string): ProductImage {
  const { src, width, height } = images[key];
  return { src, width, height, alt: alt ?? images[key].alt };
}

export const imageCredits = Object.values(images).map((image) => image.credit);
