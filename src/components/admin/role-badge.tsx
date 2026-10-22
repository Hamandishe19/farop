import { roleLabels, type AdminRole } from "@/lib/auth/roles";
import { cn } from "@/lib/cn";

const styles: Record<AdminRole, string> = {
  developer: "bg-charcoal text-ivory",
  supreme: "bg-brown text-ivory",
  regular: "bg-sage-soft text-sage-deep",
};

export function RoleBadge({ role, className }: { role: AdminRole; className?: string }) {
  return (
    <span className={cn("inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium", styles[role], className)}>
      {roleLabels[role]}
    </span>
  );
}
