"use client";

import { useState, useTransition, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toggleHabitLog, createHabit, archiveHabit } from "./actions";
import type { Habit, HabitGroup, HabitLog, HabitLogStatus, ScheduleType } from "@/lib/db/schema";

type Props = {
  groups: HabitGroup[];
  habits: Habit[];
  notTodayHabits: Habit[];
  todayLogs: Record<string, HabitLog>;
  date: string;
};

const GROUP_GRADIENTS: Record<string, string> = {
  morning: "bg-gradient-to-r from-[#FF6B6B] via-[#FEC89A] to-[#FFD93D]",
  afternoon: "bg-gradient-to-r from-[#2DD4BF] to-[#38BDF8]",
  evening: "bg-gradient-to-r from-[#E2B0FF] to-[#A78BFA]",
  anytime: "bg-gradient-to-r from-[#FFF8F0]/20 to-[#FFF8F0]/10",
};

const SCHEDULE_OPTIONS: { value: ScheduleType; label: string }[] = [
  { value: "daily", label: "Daily" },
  { value: "weekdays", label: "Weekdays" },
  { value: "weekends", label: "Weekends" },
  { value: "custom", label: "Custom" },
];

const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

export function HabitTracker({ groups, habits, notTodayHabits, todayLogs, date }: Props) {
  const [optimisticLogs, setOptimisticLogs] = useState<Record<string, HabitLogStatus>>(
    () => {
      const map: Record<string, HabitLogStatus> = {};
      for (const [habitId, log] of Object.entries(todayLogs)) {
        map[habitId] = log.status;
      }
      return map;
    }
  );
  const [isPending, startTransition] = useTransition();
  const [showNotToday, setShowNotToday] = useState(false);
  const [addingInGroup, setAddingInGroup] = useState<string | null>(null);
  const [newHabitName, setNewHabitName] = useState("");
  const [newHabitEmoji, setNewHabitEmoji] = useState("");
  const [newHabitSchedule, setNewHabitSchedule] = useState<ScheduleType>("daily");
  const [newHabitDays, setNewHabitDays] = useState<number[]>([]);
  const [toast, setToast] = useState<{ message: string; habitId?: string; prevStatus?: HabitLogStatus } | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const prevAllDoneRef = useRef(false);

  // Celebration: detect when all habits become completed
  const completedCount = habits.filter((h) => optimisticLogs[h.id] === "completed").length;
  const allDone = habits.length > 0 && completedCount === habits.length;

  useEffect(() => {
    if (allDone && !prevAllDoneRef.current) {
      setShowConfetti(true);
      // Haptic burst for celebration
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate([50, 30, 50, 30, 100]);
      }
      setTimeout(() => setShowConfetti(false), 3000);
    }
    prevAllDoneRef.current = allDone;
  }, [allDone]);

  function showToast(message: string, habitId?: string, prevStatus?: HabitLogStatus) {
    setToast({ message, habitId, prevStatus });
    setTimeout(() => setToast(null), 3000);
  }

  async function handleToggle(habitId: string) {
    const currentStatus = optimisticLogs[habitId];
    const newStatus: HabitLogStatus = currentStatus === "completed" ? "pending" : "completed";
    const prevStatus = currentStatus || "pending";

    // Optimistic update
    setOptimisticLogs((prev) => ({ ...prev, [habitId]: newStatus }));

    // Haptic feedback
    if (newStatus === "completed" && typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(50);
    }

    startTransition(async () => {
      try {
        await toggleHabitLog(habitId, date, newStatus);
        if (newStatus === "completed") {
          showToast("Habit completed!", habitId, prevStatus);
        }
      } catch {
        // Rollback
        setOptimisticLogs((prev) => ({ ...prev, [habitId]: prevStatus }));
        showToast("Couldn't save, try again");
      }
    });
  }

  async function handleUndo() {
    if (!toast?.habitId || !toast?.prevStatus) return;
    const { habitId, prevStatus } = toast;
    setOptimisticLogs((prev) => ({ ...prev, [habitId]: prevStatus }));
    setToast(null);
    startTransition(async () => {
      try {
        await toggleHabitLog(habitId, date, prevStatus);
      } catch {
        // Silent
      }
    });
  }

  async function handleAddHabit(groupId: string) {
    if (!newHabitName.trim()) return;

    const scheduleDays = newHabitSchedule === "weekdays"
      ? [1, 2, 3, 4, 5]
      : newHabitSchedule === "weekends"
      ? [0, 6]
      : newHabitSchedule === "custom"
      ? newHabitDays
      : [];

    startTransition(async () => {
      try {
        await createHabit(
          newHabitName.trim(),
          newHabitEmoji || null,
          groupId,
          newHabitSchedule,
          scheduleDays
        );
        setNewHabitName("");
        setNewHabitEmoji("");
        setNewHabitSchedule("daily");
        setNewHabitDays([]);
        setAddingInGroup(null);
      } catch {
        showToast("Couldn't create habit");
      }
    });
  }

  async function handleArchive(habitId: string) {
    if (!confirm("Archive this habit? History will be preserved.")) return;
    startTransition(async () => {
      try {
        await archiveHabit(habitId);
      } catch {
        showToast("Couldn't archive habit");
      }
    });
  }

  function getHabitsForGroup(groupId: string) {
    return habits.filter((h) => h.groupId === groupId);
  }

  const ungroupedHabits = habits.filter((h) => !h.groupId);

  return (
    <div className="space-y-6">
      {/* Grouped habits */}
      {groups.map((group) => {
        const groupHabits = getHabitsForGroup(group.id);
        if (groupHabits.length === 0 && addingInGroup !== group.id) return null;

        const groupCompleted = groupHabits.filter(
          (h) => optimisticLogs[h.id] === "completed"
        ).length;

        return (
          <div key={group.id} className="glass-card rounded-3xl overflow-hidden hover:border-[#FFF8F0]/[0.08] transition-all">
            <div className={`h-1 ${GROUP_GRADIENTS[group.timeOfDay] || GROUP_GRADIENTS.anytime}`} />
            <div className="p-6 space-y-4">
              {/* Group header */}
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h2 className="text-base font-serif italic text-[#FEC89A]">
                    {group.emoji && `${group.emoji} `}{group.name}
                  </h2>
                </div>
                <span className="text-[10px] font-mono text-[#FFF8F0]/30 tracking-wider">
                  {groupCompleted}/{groupHabits.length}
                </span>
              </div>

              {/* Habit cards */}
              <div className="space-y-2">
                {groupHabits.map((habit) => (
                  <HabitCard
                    key={habit.id}
                    habit={habit}
                    status={optimisticLogs[habit.id] || "pending"}
                    onToggle={() => handleToggle(habit.id)}
                    onArchive={() => handleArchive(habit.id)}
                  />
                ))}
              </div>

              {/* Add habit inline */}
              <AnimatePresence>
                {addingInGroup === group.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="space-y-3 pt-2 border-t border-[#FFF8F0]/[0.06]">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Emoji"
                          value={newHabitEmoji}
                          onChange={(e) => setNewHabitEmoji(e.target.value)}
                          className="w-14 bg-[#FFF8F0]/[0.03] border border-[#FFF8F0]/[0.08] text-[#FFF8F0]/80 px-2 py-2.5 text-sm rounded-xl focus:outline-none focus:ring-1 focus:ring-[#FF6B6B]/30 text-center"
                          maxLength={2}
                        />
                        <input
                          type="text"
                          placeholder="Habit name..."
                          value={newHabitName}
                          onChange={(e) => setNewHabitName(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleAddHabit(group.id)}
                          className="flex-1 bg-[#FFF8F0]/[0.03] border border-[#FFF8F0]/[0.08] text-[#FFF8F0]/80 px-3 py-2.5 text-sm font-serif rounded-xl focus:outline-none focus:ring-1 focus:ring-[#FF6B6B]/30 placeholder:text-[#FFF8F0]/20"
                          autoFocus
                        />
                      </div>

                      {/* Schedule selector */}
                      <div className="flex gap-1">
                        {SCHEDULE_OPTIONS.map((opt) => (
                          <button
                            key={opt.value}
                            onClick={() => setNewHabitSchedule(opt.value)}
                            className={`flex-1 py-2 text-[10px] font-mono uppercase tracking-wider rounded-lg transition-colors ${
                              newHabitSchedule === opt.value
                                ? "bg-[#FF6B6B] text-white"
                                : "bg-[#FFF8F0]/[0.04] text-[#FFF8F0]/40 hover:text-[#FFF8F0]/60"
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>

                      {/* Custom days picker */}
                      <AnimatePresence>
                        {newHabitSchedule === "custom" && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="flex gap-2 justify-center">
                              {DAY_LABELS.map((label, i) => (
                                <button
                                  key={i}
                                  onClick={() => {
                                    setNewHabitDays((prev) =>
                                      prev.includes(i)
                                        ? prev.filter((d) => d !== i)
                                        : [...prev, i]
                                    );
                                  }}
                                  className={`w-9 h-9 rounded-full text-xs font-mono transition-colors ${
                                    newHabitDays.includes(i)
                                      ? "bg-[#FF6B6B] text-white"
                                      : "border border-[#FFF8F0]/[0.1] text-[#FFF8F0]/40 hover:border-[#FF6B6B]/50"
                                  }`}
                                >
                                  {label}
                                </button>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <div className="flex gap-2">
                        <button
                          onClick={() => handleAddHabit(group.id)}
                          disabled={!newHabitName.trim() || isPending}
                          className="flex-1 py-2.5 text-[11px] font-mono uppercase tracking-widest bg-gradient-to-r from-[#FF6B6B] to-[#FEC89A] text-white rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
                        >
                          Add Habit
                        </button>
                        <button
                          onClick={() => {
                            setAddingInGroup(null);
                            setNewHabitName("");
                            setNewHabitEmoji("");
                            setNewHabitSchedule("daily");
                            setNewHabitDays([]);
                          }}
                          className="px-4 py-2.5 text-[11px] font-mono uppercase tracking-widest text-[#FFF8F0]/40 hover:text-[#FFF8F0]/70 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Add button */}
              {addingInGroup !== group.id && (
                <button
                  onClick={() => setAddingInGroup(group.id)}
                  className="w-full py-2 text-[10px] font-mono uppercase tracking-[0.25em] text-[#FFF8F0]/25 hover:text-[#FFF8F0]/50 transition-colors border border-dashed border-[#FFF8F0]/[0.06] rounded-xl hover:border-[#FFF8F0]/[0.15]"
                >
                  + Add habit
                </button>
              )}
            </div>
          </div>
        );
      })}

      {/* Ungrouped habits */}
      {ungroupedHabits.length > 0 && (
        <div className="glass-card rounded-3xl overflow-hidden hover:border-[#FFF8F0]/[0.08] transition-all">
          <div className="h-1 bg-gradient-to-r from-[#FFF8F0]/10 to-[#FFF8F0]/5" />
          <div className="p-6 space-y-4">
            <h2 className="text-base font-serif italic text-[#FFF8F0]/50">
              Ungrouped
            </h2>
            <div className="space-y-2">
              {ungroupedHabits.map((habit) => (
                <HabitCard
                  key={habit.id}
                  habit={habit}
                  status={optimisticLogs[habit.id] || "pending"}
                  onToggle={() => handleToggle(habit.id)}
                  onArchive={() => handleArchive(habit.id)}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Not Today section */}
      {notTodayHabits.length > 0 && (
        <div className="animate-slide-up" style={{ animationDelay: "0.16s", animationFillMode: "both" }}>
          <button
            onClick={() => setShowNotToday(!showNotToday)}
            className="w-full flex items-center justify-between py-3 text-[10px] font-mono uppercase tracking-[0.25em] text-[#FFF8F0]/25 hover:text-[#FFF8F0]/40 transition-colors"
          >
            <span>Not scheduled today ({notTodayHabits.length})</span>
            <span>{showNotToday ? "\u25BE" : "\u25B8"}</span>
          </button>
          <AnimatePresence>
            {showNotToday && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="space-y-2 opacity-40">
                  {notTodayHabits.map((habit) => (
                    <HabitCard
                      key={habit.id}
                      habit={habit}
                      status={optimisticLogs[habit.id] || "pending"}
                      onToggle={() => handleToggle(habit.id)}
                      onArchive={() => handleArchive(habit.id)}
                      dimmed
                    />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Celebration confetti */}
      <AnimatePresence>
        {showConfetti && <ConfettiBurst />}
      </AnimatePresence>

      {/* All-done celebration banner */}
      <AnimatePresence>
        {allDone && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10 }}
            className="glass-card rounded-3xl p-6 text-center border-[#34D399]/30"
          >
            <p className="text-2xl mb-1">{"\uD83C\uDF89"}</p>
            <p className="text-base font-serif italic text-[#34D399]">
              All habits completed today!
            </p>
            <p className="text-[10px] font-mono text-[#FFF8F0]/30 mt-1 tracking-wider uppercase">
              Perfect day — keep the streak alive
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 bg-[#1a1a2e]/95 backdrop-blur border border-[#FFF8F0]/[0.1] rounded-2xl shadow-xl"
          >
            <span className="text-sm font-serif text-[#FFF8F0]/80">{toast.message}</span>
            {toast.habitId && toast.prevStatus && (
              <button
                onClick={handleUndo}
                className="text-[10px] font-mono uppercase tracking-wider text-[#FF6B6B] hover:text-[#FF6B6B]/80"
              >
                Undo
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─────────────────────────────────────────
// Individual Habit Card
// ─────────────────────────────────────────

function HabitCard({
  habit,
  status,
  onToggle,
  onArchive,
  dimmed,
}: {
  habit: Habit;
  status: HabitLogStatus;
  onToggle: () => void;
  onArchive: () => void;
  dimmed?: boolean;
}) {
  const isCompleted = status === "completed";
  const [showActions, setShowActions] = useState(false);

  return (
    <motion.div
      layout
      whileTap={{ scale: 0.98 }}
      animate={isCompleted ? { scale: [1, 1.02, 1] } : {}}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      onClick={onToggle}
      className={`relative flex items-center gap-3 px-4 py-3.5 rounded-2xl border cursor-pointer transition-all select-none ${
        isCompleted
          ? "border-[#34D399]/40 bg-[#34D399]/5 shadow-[inset_4px_0_0_#34D399]"
          : dimmed
          ? "border-[#FFF8F0]/[0.04] bg-[#FFF8F0]/[0.01]"
          : "border-[#FFF8F0]/[0.08] hover:border-[#FFF8F0]/[0.15] bg-[#FFF8F0]/[0.02]"
      }`}
    >
      {/* Checkbox indicator */}
      <div
        className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all shrink-0 ${
          isCompleted
            ? "border-[#34D399] bg-[#34D399]"
            : "border-[#FFF8F0]/20"
        }`}
      >
        <AnimatePresence>
          {isCompleted && (
            <motion.svg
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              className="w-3 h-3 text-white"
              viewBox="0 0 12 12"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M2.5 6l2.5 2.5 4.5-5" />
            </motion.svg>
          )}
        </AnimatePresence>
      </div>

      {/* Habit info */}
      <div className="flex-1 min-w-0">
        <span
          className={`text-sm font-serif block truncate ${
            isCompleted ? "text-[#34D399]" : "text-[#FFF8F0]/80"
          }`}
        >
          {habit.emoji && `${habit.emoji} `}{habit.name}
        </span>
      </div>

      {/* Streak badge */}
      {habit.currentStreak >= 2 && (
        <div className="flex flex-col items-end shrink-0" onClick={(e) => e.stopPropagation()}>
          <span className="text-[11px] font-mono text-[#FF6B6B]/80 font-semibold">
            {"\uD83D\uDD25"}{habit.currentStreak}
          </span>
          {habit.bestStreak > habit.currentStreak && (
            <span className="text-[8px] font-mono text-[#FFF8F0]/20">
              best: {habit.bestStreak}
            </span>
          )}
        </div>
      )}

      {/* Context menu trigger */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          setShowActions(!showActions);
        }}
        className="text-[#FFF8F0]/20 hover:text-[#FFF8F0]/50 transition-colors shrink-0 px-1"
      >
        {"\u22EF"}
      </button>

      {/* Context actions dropdown */}
      <AnimatePresence>
        {showActions && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute right-2 top-full mt-1 z-20 bg-[#1a1a2e] border border-[#FFF8F0]/[0.1] rounded-xl shadow-xl py-1 min-w-[140px]"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => {
                onArchive();
                setShowActions(false);
              }}
              className="w-full px-4 py-2 text-left text-xs font-mono text-[#FF6B6B]/70 hover:bg-[#FF6B6B]/10 transition-colors"
            >
              Archive habit
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─────────────────────────────────────────
// Confetti Burst (celebration particles)
// ─────────────────────────────────────────

const CONFETTI_COLORS = ["#FF6B6B", "#FEC89A", "#34D399", "#FFD93D", "#E2B0FF", "#38BDF8", "#A78BFA"];

function ConfettiBurst() {
  const particles = Array.from({ length: 40 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,      // vw start position
    delay: Math.random() * 0.5,
    size: Math.random() * 8 + 4,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    rotation: Math.random() * 360,
    drift: (Math.random() - 0.5) * 200,
  }));

  return (
    <div className="fixed inset-0 pointer-events-none z-[100] overflow-hidden">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          initial={{
            x: `${p.x}vw`,
            y: "-5vh",
            rotate: 0,
            opacity: 1,
          }}
          animate={{
            y: "110vh",
            x: `calc(${p.x}vw + ${p.drift}px)`,
            rotate: p.rotation + 720,
            opacity: [1, 1, 0.8, 0],
          }}
          transition={{
            duration: 2.5 + Math.random(),
            delay: p.delay,
            ease: "easeIn",
          }}
          style={{
            position: "absolute",
            width: p.size,
            height: p.size * 0.6,
            backgroundColor: p.color,
            borderRadius: 1,
          }}
        />
      ))}
    </div>
  );
}
