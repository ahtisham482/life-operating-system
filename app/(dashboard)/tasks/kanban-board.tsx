"use client";

import {
  useState,
  useCallback,
  useMemo,
  useEffect,
  useRef,
  type KeyboardEvent,
} from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { Plus } from "lucide-react";
import type { Task } from "@/lib/db/schema";
import { createTask, reorderTasks } from "./actions";
import { TaskCard, TaskCardOverlay } from "./task-card";
import { TaskDetailPanel } from "./task-detail";

// ─── Constants ───────────────────────────────────────
const STATUSES = ["To Do", "In Progress", "Done"] as const;
type Status = (typeof STATUSES)[number];

const COLUMN_META: Record<Status, { label: string; accent: boolean }> = {
  "To Do": { label: "To Do", accent: false },
  "In Progress": { label: "In Progress", accent: true },
  Done: { label: "Done", accent: false },
};

// ─── KanbanBoard ─────────────────────────────────────
export function KanbanBoard({ initialTasks }: { initialTasks: Task[] }) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  const [detailTask, setDetailTask] = useState<Task | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    task: Task;
  } | null>(null);

  // Sync with server data on revalidation
  useEffect(() => {
    setTasks(initialTasks);
  }, [initialTasks]);

  // Close context menu on any click
  useEffect(() => {
    if (!contextMenu) return;
    const close = () => setContextMenu(null);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [contextMenu]);

  // DnD sensors — 8px activation distance prevents accidental drags
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  // Group tasks by status, sorted by sortOrder
  const tasksByStatus = useMemo(() => {
    const map: Record<Status, Task[]> = {
      "To Do": [],
      "In Progress": [],
      Done: [],
    };
    for (const task of tasks) {
      const s = task.status as Status;
      if (map[s]) map[s].push(task);
    }
    for (const key of STATUSES) {
      map[key].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    }
    return map;
  }, [tasks]);

  // Find which column a task/container belongs to
  const findContainer = useCallback(
    (id: UniqueIdentifier): Status | undefined => {
      if (STATUSES.includes(id as Status)) return id as Status;
      const task = tasks.find((t) => t.id === id);
      return task ? (task.status as Status) : undefined;
    },
    [tasks]
  );

  // Active task for DragOverlay
  const activeTask = useMemo(
    () => tasks.find((t) => t.id === activeId),
    [tasks, activeId]
  );

  // ─── DnD Handlers ──────────────────────────────────
  function onDragStart(event: DragStartEvent) {
    setActiveId(event.active.id);
    setContextMenu(null);
  }

  function onDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;

    const activeContainer = findContainer(active.id);
    const overContainer = findContainer(over.id);

    if (
      !activeContainer ||
      !overContainer ||
      activeContainer === overContainer
    )
      return;

    // Cross-column: move task to new column optimistically
    setTasks((prev) =>
      prev.map((t) =>
        t.id === active.id
          ? { ...t, status: overContainer as Task["status"] }
          : t
      )
    );
  }

  async function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeContainer = findContainer(active.id);
    const overContainer = findContainer(over.id);
    if (!activeContainer || !overContainer) return;

    const task = tasks.find((t) => t.id === active.id);
    if (!task) return;

    if (activeContainer === overContainer) {
      // Same column: reorder
      const items = tasksByStatus[overContainer];
      const oldIndex = items.findIndex((t) => t.id === active.id);
      const newIndex = items.findIndex((t) => t.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        const reordered = arrayMove(items, oldIndex, newIndex);
        const updates = reordered.map((t, i) => ({
          id: t.id,
          sortOrder: i,
          status: overContainer,
        }));

        // Optimistic
        setTasks((prev) => {
          const result = [...prev];
          for (const u of updates) {
            const idx = result.findIndex((t) => t.id === u.id);
            if (idx >= 0)
              result[idx] = { ...result[idx], sortOrder: u.sortOrder };
          }
          return result;
        });

        try {
          await reorderTasks(updates);
        } catch {
          setTasks(initialTasks);
        }
      }
    } else {
      // Cross-column: finalize the move
      const targetTasks = tasks
        .filter((t) => t.status === overContainer && t.id !== active.id)
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

      let insertAt = targetTasks.length;
      if (over.id !== overContainer) {
        const idx = targetTasks.findIndex((t) => t.id === over.id);
        if (idx >= 0) insertAt = idx;
      }

      const newColumn = [...targetTasks];
      newColumn.splice(insertAt, 0, {
        ...task,
        status: overContainer as Task["status"],
      });

      const updates = newColumn.map((t, i) => ({
        id: t.id,
        sortOrder: i,
        status: overContainer,
      }));

      // Optimistic
      setTasks((prev) =>
        prev.map((t) => {
          const u = updates.find((u) => u.id === t.id);
          if (u)
            return {
              ...t,
              status: u.status as Task["status"],
              sortOrder: u.sortOrder,
            };
          return t;
        })
      );

      try {
        await reorderTasks(updates);
      } catch {
        setTasks(initialTasks);
      }
    }
  }

  // ─── Task Mutation Callbacks ────────────────────────
  const handleTaskUpdate = useCallback(
    (updatedTask: Task) => {
      setTasks((prev) =>
        prev.map((t) => (t.id === updatedTask.id ? updatedTask : t))
      );
      // If detail panel is open for this task, update it too
      if (detailTask?.id === updatedTask.id) {
        setDetailTask(updatedTask);
      }
    },
    [detailTask]
  );

  const handleTaskDelete = useCallback(
    (id: string) => {
      setTasks((prev) => prev.filter((t) => t.id !== id));
      if (detailTask?.id === id) setDetailTask(null);
      setContextMenu(null);
    },
    [detailTask]
  );

  const handleContextMenu = useCallback(
    (e: React.MouseEvent, task: Task) => {
      e.preventDefault();
      setContextMenu({ x: e.clientX, y: e.clientY, task });
    },
    []
  );

  const handleMoveToColumn = useCallback(
    async (task: Task, newStatus: Status) => {
      setContextMenu(null);

      // Optimistic
      setTasks((prev) =>
        prev.map((t) =>
          t.id === task.id
            ? { ...t, status: newStatus as Task["status"] }
            : t
        )
      );

      try {
        const targetTasks = tasks
          .filter((t) => t.status === newStatus && t.id !== task.id)
          .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

        const updates = [
          ...targetTasks.map((t, i) => ({
            id: t.id,
            sortOrder: i,
            status: newStatus,
          })),
          {
            id: task.id,
            sortOrder: targetTasks.length,
            status: newStatus,
          },
        ];
        await reorderTasks(updates);
      } catch {
        setTasks(initialTasks);
      }
    },
    [tasks, initialTasks]
  );

  // ─── Render ─────────────────────────────────────────
  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
      >
        {tasks.length === 0 ? (
          <div className="py-16 text-center glass-card rounded-2xl">
            <p className="text-[11px] font-mono text-white/25 tracking-widest uppercase mb-4">
              No tasks yet
            </p>
            <p className="text-[10px] text-white/15">
              Click &ldquo;New Task&rdquo; or type in a column below to get
              started.
            </p>
          </div>
        ) : null}

        <div
          className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-slide-up"
          style={{ animationDelay: "0.1s", animationFillMode: "both" }}
        >
          {STATUSES.map((status) => (
            <KanbanColumn
              key={status}
              status={status}
              tasks={tasksByStatus[status]}
              onContextMenu={handleContextMenu}
              onCardClick={setDetailTask}
              onTaskUpdate={handleTaskUpdate}
              onTaskDelete={handleTaskDelete}
            />
          ))}
        </div>

        {/* Drag overlay — shows floating card during drag */}
        <DragOverlay dropAnimation={null}>
          {activeTask ? <TaskCardOverlay task={activeTask} /> : null}
        </DragOverlay>
      </DndContext>

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenuPopover
          x={contextMenu.x}
          y={contextMenu.y}
          task={contextMenu.task}
          onClose={() => setContextMenu(null)}
          onMoveToColumn={handleMoveToColumn}
          onEdit={() => {
            setDetailTask(contextMenu.task);
            setContextMenu(null);
          }}
          onDelete={() => handleTaskDelete(contextMenu.task.id)}
        />
      )}

      {/* Task Detail Slide-over */}
      {detailTask && (
        <TaskDetailPanel
          task={detailTask}
          onClose={() => setDetailTask(null)}
          onUpdate={handleTaskUpdate}
          onDelete={handleTaskDelete}
        />
      )}
    </>
  );
}

