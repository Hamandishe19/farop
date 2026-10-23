import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Svg({ size = 20, children, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  );
}

export function WhatsAppIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3.5 20.5l1.2-4.1A8.5 8.5 0 1 1 8 19.6z" />
      <path d="M9.2 8.6c.2-.5.4-.6.7-.6h.5c.2 0 .4 0 .5.4l.6 1.5c.1.2 0 .4-.1.6l-.4.5c-.1.1-.2.3 0 .5.5.9 1.3 1.7 2.3 2.2.2.1.4.1.5 0l.5-.6c.2-.2.4-.2.6-.1l1.5.7c.2.1.3.2.3.4 0 .6-.3 1.2-.8 1.5-.5.3-1.1.4-2.2 0-2.2-.8-3.9-2.6-4.6-4.2-.3-.9-.2-1.8.1-2.3z" />
    </Svg>
  );
}

export function FacebookIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M14 8h2.5V4.5H14c-2.2 0-4 1.8-4 4V11H7.5v3.5H10V21h3.5v-6.5H16l.5-3.5h-3V8.8c0-.4.3-.8.5-.8z" />
    </Svg>
  );
}
