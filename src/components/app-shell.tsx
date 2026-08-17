"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Building2,
  MapPinned,
  Calculator,
  CheckSquare,
  FileText,
  LogOut,
  LayoutDashboard,
  BarChart3,
  UploadCloud,
  Wallet,
  PieChart,
  FileBarChart,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  ScrollText,
} from "lucide-react";
import { useAuth } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Avatar,
  AvatarFallback,
} from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

type NavItemDef = { href: string; label: string; icon: React.ElementType };

// Grouped nav gives the rail an intentional structure (not a flat list) —
// Overview stands alone, then the two working areas are labelled.
const NAV_GROUPS: {
  label: string | null;
  adminOnly?: boolean;
  items: { href: string; label: string; icon: React.ElementType }[];
}[] = [
  { label: null, items: [{ href: "/", label: "Overview", icon: LayoutDashboard }] },
  {
    label: "Manage",
    items: [
      { href: "/vendors", label: "Vendors", icon: Building2 },
      { href: "/zones", label: "Zones", icon: MapPinned },
    ],
  },
  {
    label: "Workflow",
    items: [
      { href: "/sales-sheets", label: "Sales Sheets", icon: UploadCloud },
      { href: "/sales", label: "Sales Summary", icon: BarChart3 },
      { href: "/calculations", label: "Calculations", icon: Calculator },
      { href: "/approvals", label: "Approvals", icon: CheckSquare },
      { href: "/bills", label: "Bills", icon: FileText },
      { href: "/payouts", label: "Vendor Payouts", icon: Wallet },
      { href: "/reports/zone-commission", label: "Zone Commission", icon: PieChart },
      { href: "/reports/vendor-commission", label: "Vendor Report", icon: FileBarChart },
    ],
  },
  {
    label: "System",
    adminOnly: true,
    items: [{ href: "/logs", label: "System Logs", icon: ScrollText }],
  },
];

// One nav link. When the rail is collapsed it shows the icon only and reveals
// the label in a right-side tooltip on hover/focus.
function NavItem({
  item,
  active,
  collapsed,
  onNavigate,
}: {
  item: NavItemDef;
  active: boolean;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const Icon = item.icon;
  const link = (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative flex items-center rounded-md py-2 text-sm outline-none transition-colors",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-card",
        collapsed ? "justify-center px-0" : "gap-3 px-3",
        active
          ? "bg-primary/10 font-medium text-primary"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      {/* current-page accent bar */}
      <span
        className={cn(
          "absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-primary transition-opacity",
          active ? "opacity-100" : "opacity-0",
        )}
      />
      <Icon
        className={cn(
          "h-[1.125rem] w-[1.125rem] shrink-0 transition-colors",
          active ? "text-primary" : "text-muted-foreground group-hover:text-foreground",
        )}
      />
      {!collapsed && <span>{item.label}</span>}
    </Link>
  );

  if (!collapsed) return link;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right">{item.label}</TooltipContent>
    </Tooltip>
  );
}

