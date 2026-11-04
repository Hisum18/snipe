"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { signOutAction } from "@/app/actions/auth";
import {
  BellRing,
  Briefcase,
  Building,
  CreditCard,
  HelpCircle,
  Home,
  LogOut,
  PanelLeft,
  Search,
  Settings,
  SnipeLogo,
  X,
  type IconProps,
} from "@/components/icons";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { cn } from "@/lib/utils";

const NAV: { href: string; label: string; Icon: (p: IconProps) => React.ReactElement }[] = [
  { href: "/dashboard", label: "Dashboard", Icon: Home },
  { href: "/companies", label: "Companies", Icon: Building },
  { href: "/jobs", label: "Job history", Icon: Briefcase },
  { href: "/billing", label: "Billing & plan", Icon: CreditCard },
  { href: "/settings", label: "Settings", Icon: Settings },
  { href: "/help", label: "Help & Support", Icon: HelpCircle },
];

const PROVIDER_LABEL = { greenhouse: "Greenhouse", lever: "Lever", ashby: "Ashby" } as const;

export interface WatchingItem {
  id: string;
  name: string;
  provider: keyof typeof PROVIDER_LABEL;
  active: boolean;
}

interface ShellUser {
  name: string | null;
  email: string;
  planLabel: string;
}

const STORAGE_KEY = "snipe-sidebar-open";

function isActive(href: string, pathname: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function titleFor(pathname: string, name: string | null) {
  if (isActive("/dashboard", pathname)) {
    const first = name?.trim().split(/\s+/)[0];
    return first ? `Welcome back, ${first}` : "Dashboard";
  }
  return NAV.find((item) => isActive(item.href, pathname))?.label ?? "Snipe";
}

function Initial({ text, className }: { text: string; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-accent-2 font-medium text-accent-2-foreground",
        className,
      )}
    >
      {text.trim().charAt(0).toUpperCase() || "?"}
    </span>
  );
}

/**
 * Logged-in app shell: collapsible sidebar (icon rail when collapsed, a
 * drawer on mobile) + a sticky top bar with the page title and quick
 * actions. Collapse state is persisted in localStorage.
 */
