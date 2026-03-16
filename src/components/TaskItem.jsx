import Button from "./Button";

export default function TaskItem({ task, onToggle, onDelete }) {
  return (
    <div className="task-row">
      <button
        type="button"
        className="task-checkbox"
        role="checkbox"
        aria-checked={task.done}
        onClick={() => onToggle(task.id)}
        aria-label={task.done ? `Unmark: ${task.text}` : `Mark done: ${task.text}`}
      >
        {task.done ? "✓" : ""}
      </button>
      <span className={`task-text${task.done ? " task-text--done" : ""}`}>
        {task.text}
      </span>
      <Button
        variant="danger"
        size="sm"
        onClick={() => onDelete(task.id)}
        aria-label={`Delete task: ${task.text}`}
      >
        ✗
      </Button>
    </div>
  );
}
