import { useState, useEffect } from "react";
import { storage } from "./supabase";
import "./styles/globals.css";

import Button      from "./components/Button";
import Badge       from "./components/Badge";
import Card        from "./components/Card";
import SectionTitle from "./components/SectionTitle";
import FieldLabel  from "./components/FieldLabel";
import TextInput   from "./components/TextInput";
import Textarea    from "./components/Textarea";
import Select      from "./components/Select";
import CheckButton from "./components/CheckButton";
import MoodButton  from "./components/MoodButton";
import StreakDot   from "./components/StreakDot";
import TaskItem    from "./components/TaskItem";
import TabBar      from "./components/TabBar";
import Toast       from "./components/Toast";

// ── Data constants ────────────────────────────────────────────
const DOMAINS = [
  { id: "business", label: "Business & Agency", icon: "◈", desc: "Revenue, clients, PPC, growth" },
  { id: "content",  label: "Content & Brand",   icon: "◉", desc: "TikTok, personal brand, audience" },
  { id: "learning", label: "Learning & Books",  icon: "◎", desc: "Reading, implementation, skills" },
  { id: "health",   label: "Health & Body",     icon: "◇", desc: "Exercise, sleep, energy" },
  { id: "deen",     label: "Deen & Spirit",     icon: "◆", desc: "Prayer, reflection, purpose" },
  { id: "personal", label: "Personal Life",     icon: "○", desc: "Family, rest, relationships" },
];

const WEEKLY_QUESTIONS = [
  "What is my ONE lead priority this week?",
  "What are the minimum actions to keep other domains alive?",
  "What am I removing or pausing this week?",
];

const MOODS = ["🔥 On Fire", "⚡ Energized", "😐 Neutral", "😔 Drained", "🌀 Scattered"];

const PRESCRIBED_BOOKS = [
  "The War of Art — Steven Pressfield",
  "Essentialism — Greg McKeown",
  "Atomic Habits — James Clear",
  "The ONE Thing — Gary Keller",
  "Drive — Daniel Pink",
  "The Compound Effect — Darren Hardy",
  "Daring Greatly — Brené Brown",
  "Man's Search for Meaning — Viktor Frankl",
  "The 12 Week Year — Brian Moran",
  "Getting Things Done — David Allen",
  "The Big Leap — Gay Hendricks",
  "Discipline Is Destiny — Ryan Holiday",
];

const defaultSeason = {
  goal: "",
  lead: "business",
  startDate: new Date().toISOString().split("T")[0],
  endDate: "",
  domains: {
    business: "lead",
    content:  "maintenance",
    learning: "maintenance",
    health:   "maintenance",
    deen:     "maintenance",
    personal: "maintenance",
  },
};

const defaultWeekly = { answers: ["", "", ""], tasks: [], week: "" };

// ── Utilities ─────────────────────────────────────────────────
function getWeekKey() {
  const d = new Date();
  const jan1 = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil(((d - jan1) / 86400000 + jan1.getDay() + 1) / 7);
  return `${d.getFullYear()}-W${week}`;
}

function getTodayKey() {
  return new Date().toISOString().split("T")[0];
}

function formatDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-PK", {
    day: "numeric", month: "short", year: "numeric",
  });
}

function getDaysLeft(endDate) {
  if (!endDate) return null;
  const diff = new Date(endDate) - new Date();
  return Math.max(0, Math.ceil(diff / 86400000));
}

