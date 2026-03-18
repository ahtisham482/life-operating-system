"use client";

import { useState, useTransition, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  toggleHabitLog,
  createHabit,
  updateHabit,
  archiveHabit,
  unarchiveHabit,
  reorderHabits,
  createHabitGroup,
  updateHabitGroup,
  deleteHabitGroup,
  adoptTemplate,
  submitDiagnosis,
  dismissDiagnosis,
  bulkCompleteToday,
} from "./actions";
import { HabitInterviewModal } from "./habit-interview";
import type {
  Habit,
  HabitGroup,
  HabitLog,
  HabitLogStatus,
  ScheduleType,
  HabitTemplate,
  DiagnosisType,
} from "@/lib/db/schema";

// ─────────────────────────────────────────
// Constants
// ─────────────────────────────────────────

const STREAK_MILESTONES = [7, 14, 21, 30, 50, 66, 100];
const MILESTONE_MESSAGES: Record<number, string> = {
  7: "🔥 1 week streak! Building momentum!",
  14: "💪 2 weeks strong! Habit forming!",
  21: "⚡ 21 days! Science says it's a habit now!",
  30: "🏆 30-day streak! Incredible discipline!",
  50: "🌟 50 days! You're unstoppable!",
  66: "🧠 66 days! Neurologically automatic!",
  100: "👑 100-day streak! Legendary!",
};

const SKIP_REASONS = ["Traveling", "Sick", "Rest day", "Chose to skip"];

type DiagnosisFlag = {
  habitId: string;
  missCount: number;
  diagnosisId?: string;
};

