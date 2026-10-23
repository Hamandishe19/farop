"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { saveProduct, type ProductFormState } from "@/app/actions/admin";
import { buttonClass } from "@/components/ui/button-styles";
import { cn } from "@/lib/cn";
import { AVAILABILITY_OPTIONS, type ProductFormValues } from "@/lib/validation/product";
import { productTypeLabels } from "@/config/product-types";
import { conditionLabels } from "@/lib/product-display";
import { PRODUCT_CONDITIONS, PRODUCT_TYPES, type CategorySlug } from "@/types/product";

export function ProductForm({
  initial,
  categories,
  mode,
  productId,
  costPrice,
}: {
  initial: ProductFormValues;
  categories: Array<{ slug: CategorySlug; name: string }>;
  mode: "create" | "edit";
  /** Set when editing an existing product. */
  productId?: string;
  /** Shown only to admins who may record finances; undefined = field hidden. */
  costPrice?: { value: string };
}) {
  const [state, action, pending] = useActionState<ProductFormState, FormData>(saveProduct, { status: "idle" });
  const values = "values" in state ? state.values : initial;
  const errors = state.status === "invalid" ? state.errors : {};
  const [newPhoto, setNewPhoto] = useState<string>();
  const [removePhoto, setRemovePhoto] = useState(false);
  // React clears the file input after each submit, so drop the preview of a photo that is no longer chosen.
  const [previewFor, setPreviewFor] = useState(state);
  if (previewFor !== state) {
    setPreviewFor(state);
    setNewPhoto(undefined);
  }
  const photoPreview = newPhoto ?? (removePhoto ? undefined : values.imageSrc || undefined);

  const input = (hasError?: string) =>
    cn(
      "w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm text-charcoal focus:border-sage-deep",
      hasError ? "border-danger/60" : "border-line",
    );
  const err = (key: keyof ProductFormValues) =>
    errors[key] && (
      <p id={`err-${key}`} className="mt-1 text-xs text-danger">
        {errors[key]}
      </p>
    );
  const a11y = (key: keyof ProductFormValues) => ({
    "aria-invalid": Boolean(errors[key]),
    "aria-describedby": errors[key] ? `err-${key}` : undefined,
  });

  return (
    <form action={action} noValidate className="space-y-6">
      {productId && <input type="hidden" name="id" value={productId} />}
      {state.status === "refused" && (
        <div role="alert" className="flex gap-2 rounded-lg border border-blush bg-blush-soft px-4 py-3 text-sm">
          <AlertTriangle size={16} aria-hidden="true" className="mt-0.5 shrink-0 text-brown" />
          <p>
            <strong className="font-medium">Not saved.</strong> {state.message}
          </p>
        </div>
      )}
      {state.status === "invalid" && (
        <p role="alert" className="rounded-lg bg-blush-soft px-4 py-3 text-sm">
          Please correct the highlighted fields.
        </p>
      )}

      <section className="rounded-xl border border-line bg-white p-5 sm:p-6">
        <h2 className="mb-4 text-sm font-medium">Details</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="name" className="mb-1.5 block text-sm">Name</label>
            <input id="name" name="name" defaultValue={values.name} className={input(errors.name)} {...a11y("name")} />
            {err("name")}
            <p className="mt-1 text-xs text-muted">
              {mode === "edit"
                ? "The product's web address stays the same if you rename it, so shared links keep working."
                : "The product's web address is made from its name automatically."}
            </p>
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="shortDescription" className="mb-1.5 block text-sm">Short description</label>
            <input id="shortDescription" name="shortDescription" defaultValue={values.shortDescription} className={input(errors.shortDescription)} {...a11y("shortDescription")} />
            {err("shortDescription")}
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="description" className="mb-1.5 block text-sm">
              Full description <span className="text-muted">(optional)</span>
            </label>
            <textarea id="description" name="description" rows={4} defaultValue={values.description} className={input()} />
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-line bg-white p-5 sm:p-6">
        <fieldset {...a11y("categories")}>
          <legend className="mb-3 text-sm font-medium">Categories</legend>
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <label key={category.slug} className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-line px-3.5 py-2 text-sm has-[:checked]:border-brown has-[:checked]:bg-brown/5">
                <input type="checkbox" name="categories" value={category.slug} defaultChecked={values.categories.includes(category.slug)} className="accent-brown" />
                {category.name}
              </label>
            ))}
          </div>
          {err("categories")}
        </fieldset>
        <div className="mt-5 max-w-xs">
          <label htmlFor="type" className="mb-1.5 block text-sm">Type</label>
          <select id="type" name="type" defaultValue={values.type} className={input(errors.type)} {...a11y("type")}>
            <option value="">Choose a type</option>
            {PRODUCT_TYPES.map((type) => (
              <option key={type} value={type}>{productTypeLabels[type]}</option>
            ))}
          </select>
          {err("type")}
          <p className="mt-1 text-xs text-muted">Girls: no bottoms. Boys: no dresses. Shorts are not sold.</p>
        </div>
        <fieldset className="mt-5" {...a11y("condition")}>
          <legend className="mb-3 text-sm">Condition</legend>
          <div className="flex flex-wrap gap-2">
            {PRODUCT_CONDITIONS.map((condition) => (
              <label key={condition} className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-line px-3.5 py-2 text-sm has-[:checked]:border-brown has-[:checked]:bg-brown/5">
                <input type="radio" name="condition" value={condition} defaultChecked={values.condition === condition} className="accent-brown" />
                {conditionLabels[condition]}
              </label>
            ))}
          </div>
          {err("condition")}
        </fieldset>
      </section>

      <section className="rounded-xl border border-line bg-white p-5 sm:p-6">
        <h2 className="mb-1 text-sm font-medium">Pricing, sizes &amp; availability</h2>
        <p className="mb-4 text-xs text-muted">Leave blank to hide. Only enter confirmed information.</p>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="price" className="mb-1.5 block text-sm">Price</label>
            <input id="price" name="price" inputMode="decimal" defaultValue={values.price} className={input(errors.price)} {...a11y("price")} />
            {err("price")}
          </div>
          <div>
            <label htmlFor="currency" className="mb-1.5 block text-sm">Currency</label>
            <input id="currency" name="currency" maxLength={3} placeholder="e.g. USD" defaultValue={values.currency} className={input(errors.currency)} {...a11y("currency")} />
            {err("currency")}
          </div>
          {costPrice && (
            <div>
              <label htmlFor="costPrice" className="mb-1.5 block text-sm">
                Cost price <span className="text-muted">(private)</span>
              </label>
              <input id="costPrice" name="costPrice" inputMode="decimal" placeholder="What you paid per item" defaultValue={costPrice.value} className={input()} />
              <p className="mt-1 text-xs text-muted">Never shown on the website. Used for profit figures.</p>
            </div>
          )}
          <div>
            <label htmlFor="availability" className="mb-1.5 block text-sm">Availability</label>
            <select id="availability" name="availability" defaultValue={values.availability} className={input(errors.availability)}>
              {AVAILABILITY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            {err("availability")}
          </div>
          <div className="sm:col-span-3">
            <label htmlFor="sizes" className="mb-1.5 block text-sm">Sizes</label>
            <input id="sizes" name="sizes" placeholder="Comma separated, e.g. 0-3 months, 3-6 months" defaultValue={values.sizes} className={input()} />
            <p className="mt-1 text-xs text-muted">When sizes are listed, customers must choose one before adding to their cart.</p>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-line bg-white p-5 sm:p-6">
        <h2 className="mb-1 text-sm font-medium">Photo</h2>
        <p className="mb-4 text-xs text-muted">
          Product-only photography — no people. JPG, PNG, WebP or AVIF, up to 5 MB. A portrait (4:5) photo fits best.
        </p>
        <input type="hidden" name="imageSrc" value={removePhoto ? "" : values.imageSrc} />
        <div className="flex flex-col gap-5 sm:flex-row">
          <div className="relative aspect-[4/5] w-32 shrink-0 overflow-hidden rounded-lg border border-line bg-cream">
            {photoPreview ? (
              // eslint-disable-next-line @next/next/no-img-element -- local preview / already-uploaded photo
              <img src={photoPreview} alt="" className="absolute inset-0 h-full w-full object-cover" />
            ) : (
              <span className="absolute inset-0 flex items-center justify-center px-2 text-center text-xs text-muted">No photo</span>
            )}
          </div>
          <div className="flex-1 space-y-4">
            <div>
              <label htmlFor="imageFile" className="mb-1.5 block text-sm">
                {values.imageSrc && !removePhoto ? "Replace photo" : "Upload photo"}
              </label>
              <input
                id="imageFile"
                name="imageFile"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/avif"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  setNewPhoto(file ? URL.createObjectURL(file) : undefined);
                  if (file) setRemovePhoto(false);
                }}
                className="block w-full text-sm text-muted file:mr-3 file:rounded-full file:border-0 file:bg-cream file:px-4 file:py-2 file:text-sm file:text-charcoal hover:file:bg-line/60"
                {...a11y("imageSrc")}
              />
              {err("imageSrc")}
              {state.status !== "idle" && newPhoto === undefined && (
                <p className="mt-1 text-xs text-muted">If you had chosen a new photo, please choose it again.</p>
              )}
            </div>
            {values.imageSrc && !newPhoto && (
              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={removePhoto}
                  onChange={(event) => setRemovePhoto(event.target.checked)}
                  className="accent-brown"
                />
                Remove the current photo
              </label>
            )}
            <div>
              <label htmlFor="imageAlt" className="mb-1.5 block text-sm">
                Photo description <span className="text-muted">(optional, for screen readers)</span>
              </label>
              <input id="imageAlt" name="imageAlt" defaultValue={values.imageAlt} placeholder="e.g. White short-sleeve bodysuit laid flat" className={input()} />
            </div>
          </div>
        </div>
      </section>

      <section className="flex flex-wrap gap-6 rounded-xl border border-line bg-white p-5 sm:p-6">
        <label className="inline-flex items-center gap-2 text-sm">
          <input type="checkbox" name="active" defaultChecked={values.active} className="accent-brown" />
          Visible on the website
        </label>
        <label className="inline-flex items-center gap-2 text-sm">
          <input type="checkbox" name="featured" defaultChecked={values.featured} className="accent-brown" />
          Featured on the homepage
        </label>
      </section>

      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={pending} className={buttonClass()}>
          {pending ? "Saving…" : mode === "create" ? "Create product" : "Save changes"}
        </button>
        <Link href="/admin/products" className={buttonClass({ variant: "secondary" })}>
          Cancel
        </Link>
      </div>
    </form>
  );
}
