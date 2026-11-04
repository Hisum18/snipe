"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { signOutAction } from "@/app/actions/auth";
import {
  Briefcase,
  Building,
  ChevronsRight,
  CreditCard,
  HelpCircle,
  Home,
  LogOut,
  Menu,
  Settings,
  SnipeLogo,
  X,
  type IconProps,
} from "@/components/icons";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { cn } from "@/lib/utils";

const ITEMS: { href: string; label: string; Icon: (p: IconProps) => React.ReactElement }[] = [
  { href: "/dashboard", label: "Dashboard", Icon: Home },
  { href: "/companies", label: "Companies", Icon: Building },
  { href: "/jobs", label: "Job history", Icon: Briefcase },
  { href: "/billing", label: "Billing & plan", Icon: CreditCard },
  { href: "/settings", label: "Settings", Icon: Settings },
  { href: "/help", label: "Help & Support", Icon: HelpCircle },
];

const STORAGE_KEY = "snipe-sidebar-open";

function NavItems({
  pathname,
  collapsed,
  onNavigate,
}: {
  pathname: string;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  return (
    <nav className="space-y-1 px-2">
      {ITEMS.map(({ href, label, Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex h-10 items-center gap-3 rounded-full border px-3 text-sm font-normal transition-colors",
              active
                ? "border-white/[0.1] bg-white/[0.06] text-white"
                : "border-transparent text-neutral-400 hover:bg-white/[0.04] hover:text-white",
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {!collapsed && <span className="truncate">{label}</span>}
          </Link>
        );
      })}
    </nav>
  );
}

export function AppSidebar({ email, planLabel }: { email: string; planLabel: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(true);
  const [hydrated, setHydrated] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Read the persisted collapse state once on mount (avoids a server/client
  // markup mismatch — the server always renders the "open" default).
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored !== null) setOpen(stored === "1");
    } catch {
      // Ignore — private browsing / storage blocked. Falls back to "open".
    }
    setHydrated(true);
  }, []);

  function toggle() {
    setOpen((o) => {
      const next = !o;
      try {
        window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch {
        // Best-effort only.
      }
      return next;
    });
  }

  // Close the mobile drawer on route change.
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <>
      {/* Mobile top bar */}
      <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-white/[0.08] bg-black px-4 md:hidden">
        <button
          type="button"
          aria-label="Open menu"
          onClick={() => setMobileOpen(true)}
          className="inline-flex size-9 items-center justify-center rounded-lg text-white hover:bg-white/[0.06]"
        >
          <Menu className="h-4 w-4" />
        </button>
        <Link href="/dashboard" className="flex items-center gap-2 font-normal tracking-tight">
          <SnipeLogo className="h-6 w-6" />
          Snipe
        </Link>
      </header>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setMobileOpen(false)}
            className="absolute inset-0 bg-black/70"
          />
          <div className="relative flex h-full w-72 flex-col border-r border-white/[0.08] bg-black shadow-[16px_0_40px_-16px_rgba(0,0,0,0.5)]">
            <div className="flex h-14 items-center justify-between px-4">
              <Link
                href="/dashboard"
                className="flex items-center gap-2 font-normal tracking-tight"
                onClick={() => setMobileOpen(false)}
              >
                <SnipeLogo className="h-6 w-6" />
                Snipe
              </Link>
              <button
                type="button"
                aria-label="Close menu"
                onClick={() => setMobileOpen(false)}
                className="inline-flex size-9 items-center justify-center rounded-lg text-neutral-400 hover:bg-white/[0.06] hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto py-4">
              <NavItems
                pathname={pathname}
                collapsed={false}
                onNavigate={() => setMobileOpen(false)}
              />
            </div>
            <SidebarFooter email={email} planLabel={planLabel} collapsed={false} />
          </div>
        </div>
      )}

      {/* Desktop rail */}
      <aside
        className={cn(
          "sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-white/[0.08] bg-black md:flex",
          hydrated ? "transition-[width] duration-200" : "",
          open ? "w-64" : "w-[68px]",
        )}
      >
        <div className="flex h-14 items-center gap-2 px-4">
          <Link href="/dashboard" className="flex items-center gap-2 font-normal tracking-tight">
            <SnipeLogo className="h-6 w-6 shrink-0" />
            {open && <span>Snipe</span>}
          </Link>
        </div>

        <div className="flex-1 overflow-y-auto py-4">
          <NavItems pathname={pathname} collapsed={!open} />
        </div>

        <SidebarFooter email={email} planLabel={planLabel} collapsed={!open} />

        <button
          type="button"
          onClick={toggle}
          aria-label={open ? "Collapse sidebar" : "Expand sidebar"}
          className="flex items-center gap-2 px-2.5 py-3 text-neutral-400 transition-colors hover:bg-white/[0.04] hover:text-white"
        >
          <ChevronsRight className={cn("h-4 w-4 shrink-0 transition-transform", open && "rotate-180")} />
          {open && <span className="text-sm font-normal">Collapse</span>}
        </button>
      </aside>
    </>
  );
}

function SidebarFooter({
  email,
  planLabel,
  collapsed,
}: {
  email: string;
  planLabel: string;
  collapsed: boolean;
}) {
  return (
    <div className="p-2.5">
      {!collapsed && (
        <div className="mb-1 px-2 py-1.5">
          <div className="truncate text-xs text-neutral-500">{email}</div>
          <div className="text-xs text-neutral-300">{planLabel} plan</div>
        </div>
      )}
      <div
        className={cn(
          "mb-1 flex items-center rounded-full px-1",
          collapsed ? "justify-center" : "justify-between pl-3 pr-1",
        )}
      >
        {!collapsed && (
          <span className="text-xs font-normal uppercase tracking-wide text-neutral-500">
            Theme
          </span>
        )}
        <ThemeToggle />
      </div>
      <form action={signOutAction}>
        <button
          type="submit"
          className="flex h-10 w-full items-center gap-3 rounded-full px-3 text-sm font-normal text-neutral-400 transition-colors hover:bg-white/[0.04] hover:text-white"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && <span>Sign out</span>}
        </button>
      </form>
    </div>
  );
}
