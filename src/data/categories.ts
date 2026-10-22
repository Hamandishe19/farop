import { img } from "@/config/images";
import type { Category } from "@/types/product";

export const categories: Category[] = [
  {
    slug: "boys",
    name: "Boys",
    summary: "Everyday pieces for baby boys",
    intro:
      "Easy everyday pieces for baby boys — bodysuits, tops and small shoes chosen for comfortable dressing.",
    image: img("boysFlatlay"),
    sortOrder: 1,
  },
  {
    slug: "girls",
    name: "Girls",
    summary: "Dresses, sets and soft shoes",
    intro:
      "Dresses, sets and soft shoes for baby girls, from everyday wear to pieces kept for special days.",
    image: img("girlsDress"),
    sortOrder: 2,
  },
  {
    slug: "babywear",
    name: "Babywear",
    summary: "Bodysuits and newborn essentials",
    intro:
      "The essentials: bodysuits, sleepwear and the everyday basics every little wardrobe relies on.",
    image: img("babywearOnesies"),
    sortOrder: 3,
  },
  {
    slug: "shoes",
    name: "Shoes",
    summary: "Booties, soft soles and first shoes",
    intro:
      "Booties, soft-soled shoes and first sneakers. Ask us about sizing before you order — we are happy to help.",
    image: img("shoesTealTop"),
    sortOrder: 4,
  },
];
