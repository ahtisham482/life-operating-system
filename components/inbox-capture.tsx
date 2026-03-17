"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import {
  Inbox,
  Send,
  Loader2,
  Check,
  X,
  ChevronDown,
  RotateCcw,
  MessageCircleQuestion,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  parseCapture,
  confirmCapture,
  discardCapture,
  enrichCapture,
} from "@/app/(dashboard)/inbox/actions";
import type { ParsedRoute } from "@/lib/db/schema";

const MODULE_META: Record<
  string,
  { label: string; icon: string; color: string }
> = {
  tasks: { label: "Tasks", icon: "✅", color: "text-blue-400" },
  expenses: { label: "Expenses", icon: "💰", color: "text-green-400" },
  journal: { label: "Journal", icon: "📝", color: "text-purple-400" },
  books: { label: "Books", icon: "📚", color: "text-amber-400" },
  weekly: { label: "Weekly", icon: "📅", color: "text-cyan-400" },
  season: { label: "Season", icon: "🎯", color: "text-orange-400" },
  checkin: { label: "Check-In", icon: "⚡", color: "text-yellow-400" },
  habits: { label: "Habits", icon: "🔁", color: "text-pink-400" },
};

type Phase =
  | "input"
  | "parsing"
  | "enrich"
  | "enriching"
  | "confirm"
  | "executing"
  | "done"
  | "error";