// The rail content — brand, grouped nav, signed-in footer. Shared verbatim by
// the desktop <aside> and the mobile drawer, so the two never drift. `collapsed`
// renders the icon-only rail; `onNavigate` lets the mobile drawer close on tap.
function SidebarNav({
  onNavigate,
  collapsed = false,
}: {
  onNavigate?: () => void;
  collapsed?: boolean;
}) {
  const pathname = usePathname();
  const user = useAuth((s) => s.user);
  const initials = (user?.name ?? "U")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const visibleGroups = NAV_GROUPS.filter((g) => !g.adminOnly || user?.role === "ADMIN");

  return (
    <div className="flex h-full flex-col">
      {/* Brand lockup — mark + serif wordmark register + tracked product tag */}
      <div
        className={cn(
          "flex h-16 shrink-0 items-center border-b border-border",
          collapsed ? "justify-center px-0" : "gap-2.5 px-5",
        )}
      >
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-lg text-primary-foreground"
          style={{ fontFamily: "var(--font-editorial)" }}
        >
          G
        </div>
        {!collapsed && (
          <div className="leading-none">
            <div className="text-[1.0625rem]" style={{ fontFamily: "var(--font-editorial)" }}>
              Gazon
            </div>
            <div className="mt-1 text-[0.6875rem] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              VCMS
            </div>
          </div>
        )}
      </div>

      {/* Grouped navigation */}
      <nav className={cn("min-h-0 flex-1 overflow-y-auto py-4", collapsed ? "px-2" : "px-3")}>
        {visibleGroups.map((group, gi) => (
          <div key={gi} className={gi > 0 ? (collapsed ? "mt-3" : "mt-6") : ""}>
            {group.label &&
              (collapsed ? (
                // A hairline stands in for the section label when collapsed.
                gi > 0 && <div className="mx-2 mb-2 border-t border-border" />
              ) : (
                <div className="px-3 pb-1.5 text-[0.6875rem] font-medium uppercase tracking-[0.12em] text-muted-foreground/70">
                  {group.label}
                </div>
              ))}
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <NavItem
                  key={item.href}
                  item={item}
                  // Match the exact route or a sub-route (href + "/…"), never a
                  // prefix of another item's path — otherwise /sales-sheets would
                  // also light up /sales ("Sales Summary").
                  active={
                    item.href === "/"
                      ? pathname === "/"
                      : pathname === item.href || pathname.startsWith(item.href + "/")
                  }
                  collapsed={collapsed}
                  onNavigate={onNavigate}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer — signed-in identity anchored at the base of the rail */}
      <div className={cn("shrink-0 border-t border-border py-3", collapsed ? "px-2" : "px-4")}>
        <div className={cn("flex items-center", collapsed ? "justify-center" : "gap-2.5")}>
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-[0.6875rem]">{initials}</AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="min-w-0 leading-tight">
              <div className="truncate text-[0.8125rem] font-medium">{user?.name}</div>
              <div className="text-[0.6875rem] uppercase tracking-wide text-muted-foreground">
                {user?.role}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const COLLAPSE_KEY = "vcms_sidebar_collapsed";

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { token, hydrated, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  // Client-side auth guard: once the persisted store has hydrated, bounce to
  // /login if there's no token.
  useEffect(() => {
    if (hydrated && !token) router.replace("/login");
  }, [hydrated, token, router]);

  // Restore the collapsed preference on mount (client-only).
  useEffect(() => {
    if (localStorage.getItem(COLLAPSE_KEY) === "1") setCollapsed(true);
  }, []);

  const toggleCollapsed = () =>
    setCollapsed((c) => {
      const next = !c;
      try {
        localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
      } catch {
        /* ignore quota / private-mode errors */
      }
      return next;
    });

  if (!hydrated || !token) {
    return (
      <div className="fixed inset-0 flex items-center justify-center text-muted-foreground">
        Loading…
      </div>
    );
  }

  return (
    // Pin the whole shell to the viewport (out of document flow) so the page
    // itself can never scroll — only <main> scrolls internally. This is more
    // robust than h-screen + overflow-hidden, which the browser can propagate
    // to the viewport and defeat.
    <div className="fixed inset-0 flex overflow-hidden">
      {/* Sidebar
       * Hallmark · component: nav (labelled side-rail) · genre: modern-minimal
       * states: default · hover · focus-visible · current
       * theme: preserved (Geist + OKLCH blue) · wordmark in Instrument Serif
       */}
      <aside
        className={cn(
          "hidden shrink-0 border-r border-border bg-card transition-[width] duration-200 ease-out md:block",
          collapsed ? "w-16" : "w-60",
        )}
      >
        <SidebarNav collapsed={collapsed} />
      </aside>

      {/* Mobile drawer — same rail, slides in from the left under `md`. */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" showCloseButton={false} className="w-[17rem] max-w-[85vw] border-border bg-card p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SidebarNav onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center gap-2 border-b border-border px-4 sm:px-6">
          {/* Mobile: hamburger opens the drawer. */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation"
          >
            <Menu className="h-5 w-5" />
          </Button>
          {/* Desktop: collapse/expand the rail. */}
          <Button
            variant="ghost"
            size="icon"
            className="hidden md:inline-flex"
            onClick={toggleCollapsed}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
          </Button>
          <div
            className="text-[1.0625rem] md:hidden"
            style={{ fontFamily: "var(--font-editorial)" }}
          >
            Gazon
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            <ThemeToggle />
            <Button variant="ghost" size="icon" onClick={logout} title="Log out">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>
        {/* min-h-0 lets flex-1 actually constrain the height so overflow-y-auto
            engages — without it the content grows past 100vh and the window
            scrolls. */}
        <main className="min-h-0 flex-1 space-y-6 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}

// Convenience hook for role-gating UI in pages.
export function useRole() {
  return useAuth((s) => s.user?.role);
}
