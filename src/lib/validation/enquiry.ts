export const ENQUIRY_CATEGORIES = [
  "General question",
  "Product availability",
  "Sizing help",
  "Order or payment",
  "Other",
] as const;

export interface EnquiryInput {
  name: string;
  category: string;
  message: string;
}

export type EnquiryErrors = Partial<Record<keyof EnquiryInput, string>>;

export function validateEnquiry(input: EnquiryInput): EnquiryErrors {
  const errors: EnquiryErrors = {};
  if (input.name.trim().length < 2) errors.name = "Please enter your name.";
  if (!ENQUIRY_CATEGORIES.includes(input.category as (typeof ENQUIRY_CATEGORIES)[number])) {
    errors.category = "Please choose what your enquiry is about.";
  }
  if (input.message.trim().length < 10) errors.message = "Please write a short message (at least 10 characters).";
  return errors;
}
