export default function NotificationsLoading() {
  return (
    <div className="max-w-2xl mx-auto px-6 py-10 md:py-16 animate-pulse">
      <div className="mb-10">
        <div className="h-7 w-40 bg-[#FFF8F0]/[0.06] rounded-lg mb-2" />
        <div className="h-4 w-64 bg-[#FFF8F0]/[0.04] rounded" />
      </div>
      <div className="space-y-6">
        <div className="glass-card rounded-2xl p-6 h-32" />
        <div className="glass-card rounded-xl p-5 h-24" />
        <div className="glass-card rounded-xl p-5 h-24" />
        <div className="glass-card rounded-xl p-5 h-24" />
        <div className="glass-card rounded-xl p-5 h-24" />
        <div className="glass-card rounded-xl p-5 h-24" />
      </div>
    </div>
  );
}
