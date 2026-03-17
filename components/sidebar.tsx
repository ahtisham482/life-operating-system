"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import {
  Target, Grid2X2, CheckSquare, RotateCcw,
  DollarSign, BookOpen, BookMarked, Settings, LogOut,
  Zap, Calendar, Flag, Brain, Menu, X, Inbox,
} from "lucide-react";

const NAV_SECTIONS = [
  {
    label: "Capture",
    items: [
      { href: "/inbox",     icon: Inbox,       label: "Inbox" },
    ],
  },
  {
    label: "Core",
    items: [
      { href: "/dashboard", icon: Target,      label: "Command Center" },
      { href: "/checkin",   icon: Zap,         label: "Check-In" },
      { href: "/weekly",    icon: Calendar,    label: "Weekly" },
      { href: "/season",    icon: Flag,        label: "Season" },
    ],
  },
  {
    label: "Execute",
    items: [
      { href: "/matrix",    icon: Grid2X2,     label: "Matrix" },
      { href: "/tasks",     icon: CheckSquare, label: "Tasks" },
      { href: "/habits",    icon: RotateCcw,   label: "Habits" },
    ],
  },
  {
    label: "Track",
    items: [
      { href: "/expenses",  icon: DollarSign,  label: "Expenses" },
      { href: "/journal",   icon: BookOpen,    label: "Journal" },
      { href: "/books",     icon: BookMarked,  label: "Books" },
    ],
  },
  {
    label: "Intelligence",
    items: [
      { href: "/mirror",    icon: Brain,       label: "Mirror AI" },
      { href: "/engines",   icon: Settings,    label: "Automations" },
    ],
  },
];

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <>
      {/* Logo */}
      <div className="px-6 py-6 border-b border-[#FFF8F0]/[0.05]">
        <div className="flex items-center gap-3.5">
          <div className="size-10 rounded-xl bg-gradient-to-b from-[#FF6B6B]/20 to-transparent border border-[#FF6B6B]/25 flex items-center justify-center">
            <span className="text-lg font-serif text-[#FF6B6B] font-medium">L</span>
          </div>
          <div>
            <p className="text-[#FF6B6B] font-serif text-sm tracking-[0.25em] uppercase font-medium">
              LOS
            </p>
            <p className="text-[#FFF8F0]/25 font-mono text-[8px] tracking-[0.35em] uppercase">
              Operating System
            </p>
          </div>
        </div>
      </div>

      {/* Nav Sections */}
      <nav className="flex-1 py-4 px-3 overflow-y-auto space-y-5">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label}>
            <p className="text-[9px] font-mono uppercase tracking-[0.35em] text-[#FFF8F0]/20 px-3 mb-2">
              {section.label}
            </p>
            <div className="space-y-0.5">
              {section.items.map(({ href, icon: Icon, label }) => {
                const active = pathname === href || pathname.startsWith(href + "/");
                return (
                  <Link
                    key={href}
                    href={href}
                    prefetch={true}
                    onClick={onNavigate}
                    className={cn(
                      "group flex items-center gap-3 px-3 py-2.5 rounded-xl text-[11px] font-mono uppercase tracking-wider transition-all duration-200",
                      active
                        ? "bg-[#FF6B6B]/[0.08] text-[#FF6B6B] border border-[#FF6B6B]/[0.15] glow-primary-sm"
                        : "text-[#FFF8F0]/35 hover:text-[#FFF8F0]/80 hover:bg-[#FFF8F0]/[0.03] border border-transparent"
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-3.5 w-3.5 shrink-0 transition-colors",
                        active ? "text-[#FF6B6B]" : "text-[#FFF8F0]/25 group-hover:text-[#FFF8F0]/60"
                      )}
                    />
                    <span className="truncate">{label}</span>
                    {active && (
                      <div className="ml-auto size-1.5 rounded-full bg-[#FF6B6B] animate-pulse" />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom */}
      <div className="px-3 py-4 border-t border-[#FFF8F0]/[0.05]">
        <form action="/auth/signout" method="post">
          <button
            type="submit"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[11px] font-mono uppercase tracking-wider text-[#FFF8F0]/25 hover:text-[#FFF8F0]/60 hover:bg-red-500/[0.05] transition-all w-full border border-transparent"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Sign Out</span>
          </button>
        </form>
      </div>
    </>
  );
}

export function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed top-4 left-4 z-50 size-11 flex items-center justify-center rounded-xl bg-[rgba(22,22,42,0.95)] backdrop-blur-xl border border-[#FFF8F0]/[0.08] text-[#FFF8F0]/60 hover:text-[#FFF8F0]/90 transition-colors"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Mobile overlay + sidebar */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          {/* Slide-in sidebar */}
          <aside className="absolute left-0 top-0 bottom-0 w-72 flex flex-col bg-[rgba(22,22,42,0.97)] backdrop-blur-xl border-r border-[#FFF8F0]/[0.05] animate-slide-in-left">
            {/* Close button */}
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4 size-11 flex items-center justify-center rounded-xl text-[#FFF8F0]/40 hover:text-[#FFF8F0]/80 transition-colors"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
            <SidebarContent onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      {/* Desktop sidebar — hidden on mobile */}
      <aside className="hidden md:flex flex-col w-60 shrink-0 border-r border-[#FFF8F0]/[0.05] bg-[rgba(22,22,42,0.85)] backdrop-blur-xl h-screen sticky top-0 relative">
        {/* Subtle right edge glow */}
        <div className="absolute right-0 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-[#FF6B6B]/10 to-transparent" />
        <SidebarContent />
      </aside>
    </>
  );
}
