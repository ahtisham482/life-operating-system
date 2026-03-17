"use client";

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  useTransition,
} from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Search,
  Plus,
  Target,
  CheckSquare,
  Zap,
  Calendar as CalendarIcon,
  RotateCcw,
  DollarSign,
  BookOpen,
  Grid2X2,
  Brain,
  Command,
  X,
} from "lucide-react";
import { createTask, searchTasks } from "@/app/(dashboard)/tasks/actions";
import { parseNaturalDate, formatDateLabel, type ParsedDate } from "@/lib/parse-date";

// ─── Types ────────────────────────────────────────────

type PaletteItem = {
  id: string;
  icon: React.ReactNode;
  label: string;
  description?: string;
  dateBadge?: string;
  action: () => void | Promise<void>;
  type: "create" | "navigate" | "task";
};

// ─── Navigation Items ─────────────────────────────────

const ICON_CLASS = "w-3.5 h-3.5";

const NAV_ITEMS: Omit<PaletteItem, "action">[] = [
  {
    id: "nav-dashboard",
    icon: <Target className={ICON_CLASS} />,
    label: "Command Center",
    description: "/dashboard",
    type: "navigate",
  },
  {
    id: "nav-tasks",
    icon: <CheckSquare className={ICON_CLASS} />,
    label: "Tasks",
    description: "/tasks",
    type: "navigate",
  },
  {
    id: "nav-checkin",
    icon: <Zap className={ICON_CLASS} />,
    label: "Check-In",
    description: "/checkin",
    type: "navigate",
  },
  {
    id: "nav-habits",
    icon: <RotateCcw className={ICON_CLASS} />,
    label: "Habits",
    description: "/habits",
    type: "navigate",
  },
  {
    id: "nav-matrix",
    icon: <Grid2X2 className={ICON_CLASS} />,
    label: "Matrix",
    description: "/matrix",
    type: "navigate",
  },
  {
    id: "nav-weekly",
    icon: <CalendarIcon className={ICON_CLASS} />,
    label: "Weekly Plan",
    description: "/weekly",
    type: "navigate",
  },
  {
    id: "nav-expenses",
    icon: <DollarSign className={ICON_CLASS} />,
    label: "Expenses",
    description: "/expenses",
    type: "navigate",
  },
  {
    id: "nav-journal",
    icon: <BookOpen className={ICON_CLASS} />,
    label: "Journal",
    description: "/journal",
    type: "navigate",
  },
  {
    id: "nav-mirror",
    icon: <Brain className={ICON_CLASS} />,
    label: "Mirror AI",
    description: "/mirror",
    type: "navigate",
  },
];

