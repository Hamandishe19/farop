import type { CategorySlug } from "@/types/product";

export interface NavLink {
  label: string;
  href: string;
}

export const categoryLinks: Array<NavLink & { slug: CategorySlug; hint: string }> = [
  { slug: "boys", label: "Boys", href: "/boys", hint: "Everyday pieces" },
  { slug: "girls", label: "Girls", href: "/girls", hint: "Dresses & sets" },
  { slug: "babywear", label: "Babywear", href: "/babywear", hint: "Bodysuits & basics" },
  { slug: "shoes", label: "Shoes", href: "/shoes", hint: "Booties & first shoes" },
];

export const primaryLinks: NavLink[] = [
  { label: "Home", href: "/" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
];

export function categoryHref(slug: CategorySlug): string {
  return `/${slug}`;
}
