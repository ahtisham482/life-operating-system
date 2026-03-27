"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { IdentityCard } from "./identity-card";
import { CreateIdentityModal } from "./create-identity-modal";
import { LinkHabitsModal } from "./link-habits-modal";
import { ReflectionModal } from "./reflection-modal";
import { MilestoneToast } from "./milestone-toast";
import type { MilestoneDef } from "@/lib/identity";

interface IdentityBoardHabit {
  id: string;
  name: string;
  emoji: string | null;
  tinyVersion: string | null;
  identityId: string | null;
  isCompletedToday: boolean;
}

interface IdentityData {
  id: string;
  identityStatement: string;
  icon: string | null;
  color: string;
  whyStatement: string | null;
  confidenceLevel: number;
}

interface UncelebratedMilestone {
  id: string;
  milestoneTitle: string;
  milestoneMessage: string;
}

interface IdentityBoardProps {
  identities: IdentityData[];
  habits: IdentityBoardHabit[];
  uncelebrated: UncelebratedMilestone[];
  weekStats: Record<
    string,
    { totalVotes: number; positiveVotes: number; percentage: number }
  >;
}

export function IdentityBoard({
  identities,
  habits,
  uncelebrated,
  weekStats,
}: IdentityBoardProps) {
  const [showCreate, setShowCreate] = useState(false);
  const [linkTarget, setLinkTarget] = useState<IdentityData | null>(null);
  const [reflectTarget, setReflectTarget] = useState<IdentityData | null>(null);
  const [activeMilestone, setActiveMilestone] = useState<{
    id?: string;
    title: string;
    message: string;
  } | null>(
    // Pre-load first uncelebrated if any
    uncelebrated.length > 0
      ? {
          id: uncelebrated[0].id,
          title: uncelebrated[0].milestoneTitle,
          message: uncelebrated[0].milestoneMessage,
        }
      : null,
  );

  function handleMilestone(m: MilestoneDef) {
    setActiveMilestone({ title: m.title, message: m.message });
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[11px] font-mono uppercase tracking-[0.2em] text-[#FFF8F0]/40">
            Your identities
          </h2>
          <p className="text-[10px] font-mono text-[#FFF8F0]/20 mt-0.5">
            Every habit is a vote for who you&apos;re becoming
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 px-3 py-2 text-[9px] font-mono uppercase tracking-[0.2em] text-[#FF6B6B] border border-[#FF6B6B]/30 rounded-xl hover:bg-[#FF6B6B]/10 transition-colors"
        >
          <Plus size={11} />
          New identity
        </button>
      </div>

      {/* Empty state */}
      {identities.length === 0 && (
        <div className="glass-card rounded-3xl p-8 text-center space-y-4">
          <p className="text-3xl">🌱</p>
          <div className="space-y-2">
            <p className="text-sm font-serif italic text-[#FFF8F0]/60">
              Who are you becoming?
            </p>
            <p className="text-[10px] font-mono text-[#FFF8F0]/25 max-w-[240px] mx-auto leading-relaxed">
              Every habit you complete is a vote for an identity. Start by
              defining who you want to be.
            </p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-[10px] font-mono uppercase tracking-widest bg-[#FF6B6B]/20 text-[#FF6B6B] border border-[#FF6B6B]/30 rounded-xl hover:bg-[#FF6B6B]/30 transition-colors"
          >
            <Plus size={11} />
            Create first identity
          </button>
        </div>
      )}

      {/* Identity cards */}
      <AnimatePresence>
        {identities.map((identity) => {
          const linkedHabits = habits
            .filter((h) => h.identityId === identity.id)
            .map((h) => ({
              id: h.id,
              name: h.name,
              emoji: h.emoji,
              tinyVersion: h.tinyVersion,
              isCompletedToday: h.isCompletedToday,
            }));

          return (
            <motion.div
              key={identity.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <IdentityCard
                id={identity.id}
                identityStatement={identity.identityStatement}
                icon={identity.icon}
                color={identity.color}
                whyStatement={identity.whyStatement}
                confidenceLevel={identity.confidenceLevel}
                habits={linkedHabits}
                onLinkHabits={() => setLinkTarget(identity)}
                onReflect={() => setReflectTarget(identity)}
                onMilestone={handleMilestone}
              />
            </motion.div>
          );
        })}
      </AnimatePresence>

      {/* Modals */}
      {showCreate && (
        <CreateIdentityModal
          onClose={() => setShowCreate(false)}
          onCreated={() => setShowCreate(false)}
        />
      )}

      {linkTarget && (
        <LinkHabitsModal
          identityId={linkTarget.id}
          identityStatement={linkTarget.identityStatement}
          allHabits={habits.map((h) => ({
            id: h.id,
            name: h.name,
            emoji: h.emoji,
            identityId: h.identityId,
          }))}
          onClose={() => setLinkTarget(null)}
        />
      )}

      {reflectTarget && (
        <ReflectionModal
          identityId={reflectTarget.id}
          identityStatement={reflectTarget.identityStatement}
          weekStats={
            weekStats[reflectTarget.id] ?? {
              totalVotes: 0,
              positiveVotes: 0,
              percentage: 0,
            }
          }
          onClose={() => setReflectTarget(null)}
        />
      )}

      {/* Milestone toast */}
      <MilestoneToast
        milestone={activeMilestone}
        onDismiss={() => setActiveMilestone(null)}
      />
    </div>
  );
}
