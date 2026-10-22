import { CategoryPage, categoryMetadata } from "@/components/product/category-page";

export function generateMetadata() {
  return categoryMetadata("girls");
}

export default function Page() {
  return <CategoryPage slug="girls" />;
}
