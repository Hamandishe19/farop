import { CategoryPage, categoryMetadata } from "@/components/product/category-page";

export function generateMetadata() {
  return categoryMetadata("boys");
}

export default function Page() {
  return <CategoryPage slug="boys" />;
}