type Props = {
  groups: HabitGroup[];
  habits: Habit[];
  notTodayHabits: Habit[];
  archivedHabits: Habit[];
  todayLogs: Record<string, HabitLog>;
  date: string;
  templates?: HabitTemplate[];
  diagnosisFlags?: DiagnosisFlag[];
  keystoneHabitIds?: string[];
  recoveryMessage?: string | null;
  perfectDayCount?: number;
  daysOfData?: number;
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

const TIME_OF_DAY_OPTIONS = [
  { value: "morning" as const, label: "Morning", emoji: "☀️" },
  { value: "afternoon" as const, label: "Afternoon", emoji: "🌿" },
  { value: "evening" as const, label: "Evening", emoji: "🌙" },
  { value: "anytime" as const, label: "Anytime", emoji: "⭐" },
];

const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

const TEMPLATE_CATEGORIES = [
  "Health & Fitness",
  "Mindfulness",
  "Productivity",
  "Learning",
  "Finance",
  "Self-Care",
];

// ─────────────────────────────────────────
// Main HabitTracker Component
// ─────────────────────────────────────────

export function HabitTracker({
  groups,
  habits,
  notTodayHabits,
  archivedHabits,
  todayLogs,
  date,
  templates = [],
  diagnosisFlags = [],
  keystoneHabitIds = [],
  recoveryMessage,
  perfectDayCount = 0,
  daysOfData = 0,
}: Props) {
  const [optimisticLogs, setOptimisticLogs] = useState<
    Record<string, HabitLogStatus>
  >(() => {
    const map: Record<string, HabitLogStatus> = {};
    for (const [habitId, log] of Object.entries(todayLogs)) {
      map[habitId] = log.status;
    }
    return map;
  });
  const [isPending, startTransition] = useTransition();
  const [showNotToday, setShowNotToday] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [addingInGroup, setAddingInGroup] = useState<string | null>(null);
  const [newHabitName, setNewHabitName] = useState("");
  const [newHabitEmoji, setNewHabitEmoji] = useState("");
  const [newHabitSchedule, setNewHabitSchedule] =
    useState<ScheduleType>("daily");
  const [newHabitDays, setNewHabitDays] = useState<number[]>([]);
  const [toast, setToast] = useState<{
    message: string;
    habitId?: string;
    prevStatus?: HabitLogStatus;
    milestone?: boolean;
  } | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const prevAllDoneRef = useRef(false);

  // Skip-note state
  const [skipNoteHabitId, setSkipNoteHabitId] = useState<string | null>(null);
  const [skipNoteText, setSkipNoteText] = useState("");

  // Group management state
  const [showAddGroup, setShowAddGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupEmoji, setNewGroupEmoji] = useState("");
  const [newGroupTimeOfDay, setNewGroupTimeOfDay] = useState<
    "morning" | "afternoon" | "evening" | "anytime"
  >("anytime");
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editGroupName, setEditGroupName] = useState("");
  const [editGroupEmoji, setEditGroupEmoji] = useState("");

  // AI Interview state
  const [interviewHabitId, setInterviewHabitId] = useState<string | null>(null);
  const [interviewHabitName, setInterviewHabitName] = useState("");

  // Template library state
  const [showTemplates, setShowTemplates] = useState(false);

  // DnD sensors — require 8px movement before drag starts to avoid conflicting with tap
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  // Celebration: detect when all habits become completed
  const completedCount = habits.filter(
    (h) => optimisticLogs[h.id] === "completed",
  ).length;
  const allDone = habits.length > 0 && completedCount === habits.length;

  useEffect(() => {
    if (allDone && !prevAllDoneRef.current) {
      setShowConfetti(true);
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate([50, 30, 50, 30, 100]);
      }
      setTimeout(() => setShowConfetti(false), 3000);
    }
    prevAllDoneRef.current = allDone;
  }, [allDone]);

  function showToastMsg(
    message: string,
    habitId?: string,
    prevStatus?: HabitLogStatus,
    milestone?: boolean,
  ) {
    setToast({ message, habitId, prevStatus, milestone });
    setTimeout(() => setToast(null), milestone ? 4000 : 3000);
  }

  // ─── Toggle handler ───
  async function handleToggle(habitId: string) {
    const currentStatus = optimisticLogs[habitId];
    const newStatus: HabitLogStatus =
      currentStatus === "completed" ? "pending" : "completed";
    const prevStatus = currentStatus || "pending";

    setOptimisticLogs((prev) => ({ ...prev, [habitId]: newStatus }));

    if (
      newStatus === "completed" &&
      typeof navigator !== "undefined" &&
      "vibrate" in navigator
    ) {
      navigator.vibrate(50);
    }

    startTransition(async () => {
      try {
        const result = await toggleHabitLog(habitId, date, newStatus);

        // Check for streak milestones
        if (newStatus === "completed" && result.currentStreak > 0) {
          const milestone = STREAK_MILESTONES.find(
            (m) => m === result.currentStreak,
          );
          if (milestone) {
            const msg =
              MILESTONE_MESSAGES[milestone] || `🔥 ${milestone}-day streak!`;
            showToastMsg(msg, undefined, undefined, true);
            if (milestone >= 21) {
              setShowConfetti(true);
              setTimeout(() => setShowConfetti(false), 3000);
            }
            return;
          }
        }

        if (newStatus === "completed") {
          showToastMsg("Habit completed!", habitId, prevStatus);
        }
      } catch {
        setOptimisticLogs((prev) => ({ ...prev, [habitId]: prevStatus }));
        showToastMsg("Couldn't save, try again");
      }
    });
  }

  // ─── Skip handler (with optional note) ───
  const handleSkipWithNote = useCallback((habitId: string) => {
    setSkipNoteHabitId(habitId);
    setSkipNoteText("");
  }, []);

  async function handleSubmitSkip(habitId: string, note: string | null) {
    const prevStatus = optimisticLogs[habitId] || "pending";
    setOptimisticLogs((prev) => ({ ...prev, [habitId]: "skipped" }));
    setSkipNoteHabitId(null);
    setSkipNoteText("");

    startTransition(async () => {
      try {
        await toggleHabitLog(habitId, date, "skipped", note);
        showToastMsg("Marked as skipped", habitId, prevStatus);
      } catch {
        setOptimisticLogs((prev) => ({ ...prev, [habitId]: prevStatus }));
        showToastMsg("Couldn't save, try again");
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

  // ─── CRUD handlers ───
  async function handleAddHabit(groupId: string) {
    if (!newHabitName.trim()) return;

    const scheduleDays =
      newHabitSchedule === "weekdays"
        ? [1, 2, 3, 4, 5]
        : newHabitSchedule === "weekends"
          ? [0, 6]
          : newHabitSchedule === "custom"
            ? newHabitDays
            : [];

    const habitNameForInterview = newHabitName.trim();

    startTransition(async () => {
      try {
        const newId = await createHabit(
          newHabitName.trim(),
          newHabitEmoji || null,
          groupId,
          newHabitSchedule,
          scheduleDays,
        );
        setNewHabitName("");
        setNewHabitEmoji("");
        setNewHabitSchedule("daily");
        setNewHabitDays([]);
        setAddingInGroup(null);

        // Open AI interview after creation
        setInterviewHabitId(newId);
        setInterviewHabitName(habitNameForInterview);
      } catch {
        showToastMsg("Couldn't create habit");
      }
    });
  }

  async function handleArchive(habitId: string) {
    if (!confirm("Archive this habit? History will be preserved.")) return;
    startTransition(async () => {
      try {
        await archiveHabit(habitId);
        showToastMsg("Habit archived");
      } catch {
        showToastMsg("Couldn't archive habit");
      }
    });
  }

  async function handleUnarchive(habitId: string) {
    startTransition(async () => {
      try {
        await unarchiveHabit(habitId);
        showToastMsg("Habit restored");
      } catch {
        showToastMsg("Couldn't restore habit");
      }
    });
  }

  async function handleEditHabit(
    id: string,
    fields: {
      name?: string;
      emoji?: string | null;
      scheduleType?: ScheduleType;
      scheduleDays?: number[];
      purpose?: string | null;
      identity?: string | null;
      tinyVersion?: string | null;
      anchorText?: string | null;
    },
  ) {
    startTransition(async () => {
      try {
        await updateHabit(id, fields);
        showToastMsg("Habit updated");
      } catch {
        showToastMsg("Couldn't update habit");
      }
    });
  }

  // ─── Template adopt handler ───
  async function handleAdoptTemplate(
    templateId: string,
    groupId: string | null,
  ) {
    startTransition(async () => {
      try {
        await adoptTemplate(templateId, groupId);
        showToastMsg("Habit added from template!");
        setShowTemplates(false);
      } catch {
        showToastMsg("Couldn't add template");
      }
    });
  }

  // ─── Diagnosis handler ───
  async function handleDiagnosis(habitId: string, diagnosis: DiagnosisType) {
    startTransition(async () => {
      try {
        await submitDiagnosis(habitId, diagnosis);
        showToastMsg("Thanks for the feedback");
      } catch {
        showToastMsg("Couldn't save diagnosis");
      }
    });
  }

  async function handleDismissDiagnosis(diagnosisId: string) {
    startTransition(async () => {
      try {
        await dismissDiagnosis(diagnosisId);
      } catch {
        // Silent
      }
    });
  }

  // ─── Bulk complete (recovery) ───
  async function handleBulkComplete() {
    const pendingIds = habits
      .filter((h) => optimisticLogs[h.id] !== "completed")
      .map((h) => h.id);
    if (pendingIds.length === 0) return;

    // Optimistic update
    const updates: Record<string, HabitLogStatus> = {};
    for (const id of pendingIds) updates[id] = "completed";
    setOptimisticLogs((prev) => ({ ...prev, ...updates }));

    startTransition(async () => {
      try {
        await bulkCompleteToday(pendingIds, date);
        showToastMsg("All habits marked complete!");
      } catch {
        showToastMsg("Couldn't complete all habits");
      }
    });
  }

  // ─── Group handlers ───
  async function handleAddGroup() {
    if (!newGroupName.trim()) return;
    startTransition(async () => {
      try {
        await createHabitGroup(
          newGroupName.trim(),
          newGroupEmoji || null,
          newGroupTimeOfDay,
        );
        setNewGroupName("");
        setNewGroupEmoji("");
        setNewGroupTimeOfDay("anytime");
        setShowAddGroup(false);
        showToastMsg("Group created");
      } catch {
        showToastMsg("Couldn't create group");
      }
    });
  }

  async function handleSaveGroupEdit(groupId: string) {
    startTransition(async () => {
      try {
        await updateHabitGroup(groupId, {
          name: editGroupName,
          emoji: editGroupEmoji || null,
        });
        setEditingGroupId(null);
        showToastMsg("Group updated");
      } catch {
        showToastMsg("Couldn't update group");
      }
    });
  }

  async function handleDeleteGroup(groupId: string) {
    if (!confirm("Delete this group? Habits inside will become ungrouped."))
      return;
    startTransition(async () => {
      try {
        await deleteHabitGroup(groupId);
        showToastMsg("Group deleted");
      } catch {
        showToastMsg("Couldn't delete group");
      }
    });
  }

  // ─── DnD handler ───
  function handleDragEnd(groupId: string, event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const groupHabits = getHabitsForGroup(groupId);
    const oldIndex = groupHabits.findIndex((h) => h.id === active.id);
    const newIndex = groupHabits.findIndex((h) => h.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(groupHabits, oldIndex, newIndex);
    const orderedIds = reordered.map((h) => h.id);

    startTransition(async () => {
      try {
        await reorderHabits(orderedIds);
      } catch {
        showToastMsg("Couldn't reorder habits");
      }
    });
  }

  function getHabitsForGroup(groupId: string) {
    return habits.filter((h) => h.groupId === groupId);
  }

  const ungroupedHabits = habits.filter((h) => !h.groupId);

  // Check if this is a new user with 0 habits (show templates)
  const hasNoHabits = habits.length === 0 && notTodayHabits.length === 0;

  return (
    <div className="space-y-6">
      {/* AI Interview Modal */}
      <AnimatePresence>
        {interviewHabitId && (
          <HabitInterviewModal
            habitId={interviewHabitId}
            habitName={interviewHabitName}
            onClose={() => {
              setInterviewHabitId(null);
              setInterviewHabitName("");
            }}
          />
        )}
      </AnimatePresence>

      {/* Skip-note modal overlay */}
      <AnimatePresence>
        {skipNoteHabitId && (
          <SkipNoteModal
            habitId={skipNoteHabitId}
            onSubmit={handleSubmitSkip}
            onCancel={() => {
              setSkipNoteHabitId(null);
              setSkipNoteText("");
            }}
            noteText={skipNoteText}
            setNoteText={setSkipNoteText}
          />
        )}
      </AnimatePresence>

      {/* Recovery Banner */}
      {recoveryMessage && !allDone && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card rounded-3xl p-5 border-[#FEC89A]/20 space-y-3"
        >
          <p className="text-sm font-serif italic text-[#FEC89A]">
            {recoveryMessage}
          </p>
          <button
            onClick={handleBulkComplete}
            disabled={isPending}
            className="px-4 py-2 text-[10px] font-mono uppercase tracking-widest bg-[#34D399]/20 text-[#34D399] border border-[#34D399]/30 rounded-xl hover:bg-[#34D399]/30 transition-colors disabled:opacity-50"
          >
            I&apos;m back — complete all
          </button>
        </motion.div>
      )}

      {/* Empty state — Template suggestions */}
      {hasNoHabits && templates.length > 0 ? (
        <TemplateLibrary
          templates={templates}
          groups={groups}
          onAdopt={handleAdoptTemplate}
          isPending={isPending}
          fullPage
        />
      ) : (
        <>
          {/* Grouped habits */}
          {groups.map((group) => {
            const groupHabits = getHabitsForGroup(group.id);
            if (groupHabits.length === 0 && addingInGroup !== group.id)
              return null;

            const groupCompleted = groupHabits.filter(
              (h) => optimisticLogs[h.id] === "completed",
            ).length;

            const isEditing = editingGroupId === group.id;

            return (
              <div
                key={group.id}
                className="glass-card rounded-3xl overflow-hidden hover:border-[#FFF8F0]/[0.08] transition-all"
              >
                <div
                  className={`h-1 ${GROUP_GRADIENTS[group.timeOfDay] || GROUP_GRADIENTS.anytime}`}
                />
                <div className="p-6 space-y-4">
                  {/* Group header */}
                  {isEditing ? (
                    <GroupEditForm
                      emoji={editGroupEmoji}
                      name={editGroupName}
                      setEmoji={setEditGroupEmoji}
                      setName={setEditGroupName}
                      onSave={() => handleSaveGroupEdit(group.id)}
                      onCancel={() => setEditingGroupId(null)}
                    />
                  ) : (
                    <GroupHeader
                      group={group}
                      completed={groupCompleted}
                      total={groupHabits.length}
                      onEdit={() => {
                        setEditingGroupId(group.id);
                        setEditGroupName(group.name);
                        setEditGroupEmoji(group.emoji || "");
                      }}
                      onDelete={() => handleDeleteGroup(group.id)}
                    />
                  )}

                  {/* Habit cards with DnD */}
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={(event) => handleDragEnd(group.id, event)}
                  >
                    <SortableContext
                      items={groupHabits.map((h) => h.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-2">
                        {groupHabits.map((habit) => {
                          const diagFlag = diagnosisFlags.find(
                            (d) => d.habitId === habit.id,
                          );
                          return (
                            <div key={habit.id} className="space-y-1">
                              <SortableHabitCard
                                habit={habit}
                                status={optimisticLogs[habit.id] || "pending"}
                                note={todayLogs[habit.id]?.note || null}
                                onToggle={() => handleToggle(habit.id)}
                                onSkip={() => handleSkipWithNote(habit.id)}
                                onArchive={() => handleArchive(habit.id)}
                                onEdit={handleEditHabit}
                                isKeystone={keystoneHabitIds.includes(habit.id)}
                                onOpenInterview={(id, name) => {
                                  setInterviewHabitId(id);
                                  setInterviewHabitName(name);
                                }}
                              />
                              {/* Diagnosis card */}
                              {diagFlag && (
                                <DiagnosisCard
                                  habit={habit}
                                  missCount={diagFlag.missCount}
                                  diagnosisId={diagFlag.diagnosisId}
                                  onDiagnose={handleDiagnosis}
                                  onDismiss={
                                    diagFlag.diagnosisId
                                      ? () =>
                                          handleDismissDiagnosis(
                                            diagFlag.diagnosisId!,
                                          )
                                      : undefined
                                  }
                                />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </SortableContext>
                  </DndContext>

                  {/* Add habit inline */}
                  <AnimatePresence>
                    {addingInGroup === group.id && (
                      <AddHabitForm
                        emoji={newHabitEmoji}
                        name={newHabitName}
                        schedule={newHabitSchedule}
                        days={newHabitDays}
                        isPending={isPending}
                        setEmoji={setNewHabitEmoji}
                        setName={setNewHabitName}
                        setSchedule={setNewHabitSchedule}
                        setDays={setNewHabitDays}
                        onSubmit={() => handleAddHabit(group.id)}
                        onCancel={() => {
                          setAddingInGroup(null);
                          setNewHabitName("");
                          setNewHabitEmoji("");
                          setNewHabitSchedule("daily");
                          setNewHabitDays([]);
                        }}
                      />
                    )}
                  </AnimatePresence>

                  {/* Add button row */}
                  {addingInGroup !== group.id && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => setAddingInGroup(group.id)}
                        className="flex-1 py-2 text-[10px] font-mono uppercase tracking-[0.25em] text-[#FFF8F0]/25 hover:text-[#FFF8F0]/50 transition-colors border border-dashed border-[#FFF8F0]/[0.06] rounded-xl hover:border-[#FFF8F0]/[0.15]"
                      >
                        + Add habit
                      </button>
                      {templates.length > 0 && (
                        <button
                          onClick={() => setShowTemplates(true)}
                          className="px-3 py-2 text-[10px] font-mono uppercase tracking-[0.15em] text-[#FEC89A]/40 hover:text-[#FEC89A]/70 transition-colors border border-dashed border-[#FEC89A]/[0.1] rounded-xl hover:border-[#FEC89A]/[0.25]"
                        >
                          Templates
                        </button>
                      )}
                    </div>
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
                  {ungroupedHabits.map((habit) => {
                    const diagFlag = diagnosisFlags.find(
                      (d) => d.habitId === habit.id,
                    );
                    return (
                      <div key={habit.id} className="space-y-1">
                        <HabitCard
                          habit={habit}
                          status={optimisticLogs[habit.id] || "pending"}
                          note={todayLogs[habit.id]?.note || null}
                          onToggle={() => handleToggle(habit.id)}
                          onSkip={() => handleSkipWithNote(habit.id)}
                          onArchive={() => handleArchive(habit.id)}
                          onEdit={handleEditHabit}
                          isKeystone={keystoneHabitIds.includes(habit.id)}
                          onOpenInterview={(id, name) => {
                            setInterviewHabitId(id);
                            setInterviewHabitName(name);
                          }}
                        />
                        {diagFlag && (
                          <DiagnosisCard
                            habit={habit}
                            missCount={diagFlag.missCount}
                            diagnosisId={diagFlag.diagnosisId}
                            onDiagnose={handleDiagnosis}
                            onDismiss={
                              diagFlag.diagnosisId
                                ? () =>
                                    handleDismissDiagnosis(
                                      diagFlag.diagnosisId!,
                                    )
                                : undefined
                            }
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Template Library Modal */}
      <AnimatePresence>
        {showTemplates && templates.length > 0 && (
          <TemplateModal
            templates={templates}
            groups={groups}
            onAdopt={handleAdoptTemplate}
            onClose={() => setShowTemplates(false)}
            isPending={isPending}
          />
        )}
      </AnimatePresence>

      {/* Add Group */}
      <AnimatePresence>
        {showAddGroup ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="glass-card rounded-3xl p-6 space-y-4">
              <h2 className="text-[11px] font-mono uppercase tracking-[0.25em] text-[#FEC89A]/80">
                New Group
              </h2>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Emoji"
                  value={newGroupEmoji}
                  onChange={(e) => setNewGroupEmoji(e.target.value)}
                  className="w-14 bg-[#FFF8F0]/[0.03] border border-[#FFF8F0]/[0.08] text-[#FFF8F0]/80 px-2 py-2.5 text-sm rounded-xl focus:outline-none focus:ring-1 focus:ring-[#FF6B6B]/30 text-center"
                  maxLength={2}
                />
                <input
                  type="text"
                  placeholder="Group name..."
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddGroup()}
                  className="flex-1 bg-[#FFF8F0]/[0.03] border border-[#FFF8F0]/[0.08] text-[#FFF8F0]/80 px-3 py-2.5 text-sm font-serif rounded-xl focus:outline-none focus:ring-1 focus:ring-[#FF6B6B]/30 placeholder:text-[#FFF8F0]/20"
                  autoFocus
                />
              </div>
              {/* Time of day selector */}
              <div className="flex gap-1">
                {TIME_OF_DAY_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setNewGroupTimeOfDay(opt.value)}
                    className={`flex-1 py-2 text-[10px] font-mono uppercase tracking-wider rounded-lg transition-colors ${
                      newGroupTimeOfDay === opt.value
                        ? "bg-[#FF6B6B] text-white"
                        : "bg-[#FFF8F0]/[0.04] text-[#FFF8F0]/40 hover:text-[#FFF8F0]/60"
                    }`}
                  >
                    {opt.emoji} {opt.label}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleAddGroup}
                  disabled={!newGroupName.trim() || isPending}
                  className="flex-1 py-2.5 text-[11px] font-mono uppercase tracking-widest bg-gradient-to-r from-[#FF6B6B] to-[#FEC89A] text-white rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  Create Group
                </button>
                <button
                  onClick={() => {
                    setShowAddGroup(false);
                    setNewGroupName("");
                    setNewGroupEmoji("");
                    setNewGroupTimeOfDay("anytime");
                  }}
                  className="px-4 py-2.5 text-[11px] font-mono uppercase tracking-widest text-[#FFF8F0]/40 hover:text-[#FFF8F0]/70 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        ) : (
          <button
            onClick={() => setShowAddGroup(true)}
            className="w-full py-3 text-[10px] font-mono uppercase tracking-[0.25em] text-[#FFF8F0]/20 hover:text-[#FFF8F0]/40 transition-colors border border-dashed border-[#FFF8F0]/[0.04] rounded-2xl hover:border-[#FFF8F0]/[0.1]"
          >
            + New group
          </button>
        )}
      </AnimatePresence>

      {/* Not Today section */}
      {notTodayHabits.length > 0 && (
        <div
          className="animate-slide-up"
          style={{ animationDelay: "0.16s", animationFillMode: "both" }}
        >
          <button
            onClick={() => setShowNotToday(!showNotToday)}
            className="w-full flex items-center justify-between py-3 text-[10px] font-mono uppercase tracking-[0.25em] text-[#FFF8F0]/25 hover:text-[#FFF8F0]/40 transition-colors"
          >
            <span>Not scheduled today ({notTodayHabits.length})</span>
            <span>{showNotToday ? "▾" : "▸"}</span>
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
                      note={null}
                      onToggle={() => handleToggle(habit.id)}
                      onSkip={() => handleSkipWithNote(habit.id)}
                      onArchive={() => handleArchive(habit.id)}
                      onEdit={handleEditHabit}
                      dimmed
                      isKeystone={false}
                      onOpenInterview={(id, name) => {
                        setInterviewHabitId(id);
                        setInterviewHabitName(name);
                      }}
                    />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Archived habits section */}
      {archivedHabits.length > 0 && (
        <div>
          <button
            onClick={() => setShowArchived(!showArchived)}
            className="w-full flex items-center justify-between py-3 text-[10px] font-mono uppercase tracking-[0.25em] text-[#FFF8F0]/20 hover:text-[#FFF8F0]/35 transition-colors"
          >
            <span>Archived ({archivedHabits.length})</span>
            <span>{showArchived ? "▾" : "▸"}</span>
          </button>
          <AnimatePresence>
            {showArchived && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="space-y-2">
                  {archivedHabits.map((habit) => (
                    <div
                      key={habit.id}
                      className="flex items-center justify-between px-4 py-3 rounded-2xl border border-[#FFF8F0]/[0.04] bg-[#FFF8F0]/[0.01] opacity-50"
                    >
                      <span className="text-sm font-serif text-[#FFF8F0]/40 truncate">
                        {habit.emoji && `${habit.emoji} `}
                        {habit.name}
                      </span>
                      <button
                        onClick={() => handleUnarchive(habit.id)}
                        className="text-[10px] font-mono uppercase tracking-wider text-[#34D399]/60 hover:text-[#34D399] transition-colors shrink-0 ml-3"
                      >
                        Restore
                      </button>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Celebration confetti */}
      <AnimatePresence>{showConfetti && <ConfettiBurst />}</AnimatePresence>

      {/* All-done celebration banner */}
      <AnimatePresence>
        {allDone && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10 }}
            className="glass-card rounded-3xl p-6 text-center border-[#34D399]/30"
          >
            <p className="text-2xl mb-1">🎉</p>
            <p className="text-base font-serif italic text-[#34D399]">
              All habits completed today!
            </p>
            {perfectDayCount > 0 && (
              <p className="text-[10px] font-mono text-[#34D399]/60 mt-1 tracking-wider uppercase">
                🌟 Perfect day #{perfectDayCount} this month
              </p>
            )}
            <p className="text-[10px] font-mono text-[#FFF8F0]/30 mt-1 tracking-wider uppercase">
              Keep the streak alive
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
            className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 bg-[#1a1a2e]/95 backdrop-blur border rounded-2xl shadow-xl ${
              toast.milestone
                ? "border-[#FFD93D]/30 shadow-[0_0_20px_rgba(255,217,61,0.15)]"
                : "border-[#FFF8F0]/[0.1]"
            }`}
          >
            <span
              className={`text-sm font-serif ${toast.milestone ? "text-[#FFD93D]" : "text-[#FFF8F0]/80"}`}
            >
              {toast.message}
            </span>
            {toast.habitId && toast.prevStatus && !toast.milestone && (
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
// Skip Note Modal
// ─────────────────────────────────────────

function SkipNoteModal({
  habitId,
  onSubmit,
  onCancel,
  noteText,
  setNoteText,
}: {
  habitId: string;
  onSubmit: (habitId: string, note: string | null) => void;
  onCancel: () => void;
  noteText: string;
  setNoteText: (text: string) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onCancel}
    >
      <motion.div
        initial={{ scale: 0.95, y: 10 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 10 }}
        className="glass-card rounded-3xl p-6 w-full max-w-sm space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-[11px] font-mono uppercase tracking-[0.25em] text-[#60A5FA]/80">
          Why are you skipping?
        </h3>
        <div className="flex flex-wrap gap-2">
          {SKIP_REASONS.map((reason) => (
            <button
              key={reason}
              onClick={() => setNoteText(reason)}
              className={`px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider rounded-lg transition-colors ${
                noteText === reason
                  ? "bg-[#60A5FA]/20 text-[#60A5FA] border border-[#60A5FA]/30"
                  : "bg-[#FFF8F0]/[0.04] text-[#FFF8F0]/40 hover:text-[#FFF8F0]/60 border border-transparent"
              }`}
            >
              {reason}
            </button>
          ))}
        </div>
        <input
          type="text"
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
          placeholder="Or type a reason..."
          className="w-full bg-[#FFF8F0]/[0.03] border border-[#FFF8F0]/[0.08] text-[#FFF8F0]/80 px-3 py-2.5 text-sm font-serif rounded-xl focus:outline-none focus:ring-1 focus:ring-[#60A5FA]/30 placeholder:text-[#FFF8F0]/20"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter") onSubmit(habitId, noteText || null);
          }}
        />
        <div className="flex gap-2">
          <button
            onClick={() => onSubmit(habitId, noteText || null)}
            className="flex-1 py-2.5 text-[11px] font-mono uppercase tracking-widest bg-[#60A5FA]/20 text-[#60A5FA] border border-[#60A5FA]/30 rounded-xl hover:bg-[#60A5FA]/30 transition-colors"
          >
            {noteText ? "Skip with note" : "Skip"}
          </button>
          <button
            onClick={onCancel}
            className="px-4 py-2.5 text-[11px] font-mono uppercase tracking-widest text-[#FFF8F0]/40 hover:text-[#FFF8F0]/70 transition-colors"
          >
            Cancel
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─────────────────────────────────────────
// Group Header (non-editing state)
// ─────────────────────────────────────────

function GroupHeader({
  group,
  completed,
  total,
  onEdit,
  onDelete,
}: {
  group: HabitGroup;
  completed: number;
  total: number;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="space-y-1 cursor-pointer group" onClick={onEdit}>
        <h2 className="text-base font-serif italic text-[#FEC89A] group-hover:text-[#FEC89A]/80 transition-colors">
          {group.emoji && `${group.emoji} `}
          {group.name}
          <span className="text-[8px] font-mono text-[#FFF8F0]/0 group-hover:text-[#FFF8F0]/20 transition-colors ml-2">
            edit
          </span>
        </h2>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-[10px] font-mono text-[#FFF8F0]/30 tracking-wider">
          {completed}/{total}
        </span>
        <button
          onClick={onDelete}
          className="text-[#FFF8F0]/10 hover:text-[#FF6B6B]/50 transition-colors text-xs"
          title="Delete group"
        >
          ×
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// Group Edit Form
// ─────────────────────────────────────────

function GroupEditForm({
  emoji,
  name,
  setEmoji,
  setName,
  onSave,
  onCancel,
}: {
  emoji: string;
  name: string;
  setEmoji: (v: string) => void;
  setName: (v: string) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="text"
        value={emoji}
        onChange={(e) => setEmoji(e.target.value)}
        placeholder="📌"
        className="w-10 bg-[#FFF8F0]/[0.03] border border-[#FFF8F0]/[0.08] text-[#FFF8F0]/80 px-1.5 py-1.5 text-sm rounded-lg focus:outline-none focus:ring-1 focus:ring-[#FF6B6B]/30 text-center"
        maxLength={2}
      />
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && onSave()}
        className="flex-1 bg-[#FFF8F0]/[0.03] border border-[#FFF8F0]/[0.08] text-[#FFF8F0]/80 px-3 py-1.5 text-sm font-serif rounded-lg focus:outline-none focus:ring-1 focus:ring-[#FF6B6B]/30"
        autoFocus
      />
      <button
        onClick={onSave}
        className="text-[10px] font-mono uppercase tracking-wider text-[#34D399] hover:text-[#34D399]/80 px-2"
      >
        Save
      </button>
      <button
        onClick={onCancel}
        className="text-[10px] font-mono uppercase tracking-wider text-[#FFF8F0]/30 hover:text-[#FFF8F0]/50 px-2"
      >
        Cancel
      </button>
    </div>
  );
}

// ─────────────────────────────────────────
// Add Habit Form
// ─────────────────────────────────────────

function AddHabitForm({
  emoji,
  name,
  schedule,
  days,
  isPending,
  setEmoji,
  setName,
  setSchedule,
  setDays,
  onSubmit,
  onCancel,
}: {
  emoji: string;
  name: string;
  schedule: ScheduleType;
  days: number[];
  isPending: boolean;
  setEmoji: (v: string) => void;
  setName: (v: string) => void;
  setSchedule: (v: ScheduleType) => void;
  setDays: (v: number[] | ((prev: number[]) => number[])) => void;
  onSubmit: () => void;
  onCancel: () => void;
}) {
  return (
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
            value={emoji}
            onChange={(e) => setEmoji(e.target.value)}
            className="w-14 bg-[#FFF8F0]/[0.03] border border-[#FFF8F0]/[0.08] text-[#FFF8F0]/80 px-2 py-2.5 text-sm rounded-xl focus:outline-none focus:ring-1 focus:ring-[#FF6B6B]/30 text-center"
            maxLength={2}
          />
          <input
            type="text"
            placeholder="Habit name..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onSubmit()}
            className="flex-1 bg-[#FFF8F0]/[0.03] border border-[#FFF8F0]/[0.08] text-[#FFF8F0]/80 px-3 py-2.5 text-sm font-serif rounded-xl focus:outline-none focus:ring-1 focus:ring-[#FF6B6B]/30 placeholder:text-[#FFF8F0]/20"
            autoFocus
          />
        </div>
        <div className="flex gap-1">
          {SCHEDULE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setSchedule(opt.value)}
              className={`flex-1 py-2 text-[10px] font-mono uppercase tracking-wider rounded-lg transition-colors ${
                schedule === opt.value
                  ? "bg-[#FF6B6B] text-white"
                  : "bg-[#FFF8F0]/[0.04] text-[#FFF8F0]/40 hover:text-[#FFF8F0]/60"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <AnimatePresence>
          {schedule === "custom" && (
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
                    onClick={() =>
                      setDays((prev: number[]) =>
                        prev.includes(i)
                          ? prev.filter((d: number) => d !== i)
                          : [...prev, i],
                      )
                    }
                    className={`w-9 h-9 rounded-full text-xs font-mono transition-colors ${
                      days.includes(i)
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
            onClick={onSubmit}
            disabled={!name.trim() || isPending}
            className="flex-1 py-2.5 text-[11px] font-mono uppercase tracking-widest bg-gradient-to-r from-[#FF6B6B] to-[#FEC89A] text-white rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            Add Habit
          </button>
          <button
            onClick={onCancel}
            className="px-4 py-2.5 text-[11px] font-mono uppercase tracking-widest text-[#FFF8F0]/40 hover:text-[#FFF8F0]/70 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────
// Sortable Habit Card (DnD wrapper)
// ─────────────────────────────────────────

function SortableHabitCard(props: {
  habit: Habit;
  status: HabitLogStatus;
  note: string | null;
  onToggle: () => void;
  onSkip: () => void;
  onArchive: () => void;
  onEdit: (id: string, fields: Record<string, unknown>) => void;
  isKeystone: boolean;
  onOpenInterview: (id: string, name: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: props.habit.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className="relative [&:has([data-menu-open])]:z-50"
    >
      <HabitCard {...props} dragHandleProps={{ ...attributes, ...listeners }} />
    </div>
  );
}

// ─────────────────────────────────────────
// Individual Habit Card — Enhanced with purpose, anchor, tiny version
// ─────────────────────────────────────────

function HabitCard({
  habit,
  status,
  note,
  onToggle,
  onSkip,
  onArchive,
  onEdit,
  dimmed,
  dragHandleProps,
  isKeystone,
  onOpenInterview,
}: {
  habit: Habit;
  status: HabitLogStatus;
  note: string | null;
  onToggle: () => void;
  onSkip: () => void;
  onArchive: () => void;
  onEdit: (id: string, fields: Record<string, unknown>) => void;
  dimmed?: boolean;
  dragHandleProps?: Record<string, unknown>;
  isKeystone: boolean;
  onOpenInterview: (id: string, name: string) => void;
}) {
  const isCompleted = status === "completed";
  const isSkipped = status === "skipped";
  const [showActions, setShowActions] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(habit.name);
  const [editEmoji, setEditEmoji] = useState(habit.emoji || "");
  const [editSchedule, setEditSchedule] = useState<ScheduleType>(
    habit.scheduleType as ScheduleType,
  );
  const [editDays, setEditDays] = useState<number[]>(habit.scheduleDays || []);
  const [showPurpose, setShowPurpose] = useState(false);

  // Type-safe access to advanced fields
  const purpose = (habit as Record<string, unknown>).purpose as string | null;
  const identity = (habit as Record<string, unknown>).identity as string | null;
  const tinyVersion = (habit as Record<string, unknown>).tinyVersion as
    | string
    | null;
  const anchorText = (habit as Record<string, unknown>).anchorText as
    | string
    | null;

  function handleSaveEdit() {
    const scheduleDays =
      editSchedule === "weekdays"
        ? [1, 2, 3, 4, 5]
        : editSchedule === "weekends"
          ? [0, 6]
          : editSchedule === "custom"
            ? editDays
            : [];

    onEdit(habit.id, {
      name: editName.trim() || habit.name,
      emoji: editEmoji || null,
      scheduleType: editSchedule,
      scheduleDays,
    });
    setEditing(false);
  }

  if (editing) {
    return (
      <motion.div
        layout
        className="px-4 py-3 rounded-2xl border border-[#FFF8F0]/[0.15] bg-[#FFF8F0]/[0.03] space-y-3"
      >
        <div className="flex gap-2">
          <input
            type="text"
            value={editEmoji}
            onChange={(e) => setEditEmoji(e.target.value)}
            placeholder="Emoji"
            className="w-12 bg-[#FFF8F0]/[0.03] border border-[#FFF8F0]/[0.08] text-[#FFF8F0]/80 px-1.5 py-2 text-sm rounded-lg focus:outline-none focus:ring-1 focus:ring-[#FF6B6B]/30 text-center"
            maxLength={2}
          />
          <input
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSaveEdit()}
            className="flex-1 bg-[#FFF8F0]/[0.03] border border-[#FFF8F0]/[0.08] text-[#FFF8F0]/80 px-3 py-2 text-sm font-serif rounded-lg focus:outline-none focus:ring-1 focus:ring-[#FF6B6B]/30"
            autoFocus
          />
        </div>
        <div className="flex gap-1">
          {SCHEDULE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setEditSchedule(opt.value)}
              className={`flex-1 py-1.5 text-[9px] font-mono uppercase tracking-wider rounded-lg transition-colors ${
                editSchedule === opt.value
                  ? "bg-[#FF6B6B] text-white"
                  : "bg-[#FFF8F0]/[0.04] text-[#FFF8F0]/40 hover:text-[#FFF8F0]/60"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <AnimatePresence>
          {editSchedule === "custom" && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="flex gap-1.5 justify-center">
                {DAY_LABELS.map((label, i) => (
                  <button
                    key={i}
                    onClick={() =>
                      setEditDays((prev) =>
                        prev.includes(i)
                          ? prev.filter((d) => d !== i)
                          : [...prev, i],
                      )
                    }
                    className={`w-8 h-8 rounded-full text-[10px] font-mono transition-colors ${
                      editDays.includes(i)
                        ? "bg-[#FF6B6B] text-white"
                        : "border border-[#FFF8F0]/[0.1] text-[#FFF8F0]/40"
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
            onClick={handleSaveEdit}
            className="flex-1 py-2 text-[10px] font-mono uppercase tracking-widest bg-gradient-to-r from-[#FF6B6B] to-[#FEC89A] text-white rounded-xl hover:opacity-90"
          >
            Save
          </button>
          <button
            onClick={() => {
              setEditing(false);
              setEditName(habit.name);
              setEditEmoji(habit.emoji || "");
              setEditSchedule(habit.scheduleType as ScheduleType);
              setEditDays(habit.scheduleDays || []);
            }}
            className="px-4 py-2 text-[10px] font-mono uppercase tracking-widest text-[#FFF8F0]/40 hover:text-[#FFF8F0]/70"
          >
            Cancel
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      layout
      whileTap={{ scale: 0.98 }}
      animate={isCompleted ? { scale: [1, 1.02, 1] } : {}}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className={`relative flex items-start gap-3 px-4 py-3.5 rounded-2xl border cursor-pointer transition-all select-none ${
        isCompleted
          ? "border-[#34D399]/40 bg-[#34D399]/5 shadow-[inset_4px_0_0_#34D399]"
          : isSkipped
            ? "border-[#60A5FA]/30 bg-[#60A5FA]/5 shadow-[inset_4px_0_0_#60A5FA]"
            : dimmed
              ? "border-[#FFF8F0]/[0.04] bg-[#FFF8F0]/[0.01]"
              : "border-[#FFF8F0]/[0.08] hover:border-[#FFF8F0]/[0.15] bg-[#FFF8F0]/[0.02]"
      }`}
    >
      {/* Drag handle */}
      {dragHandleProps && (
        <div
          {...dragHandleProps}
          className="text-[#FFF8F0]/15 hover:text-[#FFF8F0]/40 transition-colors cursor-grab active:cursor-grabbing shrink-0 touch-none mt-1"
          onClick={(e) => e.stopPropagation()}
        >
          <svg width="12" height="16" viewBox="0 0 12 16" fill="currentColor">
            <circle cx="3" cy="2" r="1.5" />
            <circle cx="9" cy="2" r="1.5" />
            <circle cx="3" cy="8" r="1.5" />
            <circle cx="9" cy="8" r="1.5" />
            <circle cx="3" cy="14" r="1.5" />
            <circle cx="9" cy="14" r="1.5" />
          </svg>
        </div>
      )}

      {/* Checkbox indicator */}
      <div
        onClick={onToggle}
        className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all shrink-0 mt-0.5 ${
          isCompleted
            ? "border-[#34D399] bg-[#34D399]"
            : isSkipped
              ? "border-[#60A5FA] bg-[#60A5FA]/30"
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
          {isSkipped && (
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
            >
              <path d="M3 6h6" />
            </motion.svg>
          )}
        </AnimatePresence>
      </div>

      {/* Habit info */}
      <div className="flex-1 min-w-0" onClick={onToggle}>
        <div className="flex items-center gap-1.5">
          <span
            className={`text-sm font-serif block truncate ${
              isCompleted
                ? "text-[#34D399] line-through decoration-[#34D399]/30"
                : isSkipped
                  ? "text-[#60A5FA]/60 line-through decoration-[#60A5FA]/20"
                  : "text-[#FFF8F0]/80"
            }`}
          >
            {habit.emoji && `${habit.emoji} `}
            {habit.name}
          </span>
          {isKeystone && (
            <span
              className="text-[10px] shrink-0"
              title="Keystone habit — when you do this, everything else follows"
            >
              ⭐
            </span>
          )}
        </div>

        {/* Purpose display */}
        {purpose && !isCompleted && !isSkipped && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowPurpose(!showPurpose);
            }}
            className="text-[9px] font-serif italic text-[#FFF8F0]/25 hover:text-[#FFF8F0]/40 transition-colors truncate block max-w-full text-left"
          >
            {showPurpose ? purpose : "why?"}
          </button>
        )}

        {/* Identity tooltip on purpose expand */}
        <AnimatePresence>
          {showPurpose && identity && (
            <motion.p
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="text-[9px] font-mono text-[#FEC89A]/40 mt-0.5"
            >
              {identity}
            </motion.p>
          )}
        </AnimatePresence>

        {/* Anchor text */}
        {anchorText && !isCompleted && !isSkipped && !showPurpose && (
          <span className="text-[9px] font-mono text-[#FFF8F0]/15 block truncate">
            {anchorText}
          </span>
        )}

        {/* Skip note */}
        {isSkipped && (
          <span className="text-[9px] font-mono text-[#60A5FA]/40 uppercase tracking-wider">
            Skipped{note ? ` — ${note}` : ""}
          </span>
        )}
        {!isSkipped && note && (
          <span className="text-[9px] font-mono text-[#FFF8F0]/20 italic block truncate">
            {note}
          </span>
        )}

        {/* Tiny version prompt */}
        {tinyVersion && !isCompleted && !isSkipped && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
            }}
            className="mt-1 px-2 py-0.5 text-[8px] font-mono uppercase tracking-wider text-[#34D399]/50 bg-[#34D399]/[0.06] rounded-md hover:bg-[#34D399]/[0.12] transition-colors"
          >
            Just 2 min: {tinyVersion}
          </button>
        )}
      </div>

      {/* Streak badge */}
      {habit.currentStreak >= 2 && (
        <div
          className="flex flex-col items-end shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <span className="text-[11px] font-mono text-[#FF6B6B]/80 font-semibold">
            🔥{habit.currentStreak}
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
        className="text-[#FFF8F0]/20 hover:text-[#FFF8F0]/50 transition-colors shrink-0 px-1 mt-0.5"
      >
        ⋯
      </button>

      {/* Context actions dropdown */}
      <AnimatePresence>
        {showActions && (
          <motion.div
            data-menu-open
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute right-2 top-full mt-1 z-20 bg-[#1a1a2e] border border-[#FFF8F0]/[0.1] rounded-xl shadow-xl py-1 min-w-[160px]"
            onClick={(e) => e.stopPropagation()}
          >
            {!isSkipped && (
              <button
                onClick={() => {
                  onSkip();
                  setShowActions(false);
                }}
                className="w-full px-4 py-2 text-left text-xs font-mono text-[#60A5FA]/70 hover:bg-[#60A5FA]/10 transition-colors"
              >
                Skip today
              </button>
            )}
            <button
              onClick={() => {
                setEditing(true);
                setShowActions(false);
              }}
              className="w-full px-4 py-2 text-left text-xs font-mono text-[#FFF8F0]/50 hover:bg-[#FFF8F0]/[0.05] transition-colors"
            >
              Edit habit
            </button>
            {!purpose && (
              <button
                onClick={() => {
                  onOpenInterview(habit.id, habit.name);
                  setShowActions(false);
                }}
                className="w-full px-4 py-2 text-left text-xs font-mono text-[#FEC89A]/70 hover:bg-[#FEC89A]/10 transition-colors"
              >
                Build your why
              </button>
            )}
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
// Diagnosis Card (B=MAP inline)
// ─────────────────────────────────────────

function DiagnosisCard({
  habit,
  missCount,
  diagnosisId,
  onDiagnose,
  onDismiss,
}: {
  habit: Habit;
  missCount: number;
  diagnosisId?: string;
  onDiagnose: (habitId: string, diagnosis: DiagnosisType) => void;
  onDismiss?: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      className="overflow-hidden"
    >
      <div className="ml-8 px-4 py-3 rounded-xl bg-[#FF6B6B]/[0.05] border border-[#FF6B6B]/[0.15] space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[9px] font-mono uppercase tracking-wider text-[#FF6B6B]/60">
            Missed {missCount}/7 days — what&apos;s happening?
          </span>
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="text-[#FFF8F0]/20 hover:text-[#FFF8F0]/40 text-xs"
            >
              ×
            </button>
          )}
        </div>
        <div className="flex gap-1.5 flex-wrap">
          <button
            onClick={() => onDiagnose(habit.id, "forgot")}
            className="px-3 py-1.5 text-[9px] font-mono uppercase tracking-wider rounded-lg bg-[#FFF8F0]/[0.04] text-[#FFF8F0]/40 hover:text-[#FFF8F0]/60 hover:bg-[#FFF8F0]/[0.08] transition-colors border border-transparent hover:border-[#FFF8F0]/[0.1]"
          >
            I keep forgetting
          </button>
          <button
            onClick={() => onDiagnose(habit.id, "too_hard")}
            className="px-3 py-1.5 text-[9px] font-mono uppercase tracking-wider rounded-lg bg-[#FFF8F0]/[0.04] text-[#FFF8F0]/40 hover:text-[#FFF8F0]/60 hover:bg-[#FFF8F0]/[0.08] transition-colors border border-transparent hover:border-[#FFF8F0]/[0.1]"
          >
            It&apos;s too hard
          </button>
          <button
            onClick={() => onDiagnose(habit.id, "no_motivation")}
            className="px-3 py-1.5 text-[9px] font-mono uppercase tracking-wider rounded-lg bg-[#FFF8F0]/[0.04] text-[#FFF8F0]/40 hover:text-[#FFF8F0]/60 hover:bg-[#FFF8F0]/[0.08] transition-colors border border-transparent hover:border-[#FFF8F0]/[0.1]"
          >
            Don&apos;t want to
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────
// Template Library (full page or modal)
// ─────────────────────────────────────────

function TemplateLibrary({
  templates,
  groups,
  onAdopt,
  isPending,
  fullPage,
}: {
  templates: HabitTemplate[];
  groups: HabitGroup[];
  onAdopt: (templateId: string, groupId: string | null) => void;
  isPending: boolean;
  fullPage?: boolean;
}) {
  const defaultGroupId = groups.length > 0 ? groups[0].id : null;

  return (
    <div className={`space-y-6 ${fullPage ? "" : ""}`}>
      {fullPage && (
        <div className="text-center space-y-2 mb-6">
          <p className="text-3xl">🌱</p>
          <h2 className="text-xl font-serif italic text-[#FFF8F0]/80">
            Start building your routine
          </h2>
          <p className="text-xs font-mono text-[#FFF8F0]/30">
            Choose habits that matter to you — you can customize everything
            later
          </p>
        </div>
      )}
      {TEMPLATE_CATEGORIES.map((category) => {
        const catTemplates = templates.filter((t) => t.category === category);
        if (catTemplates.length === 0) return null;
        return (
          <div key={category} className="space-y-2">
            <h3 className="text-[10px] font-mono uppercase tracking-[0.25em] text-[#FEC89A]/50">
              {category}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {catTemplates.map((t) => (
                <button
                  key={t.id}
                  onClick={() => onAdopt(t.id, defaultGroupId)}
                  disabled={isPending}
                  className="flex items-start gap-3 px-4 py-3 rounded-2xl border border-[#FFF8F0]/[0.06] bg-[#FFF8F0]/[0.02] hover:border-[#FFF8F0]/[0.15] hover:bg-[#FFF8F0]/[0.04] transition-all text-left group disabled:opacity-50"
                >
                  <span className="text-lg shrink-0">{t.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-serif text-[#FFF8F0]/70 block">
                      {t.name}
                    </span>
                    {t.purpose && (
                      <span className="text-[9px] font-mono text-[#FFF8F0]/25 block truncate mt-0.5">
                        {t.purpose}
                      </span>
                    )}
                  </div>
                  <span className="text-[9px] font-mono text-[#34D399]/0 group-hover:text-[#34D399]/60 transition-colors shrink-0 mt-1">
                    + Add
                  </span>
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TemplateModal({
  templates,
  groups,
  onAdopt,
  onClose,
  isPending,
}: {
  templates: HabitTemplate[];
  groups: HabitGroup[];
  onAdopt: (templateId: string, groupId: string | null) => void;
  onClose: () => void;
  isPending: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 10 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 10 }}
        className="bg-[#0d0d1a] border border-[#FFF8F0]/[0.1] rounded-3xl p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-[11px] font-mono uppercase tracking-[0.25em] text-[#FEC89A]/80">
            Habit Templates
          </h2>
          <button
            onClick={onClose}
            className="text-[#FFF8F0]/20 hover:text-[#FFF8F0]/50 text-lg"
          >
            ×
          </button>
        </div>
        <TemplateLibrary
          templates={templates}
          groups={groups}
          onAdopt={onAdopt}
          isPending={isPending}
        />
      </motion.div>
    </motion.div>
  );
}

// ─────────────────────────────────────────
// Confetti Burst (celebration particles)
// ─────────────────────────────────────────

const CONFETTI_COLORS = [
  "#FF6B6B",
  "#FEC89A",
  "#34D399",
  "#FFD93D",
  "#E2B0FF",
  "#38BDF8",
  "#A78BFA",
];

function ConfettiBurst() {
  const particles = Array.from({ length: 40 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
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
          initial={{ x: `${p.x}vw`, y: "-5vh", rotate: 0, opacity: 1 }}
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
