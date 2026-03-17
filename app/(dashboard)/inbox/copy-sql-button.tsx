"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

export function CopySqlButton({ sql }: { sql: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(sql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      onClick={handleCopy}
      className="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-mono uppercase tracking-wider bg-[#C49E45]/10 text-[#C49E45] border border-[#C49E45]/20 hover:bg-[#C49E45]/20 transition-all"
    >
      {copied ? (
        <>
          <Check className="h-3 w-3" />
          Copied!
        </>
      ) : (
        <>
          <Copy className="h-3 w-3" />
          Copy SQL
        </>
      )}
    </button>
  );
}