// ─── CommandPalette Component ─────────────────────────

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isPending, startTransition] = useTransition();
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [matchingTasks, setMatchingTasks] = useState<
    Array<{
      id: string;
      taskName: string;
      status: string;
      priority: string | null;
      dueDate: string | null;
      lifeArea: string | null;
    }>
  >([]);

  const inputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  // ─── NLP Date Parsing ──────────────────────────────
  const parsed = useMemo(() => {
    if (!query.trim()) return null;
    return parseNaturalDate(query);
  }, [query]);

  const parsedDate: ParsedDate | null = parsed?.parsedDate ?? null;
  const cleanTaskName = parsed?.taskName ?? query.trim();

  // ─── Build Items List ──────────────────────────────
  const items: PaletteItem[] = useMemo(() => {
    const result: PaletteItem[] = [];
    const trimmed = query.trim();

    if (trimmed) {
      // Create task action (always first when typing)
      result.push({
        id: "create-task",
        icon: <Plus className={ICON_CLASS} />,
        label: `Create: ${cleanTaskName}`,
        dateBadge: parsedDate
          ? `📅 ${parsedDate.label}`
          : undefined,
        action: () => handleCreateTask(),
        type: "create",
      });

      // Matching existing tasks
      for (const task of matchingTasks) {
        result.push({
          id: `task-${task.id}`,
          icon: <CheckSquare className={ICON_CLASS} />,
          label: task.taskName,
          description: [task.status, task.priority]
            .filter(Boolean)
            .join(" · "),
          dateBadge: task.dueDate
            ? `📅 ${formatDateLabel(task.dueDate)}`
            : undefined,
          action: () => {
            router.push("/tasks");
            close();
          },
          type: "task",
        });
      }

      // Filtered navigation
      const navMatches = NAV_ITEMS.filter(
        (item) =>
          item.label.toLowerCase().includes(trimmed.toLowerCase()) ||
          item.description?.toLowerCase().includes(trimmed.toLowerCase())
      );
      for (const nav of navMatches) {
        result.push({
          ...nav,
          action: () => {
            router.push(nav.description!);
            close();
          },
        });
      }
    } else {
      // Empty state: show navigation
      for (const nav of NAV_ITEMS) {
        result.push({
          ...nav,
          action: () => {
            router.push(nav.description!);
            close();
          },
        });
      }
    }

    return result;
  }, [query, cleanTaskName, parsedDate, matchingTasks, router]);

  // ─── Search Existing Tasks (debounced) ─────────────
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    const trimmed = query.trim();
    if (!trimmed || trimmed.length < 2) {
      setMatchingTasks([]);
      return;
    }

    searchTimeoutRef.current = setTimeout(async () => {
      try {
        // Search using the cleaned task name (without date)
        const searchText =
          parseNaturalDate(trimmed).taskName || trimmed;
        const results = await searchTasks(searchText);
        setMatchingTasks(results);
      } catch {
        setMatchingTasks([]);
      }
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [query]);

  // ─── Keep selected index in bounds ─────────────────
  useEffect(() => {
    if (selectedIndex >= items.length) {
      setSelectedIndex(Math.max(0, items.length - 1));
    }
  }, [items.length, selectedIndex]);

  // ─── Global Keyboard Shortcut ──────────────────────
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Cmd+K or Ctrl+K
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
        return;
      }

      // "/" key — only when not typing in an input
      if (e.key === "/" && !open) {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
        // Don't intercept if user has content editable focused
        if ((e.target as HTMLElement)?.isContentEditable) return;
        e.preventDefault();
        setOpen(true);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  // ─── Close on route change ─────────────────────────
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // ─── Focus input when opened ───────────────────────
  useEffect(() => {
    if (open) {
      // Small delay to ensure modal is rendered
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
      setQuery("");
      setSelectedIndex(0);
      setMatchingTasks([]);
      setSuccessMsg(null);
    }
  }, [open]);

  // ─── Handlers ──────────────────────────────────────

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setSelectedIndex(0);
    setMatchingTasks([]);
    setSuccessMsg(null);
  }, []);

  const handleCreateTask = useCallback(() => {
    if (!cleanTaskName.trim()) return;

    startTransition(async () => {
      try {
        await createTask({
          taskName: cleanTaskName,
          status: "To Do",
          priority: "🟡 Medium",
          type: "✅ Task",
          lifeArea: null,
          dueDate: parsedDate?.date ?? null,
          notes: null,
          recurring: false,
          frequency: null,
          repeatEveryDays: null,
        });

        setSuccessMsg(
          parsedDate
            ? `✓ "${cleanTaskName}" created — ${parsedDate.label}`
            : `✓ "${cleanTaskName}" created`
        );
        setQuery("");

        // Close after brief success feedback
        setTimeout(() => {
          close();
        }, 900);
      } catch {
        setSuccessMsg("✗ Failed to create task");
        setTimeout(() => setSuccessMsg(null), 2000);
      }
    });
  }, [cleanTaskName, parsedDate, close]);

  function handleKeyDown(e: React.KeyboardEvent) {
    switch (e.key) {
      case "ArrowDown": {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < items.length - 1 ? prev + 1 : 0
        );
        break;
      }
      case "ArrowUp": {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev > 0 ? prev - 1 : items.length - 1
        );
        break;
      }
      case "Enter": {
        e.preventDefault();
        if (items[selectedIndex]) {
          items[selectedIndex].action();
        }
        break;
      }
      case "Escape": {
        e.preventDefault();
        close();
        break;
      }
    }
  }

  // ─── Render ────────────────────────────────────────

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[999] flex items-start justify-center pt-[15vh]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
        onClick={close}
      />

      {/* Palette Card */}
      <div
        className="relative w-full max-w-[540px] mx-4 rounded-2xl overflow-hidden shadow-2xl shadow-black/40 animate-in zoom-in-95 slide-in-from-top-2 duration-150"
        style={{
          background: "rgba(20, 20, 35, 0.95)",
          border: "1px solid rgba(255, 200, 154, 0.1)",
          backdropFilter: "blur(24px)",
        }}
        onKeyDown={handleKeyDown}
      >
        {/* Search Input */}
        <div className="flex items-center gap-3 px-5 h-14 border-b border-[#FFF8F0]/[0.06]">
          {isPending ? (
            <div className="w-4 h-4 border-2 border-[#FF6B6B]/30 border-t-[#FF6B6B] rounded-full animate-spin flex-shrink-0" />
          ) : (
            <Search className="w-4 h-4 text-[#FFF8F0]/25 flex-shrink-0" />
          )}
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Create a task, or navigate..."
            className="flex-1 bg-transparent text-sm font-serif text-[#FFF8F0]/90 placeholder:text-[#FFF8F0]/25 outline-none"
            autoComplete="off"
            spellCheck={false}
          />
          {query && (
            <button
              onClick={() => {
                setQuery("");
                inputRef.current?.focus();
              }}
              className="w-5 h-5 flex items-center justify-center rounded text-[#FFF8F0]/20 hover:text-[#FFF8F0]/50 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[9px] font-mono text-[#FFF8F0]/20 border border-[#FFF8F0]/[0.06] rounded bg-[#FFF8F0]/[0.03]">
            Esc
          </kbd>
        </div>

        {/* NLP Date Preview Badge */}
        {parsedDate && !successMsg && (
          <div className="px-5 py-2 border-b border-[#FFF8F0]/[0.04] flex items-center gap-2">
            <span className="text-[10px] font-mono text-[#FF6B6B]/70 bg-[#FF6B6B]/[0.08] px-2.5 py-1 rounded-full flex items-center gap-1.5">
              <CalendarIcon className="w-3 h-3" />
              {parsedDate.label}
              <span className="text-[#FFF8F0]/20">·</span>
              <span className="text-[#FFF8F0]/30">{parsedDate.date}</span>
            </span>
            <span className="text-[10px] font-mono text-[#FFF8F0]/15">
              detected from &quot;{parsedDate.matchedText}&quot;
            </span>
          </div>
        )}

        {/* Success Message */}
        {successMsg && (
          <div className="px-5 py-4 flex items-center justify-center">
            <span
              className={`text-sm font-serif ${
                successMsg.startsWith("✓")
                  ? "text-emerald-400"
                  : "text-red-400"
              }`}
            >
              {successMsg}
            </span>
          </div>
        )}

        {/* Results List */}
        {!successMsg && (
          <div className="max-h-[320px] overflow-y-auto py-2">
            {/* Section: Create / Tasks */}
            {query.trim() && (
              <div className="px-3 pb-1">
                <p className="text-[9px] font-mono text-[#FFF8F0]/15 tracking-[0.3em] uppercase px-2 py-1.5">
                  {matchingTasks.length > 0 ? "Actions & Tasks" : "Quick Action"}
                </p>
              </div>
            )}

            {!query.trim() && (
              <div className="px-3 pb-1">
                <p className="text-[9px] font-mono text-[#FFF8F0]/15 tracking-[0.3em] uppercase px-2 py-1.5">
                  Navigate
                </p>
              </div>
            )}

            {items.map((item, i) => (
              <button
                key={item.id}
                onClick={() => item.action()}
                onMouseEnter={() => setSelectedIndex(i)}
                className={`w-full flex items-center gap-3 px-5 py-2.5 text-left transition-colors ${
                  selectedIndex === i
                    ? "bg-[#FF6B6B]/[0.08]"
                    : "hover:bg-[#FFF8F0]/[0.03]"
                }`}
              >
                <span
                  className={`flex-shrink-0 ${
                    selectedIndex === i
                      ? "text-[#FF6B6B]"
                      : item.type === "create"
                      ? "text-[#FF6B6B]/60"
                      : "text-[#FFF8F0]/25"
                  }`}
                >
                  {item.icon}
                </span>

                <div className="flex-1 min-w-0">
                  <span
                    className={`text-sm font-serif truncate block ${
                      selectedIndex === i
                        ? "text-[#FFF8F0]/90"
                        : "text-[#FFF8F0]/60"
                    }`}
                  >
                    {item.label}
                  </span>
                  {item.description && (
                    <span className="text-[10px] font-mono text-[#FFF8F0]/20 block">
                      {item.description}
                    </span>
                  )}
                </div>

                {item.dateBadge && (
                  <span className="text-[9px] font-mono text-[#FF6B6B]/50 flex-shrink-0">
                    {item.dateBadge}
                  </span>
                )}

                {selectedIndex === i && (
                  <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[9px] font-mono text-[#FFF8F0]/15 border border-[#FFF8F0]/[0.04] rounded bg-[#FFF8F0]/[0.02] flex-shrink-0">
                    ↵
                  </kbd>
                )}
              </button>
            ))}

            {items.length === 0 && (
              <div className="px-5 py-8 text-center">
                <p className="text-sm font-serif text-[#FFF8F0]/20 italic">
                  No results
                </p>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        {!successMsg && (
          <div className="px-5 py-2.5 border-t border-[#FFF8F0]/[0.04] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1 text-[9px] font-mono text-[#FFF8F0]/15">
                <kbd className="px-1 py-0.5 border border-[#FFF8F0]/[0.04] rounded bg-[#FFF8F0]/[0.02]">
                  ↑↓
                </kbd>
                navigate
              </span>
              <span className="flex items-center gap-1 text-[9px] font-mono text-[#FFF8F0]/15">
                <kbd className="px-1 py-0.5 border border-[#FFF8F0]/[0.04] rounded bg-[#FFF8F0]/[0.02]">
                  ↵
                </kbd>
                select
              </span>
              <span className="flex items-center gap-1 text-[9px] font-mono text-[#FFF8F0]/15">
                <kbd className="px-1 py-0.5 border border-[#FFF8F0]/[0.04] rounded bg-[#FFF8F0]/[0.02]">
                  esc
                </kbd>
                close
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Command className="w-3 h-3 text-[#FFF8F0]/10" />
              <span className="text-[9px] font-mono text-[#FFF8F0]/10">
                Quick Add supports &quot;tomorrow&quot;, &quot;next friday&quot;, &quot;in 3 days&quot;
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
