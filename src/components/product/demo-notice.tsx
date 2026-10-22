import { Info } from "lucide-react";
import { isDemoCatalogue } from "@/services/products";

/** Makes clear that the catalogue currently shows sample listings, not real inventory. */
export async function DemoNotice() {
  if (!(await isDemoCatalogue())) return null;
  return (
    <p className="flex items-start gap-2 rounded-lg bg-sage-soft/70 px-4 py-3 text-sm text-charcoal">
      <Info size={16} aria-hidden="true" className="mt-0.5 shrink-0 text-sage-deep" />
      <span>
        <strong className="font-medium">Sample catalogue.</strong> The items and prices below are illustrative
        while our full range is being added. Please contact us to confirm what&apos;s available and sizes.
      </span>
    </p>
  );
}
