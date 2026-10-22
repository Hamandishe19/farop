"use client";

import { useState } from "react";
import { WhatsAppIcon } from "@/components/icons/social-icons";
import { buttonClass } from "@/components/ui/button-styles";
import { AddToCart } from "@/components/product/add-to-cart";
import { useOnlineStatus } from "@/hooks/use-online-status";
import type { CartProductInput } from "@/lib/product-display";
import { buildProductEnquiryMessage, buildWhatsAppUrl } from "@/lib/whatsapp";

/**
 * Detail-page purchase panel: size selection, Add to Cart, and an optional
 * product-specific WhatsApp enquiry reflecting the current selection.
 */
export function ProductPurchasePanel({
  product,
  whatsappNumber,
  productUrl,
}: {
  product: CartProductInput;
  whatsappNumber?: string;
  productUrl?: string;
}) {
  const online = useOnlineStatus();
  const [selection, setSelection] = useState<{ size?: string; variantLabel?: string }>({});

  const enquiryUrl = buildWhatsAppUrl(
    whatsappNumber,
    buildProductEnquiryMessage({
      productName: product.name,
      productUrl,
      size: selection.size,
      variantLabel: selection.variantLabel,
    }),
  );

  return (
    <div className="space-y-3">
      <AddToCart product={product} layout="detail" onSelectionChange={setSelection} />
      {enquiryUrl && (
        <>
          <a
            href={online ? enquiryUrl : undefined}
            target="_blank"
            rel="noopener noreferrer"
            aria-disabled={!online}
            className={buttonClass({
              variant: "secondary",
              size: "lg",
              block: true,
              className: !online ? "pointer-events-none opacity-50" : undefined,
            })}
          >
            <WhatsAppIcon size={18} />
            Ask about this product
          </a>
          {!online && <p className="text-center text-xs text-muted">WhatsApp enquiries need an internet connection.</p>}
        </>
      )}
    </div>
  );
}