export function AppShell({
  user,
  watching,
  watchingTotal,
  newMatchesToday,
  children,
}: {
  user: ShellUser;
  watching: WatchingItem[];
  watchingTotal: number;
  newMatchesToday: number;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(true);
  const [hydrated, setHydrated] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Read the persisted collapse state once on mount (the server always
  // renders the "open" default, so this avoids a hydration mismatch).
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored !== null) setOpen(stored === "1");
    } catch {
      // Storage blocked — fall back to "open".
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Checkout and Manage billing run in their own tab (see
  // components/payments); when they report a change, re-fetch this page's
  // server data so the plan, limits and sidebar update without a reload.
  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return;
    const channel = new BroadcastChannel("snipe-billing");
    channel.onmessage = () => router.refresh();
    return () => channel.close();
  }, [router]);

  function toggleCollapsed() {
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

  const sidebarProps = { pathname, user, watching, watchingTotal };

  return (
    <div className="flex min-h-dvh bg-black text-white">
      {/* Desktop rail */}
      <aside
        className={cn(
          "inverse sticky top-0 hidden h-dvh shrink-0 overflow-hidden border-r border-white/[0.06] bg-black md:block",
          hydrated && "transition-[width] duration-200",
          open ? "w-64" : "w-[72px]",
        )}
      >
        <SidebarContent {...sidebarProps} collapsed={!open} />
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setMobileOpen(false)}
            className="absolute inset-0 bg-deep/60"
          />
          <div className="inverse relative h-full w-72 border-r border-white/[0.06] bg-black shadow-overlay">
            <button
              type="button"
              aria-label="Close menu"
              onClick={() => setMobileOpen(false)}
              className="absolute right-3 top-4 z-10 inline-flex size-8 items-center justify-center rounded-lg text-neutral-400 hover:bg-white/[0.06] hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
            <SidebarContent
              {...sidebarProps}
              collapsed={false}
              onNavigate={() => setMobileOpen(false)}
            />
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-2 border-b border-white/[0.06] bg-black px-3 md:px-6">
          <button
            type="button"
            aria-label="Open menu"
            onClick={() => setMobileOpen(true)}
            className="inline-flex size-9 items-center justify-center rounded-lg text-neutral-400 hover:bg-white/[0.06] hover:text-white md:hidden"
          >
            <PanelLeft className="h-[18px] w-[18px]" />
          </button>
          <button
            type="button"
            aria-label={open ? "Collapse sidebar" : "Expand sidebar"}
            aria-expanded={open}
            onClick={toggleCollapsed}
            className="hidden size-9 items-center justify-center rounded-lg text-neutral-400 hover:bg-white/[0.06] hover:text-white md:inline-flex"
          >
            <PanelLeft className="h-[18px] w-[18px]" />
          </button>
          <h1 className="ml-1 truncate text-lg font-semibold tracking-tight md:text-xl">
            {titleFor(pathname, user.name)}
          </h1>

          <div className="ml-auto flex items-center gap-1">
            <Link
              href="/companies"
              aria-label="Browse companies"
              title="Browse companies"
              className="inline-flex size-9 items-center justify-center rounded-full text-neutral-400 transition-colors hover:bg-white/[0.06] hover:text-white"
            >
              <Search className="h-[18px] w-[18px]" />
            </Link>
            <Link
              href="/jobs"
              aria-label={
                newMatchesToday > 0
                  ? `Job history, ${newMatchesToday} new in the last 24 hours`
                  : "Job history"
              }
              title="Job history"
              className="relative inline-flex size-9 items-center justify-center rounded-full text-neutral-400 transition-colors hover:bg-white/[0.06] hover:text-white"
            >
              <BellRing className="h-[18px] w-[18px]" />
              {newMatchesToday > 0 && (
                <span
                  aria-hidden="true"
                  className="absolute right-2 top-2 size-2 rounded-full bg-brand ring-2 ring-black"
                />
              )}
            </Link>
            <ThemeToggle />
            <UserMenu user={user} />
          </div>
        </header>

        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}

function SidebarContent({
  pathname,
  user,
  watching,
  watchingTotal,
  collapsed,
  onNavigate,
}: {
  pathname: string;
  user: ShellUser;
  watching: WatchingItem[];
  watchingTotal: number;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className={cn("flex h-16 shrink-0 items-center px-5", collapsed && "justify-center px-0")}>
        <Link href="/dashboard" onClick={onNavigate} className="flex items-center gap-2.5">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-[9px] bg-accent text-accent-foreground">
            <SnipeLogo className="h-[18px] w-[18px]" />
          </span>
          {!collapsed && (
            <span className="font-display text-[17px] font-semibold tracking-tight">Snipe</span>
          )}
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3">
        <nav aria-label="App" className="space-y-0.5">
          {NAV.map(({ href, label, Icon }) => {
            const active = isActive(href, pathname);
            return (
              <Link
                key={href}
                href={href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                aria-label={collapsed ? label : undefined}
                title={collapsed ? label : undefined}
                className={cn(
                  "flex h-9 items-center gap-3 rounded-lg px-2.5 text-sm transition-colors",
                  collapsed && "justify-center px-0",
                  active
                    ? "bg-selected font-medium text-selected-foreground"
                    : "text-neutral-400 hover:bg-white/[0.04] hover:text-white",
                )}
              >
                <Icon className="h-[18px] w-[18px] shrink-0" />
                {!collapsed && <span className="truncate">{label}</span>}
              </Link>
            );
          })}
        </nav>

        {!collapsed && (
          <div className="mt-8">
            <div className="mb-1.5 flex items-center justify-between px-2.5">
              <p className="text-xs font-medium text-neutral-500">Watching</p>
              {watchingTotal > watching.length && (
                <Link
                  href="/dashboard#watching"
                  onClick={onNavigate}
                  className="text-xs text-neutral-500 hover:text-brand-text"
                >
                  View all {watchingTotal}
                </Link>
              )}
            </div>
            {watching.length === 0 ? (
              <p className="px-2.5 text-sm text-neutral-500">
                No companies yet.{" "}
                <Link
                  href="/dashboard#watching"
                  onClick={onNavigate}
                  className="text-brand-text hover:underline"
                >
                  Watch one
                </Link>
              </p>
            ) : (
              <ul className="space-y-0.5">
                {watching.map((w) => (
                  <li key={w.id} className="flex items-center gap-3 rounded-lg px-2.5 py-1.5">
                    <span className="relative flex size-7 shrink-0 items-center justify-center rounded-full bg-black text-xs font-medium text-white ring-1 ring-border">
                      {w.name.trim().charAt(0).toUpperCase()}
                      {/* Status dot: accent while actively watched, muted when paused. */}
                      <span
                        className={cn(
                          "absolute -bottom-px -right-px size-2 rounded-full ring-2 ring-surface",
                          w.active ? "bg-brand" : "bg-neutral-600",
                        )}
                      />
                    </span>
                    {/* Untrusted ATS text — rendered as escaped JSX text. */}
                    <span className="min-w-0 flex-1 truncate text-sm">{w.name}</span>
                    <span className="shrink-0 text-xs text-neutral-500">
                      {w.active ? PROVIDER_LABEL[w.provider] : "Paused"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      <div className="shrink-0 border-t border-white/[0.06] p-3">
        <div className={cn("flex items-center gap-3 px-1.5", collapsed && "justify-center px-0")}>
          <Initial text={user.name ?? user.email} className="size-8 text-sm" />
          {!collapsed && (
            <>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{user.name ?? "Your account"}</p>
                <p className="truncate text-xs text-neutral-500">{user.email}</p>
              </div>
              <form action={signOutAction}>
                <button
                  type="submit"
                  aria-label="Sign out"
                  title="Sign out"
                  className="inline-flex size-8 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-white/[0.06] hover:text-white"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function UserMenu({ user }: { user: ShellUser }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const itemClass =
    "block w-full rounded-lg px-3 py-2 text-left text-sm text-neutral-200 transition-colors hover:bg-white/[0.06] hover:text-white";

  return (
    <div className="relative ml-1" ref={ref}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        onClick={() => setOpen((o) => !o)}
        className="rounded-full"
      >
        <Initial text={user.name ?? user.email} className="size-9 text-sm" />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-60 rounded-xl border border-white/[0.08] bg-surface p-1 shadow-overlay"
        >
          <div className="px-3 py-2">
            <p className="truncate text-sm font-medium">{user.name ?? "Your account"}</p>
            <p className="truncate text-xs text-neutral-500">{user.email}</p>
            <p className="mt-1 text-xs text-neutral-500">{user.planLabel} plan</p>
          </div>
          <div className="my-1 h-px bg-border" />
          <Link role="menuitem" href="/settings" className={itemClass}>
            Settings
          </Link>
          <Link role="menuitem" href="/billing" className={itemClass}>
            Billing &amp; plan
          </Link>
          <Link role="menuitem" href="/help" className={itemClass}>
            Help &amp; Support
          </Link>
          <div className="my-1 h-px bg-border" />
          <form action={signOutAction}>
            <button type="submit" role="menuitem" className={itemClass}>
              Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
