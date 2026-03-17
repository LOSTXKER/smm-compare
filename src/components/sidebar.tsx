"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useState } from "react";
import {
  BarChart3,
  GitCompare,
  RefreshCw,
  Users,
  Search,
  Menu,
  X,
  Trophy,
  DollarSign,
  Coins,
  UserCog,
  LogOut,
  Settings,
} from "lucide-react";
import { useCurrency } from "./currency-provider";
import { signOut, useSession } from "next-auth/react";

const mainSection = {
  label: "หลัก",
  items: [
    { href: "/", label: "ภาพรวม", icon: BarChart3 },
    { href: "/competitors", label: "จัดอันดับคู่แข่ง", icon: Trophy },
  ],
};

const adminSection = {
  label: "จัดการ",
  adminOnly: true,
  items: [
    { href: "/admin/providers", label: "ผู้ให้บริการ", icon: Users },
    { href: "/admin/matching", label: "จับคู่บริการ", icon: GitCompare },
    { href: "/admin/sync", label: "ซิงค์ข้อมูล", icon: RefreshCw },
    { href: "/admin/pricing", label: "แนะนำราคา", icon: DollarSign },
    { href: "/admin/users", label: "จัดการผู้ใช้", icon: UserCog },
    { href: "/admin/settings", label: "ตั้งค่าระบบ", icon: Settings },
  ],
};

export function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { data: session } = useSession();
  const role = session?.user?.role;
  const navSections = role === "admin" ? [mainSection, adminSection] : [mainSection];

  return (
    <>
      {/* Mobile header */}
      <header className="fixed top-0 left-0 right-0 z-50 flex h-14 items-center border-b border-border bg-card px-4 lg:hidden">
        <button onClick={() => setOpen(true)} className="mr-3 rounded-md p-1.5 hover:bg-accent">
          <Menu className="h-5 w-5" />
        </button>
        <Link href="/" className="text-lg font-bold">
          SMM Compare
        </Link>
      </header>

      {/* Mobile overlay */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-black/50" />
        </div>
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 z-50 flex h-full w-60 flex-col border-r border-border bg-card transition-transform duration-200 lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-14 items-center justify-between border-b border-border px-4">
          <Link href="/" className="text-lg font-bold" onClick={() => setOpen(false)}>
            SMM Compare
          </Link>
          <button onClick={() => setOpen(false)} className="rounded-md p-1 hover:bg-accent lg:hidden">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Search trigger */}
        <div className="p-3">
          <button
            className="flex w-full items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-muted-foreground hover:bg-muted"
            onClick={() => {
              setOpen(false);
              document.dispatchEvent(new CustomEvent("open-search"));
            }}
          >
            <Search className="h-4 w-4" />
            <span>ค้นหาบริการ...</span>
            <kbd className="ml-auto hidden rounded border border-border bg-background px-1.5 py-0.5 text-[10px] font-mono sm:inline">
              Ctrl+K
            </kbd>
          </button>
        </div>

        {/* Nav sections */}
        <nav className="flex-1 overflow-y-auto px-3 pb-4">
          {navSections.map((section) => (
            <div key={section.label} className="mb-4">
              <p className="mb-1 px-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                {section.label}
              </p>
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors",
                        isActive
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-accent hover:text-foreground"
                      )}
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-border p-3 space-y-2">
          <CurrencySelector />
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <LogOut className="h-4 w-4" />
            ออกจากระบบ
          </button>
        </div>
      </aside>
    </>
  );
}

function CurrencySelector() {
  const { displayCurrency, setDisplayCurrency, currencies, refreshRates } = useCurrency();
  const commonCurrencies = ["THB", "USD", "EUR", "IDR"];
  const shown = currencies.length > 0 ? commonCurrencies.filter((c) => currencies.includes(c)) : commonCurrencies;

  return (
    <div className="rounded-lg bg-muted/50 p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <Coins className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-medium">สกุลเงิน</span>
        </div>
        <button
          onClick={refreshRates}
          className="text-[10px] text-muted-foreground hover:text-foreground"
          title="อัพเดทอัตราแลกเปลี่ยน"
        >
          อัพเดท
        </button>
      </div>
      <div className="flex gap-1">
        {shown.map((c) => (
          <button
            key={c}
            className={cn(
              "flex-1 rounded px-1.5 py-1 text-[11px] font-medium transition-colors",
              displayCurrency === c
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent"
            )}
            onClick={() => setDisplayCurrency(c)}
          >
            {c}
          </button>
        ))}
      </div>
    </div>
  );
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/login";

  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="pt-14 lg:pl-60 lg:pt-0">
        <div className="mx-auto max-w-7xl p-4 pt-6 lg:p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
