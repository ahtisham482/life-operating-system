"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { celebrateMilestone } from "./identity-actions";

interface MilestoneToastProps {
  milestone: {
    id?: string;
    title: string;
    message: string;
  } | null;
  onDismiss: () => void;
}

export function MilestoneToast({ milestone, onDismiss }: MilestoneToastProps) {
  // Auto-dismiss after 5 seconds
  useEffect(() => {
    if (!milestone) return;
    const timer = setTimeout(handleDismiss, 5000);
    return () => clearTimeout(timer);
  }, [milestone]);

  function handleDismiss() {
    if (milestone?.id) {
      celebrateMilestone(milestone.id).catch(console.error);
    }
    onDismiss();
  }

  return (
    <AnimatePresence>
      {milestone && (
        <motion.div
          key={milestone.title}
          initial={{ opacity: 0, y: 40, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-sm"
        >
          <div className="glass-card rounded-2xl p-4 border-[#FEC89A]/30 space-y-1">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-serif italic text-[#FEC89A]">
                  {milestone.title}
                </p>
                <p className="text-[11px] font-mono text-[#FFF8F0]/50 mt-0.5 leading-relaxed">
                  {milestone.message}
                </p>
              </div>
              <button
                onClick={handleDismiss}
                className="text-[#FFF8F0]/20 hover:text-[#FFF8F0]/50 transition-colors mt-0.5 flex-shrink-0"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path
                    d="M1 1L11 11M11 1L1 11"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
