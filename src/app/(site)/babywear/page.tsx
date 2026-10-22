import { CategoryPage, categoryMetadata } from "@/components/product/category-page";

export function generateMetadata() {
  return categoryMetadata("babywear");
}

export default function Page() {
  return <CategoryPage slug="babywear" />;
}
