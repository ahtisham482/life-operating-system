
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Target, Grid2X2, CheckSquare, RotateCcw,
  DollarSign, BookOpen, BookMarked, Settings, LogOut,
} from "lucide-react";

const NAV = [
  { href: "/dashboard", icon: Target,      label: "Command Center", phase: 1 },
  { href: "/matrix",    icon: Grid2X2,     label: "Matrix",         phase: 1 },
  { href: "/tasks",     icon: CheckSquare, label: "Tasks",          phase: 1 },
  { href: "/habits",    icon: RotateCcw,   label: "Habits",         phase: 1 },
  { href: "/expenses",  icon: DollarSign,  label: "Expenses",       phase: 1 },
  { href: "/journal",   icon: BookOpen,    label: "Journal",        phase: 1 },
  { href: "/books",     icon: BookMarked,  label: "Books",          phase: 1 },
  { href: "/engines",   icon: Settings,    label: "Engines",        phase: 1 },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex flex-col w-52 shrink-0 border-r border-border bg-card h-screen sticky top-0">
      {/* Logo */}
      <div className="px-5 py-6 border-b border-border">
        <p className="text-primary font-serif text-lg tracking-[0.2em] uppercase">LOS</p>
        <p className="text-muted-foreground font-mono text-[9px] tracking-[0.25em] uppercase mt-0.5">
          Life Operating System
        </p>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-2 space-y-0.5 overflow-y-auto">
        {NAV.map(({ href, icon: Icon, label, phase }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          const soon = phase > 1;
          return (
            <Link
              key={href}
              href={soon ? "#" : href}
              aria-disabled={soon}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-[11px] font-mono uppercase tracking-wider transition-colors",
                active
                  ? "bg-primary/10 text-primary"
                  : soon
                  ? "text-muted-foreground/40 cursor-not-allowed"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              )}
              onClick={e => soon && e.preventDefault()}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              <span>{label}</span>
              {soon && (
                <span className="ml-auto text-[9px] tracking-widest opacity-50">
                  soon
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="px-2 py-4 border-t border-border">
        <form action="/auth/signout" method="post">
          <button
            type="submit"
            className="flex items-center gap-3 px-3 py-2 rounded-md text-[11px] font-mono uppercase tracking-wider text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors w-full"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Sign Out</span>
          </button>
        </form>
      </div>
    </aside>
  );
}
