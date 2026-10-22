"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, LayoutDashboard, Package, Settings, Tags, UserRound, Users } from "lucide-react";
import { can, type AdminRole, type Permission } from "@/lib/auth/roles";
import { cn } from "@/lib/cn";

const links: Array<{ href: string; label: string; icon: typeof Package; permission?: Permission }> = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/categories", label: "Categories", icon: Tags },
  { href: "/admin/team", label: "Team", icon: Users, permission: "team.view" },
  { href: "/admin/settings", label: "Settings", icon: Settings, permission: "settings.view" },
  { href: "/admin/system", label: "System health", icon: Activity, permission: "system.view" },
  { href: "/admin/account", label: "My account", icon: UserRound },
];

/** Admin sections the current role may open. */
export function AdminNav({ role }: { role: AdminRole }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Admin">
      <ul className="-mx-4 flex gap-1 overflow-x-auto px-4 sm:mx-0 sm:px-0 lg:flex-col">
        {links
          .filter((link) => !link.permission || can(role, link.permission))
          .map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-2.5 whitespace-nowrap rounded-lg px-3 py-2 text-sm transition-colors",
                    active ? "bg-white font-medium text-charcoal shadow-[var(--shadow-soft)]" : "text-charcoal/75 hover:bg-white/60",
                  )}
                >
                  <Icon size={16} strokeWidth={1.7} aria-hidden="true" />
                  {label}
                </Link>
              </li>
            );
          })}
      </ul>
    </nav>
  );
}
