import Link from "next/link";
import { Container } from "@/components/layout/container";
import { buttonClass } from "@/components/ui/button-styles";

export function NotFoundContent() {
  return (
    <Container className="flex flex-col items-center py-24 text-center">
      <p className="eyebrow">Page not found</p>
      <h1 className="mt-4 font-display text-4xl text-charcoal">We couldn&apos;t find that page.</h1>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-muted">
        It may have moved, or the product may no longer be listed.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/" className={buttonClass()}>
          Back to home
        </Link>
        <Link href="/#categories" className={buttonClass({ variant: "secondary" })}>
          Browse collections
        </Link>
      </div>
    </Container>
  );
}
