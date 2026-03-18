"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { updateHabit } from "./actions";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type ExtractedData = {
  purpose: string;
  identity: string;
  tinyVersion: string;
  anchorText: string;
};

type Props = {
  habitId: string;
  habitName: string;
  onClose: () => void;
};

export function HabitInterviewModal({ habitId, habitName, onClose }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [extracted, setExtracted] = useState<ExtractedData | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [fallbackMode, setFallbackMode] = useState(false);
  const [fallbackStep, setFallbackStep] = useState(0);
  const [fallbackData, setFallbackData] = useState<Partial<ExtractedData>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input
  useEffect(() => {
    inputRef.current?.focus();
  }, [isLoading]);

  // Send initial greeting
  useEffect(() => {
    sendToAI([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function sendToAI(currentMessages: ChatMessage[]) {
    setIsLoading(true);
    try {
      const res = await fetch("/api/habits/interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ habitName, messages: currentMessages }),
      });

      if (!res.ok) throw new Error("API error");

      const data = await res.json();

      if (data.fallback) {
        // No API key — switch to fallback mode
        setFallbackMode(true);
        setMessages([
          {
            role: "assistant",
            content: data.message,
          },
        ]);
        setIsLoading(false);
        return;
      }

      if (data.done && data.extracted) {
        // AI has finished and extracted structured data
        setExtracted(data.extracted);
        // Show the raw reply (which includes the JSON) as a summary
        const cleanReply = data.reply.replace(/```json[\s\S]*?```/g, "").trim();
        if (cleanReply) {
          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: cleanReply },
          ]);
        }
      } else {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.reply },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "I had trouble connecting. Let me ask you directly — why is this habit important to you?",
        },
      ]);
    }
    setIsLoading(false);
  }

  async function handleSend() {
    if (!input.trim()) return;
    const userMessage = input.trim();
    setInput("");

    if (fallbackMode) {
      // Fallback: structured form flow
      handleFallbackResponse(userMessage);
      return;
    }

    const updatedMessages: ChatMessage[] = [
      ...messages,
      { role: "user", content: userMessage },
    ];
    setMessages(updatedMessages);
    await sendToAI(updatedMessages);
  }

  function handleFallbackResponse(response: string) {
    const newMessages: ChatMessage[] = [
      ...messages,
      { role: "user", content: response },
    ];

    const fallbackPrompts = [
      "Why is this habit important to you? What will change in your life if you do this consistently?",
      "What kind of person do you want to become through this habit? Complete this: 'I am the type of person who...'",
      "What's the absolute smallest version of this habit you could do in just 2 minutes?",
      "When in your daily routine will you do this? Think of an anchor: 'After I ___, I will...'",
    ];

    const fallbackKeys: (keyof ExtractedData)[] = [
      "purpose",
      "identity",
      "tinyVersion",
      "anchorText",
    ];

    const updatedData = {
      ...fallbackData,
      [fallbackKeys[fallbackStep]]: response,
    };
    setFallbackData(updatedData);

    const nextStep = fallbackStep + 1;
    if (nextStep < fallbackPrompts.length) {
      newMessages.push({
        role: "assistant",
        content: fallbackPrompts[nextStep],
      });
      setFallbackStep(nextStep);
    } else {
      // Done — extract data
      setExtracted({
        purpose: updatedData.purpose || "",
        identity: updatedData.identity || "",
        tinyVersion: updatedData.tinyVersion || "",
        anchorText: updatedData.anchorText || "",
      });
    }

    setMessages(newMessages);
  }

  async function handleSaveExtracted() {
    if (!extracted) return;
    setIsSaving(true);
    try {
      await updateHabit(habitId, {
        purpose: extracted.purpose || null,
        identity: extracted.identity || null,
        tinyVersion: extracted.tinyVersion || null,
        anchorText: extracted.anchorText || null,
      });
      onClose();
    } catch {
      // Silently fail
    }
    setIsSaving(false);
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: "spring", damping: 25 }}
        className="w-full sm:max-w-lg bg-[#0d0d1a] border border-[#FFF8F0]/[0.1] rounded-t-3xl sm:rounded-3xl max-h-[85vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#FFF8F0]/[0.06] flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-[11px] font-mono uppercase tracking-[0.25em] text-[#FEC89A]/80">
              Build Your Why
            </h3>
            <p className="text-xs font-serif text-[#FFF8F0]/40 mt-0.5">
              {habitName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-[#FFF8F0]/20 hover:text-[#FFF8F0]/50 transition-colors text-lg"
          >
            ×
          </button>
        </div>

        {/* Chat messages */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 min-h-[200px]">
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm font-serif leading-relaxed ${
                  msg.role === "user"
                    ? "bg-[#FF6B6B]/20 text-[#FFF8F0]/80 rounded-br-md"
                    : "bg-[#FFF8F0]/[0.05] text-[#FFF8F0]/70 rounded-bl-md"
                }`}
              >
                {msg.content}
              </div>
            </motion.div>
          ))}

          {/* Typing indicator */}
          {isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-start"
            >
              <div className="bg-[#FFF8F0]/[0.05] px-4 py-3 rounded-2xl rounded-bl-md">
                <div className="flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      className="w-2 h-2 rounded-full bg-[#FFF8F0]/30"
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{
                        repeat: Infinity,
                        duration: 1,
                        delay: i * 0.2,
                      }}
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Extracted summary card */}
        <AnimatePresence>
          {extracted && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="mx-6 mb-4 p-4 rounded-2xl bg-[#34D399]/[0.08] border border-[#34D399]/20 space-y-3">
                <h4 className="text-[10px] font-mono uppercase tracking-[0.25em] text-[#34D399]/80">
                  Your Habit Profile
                </h4>
                {extracted.purpose && (
                  <div>
                    <span className="text-[9px] font-mono text-[#FFF8F0]/30 uppercase">
                      Why
                    </span>
                    <p className="text-xs font-serif text-[#FFF8F0]/70 italic">
                      {extracted.purpose}
                    </p>
                  </div>
                )}
                {extracted.identity && (
                  <div>
                    <span className="text-[9px] font-mono text-[#FFF8F0]/30 uppercase">
                      Identity
                    </span>
                    <p className="text-xs font-serif text-[#FFF8F0]/70 italic">
                      {extracted.identity}
                    </p>
                  </div>
                )}
                {extracted.tinyVersion && (
                  <div>
                    <span className="text-[9px] font-mono text-[#FFF8F0]/30 uppercase">
                      2-Min Version
                    </span>
                    <p className="text-xs font-serif text-[#FFF8F0]/70">
                      {extracted.tinyVersion}
                    </p>
                  </div>
                )}
                {extracted.anchorText && (
                  <div>
                    <span className="text-[9px] font-mono text-[#FFF8F0]/30 uppercase">
                      Anchor
                    </span>
                    <p className="text-xs font-serif text-[#FFF8F0]/70">
                      {extracted.anchorText}
                    </p>
                  </div>
                )}
                <button
                  onClick={handleSaveExtracted}
                  disabled={isSaving}
                  className="w-full py-2.5 text-[11px] font-mono uppercase tracking-widest bg-gradient-to-r from-[#34D399] to-[#2DD4BF] text-white rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {isSaving ? "Saving..." : "Save & Finish"}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input bar */}
        {!extracted && (
          <div className="px-6 py-4 border-t border-[#FFF8F0]/[0.06] shrink-0">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !isLoading) handleSend();
                }}
                placeholder="Type your answer..."
                disabled={isLoading}
                className="flex-1 bg-[#FFF8F0]/[0.03] border border-[#FFF8F0]/[0.08] text-[#FFF8F0]/80 px-4 py-2.5 text-sm font-serif rounded-xl focus:outline-none focus:ring-1 focus:ring-[#FF6B6B]/30 placeholder:text-[#FFF8F0]/20 disabled:opacity-50"
              />
              <button
                onClick={handleSend}
                disabled={isLoading || !input.trim()}
                className="px-4 py-2.5 bg-[#FF6B6B] text-white rounded-xl text-sm font-mono disabled:opacity-30 hover:bg-[#FF6B6B]/90 transition-colors"
              >
                Send
              </button>
            </div>
            <button
              onClick={onClose}
              className="w-full mt-2 text-[10px] font-mono uppercase tracking-wider text-[#FFF8F0]/20 hover:text-[#FFF8F0]/40 transition-colors py-1"
            >
              Skip for now
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
