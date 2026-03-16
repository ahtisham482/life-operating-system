import { useState, useEffect } from "react";
import { storage } from "./supabase";

const DOMAINS = [
  { id: "business", label: "Business & Agency", icon: "◈", desc: "Revenue, clients, PPC, growth" },
  { id: "content", label: "Content & Brand", icon: "◉", desc: "TikTok, personal brand, audience" },
  { id: "learning", label: "Learning & Books", icon: "◎", desc: "Reading, implementation, skills" },
  { id: "health", label: "Health & Body", icon: "◇", desc: "Exercise, sleep, energy" },
  { id: "deen", label: "Deen & Spirit", icon: "◆", desc: "Prayer, reflection, purpose" },
  { id: "personal", label: "Personal Life", icon: "○", desc: "Family, rest, relationships" },
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
    content: "maintenance",
    learning: "maintenance",
    health: "maintenance",
    deen: "maintenance",
    personal: "maintenance",
  },
};

const defaultWeekly = { answers: ["", "", ""], tasks: [], week: "" };

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
  return new Date(iso).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" });
}

function getDaysLeft(endDate) {
  if (!endDate) return null;
  const diff = new Date(endDate) - new Date();
  return Math.max(0, Math.ceil(diff / 86400000));
}

export default function App() {
  const [tab, setTab] = useState("daily");
  const [season, setSeason] = useState(defaultSeason);
  const [weekly, setWeekly] = useState(defaultWeekly);
  const [dailyLog, setDailyLog] = useState({});
  const [todayEntry, setTodayEntry] = useState({ leadDone: null, reflection: "", mood: "", blockers: "" });
  const [books, setBooks] = useState([]);
  const [prescribedStatuses, setPrescribedStatuses] = useState({});
  const [newBook, setNewBook] = useState({ title: "", status: "reading", note: "" });
  const [newTask, setNewTask] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [seasonEdit, setSeasonEdit] = useState(false);
  const [toast, setToast] = useState("");

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
        if (s.status === "fulfilled" && s.value) setSeason(JSON.parse(s.value.value));
        if (w.status === "fulfilled" && w.value) setWeekly(JSON.parse(w.value.value));
        if (dl.status === "fulfilled" && dl.value) {
          const log = JSON.parse(dl.value.value);
          setDailyLog(log);
          if (log[getTodayKey()]) setTodayEntry(log[getTodayKey()]);
        }
        if (b.status === "fulfilled" && b.value) setBooks(JSON.parse(b.value.value));
        if (ps.status === "fulfilled" && ps.value) setPrescribedStatuses(JSON.parse(ps.value.value));
      } catch (e) {
        setError(e.message || "Failed to connect to Supabase. Check your environment variables.");
      }
      setLoaded(true);
    }
    load();
  }, []);

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

  const togglePrescribedStatus = (i) => {
    const current = prescribedStatuses[i] || "unread";
    const next = current === "unread" ? "reading" : current === "reading" ? "done" : "unread";
    savePrescribedStatuses({ ...prescribedStatuses, [i]: next });
  };

  const daysLeft = getDaysLeft(season.endDate);
  const todayKey = getTodayKey();
  const todayDone = dailyLog[todayKey]?.leadDone !== null && dailyLog[todayKey]?.leadDone !== undefined;

  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    const k = d.toISOString().split("T")[0];
    const isToday = k === todayKey;
    return { key: k, label: isToday ? "TODAY" : d.toLocaleDateString("en", { weekday: "short" }), entry: dailyLog[k], isToday };
  });

  const streak = (() => {
    let s = 0;
    for (let i = 0; i <= 60; i++) {
      const d = new Date(); d.setDate(d.getDate() - i);
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
    const updated = { ...weekly, tasks: weekly.tasks.map(t => t.id === id ? { ...t, done: !t.done } : t) };
    setWeekly(updated);
    saveWeekly(updated);
  };

  const deleteTask = (id) => {
    const updated = { ...weekly, tasks: weekly.tasks.filter(t => t.id !== id) };
    setWeekly(updated);
    saveWeekly(updated);
  };

  const leadCount = Object.values(season.domains).filter(v => v === "lead").length;

  if (!loaded) return (
    <div style={{ background: "#0a0a0a", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ color: "#c9a84c", fontFamily: "Georgia, serif", fontSize: 18, letterSpacing: 4 }}>LOADING...</div>
    </div>
  );

  if (error) return (
    <div style={{ background: "#0a0a0a", minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, padding: 32 }}>
      <div style={{ color: "#c9a84c", fontFamily: "monospace", fontSize: 12, letterSpacing: 4 }}>CONNECTION ERROR</div>
      <div style={{ color: "#944", fontFamily: "monospace", fontSize: 13, maxWidth: 480, textAlign: "center", lineHeight: 1.6 }}>{error}</div>
      <div style={{ color: "#555", fontFamily: "monospace", fontSize: 11, maxWidth: 480, textAlign: "center", lineHeight: 1.8 }}>
        Make sure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set,
        and that the los_data table exists in your Supabase project.
      </div>
    </div>
  );

  const styles = {
    app: { background: "#0a0a0a", minHeight: "100vh", fontFamily: "'Georgia', serif", color: "#e8e0d0", padding: "0 0 60px 0" },
    header: { borderBottom: "1px solid #1e1e1e", padding: "24px 24px 20px", background: "#0d0d0d" },
    title: { fontSize: 13, letterSpacing: 6, color: "#c9a84c", fontFamily: "monospace", marginBottom: 4 },
    subtitle: { fontSize: 22, color: "#e8e0d0", fontWeight: "normal", margin: 0 },
    metaRow: { display: "flex", gap: 20, marginTop: 12, flexWrap: "wrap" },
    badge: { fontSize: 11, letterSpacing: 2, padding: "4px 12px", border: "1px solid #2a2a2a", color: "#888", fontFamily: "monospace" },
    badgeGold: { fontSize: 11, letterSpacing: 2, padding: "4px 12px", border: "1px solid #c9a84c33", color: "#c9a84c", fontFamily: "monospace", background: "#c9a84c11" },
    tabs: { display: "flex", gap: 0, borderBottom: "1px solid #1a1a1a", background: "#0d0d0d", padding: "0 24px" },
    tab: { padding: "14px 20px", fontSize: 11, letterSpacing: 3, cursor: "pointer", border: "none", background: "none", color: "#555", fontFamily: "monospace", borderBottom: "2px solid transparent", transition: "all 0.2s", position: "relative" },
    tabActive: { color: "#c9a84c", borderBottom: "2px solid #c9a84c" },
    body: { padding: "28px 24px", maxWidth: 720, margin: "0 auto" },
    section: { marginBottom: 36 },
    sectionTitle: { fontSize: 10, letterSpacing: 5, color: "#c9a84c", fontFamily: "monospace", marginBottom: 16, textTransform: "uppercase" },
    card: { background: "#111", border: "1px solid #1e1e1e", padding: "20px 22px", marginBottom: 16 },
    cardHighlight: { background: "#111", border: "1px solid #c9a84c33", padding: "20px 22px", marginBottom: 16 },
    label: { fontSize: 10, letterSpacing: 3, color: "#666", fontFamily: "monospace", display: "block", marginBottom: 8 },
    input: { width: "100%", background: "#0a0a0a", border: "1px solid #2a2a2a", color: "#e8e0d0", padding: "10px 14px", fontSize: 14, fontFamily: "Georgia, serif", outline: "none", boxSizing: "border-box" },
    textarea: { width: "100%", background: "#0a0a0a", border: "1px solid #2a2a2a", color: "#e8e0d0", padding: "10px 14px", fontSize: 14, fontFamily: "Georgia, serif", outline: "none", resize: "vertical", minHeight: 80, boxSizing: "border-box" },
    btn: { background: "none", border: "1px solid #c9a84c", color: "#c9a84c", padding: "10px 24px", fontSize: 11, letterSpacing: 3, cursor: "pointer", fontFamily: "monospace" },
    btnSmall: { background: "none", border: "1px solid #333", color: "#888", padding: "6px 16px", fontSize: 10, letterSpacing: 2, cursor: "pointer", fontFamily: "monospace" },
    btnDanger: { background: "none", border: "1px solid #5a2222", color: "#944", padding: "6px 16px", fontSize: 10, letterSpacing: 2, cursor: "pointer", fontFamily: "monospace" },
    domainCard: (mode) => ({
      background: mode === "lead" ? "#13110a" : "#0f0f0f",
      border: mode === "lead" ? "1px solid #c9a84c44" : "1px solid #1a1a1a",
      padding: "14px 18px", marginBottom: 10,
      display: "flex", alignItems: "center", justifyContent: "space-between",
      cursor: "pointer", transition: "all 0.2s",
    }),
    domainIcon: (mode) => ({ color: mode === "lead" ? "#c9a84c" : "#333", fontSize: 18, marginRight: 14 }),
    checkBtn: (v) => ({
      width: 48, height: 48, border: `2px solid ${v === true ? "#c9a84c" : v === false ? "#5a2222" : "#2a2a2a"}`,
      background: v === true ? "#c9a84c22" : v === false ? "#5a222222" : "transparent",
      color: v === true ? "#c9a84c" : v === false ? "#944" : "#444",
      fontSize: 20, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
    }),
    dot: (entry, isToday) => ({
      width: 32, height: 32, border: "1px solid",
      borderColor: isToday ? "#c9a84c88" : entry?.leadDone === true ? "#c9a84c" : entry?.leadDone === false ? "#5a2222" : "#222",
      background: entry?.leadDone === true ? "#c9a84c22" : "transparent",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: 9, color: isToday ? "#c9a84c88" : "#555", fontFamily: "monospace",
      boxShadow: isToday ? "0 0 0 1px #c9a84c44" : "none",
    }),
    moodBtn: (selected) => ({
      padding: "8px 14px", fontSize: 12, cursor: "pointer", border: "1px solid",
      borderColor: selected ? "#c9a84c" : "#222", background: selected ? "#c9a84c11" : "transparent",
      color: selected ? "#c9a84c" : "#666", fontFamily: "monospace", letterSpacing: 1,
    }),
    taskCheck: (done) => ({
      width: 20, height: 20, border: `1px solid ${done ? "#c9a84c" : "#333"}`,
      background: done ? "#c9a84c22" : "transparent", cursor: "pointer", flexShrink: 0,
      display: "flex", alignItems: "center", justifyContent: "center",
      color: done ? "#c9a84c" : "transparent", fontSize: 11,
    }),
    toast: {
      position: "fixed", bottom: 24, right: 24, background: "#111", border: "1px solid #c9a84c",
      color: "#c9a84c", padding: "12px 24px", fontSize: 11, letterSpacing: 3, fontFamily: "monospace",
      opacity: toast ? 1 : 0, transition: "opacity 0.3s", zIndex: 999, pointerEvents: "none",
    },
    savingDot: {
      position: "fixed", top: 16, right: 16, width: 8, height: 8, borderRadius: "50%",
      background: "#c9a84c", opacity: saving ? 1 : 0, transition: "opacity 0.3s", zIndex: 999,
    },
  };

  return (
    <div style={styles.app}>
      <div style={styles.savingDot} title="Saving..." />

      {/* HEADER */}
      <div style={styles.header}>
        <div style={styles.title}>LIFE OPERATING SYSTEM</div>
        <div style={styles.subtitle}>Muhammad's Command Center</div>
        <div style={styles.metaRow}>
          {season.goal && <div style={styles.badgeGold}>◈ {season.goal.slice(0, 40)}{season.goal.length > 40 ? "..." : ""}</div>}
          {daysLeft !== null && <div style={styles.badge}>{daysLeft} DAYS LEFT IN SEASON</div>}
          {streak > 0 && <div style={styles.badgeGold}>🔥 {streak}-DAY STREAK</div>}
          <div style={styles.badge}>{new Date().toLocaleDateString("en-PK", { weekday: "long", day: "numeric", month: "long" })}</div>
        </div>
      </div>

      {/* TABS */}
      <div style={styles.tabs}>
        {["daily", "weekly", "season", "books", "log"].map(t => (
          <button key={t} style={{ ...styles.tab, ...(tab === t ? styles.tabActive : {}) }} onClick={() => setTab(t)}>
            {t.toUpperCase()}
            {t === "daily" && todayDone && (
              <span style={{ position: "absolute", top: 8, right: 6, width: 5, height: 5, borderRadius: "50%", background: "#c9a84c" }} />
            )}
          </button>
        ))}
      </div>

      <div style={styles.body}>

        {/* ─── DAILY CHECK-IN ─── */}
        {tab === "daily" && (
          <div>
            <div style={styles.section}>
              <div style={styles.sectionTitle}>7-Day Execution Track</div>
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 24 }}>
                {last7.map(({ key, label, entry, isToday }) => (
                  <div key={key} style={{ textAlign: "center" }}>
                    <div style={styles.dot(entry, isToday)}>
                      {entry?.leadDone === true ? "✓" : entry?.leadDone === false ? "✗" : "·"}
                    </div>
                    <div style={{ fontSize: 9, color: isToday ? "#c9a84c88" : "#444", fontFamily: "monospace", marginTop: 4 }}>{label}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={styles.section}>
              <div style={styles.sectionTitle}>Today's Check-In</div>

              {season.goal && (
                <div style={styles.cardHighlight}>
                  <div style={styles.label}>YOUR CURRENT LEAD PRIORITY</div>
                  <div style={{ color: "#c9a84c", fontSize: 16 }}>{season.goal}</div>
                  <div style={{ color: "#555", fontSize: 12, marginTop: 6, fontFamily: "monospace" }}>
                    {DOMAINS.find(d => d.id === season.lead)?.label} — {DOMAINS.find(d => d.id === season.lead)?.desc}
                  </div>
                </div>
              )}

              <div style={styles.card}>
                <div style={styles.label}>DID YOU MOVE YOUR LEAD PRIORITY FORWARD TODAY?</div>
                <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
                  <button style={styles.checkBtn(todayEntry.leadDone === true)} onClick={() => setTodayEntry(p => ({ ...p, leadDone: true }))}>✓</button>
                  <button style={styles.checkBtn(todayEntry.leadDone === false)} onClick={() => setTodayEntry(p => ({ ...p, leadDone: false }))}>✗</button>
                  <div style={{ color: "#555", fontSize: 12, fontFamily: "monospace", display: "flex", alignItems: "center", marginLeft: 8 }}>
                    {todayEntry.leadDone === true ? "Yes — good. Keep going." : todayEntry.leadDone === false ? "No — what stopped you?" : "Tap to answer"}
                  </div>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <div style={styles.label}>MOOD & ENERGY</div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {MOODS.map(m => (
                      <button key={m} style={styles.moodBtn(todayEntry.mood === m)} onClick={() => setTodayEntry(p => ({ ...p, mood: m }))}>
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <div style={styles.label}>ONE-LINE REFLECTION — What happened today?</div>
                  <input style={styles.input} value={todayEntry.reflection} onChange={e => setTodayEntry(p => ({ ...p, reflection: e.target.value }))} placeholder="Write one honest sentence about today..." />
                </div>

                <div style={{ marginBottom: 20 }}>
                  <div style={styles.label}>WHAT BLOCKED YOU OR SCATTERED YOU TODAY?</div>
                  <input style={styles.input} value={todayEntry.blockers} onChange={e => setTodayEntry(p => ({ ...p, blockers: e.target.value }))} placeholder="Optional — be honest with yourself..." />
                </div>

                <button style={styles.btn} onClick={() => saveDaily(todayEntry)}>SAVE TODAY</button>
              </div>
            </div>
          </div>
        )}

        {/* ─── WEEKLY PLAN ─── */}
        {tab === "weekly" && (
          <div>
            <div style={styles.section}>
              <div style={styles.sectionTitle}>Weekly Planning — {getWeekKey()}</div>
              <div style={{ color: "#555", fontSize: 12, fontFamily: "monospace", marginBottom: 20 }}>
                Every Sunday — 20 minutes. Answer these 3 questions honestly.
              </div>
              {WEEKLY_QUESTIONS.map((q, i) => (
                <div key={i} style={styles.card}>
                  <div style={styles.label}>QUESTION {i + 1}</div>
                  <div style={{ color: "#c9a84c", fontSize: 14, marginBottom: 12 }}>{q}</div>
                  <textarea
                    style={styles.textarea}
                    value={weekly.answers[i] || ""}
                    onChange={e => {
                      const a = [...(weekly.answers || ["", "", ""])];
                      a[i] = e.target.value;
                      setWeekly(p => ({ ...p, answers: a }));
                    }}
                    placeholder="Write your honest answer here..."
                  />
                </div>
              ))}

              {/* Weekly Task Checklist */}
              <div style={styles.card}>
                <div style={styles.label}>THIS WEEK'S TASKS</div>
                {(() => {
                  const tasks = weekly.tasks || [];
                  const doneTasks = tasks.filter(t => t.done).length;
                  const allDone = tasks.length > 0 && doneTasks === tasks.length;
                  return (
                    <>
                      {tasks.length > 0 && (
                        <div style={{ fontFamily: "monospace", fontSize: 11, letterSpacing: 2, color: allDone ? "#c9a84c" : "#555", marginBottom: 14 }}>
                          {doneTasks} / {tasks.length} TASKS DONE{allDone ? " — WEEK EXECUTED ✓" : ""}
                        </div>
                      )}
                      {tasks.map(task => (
                        <div key={task.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid #161616" }}>
                          <div style={styles.taskCheck(task.done)} onClick={() => toggleTask(task.id)}>
                            {task.done ? "✓" : ""}
                          </div>
                          <div style={{ flex: 1, fontSize: 14, color: task.done ? "#555" : "#e8e0d0", textDecoration: task.done ? "line-through" : "none" }}>
                            {task.text}
                          </div>
                          <button style={styles.btnDanger} onClick={() => deleteTask(task.id)}>✗</button>
                        </div>
                      ))}
                      <div style={{ display: "flex", gap: 10, marginTop: tasks.length > 0 ? 16 : 0 }}>
                        <input
                          style={{ ...styles.input, flex: 1 }}
                          placeholder="Add a task for this week..."
                          value={newTask}
                          onChange={e => setNewTask(e.target.value)}
                          onKeyDown={e => e.key === "Enter" && addTask()}
                        />
                        <button style={{ ...styles.btn, padding: "10px 18px", whiteSpace: "nowrap" }} onClick={addTask}>ADD</button>
                      </div>
                    </>
                  );
                })()}
              </div>

              <button style={styles.btn} onClick={() => saveWeekly(weekly)}>SAVE WEEKLY PLAN</button>
            </div>
          </div>
        )}

        {/* ─── SEASON ─── */}
        {tab === "season" && (
          <div>
            <div style={styles.section}>
              <div style={styles.sectionTitle}>Current 90-Day Season</div>

              <div style={styles.cardHighlight}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={styles.label}>SEASON GOAL</div>
                    <div style={{ color: "#c9a84c", fontSize: 18, marginBottom: 8 }}>{season.goal || "Not set yet"}</div>
                    <div style={{ color: "#555", fontSize: 11, fontFamily: "monospace" }}>
                      {formatDate(season.startDate)} → {formatDate(season.endDate)}{daysLeft !== null ? ` · ${daysLeft} days remaining` : ""}
                    </div>
                  </div>
                  <button style={styles.btnSmall} onClick={() => setSeasonEdit(!seasonEdit)}>
                    {seasonEdit ? "CANCEL" : "EDIT"}
                  </button>
                </div>
              </div>

              {seasonEdit && (
                <div style={styles.card}>
                  <div style={{ marginBottom: 16 }}>
                    <div style={styles.label}>SEASON GOAL — What are you advancing this 90 days?</div>
                    <input style={styles.input} value={season.goal} onChange={e => setSeason(p => ({ ...p, goal: e.target.value }))} placeholder="e.g. Grow agency to 5 clients, stabilize revenue to PKR X/month" />
                  </div>
                  <div style={{ display: "flex", gap: 16, marginBottom: 16 }}>
                    <div style={{ flex: 1 }}>
                      <div style={styles.label}>START DATE</div>
                      <input type="date" style={styles.input} value={season.startDate} onChange={e => setSeason(p => ({ ...p, startDate: e.target.value }))} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={styles.label}>END DATE</div>
                      <input type="date" style={styles.input} value={season.endDate} onChange={e => setSeason(p => ({ ...p, endDate: e.target.value }))} />
                    </div>
                  </div>
                  <div style={{ marginBottom: 20 }}>
                    <div style={styles.label}>LEAD DOMAIN — What is your primary focus?</div>
                    <select style={{ ...styles.input, cursor: "pointer" }} value={season.lead} onChange={e => setSeason(p => ({ ...p, lead: e.target.value }))}>
                      {DOMAINS.map(d => <option key={d.id} value={d.id}>{d.label}</option>)}
                    </select>
                  </div>
                  <button style={styles.btn} onClick={() => { saveSeason(season); setSeasonEdit(false); }}>SAVE SEASON</button>
                </div>
              )}

              <div style={styles.sectionTitle}>Domain Modes — Lead vs Maintenance</div>
              <div style={{ color: "#555", fontSize: 11, fontFamily: "monospace", marginBottom: 16 }}>
                Only ONE domain should be LEAD at a time. Click to toggle.
              </div>
              {leadCount > 1 && (
                <div style={{ fontSize: 11, fontFamily: "monospace", color: "#944", border: "1px solid #5a2222", padding: "4px 12px", display: "inline-block", marginBottom: 16 }}>
                  ⚠ {leadCount} DOMAINS SET AS LEAD — SET ONE ONLY
                </div>
              )}
              {DOMAINS.map(d => {
                const mode = season.domains[d.id] || "maintenance";
                return (
                  <div key={d.id} style={styles.domainCard(mode)} onClick={() => {
                    const newMode = mode === "lead" ? "maintenance" : "lead";
                    const allMaintenance = Object.fromEntries(DOMAINS.map(x => [x.id, "maintenance"]));
                    const updated = {
                      ...season,
                      domains: newMode === "lead" ? { ...allMaintenance, [d.id]: "lead" } : { ...season.domains, [d.id]: "maintenance" },
                      lead: newMode === "lead" ? d.id : (season.lead === d.id ? "" : season.lead),
                    };
                    setSeason(updated);
                    saveSeason(updated);
                  }}>
                    <div style={{ display: "flex", alignItems: "center" }}>
                      <span style={styles.domainIcon(mode)}>{d.icon}</span>
                      <div>
                        <div style={{ color: mode === "lead" ? "#e8e0d0" : "#666", fontSize: 14 }}>{d.label}</div>
                        <div style={{ color: "#444", fontSize: 11, fontFamily: "monospace" }}>{d.desc}</div>
                      </div>
                    </div>
                    <div style={{ fontFamily: "monospace", fontSize: 10, letterSpacing: 2, color: mode === "lead" ? "#c9a84c" : "#333", border: `1px solid ${mode === "lead" ? "#c9a84c33" : "#222"}`, padding: "4px 12px" }}>
                      {mode.toUpperCase()}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ─── BOOKS ─── */}
        {tab === "books" && (
          <div>
            <div style={styles.section}>
              <div style={styles.sectionTitle}>Reading Tracker</div>

              <div style={styles.card}>
                <div style={styles.label}>PRESCRIBED READING ORDER — From Your Diagnosis</div>
                <div style={{ color: "#444", fontSize: 10, fontFamily: "monospace", marginBottom: 14 }}>Click a book to cycle: unread → reading → done</div>
                {PRESCRIBED_BOOKS.map((book, i) => {
                  const status = prescribedStatuses[i] || "unread";
                  const isDone = status === "done";
                  const isReading = status === "reading";
                  return (
                    <div
                      key={i}
                      style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0", borderBottom: "1px solid #161616", cursor: "pointer" }}
                      onClick={() => togglePrescribedStatus(i)}
                    >
                      <div style={{ fontFamily: "monospace", fontSize: 10, color: isDone ? "#c9a84c" : "#333", width: 20 }}>{i + 1}.</div>
                      <div style={{ flex: 1, fontSize: 13, color: isDone ? "#c9a84c" : isReading ? "#e8e0d0" : "#555" }}>{book}</div>
                      <div style={{ fontFamily: "monospace", fontSize: 9, color: isDone ? "#c9a84c" : isReading ? "#888" : "#333", minWidth: 50, textAlign: "right" }}>
                        {isDone ? "DONE ✓" : isReading ? "READING" : ""}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div style={{ marginTop: 24 }}>
                <div style={styles.label}>ADD A BOOK</div>
                <div style={styles.card}>
                  <input style={{ ...styles.input, marginBottom: 10 }} placeholder="Book title" value={newBook.title} onChange={e => setNewBook(p => ({ ...p, title: e.target.value }))} />
                  <select style={{ ...styles.input, marginBottom: 10 }} value={newBook.status} onChange={e => setNewBook(p => ({ ...p, status: e.target.value }))}>
                    <option value="reading">Currently Reading</option>
                    <option value="done">Finished</option>
                    <option value="next">Up Next</option>
                  </select>
                  <input style={{ ...styles.input, marginBottom: 14 }} placeholder="Key insight or implementation note" value={newBook.note} onChange={e => setNewBook(p => ({ ...p, note: e.target.value }))} />
                  <button style={styles.btn} onClick={() => {
                    if (!newBook.title) return;
                    const updated = [...books, { ...newBook, id: Date.now(), addedAt: getTodayKey() }];
                    saveBooks(updated);
                    setNewBook({ title: "", status: "reading", note: "" });
                  }}>ADD BOOK</button>
                </div>
              </div>

              {books.length > 0 && (
                <div>
                  <div style={styles.label}>YOUR LIBRARY</div>
                  {books.map(b => (
                    <div key={b.id} style={styles.card}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div>
                          <div style={{ color: "#e8e0d0", fontSize: 14, marginBottom: 4 }}>{b.title}</div>
                          {b.note && <div style={{ color: "#666", fontSize: 12 }}>{b.note}</div>}
                          <div style={{ fontFamily: "monospace", fontSize: 10, color: b.status === "done" ? "#c9a84c" : "#666", marginTop: 6 }}>{b.status.toUpperCase()}</div>
                        </div>
                        <button style={styles.btnDanger} onClick={() => saveBooks(books.filter(x => x.id !== b.id))}>✗</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── LOG ─── */}
        {tab === "log" && (
          <div>
            <div style={styles.section}>
              <div style={styles.sectionTitle}>Past Reflections</div>
              {Object.keys(dailyLog).length === 0 && (
                <div style={{ color: "#444", fontFamily: "monospace", fontSize: 12 }}>No entries yet. Start your daily check-ins.</div>
              )}
              {Object.entries(dailyLog).sort((a, b) => b[0].localeCompare(a[0])).map(([date, entry]) => (
                <div key={date} style={styles.card}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <div style={{ fontFamily: "monospace", fontSize: 11, color: "#666" }}>{formatDate(date)}</div>
                    <div style={{ fontFamily: "monospace", fontSize: 10, color: entry.leadDone ? "#c9a84c" : "#944" }}>
                      {entry.leadDone ? "LEAD ✓" : entry.leadDone === false ? "LEAD ✗" : "—"}
                    </div>
                  </div>
                  {entry.mood && <div style={{ fontSize: 12, color: "#888", marginBottom: 6 }}>{entry.mood}</div>}
                  {entry.reflection && <div style={{ fontSize: 14, color: "#e8e0d0", marginBottom: 6 }}>"{entry.reflection}"</div>}
                  {entry.blockers && <div style={{ fontSize: 12, color: "#555", fontStyle: "italic" }}>Blocked by: {entry.blockers}</div>}
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      <div style={styles.toast}>{toast}</div>
    </div>
  );
}
