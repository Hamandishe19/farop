/** A price is displayable only when it is a finite, non-negative number with a valid currency. */
export function isValidPrice(price: unknown, currency: unknown): price is number {
  return (
    typeof price === "number" &&
    Number.isFinite(price) &&
    price >= 0 &&
    typeof currency === "string" &&
    /^[A-Z]{3}$/.test(currency)
  );
}

export function formatPrice(price: number, currency: string, locale = "en"): string {
  try {
    return new Intl.NumberFormat(locale, { style: "currency", currency }).format(price);
  } catch {
    return `${currency} ${price.toFixed(2)}`;
  }
}

/** Round to cents to avoid floating point noise when summing prices. */
export function multiplyPrice(price: number, quantity: number): number {
  return Math.round(price * 100 * quantity) / 100;
}

/** "Thursday and Saturday", "Mon, Tue and Wed". */
export function formatList(items: string[], locale = "en"): string {
  return new Intl.ListFormat(locale, { style: "long", type: "conjunction" }).format(items);
}

export function pluralise(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}
