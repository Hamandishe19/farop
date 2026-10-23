import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { SaleFormLoader } from "@/components/admin/sale-form-loader";
import { requireAdminPage } from "@/lib/auth/admin";
import { harareToday } from "@/lib/finance/analytics";

export const metadata: Metadata = { title: "Record a sale" };

export default async function NewSalePage() {
  await requireAdminPage("finance.edit");
  return (
    <>
      <AdminPageHeader title="Record a sale" description="Add a WhatsApp order once it's confirmed. Mark it paid when the money arrives." />
      <Suspense fallback={<div aria-busy="true" className="h-[70vh] animate-pulse rounded-xl bg-white/60" />}>
        <NewSaleForm />
      </Suspense>
    </>
  );
}

async function NewSaleForm() {
  await connection(); // Today's date is filled in per request.
  return (
    <SaleFormLoader
      initial={{
        soldOn: harareToday(new Date()),
        customerName: "",
        customerPhone: "",
        paymentMethod: "cod",
        status: "paid",
        deliveryFee: "",
        paymentFee: "",
        discount: "",
        notes: "",
        items: [],
      }}
    />
  );
}