export function InboxCapture() {
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>("input");
  const [rawInput, setRawInput] = useState("");
  const [captureId, setCaptureId] = useState<string | null>(null);
  const [routes, setRoutes] = useState<ParsedRoute[]>([]);
  const [followUpQuestions, setFollowUpQuestions] = useState<string[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [results, setResults] = useState<
    { module: string; success: boolean; error?: string }[]
  >([]);
  const [errorMsg, setErrorMsg] = useState("");
  const [isParsing, startParsing] = useTransition();
  const [isExecuting, startExecuting] = useTransition();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const firstAnswerRef = useRef<HTMLInputElement>(null);

  // Focus input when modal opens
  useEffect(() => {
    if (open && phase === "input") {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open, phase]);

  // Focus first answer field when enrich phase starts
  useEffect(() => {
    if (phase === "enrich") {
      setTimeout(() => firstAnswerRef.current?.focus(), 100);
    }
  }, [phase]);

  // Keyboard shortcut to open — disabled since command palette uses Ctrl+K
  // The FAB button is the primary trigger
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape" && open) {
        handleClose();
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open]);

  function handleClose() {
    setOpen(false);
    // Reset state after animation
    setTimeout(() => {
      setPhase("input");
      setRawInput("");
      setCaptureId(null);
      setRoutes([]);
      setFollowUpQuestions([]);
      setAnswers({});
      setResults([]);
      setErrorMsg("");
    }, 200);
  }

  function handleParse() {
    if (!rawInput.trim()) return;
    setPhase("parsing");
    startParsing(async () => {
      try {
        const {
          id,
          routes: parsed,
          followUpQuestions: questions,
        } = await parseCapture(rawInput.trim());
        setCaptureId(id);
        setRoutes(parsed);
        setFollowUpQuestions(questions);
        setAnswers({});

        // Always go to enrich phase — let users add context
        // Even if routes are empty, questions will guide them
        setPhase("enrich");
      } catch (err) {
        setPhase("error");
        setErrorMsg(
          err instanceof Error ? err.message : "Failed to parse input"
        );
      }
    });
  }

  function handleEnrich() {
    // Collect answered questions
    const answeredPairs = followUpQuestions
      .map((q, i) => ({ question: q, answer: answers[i] || "" }))
      .filter((a) => a.answer.trim());

    if (answeredPairs.length === 0) {
      // No answers provided — go straight to confirm with current routes
      setPhase("confirm");
      return;
    }

    // Re-parse with enriched context
    setPhase("enriching");
    startParsing(async () => {
      try {
        if (!captureId) return;
        const { routes: enrichedRoutes } = await enrichCapture(
          captureId,
          rawInput,
          answeredPairs
        );
        if (enrichedRoutes.length > 0) {
          setRoutes(enrichedRoutes);
        }
        // Don't loop — go to confirm
        setPhase("confirm");
      } catch {
        // If enrichment fails, just proceed with original routes
        setPhase("confirm");
      }
    });
  }

  function handleConfirm() {
    if (!captureId) return;
    setPhase("executing");
    startExecuting(async () => {
      try {
        // Build full capture context from answers
        const contextParts: string[] = [];
        const answeredPairs = followUpQuestions
          .map((q, i) => ({ question: q, answer: answers[i] || "" }))
          .filter((a) => a.answer.trim());

        if (answeredPairs.length > 0) {
          contextParts.push("Follow-up details:");
          for (const { question, answer } of answeredPairs) {
            contextParts.push(`Q: ${question}`);
            contextParts.push(`A: ${answer}`);
            contextParts.push("");
          }
        }

        const captureContext =
          contextParts.length > 0 ? contextParts.join("\n") : undefined;

        const res = await confirmCapture(captureId, routes, captureContext);
        setResults(res);
        setPhase("done");
      } catch (err) {
        setPhase("error");
        setErrorMsg(
          err instanceof Error ? err.message : "Failed to execute"
        );
      }
    });
  }

  function handleDiscard() {
    if (captureId) {
      discardCapture(captureId);
    }
    handleClose();
  }

  function handleRemoveRoute(idx: number) {
    setRoutes((prev) => prev.filter((_, i) => i !== idx));
  }

  function handleRetry() {
    setPhase("input");
    setErrorMsg("");
    setRoutes([]);
    setFollowUpQuestions([]);
    setAnswers({});
    setCaptureId(null);
  }

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={() => setOpen(true)}
        className={cn(
          "fixed bottom-6 right-6 z-40 size-14 rounded-2xl flex items-center justify-center",
          "bg-gradient-to-br from-[#FF6B6B] to-[#FEC89A] text-[#090909]",
          "shadow-lg shadow-[#FF6B6B]/20 hover:shadow-xl hover:shadow-[#FF6B6B]/30",
          "hover:scale-105 active:scale-95 transition-all duration-200",
          "md:bottom-8 md:right-8"
        )}
        aria-label="Quick Capture"
      >
        <Inbox className="h-6 w-6" />
      </button>

      {/* Modal Overlay */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in-fast"
            onClick={handleClose}
          />

          {/* Modal Panel */}
          <div
            className={cn(
              "relative z-10 w-full sm:max-w-lg bg-[#0E0E0E] border border-[#FFF8F0]/[0.08] overflow-hidden animate-slide-up-fast",
              "rounded-t-2xl sm:rounded-2xl",
              "max-h-[85vh] sm:max-h-[80vh] flex flex-col"
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#FFF8F0]/[0.06]">
              <div className="flex items-center gap-3">
                <div className="size-8 rounded-xl bg-[#FF6B6B]/10 border border-[#FF6B6B]/20 flex items-center justify-center">
                  <Inbox className="h-4 w-4 text-[#FF6B6B]" />
                </div>
                <div>
                  <p className="text-xs font-mono uppercase tracking-[0.2em] text-[#FFF8F0]/80">
                    Quick Capture
                  </p>
                  <p className="text-[10px] text-[#FFF8F0]/30 font-mono">
                    {phase === "input" && "Type anything — we'll route it"}
                    {phase === "parsing" && "Analyzing your input..."}
                    {phase === "enrich" &&
                      "Help us understand better"}
                    {phase === "enriching" && "Refining with your details..."}
                    {phase === "confirm" && "Review routing below"}
                    {phase === "executing" && "Creating entries..."}
                    {phase === "done" && "All done!"}
                    {phase === "error" && "Something went wrong"}
                  </p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="size-9 flex items-center justify-center rounded-xl text-[#FFF8F0]/30 hover:text-[#FFF8F0]/70 hover:bg-[#FFF8F0]/[0.05] transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-5">
              {/* INPUT PHASE */}
              {(phase === "input" || phase === "parsing") && (
                <div className="space-y-4">
                  <textarea
                    ref={inputRef}
                    value={rawInput}
                    onChange={(e) => setRawInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleParse();
                      }
                    }}
                    placeholder='Try: "Buy groceries by Saturday" or "Spent 450 on dinner tonight"'
                    disabled={phase === "parsing"}
                    className={cn(
                      "w-full min-h-[100px] sm:min-h-[80px] bg-[#FFF8F0]/[0.03] border border-[#FFF8F0]/[0.08] rounded-xl px-4 py-3",
                      "text-sm text-[#FFF8F0]/90 placeholder:text-[#FFF8F0]/20 resize-none",
                      "focus:outline-none focus:border-[#FF6B6B]/30 focus:ring-1 focus:ring-[#FF6B6B]/20",
                      "transition-all duration-200",
                      phase === "parsing" && "opacity-50"
                    )}
                    rows={3}
                  />
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] text-[#FFF8F0]/20 font-mono">
                      Press Enter to send &middot; Shift+Enter for new line
                    </p>
                    <button
                      onClick={handleParse}
                      disabled={!rawInput.trim() || phase === "parsing"}
                      className={cn(
                        "flex items-center gap-2 px-4 py-2.5 rounded-xl text-[11px] font-mono uppercase tracking-wider transition-all",
                        rawInput.trim() && phase !== "parsing"
                          ? "bg-[#FF6B6B]/10 text-[#FF6B6B] border border-[#FF6B6B]/20 hover:bg-[#FF6B6B]/20"
                          : "bg-[#FFF8F0]/[0.03] text-[#FFF8F0]/20 border border-[#FFF8F0]/[0.05] cursor-not-allowed"
                      )}
                    >
                      {phase === "parsing" ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Send className="h-3.5 w-3.5" />
                      )}
                      {phase === "parsing" ? "Parsing..." : "Capture"}
                    </button>
                  </div>
                </div>
              )}

              {/* ENRICH PHASE — Always ask follow-up questions */}
              {(phase === "enrich" || phase === "enriching") && (
                <div className="space-y-4">
                  {/* What we understood */}
                  {routes.length > 0 && (
                    <div>
                      <p className="text-[10px] font-mono uppercase tracking-wider text-[#FFF8F0]/30 mb-2 flex items-center gap-2">
                        <Check className="h-3 w-3 text-emerald-400/60" />
                        We understood
                      </p>
                      <div className="space-y-1.5">
                        {routes.map((route, idx) => {
                          const meta = MODULE_META[route.module] ?? {
                            label: route.module,
                            icon: "📦",
                            color: "text-[#FFF8F0]/60",
                          };
                          return (
                            <div
                              key={idx}
                              className="flex items-center gap-2.5 px-3 py-2 bg-[#FFF8F0]/[0.03] border border-[#FFF8F0]/[0.06] rounded-lg"
                            >
                              <span className="text-base">{meta.icon}</span>
                              <div className="flex-1 min-w-0">
                                <span
                                  className={cn(
                                    "text-[10px] font-mono uppercase tracking-wider",
                                    meta.color
                                  )}
                                >
                                  {meta.label}
                                </span>
                                <p className="text-xs text-[#FFF8F0]/50 truncate">
                                  {route.summary}
                                </p>
                              </div>
                              <span className="text-[10px] font-mono text-[#FFF8F0]/20">
                                {Math.round(route.confidence * 100)}%
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* When no routes detected — explain what happened */}
                  {routes.length === 0 && (
                    <div className="bg-[#FEC89A]/[0.05] border border-[#FEC89A]/[0.15] rounded-xl px-4 py-3">
                      <p className="text-xs text-[#FEC89A]/80 font-mono">
                        We need a bit more detail to route this correctly.
                        Answer the questions below and we&apos;ll figure it
                        out.
                      </p>
                    </div>
                  )}

                  {/* Follow-up questions */}
                  <div>
                    <p className="text-[10px] font-mono uppercase tracking-wider text-[#FFF8F0]/30 mb-3 flex items-center gap-2">
                      <MessageCircleQuestion className="h-3 w-3 text-[#FEC89A]/60" />
                      {routes.length > 0
                        ? "Help us add more context"
                        : "Tell us more"}
                    </p>
                    <div className="space-y-3">
                      {followUpQuestions.map((question, idx) => (
                        <div key={idx} className="space-y-1">
                          <label className="text-xs text-[#FFF8F0]/50 font-serif">
                            {question}
                          </label>
                          <input
                            ref={idx === 0 ? firstAnswerRef : undefined}
                            type="text"
                            value={answers[idx] || ""}
                            onChange={(e) =>
                              setAnswers((prev) => ({
                                ...prev,
                                [idx]: e.target.value,
                              }))
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                // Move to next field or submit
                                if (idx < followUpQuestions.length - 1) {
                                  const nextInput = document.querySelector(
                                    `[data-answer-idx="${idx + 1}"]`
                                  ) as HTMLInputElement;
                                  nextInput?.focus();
                                } else {
                                  handleEnrich();
                                }
                              }
                            }}
                            data-answer-idx={idx}
                            placeholder="Type your answer... (optional)"
                            disabled={phase === "enriching"}
                            className={cn(
                              "w-full h-9 px-3 bg-[#FFF8F0]/[0.03] border border-[#FFF8F0]/[0.08] rounded-lg",
                              "text-sm text-[#FFF8F0]/80 placeholder:text-[#FFF8F0]/15",
                              "focus:outline-none focus:border-[#FF6B6B]/30 focus:ring-1 focus:ring-[#FF6B6B]/20",
                              "transition-all",
                              phase === "enriching" && "opacity-50"
                            )}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {phase === "enriching" && (
                    <div className="flex items-center justify-center gap-2 py-2">
                      <Loader2 className="h-4 w-4 text-[#FF6B6B] animate-spin" />
                      <span className="text-xs text-[#FFF8F0]/40 font-mono">
                        Refining...
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* CONFIRM PHASE */}
              {phase === "confirm" && (
                <div className="space-y-4">
                  {/* Original input */}
                  <div className="bg-[#FFF8F0]/[0.03] border border-[#FFF8F0]/[0.06] rounded-xl px-4 py-3">
                    <p className="text-[10px] font-mono uppercase tracking-wider text-[#FFF8F0]/30 mb-1">
                      Your input
                    </p>
                    <p className="text-sm text-[#FFF8F0]/70">{rawInput}</p>
                  </div>

                  {/* Show answered questions if any */}
                  {Object.values(answers).some((a) => a.trim()) && (
                    <div className="bg-[#FFF8F0]/[0.02] border border-[#FFF8F0]/[0.04] rounded-xl px-4 py-3">
                      <p className="text-[10px] font-mono uppercase tracking-wider text-[#FFF8F0]/20 mb-2">
                        Additional context
                      </p>
                      <div className="space-y-1.5">
                        {followUpQuestions.map((q, i) => {
                          const a = answers[i];
                          if (!a?.trim()) return null;
                          return (
                            <div key={i} className="text-xs">
                              <span className="text-[#FFF8F0]/30">{q}</span>
                              <p className="text-[#FFF8F0]/60 mt-0.5">
                                {a}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Detected routes */}
                  <div>
                    <p className="text-[10px] font-mono uppercase tracking-wider text-[#FFF8F0]/30 mb-3 flex items-center gap-2">
                      <ChevronDown className="h-3 w-3" />
                      Routing to {routes.length} module
                      {routes.length > 1 ? "s" : ""}
                    </p>
                    <div className="space-y-2">
                      {routes.map((route, idx) => {
                        const meta = MODULE_META[route.module] ?? {
                          label: route.module,
                          icon: "📦",
                          color: "text-[#FFF8F0]/60",
                        };
                        return (
                          <div
                            key={idx}
                            className="bg-[#FFF8F0]/[0.03] border border-[#FFF8F0]/[0.08] rounded-xl px-4 py-3 group hover:border-[#FFF8F0]/[0.12] transition-colors"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-start gap-3 flex-1 min-w-0">
                                <span className="text-lg mt-0.5 shrink-0">
                                  {meta.icon}
                                </span>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span
                                      className={cn(
                                        "text-xs font-mono uppercase tracking-wider",
                                        meta.color
                                      )}
                                    >
                                      {meta.label}
                                    </span>
                                    <span className="text-[10px] font-mono text-[#FFF8F0]/20">
                                      {Math.round(route.confidence * 100)}%
                                      match
                                    </span>
                                  </div>
                                  <p className="text-sm text-[#FFF8F0]/60 truncate">
                                    {route.summary}
                                  </p>
                                  {/* Show extracted data */}
                                  <div className="mt-2 flex flex-wrap gap-1.5">
                                    {Object.entries(route.data)
                                      .filter(
                                        ([, v]) =>
                                          v !== null &&
                                          v !== undefined &&
                                          v !== ""
                                      )
                                      .slice(0, 4)
                                      .map(([key, val]) => (
                                        <span
                                          key={key}
                                          className="text-[10px] font-mono bg-[#FFF8F0]/[0.05] border border-[#FFF8F0]/[0.06] rounded-md px-2 py-0.5 text-[#FFF8F0]/40"
                                        >
                                          {key}:{" "}
                                          {String(val).substring(0, 25)}
                                        </span>
                                      ))}
                                  </div>
                                </div>
                              </div>
                              {routes.length > 1 && (
                                <button
                                  onClick={() => handleRemoveRoute(idx)}
                                  className="size-7 flex items-center justify-center rounded-lg text-[#FFF8F0]/20 hover:text-red-400 hover:bg-red-400/10 transition-colors opacity-0 group-hover:opacity-100 shrink-0"
                                  title="Remove this route"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* EXECUTING PHASE */}
              {phase === "executing" && (
                <div className="flex flex-col items-center justify-center py-8 gap-4">
                  <Loader2 className="h-8 w-8 text-[#FF6B6B] animate-spin" />
                  <p className="text-sm text-[#FFF8F0]/40 font-mono">
                    Creating entries...
                  </p>
                </div>
              )}

              {/* DONE PHASE */}
              {phase === "done" && (
                <div className="space-y-4">
                  <div className="flex flex-col items-center py-6 gap-3">
                    <div className="size-12 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center">
                      <Check className="h-6 w-6 text-green-400" />
                    </div>
                    <p className="text-sm text-[#FFF8F0]/70 font-mono">
                      Captured successfully!
                    </p>
                  </div>
                  <div className="space-y-2">
                    {results.map((r, i) => {
                      const meta = MODULE_META[r.module] ?? {
                        label: r.module,
                        icon: "📦",
                        color: "text-[#FFF8F0]/60",
                      };
                      return (
                        <div
                          key={i}
                          className={cn(
                            "flex items-center gap-3 px-4 py-2.5 rounded-xl border",
                            r.success
                              ? "bg-green-500/[0.04] border-green-500/10 text-green-400"
                              : "bg-red-500/[0.04] border-red-500/10 text-red-400"
                          )}
                        >
                          <span>{meta.icon}</span>
                          <span className="text-xs font-mono uppercase tracking-wider flex-1">
                            {meta.label}
                          </span>
                          {r.success ? (
                            <Check className="h-3.5 w-3.5" />
                          ) : (
                            <span className="text-[10px] text-red-400/70">
                              {r.error}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ERROR PHASE */}
              {phase === "error" && (
                <div className="flex flex-col items-center py-8 gap-4">
                  <div className="size-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                    <X className="h-6 w-6 text-red-400" />
                  </div>
                  <p className="text-sm text-red-400/80 font-mono text-center">
                    {errorMsg}
                  </p>
                  <button
                    onClick={handleRetry}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] font-mono uppercase tracking-wider bg-[#FFF8F0]/[0.05] text-[#FFF8F0]/50 hover:text-[#FFF8F0]/80 hover:bg-[#FFF8F0]/[0.08] transition-colors border border-[#FFF8F0]/[0.06]"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Try Again
                  </button>
                </div>
              )}
            </div>

            {/* Footer Actions — Enrich Phase */}
            {phase === "enrich" && (
              <div className="px-5 py-4 border-t border-[#FFF8F0]/[0.06] flex items-center justify-between gap-3">
                <button
                  onClick={() => {
                    // Skip questions, go to confirm with current routes
                    if (routes.length > 0) {
                      setPhase("confirm");
                    } else {
                      // No routes — can't skip, need answers
                      handleEnrich();
                    }
                  }}
                  disabled={routes.length === 0}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2.5 rounded-xl text-[11px] font-mono uppercase tracking-wider transition-colors",
                    routes.length > 0
                      ? "text-[#FFF8F0]/30 hover:text-[#FFF8F0]/60 hover:bg-[#FFF8F0]/[0.05]"
                      : "text-[#FFF8F0]/15 cursor-not-allowed"
                  )}
                >
                  Skip
                </button>
                <button
                  onClick={handleEnrich}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[11px] font-mono uppercase tracking-wider bg-[#FF6B6B]/10 text-[#FF6B6B] border border-[#FF6B6B]/20 hover:bg-[#FF6B6B]/20 transition-all"
                >
                  <ArrowRight className="h-3.5 w-3.5" />
                  Continue
                </button>
              </div>
            )}

            {/* Footer Actions — Confirm Phase */}
            {phase === "confirm" && (
              <div className="px-5 py-4 border-t border-[#FFF8F0]/[0.06] flex items-center justify-between gap-3">
                <button
                  onClick={handleDiscard}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[11px] font-mono uppercase tracking-wider text-[#FFF8F0]/30 hover:text-[#FFF8F0]/60 hover:bg-[#FFF8F0]/[0.05] transition-colors"
                >
                  Discard
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={routes.length === 0}
                  className={cn(
                    "flex items-center gap-2 px-5 py-2.5 rounded-xl text-[11px] font-mono uppercase tracking-wider transition-all",
                    routes.length > 0
                      ? "bg-[#FF6B6B]/10 text-[#FF6B6B] border border-[#FF6B6B]/20 hover:bg-[#FF6B6B]/20"
                      : "bg-[#FFF8F0]/[0.03] text-[#FFF8F0]/20 border border-[#FFF8F0]/[0.05] cursor-not-allowed"
                  )}
                >
                  <Check className="h-3.5 w-3.5" />
                  Confirm & Create
                </button>
              </div>
            )}

            {phase === "done" && (
              <div className="px-5 py-4 border-t border-[#FFF8F0]/[0.06] flex justify-end">
                <button
                  onClick={handleClose}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[11px] font-mono uppercase tracking-wider bg-[#FF6B6B]/10 text-[#FF6B6B] border border-[#FF6B6B]/20 hover:bg-[#FF6B6B]/20 transition-all"
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
