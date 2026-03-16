"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Target, Grid2X2, CheckSquare, RotateCcw,
  DollarSign, BookOpen, BookMarked, Settings, LogOut,
  Zap, Calendar, Flag, Brain,
} from "lucide-react";

const NAV_SECTIONS = [
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

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex flex-col w-60 shrink-0 border-r border-white/[0.05] bg-[rgba(10,10,10,0.8)] backdrop-blur-xl h-screen sticky top-0 relative">
      {/* Subtle right edge glow */}
      <div className="absolute right-0 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-[#C49E45]/10 to-transparent" />

      {/* Logo */}
      <div className="px-6 py-6 border-b border-white/[0.05]">
        <div className="flex items-center gap-3.5">
          <div className="size-10 rounded-xl bg-gradient-to-b from-[#C49E45]/20 to-transparent border border-[#C49E45]/25 flex items-center justify-center">
            <span className="text-lg font-serif text-[#C49E45] font-medium">L</span>
          </div>
          <div>
            <p className="text-[#C49E45] font-serif text-sm tracking-[0.25em] uppercase font-medium">
              LOS
            </p>
            <p className="text-white/25 font-mono text-[8px] tracking-[0.35em] uppercase">
              Operating System
            </p>
          </div>
        </div>
      </div>

      {/* Nav Sections */}
      <nav className="flex-1 py-4 px-3 overflow-y-auto space-y-5">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label}>
            <p className="text-[9px] font-mono uppercase tracking-[0.35em] text-white/20 px-3 mb-2">
              {section.label}
            </p>
            <div className="space-y-0.5">
              {section.items.map(({ href, icon: Icon, label }) => {
                const active = pathname === href || pathname.startsWith(href + "/");
                return (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      "group flex items-center gap-3 px-3 py-2.5 rounded-xl text-[11px] font-mono uppercase tracking-wider transition-all duration-200",
                      active
                        ? "bg-[#C49E45]/[0.08] text-[#C49E45] border border-[#C49E45]/[0.15] glow-primary-sm"
                        : "text-white/35 hover:text-white/80 hover:bg-white/[0.03] border border-transparent"
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-3.5 w-3.5 shrink-0 transition-colors",
                        active ? "text-[#C49E45]" : "text-white/25 group-hover:text-white/60"
                      )}
                    />
                    <span className="truncate">{label}</span>
                    {active && (
                      <div className="ml-auto size-1.5 rounded-full bg-[#C49E45] animate-pulse" />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom */}
      <div className="px-3 py-4 border-t border-white/[0.05]">
        <form action="/auth/signout" method="post">
          <button
            type="submit"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[11px] font-mono uppercase tracking-wider text-white/25 hover:text-white/60 hover:bg-red-500/[0.05] transition-all w-full border border-transparent"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Sign Out</span>
          </button>
        </form>
      </div>
    </aside>
  );
}
