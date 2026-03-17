export default function SettingsLoading() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-10 md:py-16 animate-pulse">
      <div className="mb-10">
        <div className="h-7 w-32 bg-[#FFF8F0]/[0.06] rounded-lg mb-2" />
        <div className="h-4 w-56 bg-[#FFF8F0]/[0.04] rounded" />
      </div>
      <div className="flex flex-col md:flex-row gap-8">
        <div className="md:w-56 shrink-0 space-y-2">
          <div className="h-14 bg-[#FFF8F0]/[0.04] rounded-xl" />
          <div className="h-14 bg-[#FFF8F0]/[0.04] rounded-xl" />
          <div className="h-14 bg-[#FFF8F0]/[0.04] rounded-xl" />
        </div>
        <div className="flex-1 space-y-4">
          <div className="glass-card rounded-xl p-5 h-24" />
          <div className="glass-card rounded-xl p-5 h-24" />
          <div className="glass-card rounded-xl p-5 h-16" />
        </div>
      </div>
    </div>
  );
}
