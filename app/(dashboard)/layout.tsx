import { Sidebar } from "@/components/sidebar";
import { InboxCapture } from "@/components/inbox-capture";
import { LazyCommandPalette } from "@/components/lazy-command-palette";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-[#1A1A2E] overflow-hidden relative">
      {/* Ambient background glow — warm coral/peach */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-15%] right-[10%] w-[35%] h-[35%] bg-[#FF6B6B]/[0.03] blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] left-[5%] w-[30%] h-[30%] bg-[#FEC89A]/[0.025] blur-[100px] rounded-full" />
      </div>
      <Sidebar />
      <main className="relative z-10 flex-1 overflow-y-auto pt-16 md:pt-0">
        <div className="animate-fade-in">
          {children}
        </div>
      </main>
      <InboxCapture />
      <LazyCommandPalette />
    </div>
  );
}