// ── App ───────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab]                         = useState("daily");
  const [season, setSeason]                   = useState(defaultSeason);
  const [weekly, setWeekly]                   = useState(defaultWeekly);
  const [dailyLog, setDailyLog]               = useState({});
  const [todayEntry, setTodayEntry]           = useState({ leadDone: null, reflection: "", mood: "", blockers: "" });
  const [books, setBooks]                     = useState([]);
  const [prescribedStatuses, setPrescribedStatuses] = useState({});
  const [newBook, setNewBook]                 = useState({ title: "", status: "reading", note: "" });
  const [newTask, setNewTask]                 = useState("");
  const [loaded, setLoaded]                   = useState(false);
  const [error, setError]                     = useState(null);
  const [saving, setSaving]                   = useState(false);
  const [seasonEdit, setSeasonEdit]           = useState(false);
  const [toast, setToast]                     = useState("");

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  };

  useEffect(() => {
    async function load() {
      try {
        const [s, w, dl, b, ps] = await Promise.allSettled([
          storage.get("los:season"),
          storage.get("los:weekly:" + getWeekKey()),
          storage.get("los:dailylog"),
          storage.get("los:books"),
          storage.get("los:prescribed"),
        ]);
        if (s.status  === "fulfilled" && s.value)  setSeason(JSON.parse(s.value.value));
        if (w.status  === "fulfilled" && w.value)  setWeekly(JSON.parse(w.value.value));
        if (dl.status === "fulfilled" && dl.value) {
          const log = JSON.parse(dl.value.value);
          setDailyLog(log);
          if (log[getTodayKey()]) setTodayEntry(log[getTodayKey()]);
        }
        if (b.status  === "fulfilled" && b.value)  setBooks(JSON.parse(b.value.value));
        if (ps.status === "fulfilled" && ps.value) setPrescribedStatuses(JSON.parse(ps.value.value));
      } catch (e) {
        setError(e.message || "Failed to connect to Supabase. Check your environment variables.");
      }
      setLoaded(true);
    }
    load();
  }, []);

  // ── Persistence ─────────────────────────────────────────────
  const saveSeason = async (data) => {
    setSaving(true);
    await storage.set("los:season", JSON.stringify(data));
    setSaving(false);
    showToast("Season saved ✓");
  };

  const saveWeekly = async (data) => {
    setSaving(true);
    await storage.set("los:weekly:" + getWeekKey(), JSON.stringify(data));
    setSaving(false);
    showToast("Weekly plan saved ✓");
  };

  const saveDaily = async (entry) => {
    const updated = { ...dailyLog, [getTodayKey()]: entry };
    setDailyLog(updated);
    setSaving(true);
    await storage.set("los:dailylog", JSON.stringify(updated));
    setSaving(false);
    showToast("Daily log saved ✓");
  };

  const saveBooks = async (data) => {
    setBooks(data);
    await storage.set("los:books", JSON.stringify(data));
    showToast("Books updated ✓");
  };

  const savePrescribedStatuses = async (data) => {
    setPrescribedStatuses(data);
    await storage.set("los:prescribed", JSON.stringify(data));
    showToast("Reading status updated ✓");
  };

  // ── Derived values ───────────────────────────────────────────
  const togglePrescribedStatus = (i) => {
    const current = prescribedStatuses[i] || "unread";
    const next = current === "unread" ? "reading" : current === "reading" ? "done" : "unread";
    savePrescribedStatuses({ ...prescribedStatuses, [i]: next });
  };

  const daysLeft  = getDaysLeft(season.endDate);
  const todayKey  = getTodayKey();
  const todayDone = dailyLog[todayKey]?.leadDone !== null &&
                    dailyLog[todayKey]?.leadDone !== undefined;

  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const k = d.toISOString().split("T")[0];
    const isToday = k === todayKey;
    return {
      key: k,
      label: isToday ? "TODAY" : d.toLocaleDateString("en", { weekday: "short" }),
      entry: dailyLog[k],
      isToday,
    };
  });

  const streak = (() => {
    let s = 0;
    for (let i = 0; i <= 60; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const k = d.toISOString().split("T")[0];
      if (dailyLog[k]?.leadDone === true) s++;
      else break;
    }
    return s;
  })();

  const addTask = () => {
    if (!newTask.trim()) return;
    const task = { id: Date.now(), text: newTask.trim(), done: false };
    const updated = { ...weekly, tasks: [...(weekly.tasks || []), task] };
    setWeekly(updated);
    setNewTask("");
    saveWeekly(updated);
  };

  const toggleTask = (id) => {
    const updated = {
      ...weekly,
      tasks: weekly.tasks.map(t => t.id === id ? { ...t, done: !t.done } : t),
    };
    setWeekly(updated);
    saveWeekly(updated);
  };

  const deleteTask = (id) => {
    const updated = { ...weekly, tasks: weekly.tasks.filter(t => t.id !== id) };
    setWeekly(updated);
    saveWeekly(updated);
  };

  const leadCount = Object.values(season.domains).filter(v => v === "lead").length;

  // ── Loading / Error states ───────────────────────────────────
  if (!loaded) {
    return (
      <div className="full-screen-center">
        <p className="loading-text">Loading…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="full-screen-center" role="alert">
        <p className="error-heading">Connection Error</p>
        <p className="error-body">{error}</p>
        <p className="error-hint">
          Make sure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set,
          and that the los_data table exists in your Supabase project.
        </p>
      </div>
    );
  }

  // ── Render ───────────────────────────────────────────────────
  return (
    <div className="app-root">
      <a href="#main-content" className="skip-link">Skip to main content</a>

      {/* Saving indicator */}
      <div
        className="saving-dot"
        aria-hidden="true"
        style={{ opacity: saving ? 1 : 0 }}
        title="Saving…"
      />

      {/* ── Header ── */}
      <header className="app-header">
        <p className="app-title">Life Operating System</p>
        <h1 className="app-subtitle">Muhammad's Command Center</h1>
        <div className="meta-row" aria-label="Season overview">
          {season.goal && (
            <Badge variant="gold">
              ◈ {season.goal.slice(0, 40)}{season.goal.length > 40 ? "…" : ""}
            </Badge>
          )}
          {daysLeft !== null && (
            <Badge>{daysLeft} days left in season</Badge>
          )}
          {streak > 0 && (
            <Badge variant="gold">🔥 {streak}-day streak</Badge>
          )}
          <Badge>
            {new Date().toLocaleDateString("en-PK", {
              weekday: "long", day: "numeric", month: "long",
            })}
          </Badge>
        </div>
      </header>

      {/* ── Navigation ── */}
      <TabBar active={tab} onChange={setTab} todayDone={todayDone} />

      {/* ── Main content ── */}
      <main id="main-content" className="app-body">

        {/* ─── DAILY CHECK-IN ─── */}
        <div
          id="panel-daily"
          role="tabpanel"
          aria-labelledby="tab-daily"
          hidden={tab !== "daily"}
        >
          {tab === "daily" && (
            <>
              <section className="section" aria-labelledby="streak-heading">
                <SectionTitle id="streak-heading">7-Day Execution Track</SectionTitle>
                <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "24px" }}>
                  {last7.map(({ key, label, entry, isToday }) => (
                    <StreakDot key={key} entry={entry} isToday={isToday} label={label} />
                  ))}
                </div>
              </section>

              <section className="section" aria-labelledby="checkin-heading">
                <SectionTitle id="checkin-heading">Today's Check-In</SectionTitle>

                {season.goal && (
                  <Card highlight>
                    <FieldLabel>Your current lead priority</FieldLabel>
                    <p className="priority-text">{season.goal}</p>
                    <p className="priority-desc">
                      {DOMAINS.find(d => d.id === season.lead)?.label}
                      {" — "}
                      {DOMAINS.find(d => d.id === season.lead)?.desc}
                    </p>
                  </Card>
                )}

                <Card>
                  <div className="field">
                    <FieldLabel id="lead-done-label">
                      Did you move your lead priority forward today?
                    </FieldLabel>
                    <div
                      style={{ display: "flex", gap: "12px", alignItems: "center" }}
                      role="group"
                      aria-labelledby="lead-done-label"
                    >
                      <CheckButton
                        value={todayEntry.leadDone === true ? true : null}
                        onClick={() => setTodayEntry(p => ({ ...p, leadDone: true }))}
                        aria-label="Yes"
                      >
                        ✓
                      </CheckButton>
                      <CheckButton
                        value={todayEntry.leadDone === false ? false : null}
                        onClick={() => setTodayEntry(p => ({ ...p, leadDone: false }))}
                        aria-label="No"
                      >
                        ✗
                      </CheckButton>
                      <span className="checkin-status">
                        {todayEntry.leadDone === true
                          ? "Yes — good. Keep going."
                          : todayEntry.leadDone === false
                          ? "No — what stopped you?"
                          : "Tap to answer"}
                      </span>
                    </div>
                  </div>

                  <div className="field">
                    <FieldLabel id="mood-label">Mood & Energy</FieldLabel>
                    <div
                      style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}
                      role="group"
                      aria-labelledby="mood-label"
                    >
                      {MOODS.map(m => (
                        <MoodButton
                          key={m}
                          selected={todayEntry.mood === m}
                          onClick={() => setTodayEntry(p => ({ ...p, mood: m }))}
                        >
                          {m}
                        </MoodButton>
                      ))}
                    </div>
                  </div>

                  <div className="field">
                    <FieldLabel htmlFor="reflection">
                      One-line reflection — What happened today?
                    </FieldLabel>
                    <TextInput
                      id="reflection"
                      value={todayEntry.reflection}
                      onChange={e => setTodayEntry(p => ({ ...p, reflection: e.target.value }))}
                      placeholder="Write one honest sentence about today…"
                    />
                  </div>

                  <div className="field">
                    <FieldLabel htmlFor="blockers">
                      What blocked you or scattered you today?
                    </FieldLabel>
                    <TextInput
                      id="blockers"
                      value={todayEntry.blockers}
                      onChange={e => setTodayEntry(p => ({ ...p, blockers: e.target.value }))}
                      placeholder="Optional — be honest with yourself…"
                    />
                  </div>

                  <Button variant="primary" onClick={() => saveDaily(todayEntry)}>
                    Save Today
                  </Button>
                </Card>
              </section>
            </>
          )}
        </div>

        {/* ─── WEEKLY PLAN ─── */}
        <div
          id="panel-weekly"
          role="tabpanel"
          aria-labelledby="tab-weekly"
          hidden={tab !== "weekly"}
        >
          {tab === "weekly" && (
            <section className="section" aria-labelledby="weekly-heading">
              <SectionTitle id="weekly-heading">
                Weekly Planning — {getWeekKey()}
              </SectionTitle>
              <p className="helper-text">
                Every Sunday — 20 minutes. Answer these 3 questions honestly.
              </p>

              {WEEKLY_QUESTIONS.map((q, i) => (
                <Card key={i}>
                  <FieldLabel htmlFor={`question-${i}`}>Question {i + 1}</FieldLabel>
                  <p className="question-text">{q}</p>
                  <Textarea
                    id={`question-${i}`}
                    value={weekly.answers[i] || ""}
                    onChange={e => {
                      const a = [...(weekly.answers || ["", "", ""])];
                      a[i] = e.target.value;
                      setWeekly(p => ({ ...p, answers: a }));
                    }}
                    placeholder="Write your honest answer here…"
                  />
                </Card>
              ))}

              <Card>
                <FieldLabel>This week's tasks</FieldLabel>
                {(() => {
                  const tasks    = weekly.tasks || [];
                  const doneTasks = tasks.filter(t => t.done).length;
                  const allDone  = tasks.length > 0 && doneTasks === tasks.length;
                  return (
                    <>
                      {tasks.length > 0 && (
                        <p
                          className={`task-counter${allDone ? " task-counter--complete" : ""}`}
                          aria-live="polite"
                        >
                          {doneTasks} / {tasks.length} tasks done
                          {allDone ? " — Week Executed ✓" : ""}
                        </p>
                      )}
                      <ul style={{ listStyle: "none", padding: 0 }} aria-label="Weekly tasks">
                        {tasks.map(task => (
                          <li key={task.id}>
                            <TaskItem
                              task={task}
                              onToggle={toggleTask}
                              onDelete={deleteTask}
                            />
                          </li>
                        ))}
                      </ul>
                      <div className="task-input-row">
                        <TextInput
                          placeholder="Add a task for this week…"
                          value={newTask}
                          onChange={e => setNewTask(e.target.value)}
                          onKeyDown={e => e.key === "Enter" && addTask()}
                          aria-label="New task"
                        />
                        <Button variant="primary" onClick={addTask}>Add</Button>
                      </div>
                    </>
                  );
                })()}
              </Card>

              <Button variant="primary" onClick={() => saveWeekly(weekly)}>
                Save Weekly Plan
              </Button>
            </section>
          )}
        </div>

        {/* ─── SEASON ─── */}
        <div
          id="panel-season"
          role="tabpanel"
          aria-labelledby="tab-season"
          hidden={tab !== "season"}
        >
          {tab === "season" && (
            <section className="section" aria-labelledby="season-heading">
              <SectionTitle id="season-heading">Current 90-Day Season</SectionTitle>

              <Card highlight>
                <div className="season-header">
                  <div>
                    <FieldLabel>Season Goal</FieldLabel>
                    <p className="season-goal-text">{season.goal || "Not set yet"}</p>
                    <p className="season-dates">
                      {formatDate(season.startDate)} → {formatDate(season.endDate)}
                      {daysLeft !== null ? ` · ${daysLeft} days remaining` : ""}
                    </p>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setSeasonEdit(!seasonEdit)}
                    aria-expanded={seasonEdit}
                  >
                    {seasonEdit ? "Cancel" : "Edit"}
                  </Button>
                </div>
              </Card>

              {seasonEdit && (
                <Card>
                  <div className="field">
                    <FieldLabel htmlFor="season-goal">
                      Season Goal — What are you advancing this 90 days?
                    </FieldLabel>
                    <TextInput
                      id="season-goal"
                      value={season.goal}
                      onChange={e => setSeason(p => ({ ...p, goal: e.target.value }))}
                      placeholder="e.g. Grow agency to 5 clients, stabilize revenue to PKR X/month"
                    />
                  </div>
                  <div className="date-row field">
                    <div>
                      <FieldLabel htmlFor="start-date">Start Date</FieldLabel>
                      <TextInput
                        id="start-date"
                        type="date"
                        value={season.startDate}
                        onChange={e => setSeason(p => ({ ...p, startDate: e.target.value }))}
                      />
                    </div>
                    <div>
                      <FieldLabel htmlFor="end-date">End Date</FieldLabel>
                      <TextInput
                        id="end-date"
                        type="date"
                        value={season.endDate}
                        onChange={e => setSeason(p => ({ ...p, endDate: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="field">
                    <FieldLabel htmlFor="lead-domain">
                      Lead Domain — What is your primary focus?
                    </FieldLabel>
                    <Select
                      id="lead-domain"
                      value={season.lead}
                      onChange={e => setSeason(p => ({ ...p, lead: e.target.value }))}
                    >
                      {DOMAINS.map(d => (
                        <option key={d.id} value={d.id}>{d.label}</option>
                      ))}
                    </Select>
                  </div>
                  <Button
                    variant="primary"
                    onClick={() => { saveSeason(season); setSeasonEdit(false); }}
                  >
                    Save Season
                  </Button>
                </Card>
              )}

              <SectionTitle>Domain Modes — Lead vs Maintenance</SectionTitle>
              <p className="helper-text">
                Only ONE domain should be LEAD at a time. Click to toggle.
              </p>

              {leadCount > 1 && (
                <div className="alert-error" role="alert">
                  ⚠ {leadCount} domains set as Lead — set one only
                </div>
              )}

              <div role="list" aria-label="Domain modes">
                {DOMAINS.map(d => {
                  const mode   = season.domains[d.id] || "maintenance";
                  const isLead = mode === "lead";
                  return (
                    <button
                      key={d.id}
                      type="button"
                      className={`domain-card${isLead ? " domain-card--lead" : ""}`}
                      role="listitem"
                      aria-pressed={isLead}
                      onClick={() => {
                        const newMode = mode === "lead" ? "maintenance" : "lead";
                        const allMaintenance = Object.fromEntries(
                          DOMAINS.map(x => [x.id, "maintenance"])
                        );
                        const updated = {
                          ...season,
                          domains: newMode === "lead"
                            ? { ...allMaintenance, [d.id]: "lead" }
                            : { ...season.domains, [d.id]: "maintenance" },
                          lead: newMode === "lead"
                            ? d.id
                            : season.lead === d.id ? "" : season.lead,
                        };
                        setSeason(updated);
                        saveSeason(updated);
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center" }}>
                        <span
                          className={`domain-icon${isLead ? " domain-icon--lead" : ""}`}
                          aria-hidden="true"
                        >
                          {d.icon}
                        </span>
                        <div>
                          <div className={`domain-label${isLead ? " domain-label--lead" : ""}`}>
                            {d.label}
                          </div>
                          <div className="domain-desc">{d.desc}</div>
                        </div>
                      </div>
                      <span className={`domain-mode-badge${isLead ? " domain-mode-badge--lead" : ""}`}>
                        {mode}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          )}
        </div>

        {/* ─── BOOKS ─── */}
        <div
          id="panel-books"
          role="tabpanel"
          aria-labelledby="tab-books"
          hidden={tab !== "books"}
        >
          {tab === "books" && (
            <section className="section" aria-labelledby="books-heading">
              <SectionTitle id="books-heading">Reading Tracker</SectionTitle>

              <Card>
                <FieldLabel>Prescribed reading order — from your diagnosis</FieldLabel>
                <p className="helper-text">
                  Click a book to cycle: unread → reading → done
                </p>
                <ul style={{ listStyle: "none", padding: 0 }} aria-label="Prescribed books">
                  {PRESCRIBED_BOOKS.map((book, i) => {
                    const status = prescribedStatuses[i] || "unread";
                    return (
                      <li key={i}>
                        <button
                          type="button"
                          className="book-row"
                          onClick={() => togglePrescribedStatus(i)}
                          aria-label={`${book} — ${status}. Click to cycle status.`}
                        >
                          <span className={`book-num${status === "done" ? " book-num--done" : ""}`}>
                            {i + 1}.
                          </span>
                          <span className={`book-title book-title--${status}`}>{book}</span>
                          <span className={`book-status-label book-status-label--${status}`}>
                            {status === "done" ? "Done ✓" : status === "reading" ? "Reading" : ""}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </Card>

              <div className="field">
                <FieldLabel>Add a book</FieldLabel>
                <Card>
                  <div className="field">
                    <TextInput
                      placeholder="Book title"
                      value={newBook.title}
                      onChange={e => setNewBook(p => ({ ...p, title: e.target.value }))}
                      aria-label="Book title"
                    />
                  </div>
                  <div className="field">
                    <Select
                      value={newBook.status}
                      onChange={e => setNewBook(p => ({ ...p, status: e.target.value }))}
                      aria-label="Reading status"
                    >
                      <option value="reading">Currently Reading</option>
                      <option value="done">Finished</option>
                      <option value="next">Up Next</option>
                    </Select>
                  </div>
                  <div className="field">
                    <TextInput
                      placeholder="Key insight or implementation note"
                      value={newBook.note}
                      onChange={e => setNewBook(p => ({ ...p, note: e.target.value }))}
                      aria-label="Book note"
                    />
                  </div>
                  <Button
                    variant="primary"
                    onClick={() => {
                      if (!newBook.title) return;
                      const updated = [
                        ...books,
                        { ...newBook, id: Date.now(), addedAt: getTodayKey() },
                      ];
                      saveBooks(updated);
                      setNewBook({ title: "", status: "reading", note: "" });
                    }}
                  >
                    Add Book
                  </Button>
                </Card>
              </div>

              {books.length > 0 && (
                <section aria-labelledby="library-heading">
                  <FieldLabel id="library-heading">Your Library</FieldLabel>
                  {books.map(b => (
                    <Card key={b.id}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div>
                          <p className="book-card-title">{b.title}</p>
                          {b.note && <p className="book-card-note">{b.note}</p>}
                          <p className={`book-card-status${b.status === "done" ? " book-card-status--done" : ""}`}>
                            {b.status}
                          </p>
                        </div>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => saveBooks(books.filter(x => x.id !== b.id))}
                          aria-label={`Remove ${b.title}`}
                        >
                          ✗
                        </Button>
                      </div>
                    </Card>
                  ))}
                </section>
              )}
            </section>
          )}
        </div>

        {/* ─── LOG ─── */}
        <div
          id="panel-log"
          role="tabpanel"
          aria-labelledby="tab-log"
          hidden={tab !== "log"}
        >
          {tab === "log" && (
            <section className="section" aria-labelledby="log-heading">
              <SectionTitle id="log-heading">Past Reflections</SectionTitle>

              {Object.keys(dailyLog).length === 0 ? (
                <p className="empty-state">No entries yet. Start your daily check-ins.</p>
              ) : (
                Object.entries(dailyLog)
                  .sort((a, b) => b[0].localeCompare(a[0]))
                  .map(([date, entry]) => (
                    <Card key={date}>
                      <div className="log-header">
                        <time className="log-date" dateTime={date}>
                          {formatDate(date)}
                        </time>
                        <span
                          className={`log-status log-status--${
                            entry.leadDone === true  ? "done"  :
                            entry.leadDone === false ? "fail"  : "blank"
                          }`}
                        >
                          {entry.leadDone === true  ? "Lead ✓" :
                           entry.leadDone === false ? "Lead ✗" : "—"}
                        </span>
                      </div>
                      {entry.mood       && <p className="log-mood">{entry.mood}</p>}
                      {entry.reflection && <p className="log-reflection">"{entry.reflection}"</p>}
                      {entry.blockers   && <p className="log-blockers">Blocked by: {entry.blockers}</p>}
                    </Card>
                  ))
              )}
            </section>
          )}
        </div>

      </main>

      <Toast message={toast} />
    </div>
  );
}
