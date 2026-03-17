"use client";
import { useState, useEffect } from "react";

export function ScheduleToggle() {
  const [isRamadan, setIsRamadan] = useState(false);

  useEffect(() => {
    setIsRamadan(localStorage.getItem("schedule_mode") === "ramadan");
  }, []);

  function toggle() {
    const next = !isRamadan;
    setIsRamadan(next);
    localStorage.setItem("schedule_mode", next ? "ramadan" : "normal");
    window.location.reload();
  }

  return (
    <button
      onClick={toggle}
      className="text-[9px] font-mono tracking-wider px-3 py-1.5 rounded-lg border border-[#FFF8F0]/[0.08] text-[#FFF8F0]/30 hover:text-[#FFF8F0]/50 hover:border-[#FFF8F0]/[0.12] transition-all"
    >
      {isRamadan ? "🌙 Ramadan Mode" : "☀️ Normal Mode"}
    </button>
  );
}
