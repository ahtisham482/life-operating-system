"use client";

interface MultiInputProps {
  label: string;
  items: string[];
  inputValue: string;
  onInputChange: (v: string) => void;
  onAdd: () => void;
  onRemove: (i: number) => void;
  suggestions?: string[];
  onSuggestionClick?: (s: string) => void;
  placeholder: string;
}

export function MultiInput({
  label,
  items,
  inputValue,
  onInputChange,
  onAdd,
  onRemove,
  suggestions,
  onSuggestionClick,
  placeholder,
}: MultiInputProps) {
  return (
    <div>
      <label className="text-[10px] font-mono text-[#FFF8F0]/40 uppercase tracking-wider">
        {label}
      </label>
      <div className="flex gap-2 mt-1">
        <input
          value={inputValue}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onAdd();
            }
          }}
          placeholder={placeholder}
          className="flex-1 px-3 py-2 bg-[#FFF8F0]/[0.05] border border-[#FFF8F0]/[0.08] rounded-xl text-sm text-[#FFF8F0] placeholder:text-[#FFF8F0]/20 focus:outline-none focus:border-[#FF6B6B]/40"
        />
        <button
          onClick={onAdd}
          type="button"
          className="px-3 py-2 bg-[#FF6B6B]/20 text-[#FF6B6B] border border-[#FF6B6B]/30 rounded-xl text-[11px] font-mono"
        >
          Add
        </button>
      </div>
      {items.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {items.map((item, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 px-2 py-1 bg-[#FFF8F0]/[0.05] border border-[#FFF8F0]/[0.08] rounded-lg text-[11px] text-[#FFF8F0]/60"
            >
              {item}
              <button
                onClick={() => onRemove(i)}
                type="button"
                className="text-[#FFF8F0]/30 hover:text-[#FF6B6B] ml-0.5"
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      )}
      {suggestions && onSuggestionClick && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {suggestions
            .filter((s) => !items.includes(s))
            .map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => onSuggestionClick(s)}
                className="px-2 py-1 text-[10px] font-mono text-[#FEC89A]/60 bg-[#FEC89A]/[0.08] border border-[#FEC89A]/[0.15] rounded-lg hover:bg-[#FEC89A]/[0.15] transition-colors"
              >
                {s}
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
