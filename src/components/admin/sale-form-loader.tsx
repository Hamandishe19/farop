import { SaleForm } from "@/components/admin/sale-form";
import { siteConfig } from "@/config/site";
import type { SaleFormValues } from "@/lib/validation/finance";
import { listAdminProducts } from "@/services/admin-products";
import { getCostPrices } from "@/services/finance";
import { getSettings } from "@/services/settings";

/** The sale form with the catalogue's products, prices and (finance-only) cost prices. */
export async function SaleFormLoader({ initial, saleId }: { initial: SaleFormValues; saleId?: string }) {
  const [products, costs, settings] = await Promise.all([listAdminProducts(), getCostPrices(), getSettings()]);
  return (
    <SaleForm
      initial={initial}
      saleId={saleId}
      currency={siteConfig.currency}
      ecocashFee={settings.ecocashFee}
      products={products
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((product) => ({ id: product.id, name: product.name, price: product.price, cost: costs.get(product.id) }))}
    />
  );
}
