"use client";

import { Input } from "@/components/ui/input";

export function ScorecardInputField({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "time" | "number";
}) {
  return (
    <div className="space-y-2">
      <label className="text-[11px] font-mono uppercase tracking-[0.18em] text-[#FFF8F0]/45">
        {label}
      </label>
      <Input
        type={type}
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="border-[#FFF8F0]/10 bg-[#FFF8F0]/[0.03] text-[#FFF8F0]/85"
      />
    </div>
  );
}

export function ScorecardFormSelect({
  label,
  value,
  onChange,
  options,
  includeEmpty = "Optional",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<string> | Array<{ value: string; label: string }>;
  includeEmpty?: string;
}) {
  const normalizedOptions = options.map((option) =>
    typeof option === "string"
      ? { value: option, label: option.replaceAll("_", " ") }
      : option,
  );

  return (
    <div className="space-y-2">
      <label className="text-[11px] font-mono uppercase tracking-[0.18em] text-[#FFF8F0]/45">
        {label}
      </label>
      <select
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="flex h-10 w-full rounded-md border border-[#FFF8F0]/10 bg-[#FFF8F0]/[0.03] px-3 py-2 text-sm text-[#FFF8F0]/85"
      >
        <option value="">{includeEmpty}</option>
        {normalizedOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
