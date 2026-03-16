"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#090909] relative overflow-hidden selection:bg-[#C49E45] selection:text-[#090909]">
      {/* Ambient glow blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#C49E45]/[0.04] blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#C49E45]/[0.04] blur-[120px] rounded-full" />
      </div>

      <div className="relative w-full max-w-[460px] px-8">
        {/* Card — glassmorphism */}
        <div className="glass-card rounded-2xl p-12 glow-primary-lg flex flex-col items-center animate-scale-in">
          {/* Icon Badge */}
          <div className="size-16 rounded-2xl bg-gradient-to-b from-[#C49E45]/20 to-transparent border border-[#C49E45]/30 flex items-center justify-center mb-10">
            <span className="text-[#C49E45] text-3xl font-serif font-medium">L</span>
          </div>

          {/* Header */}
          <div className="text-center w-full mb-10">
            <h1 className="text-6xl font-serif font-light text-gradient-primary tracking-tight mb-3">
              LOS
            </h1>
            <p className="font-mono text-[9px] tracking-[0.5em] text-[#C49E45]/50 uppercase">
              Life Operating System
            </p>
          </div>

          {/* Divider */}
          <div className="w-full h-px bg-gradient-to-r from-transparent via-[#C49E45]/30 to-transparent mb-12" />

          {/* Form */}
          <form onSubmit={handleLogin} className="w-full space-y-8">
            <div className="space-y-3">
              <label className="block font-mono text-[10px] uppercase tracking-[0.2em] text-white/40 px-1">
                Access Protocol
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                spellCheck={false}
                className="w-full h-14 bg-black/40 border border-white/[0.05] rounded-xl px-5 text-white/90 focus:border-[#C49E45]/40 focus:ring-1 focus:ring-[#C49E45]/20 transition-all outline-none placeholder:text-white/10 font-mono text-sm"
                placeholder="EMAIL@LOS.SYSTEM"
              />
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center px-1">
                <label className="block font-mono text-[10px] uppercase tracking-[0.2em] text-white/40">
                  Security Clearance
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="font-mono text-[9px] uppercase tracking-wider text-[#C49E45]/40 hover:text-[#C49E45] transition-colors"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full h-14 bg-black/40 border border-white/[0.05] rounded-xl px-5 text-white/90 focus:border-[#C49E45]/40 focus:ring-1 focus:ring-[#C49E45]/20 transition-all outline-none placeholder:text-white/10 font-mono text-sm tracking-widest"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="px-4 py-3 rounded-xl bg-red-500/[0.06] border border-red-500/20">
                <p className="text-[11px] font-mono text-red-400">{error}</p>
              </div>
            )}

            <div className="pt-4">
              <button
                type="submit"
                disabled={loading}
                className="w-full h-16 bg-[#C49E45] hover:brightness-110 active:scale-[0.98] disabled:opacity-50 transition-all rounded-xl flex items-center justify-center group"
              >
                <span className="font-mono text-[11px] font-bold tracking-[0.3em] text-[#090909] uppercase">
                  {loading ? "Authenticating..." : "Enter Command Center"}
                </span>
              </button>
            </div>
          </form>

          {/* Footer */}
          <div className="mt-16 text-center border-t border-white/[0.05] pt-8 w-full">
            <p className="text-[12px] font-serif italic text-white/30 tracking-wider">
              Personal Productivity Operating System
            </p>
          </div>
        </div>

        {/* System Status */}
        <div className="mt-10 flex justify-between items-center px-4">
          <div className="flex items-center gap-3">
            <div className="size-1.5 rounded-full bg-[#C49E45]/40 animate-pulse" />
            <span className="font-mono text-[9px] uppercase tracking-[0.3em] text-white/20">
              Secure Instance
            </span>
          </div>
          <div className="font-mono text-[9px] uppercase tracking-[0.3em] text-white/20">
            Est. MMXXVI
          </div>
        </div>
      </div>
    </div>
  );
}
