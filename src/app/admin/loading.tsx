export default function AdminLoading() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs text-slate-500 uppercase tracking-widest">
          Loading Console...
        </span>
      </div>
    </div>
  );
}