// ─── KanbanColumn ────────────────────────────────────
function KanbanColumn({
  status,
  tasks,
  onContextMenu,
  onCardClick,
  onTaskUpdate,
  onTaskDelete,
}: {
  status: Status;
  tasks: Task[];
  onContextMenu: (e: React.MouseEvent, task: Task) => void;
  onCardClick: (task: Task) => void;
  onTaskUpdate: (task: Task) => void;
  onTaskDelete: (id: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const meta = COLUMN_META[status];

  const [adding, setAdding] = useState(false);
  const [addText, setAddText] = useState("");
  const [addPending, setAddPending] = useState(false);
  const addInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (adding) addInputRef.current?.focus();
  }, [adding]);

  async function handleInlineAdd(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      setAdding(false);
      setAddText("");
      return;
    }
    if (e.key !== "Enter") return;
    const name = addText.trim();
    if (!name) return;

    setAddPending(true);
    try {
      await createTask({
        taskName: name,
        status,
        priority: "🟡 Medium",
        type: "✅ Task",
        lifeArea: null,
        dueDate: null,
        notes: null,
        recurring: false,
        frequency: null,
        repeatEveryDays: null,
      });
      setAddText("");
      // Keep inline add open for rapid entry
    } catch {
      // Keep text so user can retry
    } finally {
      setAddPending(false);
      addInputRef.current?.focus();
    }
  }

  return (
    <div className="flex flex-col">
      <div
        ref={setNodeRef}
        className={`glass-card rounded-2xl flex flex-col min-h-[300px] transition-all duration-200 ${
          meta.accent ? "border-t-2 border-t-[#C49E45]/60" : ""
        } ${isOver ? "ring-1 ring-[#C49E45]/30 bg-[#C49E45]/[0.03]" : ""}`}
      >
        {/* Column header */}
        <div className="px-5 py-4 border-b border-white/[0.04] flex items-center justify-between">
          <h3 className="text-sm font-serif text-white/80 tracking-wide">
            {meta.label}
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono bg-white/[0.06] text-white/40 px-2 py-0.5 rounded-full min-w-[24px] text-center">
              {tasks.length}
            </span>
            <button
              onClick={() => setAdding(true)}
              className="w-5 h-5 flex items-center justify-center rounded text-white/20 hover:text-[#C49E45] hover:bg-[#C49E45]/10 transition-all"
              title={`Add task to ${meta.label}`}
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Task cards */}
        <SortableContext
          items={tasks.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="p-3 flex-1 space-y-2 overflow-y-auto">
            {tasks.length === 0 && !adding ? (
              <button
                onClick={() => setAdding(true)}
                className="flex flex-col items-center justify-center h-full min-h-[100px] w-full rounded-xl border border-dashed border-white/[0.06] hover:border-[#C49E45]/20 transition-colors group cursor-pointer"
              >
                <Plus className="w-4 h-4 text-white/10 group-hover:text-[#C49E45]/40 mb-1 transition-colors" />
                <p className="text-[10px] font-mono text-white/15 group-hover:text-white/30 tracking-widest uppercase transition-colors">
                  Add a task
                </p>
              </button>
            ) : (
              tasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onContextMenu={onContextMenu}
                  onCardClick={onCardClick}
                  onTaskUpdate={onTaskUpdate}
                  onTaskDelete={onTaskDelete}
                />
              ))
            )}
          </div>
        </SortableContext>

        {/* Inline Add */}
        {adding && (
          <div className="px-3 pb-3">
            <div className="glass-card rounded-lg">
              <input
                ref={addInputRef}
                type="text"
                value={addText}
                onChange={(e) => setAddText(e.target.value)}
                onKeyDown={handleInlineAdd}
                onBlur={() => {
                  if (!addText.trim()) {
                    setAdding(false);
                    setAddText("");
                  }
                }}
                placeholder="Task name — Enter to save, Esc to cancel"
                disabled={addPending}
                className="w-full h-10 px-3 bg-transparent text-sm font-serif text-white/90 placeholder:text-white/25 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#C49E45]/30 disabled:opacity-40"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Context Menu Popover ────────────────────────────
const PRIORITIES = [
  { value: "🔴 High", label: "High", dot: "bg-red-500" },
  { value: "🟡 Medium", label: "Medium", dot: "bg-yellow-500" },
  { value: "🟢 Low", label: "Low", dot: "bg-emerald-500" },
];

function ContextMenuPopover({
  x,
  y,
  task,
  onClose,
  onMoveToColumn,
  onEdit,
  onDelete,
}: {
  x: number;
  y: number;
  task: Task;
  onClose: () => void;
  onMoveToColumn: (task: Task, status: Status) => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [subMenu, setSubMenu] = useState<"priority" | "move" | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Adjust position to stay within viewport
  const style = useMemo(() => {
    const adjustedX = Math.min(x, window.innerWidth - 200);
    const adjustedY = Math.min(y, window.innerHeight - 300);
    return { left: adjustedX, top: adjustedY };
  }, [x, y]);

  return (
    <div
      ref={ref}
      className="fixed z-[100] min-w-[180px] glass-card rounded-xl border border-white/[0.08] shadow-2xl py-1 animate-in fade-in zoom-in-95 duration-100"
      style={style}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        onClick={onEdit}
        className="w-full px-3 py-2 text-left text-xs font-mono text-white/70 hover:bg-white/[0.06] hover:text-white/90 transition-colors"
      >
        Edit Details
      </button>

      {/* Move to submenu */}
      <div
        className="relative"
        onMouseEnter={() => setSubMenu("move")}
        onMouseLeave={() => setSubMenu(null)}
      >
        <button className="w-full px-3 py-2 text-left text-xs font-mono text-white/70 hover:bg-white/[0.06] hover:text-white/90 transition-colors flex items-center justify-between">
          Move to <span className="text-white/30">›</span>
        </button>
        {subMenu === "move" && (
          <div className="absolute left-full top-0 ml-1 min-w-[140px] glass-card rounded-xl border border-white/[0.08] shadow-2xl py-1">
            {STATUSES.filter((s) => s !== task.status).map((s) => (
              <button
                key={s}
                onClick={() => onMoveToColumn(task, s)}
                className="w-full px-3 py-2 text-left text-xs font-mono text-white/70 hover:bg-white/[0.06] hover:text-white/90 transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Priority submenu */}
      <div
        className="relative"
        onMouseEnter={() => setSubMenu("priority")}
        onMouseLeave={() => setSubMenu(null)}
      >
        <button className="w-full px-3 py-2 text-left text-xs font-mono text-white/70 hover:bg-white/[0.06] hover:text-white/90 transition-colors flex items-center justify-between">
          Set Priority <span className="text-white/30">›</span>
        </button>
        {subMenu === "priority" && (
          <div className="absolute left-full top-0 ml-1 min-w-[120px] glass-card rounded-xl border border-white/[0.08] shadow-2xl py-1">
            {PRIORITIES.map((p) => (
              <button
                key={p.value}
                onClick={async () => {
                  onClose();
                  const { updateTaskField } = await import("./actions");
                  await updateTaskField(task.id, "priority", p.value);
                }}
                className="w-full px-3 py-2 text-left text-xs font-mono text-white/70 hover:bg-white/[0.06] hover:text-white/90 transition-colors flex items-center gap-2"
              >
                <span
                  className={`w-2 h-2 rounded-full ${p.dot} flex-shrink-0`}
                />
                {p.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="h-px bg-white/[0.06] my-1" />

      {/* Delete */}
      {confirmDelete ? (
        <button
          onClick={async () => {
            const { deleteTask } = await import("./actions");
            await deleteTask(task.id);
            onDelete();
          }}
          className="w-full px-3 py-2 text-left text-xs font-mono text-red-400 hover:bg-red-500/10 transition-colors"
        >
          Confirm Delete
        </button>
      ) : (
        <button
          onClick={() => setConfirmDelete(true)}
          className="w-full px-3 py-2 text-left text-xs font-mono text-red-400/70 hover:bg-red-500/10 hover:text-red-400 transition-colors"
        >
          Delete
        </button>
      )}
    </div>
  );
}
