/**
 * Contact page FAQs. Edit freely — answers deliberately avoid company
 * policies (such as returns) until the business supplies them. Delivery
 * days, working hours and the EcoCash number come from the business
 * settings, so they stay in step with the admin.
 */

import { formatList } from "@/lib/format";
import type { BusinessSettings } from "@/types/settings";

export interface Faq {
  question: string;
  answer: string;
}

export function buildFaqs(settings: BusinessSettings): Faq[] {
  const { deliveryDays, ecocashNumber, hours } = settings;
  return [
    {
      question: "How do I place an order?",
      answer:
        "Add the products you want to your cart, choosing sizes where needed. Open your cart, enter your name and delivery address, choose how you'd like to pay, then select “Place Order via WhatsApp”. We'll confirm availability, your total and your delivery day.",
    },
    {
      question: "How is my order sent through WhatsApp?",
      answer:
        "When you select “Place Order via WhatsApp”, WhatsApp opens with a message listing your products, quantities, delivery details and payment method. Review the message, edit it if you like, then tap send. Your order is only placed once you send it in WhatsApp.",
    },
    {
      question: "How can I pay?",
      answer: `You can pay cash on delivery, or by EcoCash${ecocashNumber ? ` to ${ecocashNumber}` : ""}. If you choose EcoCash, please wait until we've confirmed your order and total on WhatsApp, then send the payment and share the EcoCash confirmation message with us.`,
    },
    {
      question: "How can I enquire about product availability?",
      answer:
        "Every product page has an “Ask about this product” option that opens WhatsApp with the product's details. You can also ask about availability in your order message or use the enquiry form on this page.",
    },
    {
      question: "Can I ask about product sizes?",
      answer:
        "Yes. If you're unsure which size to choose, ask us about the specific product and we'll help. Mention your little one's age to help us advise.",
    },
    deliveryDays.length > 0 && {
      question: "When do you deliver?",
      answer: `Deliveries go out every ${formatList(deliveryDays)}. We'll confirm the delivery day when we reply to your order.`,
    },
    hours.length > 0 && {
      question: "What are your working hours?",
      answer: `Our working hours are: ${hours.map((row) => `${row.days}: ${row.time}`).join("; ")}.`,
    },
    {
      question: "Do I need an account?",
      answer:
        "No. You can browse, build a cart and place an order without signing up. Your cart is saved on your device.",
    },
    {
      question: "How do I contact the company?",
      answer:
        "Use the contact options on this page. Our WhatsApp and social media links appear here and in the footer.",
    },
    {
      question: "Where can I find the company's social media pages?",
      answer:
        "Links to our Instagram and Facebook pages are shown on this page and in the website footer.",
    },
  ].filter(Boolean) as Faq[];
}
