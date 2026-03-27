"use client";

import { getConfidenceLabel } from "@/lib/identity";

interface ConfidenceRingProps {
  score: number;
  color?: string;
  size?: number;
}

export function ConfidenceRing({
  score,
  color = "#FF6B6B",
  size = 80,
}: ConfidenceRingProps) {
  const radius = (size - 14) / 2;
  const circumference = 2 * Math.PI * radius;
  const filled = (score / 100) * circumference;
  const cx = size / 2;
  const cy = size / 2;

  // Color shifts: 0-49 → identity color, 50-74 → amber, 75+ → green
  const ringColor = score >= 75 ? "#34D399" : score >= 50 ? "#FEC89A" : color;

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90 absolute inset-0">
        {/* Background track */}
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke="#FFF8F0"
          strokeOpacity={0.06}
          strokeWidth={6}
        />
        {/* Filled arc */}
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke={ringColor}
          strokeWidth={6}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - filled}
          style={{
            transition: "stroke-dashoffset 0.6s ease, stroke 0.3s ease",
          }}
        />
      </svg>
      {/* Score in centre */}
      <div className="relative flex flex-col items-center justify-center">
        <span
          className="text-lg font-mono font-bold leading-none"
          style={{ color: ringColor }}
        >
          {score}
        </span>
        <span className="text-[7px] font-mono uppercase tracking-[0.1em] text-[#FFF8F0]/30 mt-0.5 text-center leading-tight">
          {getConfidenceLabel(score)}
        </span>
      </div>
    </div>
  );
}
