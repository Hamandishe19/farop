import { CategoryPage, categoryMetadata } from "@/components/product/category-page";

export function generateMetadata() {
  return categoryMetadata("shoes");
}

export default function Page() {
  return <CategoryPage slug="shoes" />;
}
