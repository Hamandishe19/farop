import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "whatsapp" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-full font-medium transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50 select-none";

const variants: Record<Variant, string> = {
  primary: "bg-brown text-ivory hover:bg-brown-deep",
  secondary: "border border-line bg-white/60 text-charcoal hover:border-brown/40 hover:bg-white",
  whatsapp: "bg-sage-deep text-white hover:bg-[#4a5944]",
  ghost: "text-charcoal hover:bg-cream",
  danger: "border border-danger/30 text-danger hover:bg-danger/5",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-4 text-sm",
  md: "h-11 px-5 text-sm",
  lg: "h-12 px-6 text-[0.95rem]",
};

export function buttonClass(
  options: { variant?: Variant; size?: Size; className?: string; block?: boolean } = {},
): string {
  const { variant = "primary", size = "md", className, block } = options;
  return cn(base, variants[variant], sizes[size], block && "w-full", className);
}
